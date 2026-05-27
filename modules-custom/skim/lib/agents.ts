// Skim — the multi-agent LLM pipeline (Groq via OpenAI-compatible endpoint).
//
// Server-only. Called from /api/modules/skim/ingest and /api/modules/skim/sources/refresh.
// Each article passes through a small team of focused agents, each with a single job.
// Specialization gives more consistent, structured output than any single-shot call.

import type { AgentBreakdown, SkimPillar } from '../types'
import { SKIM_PILLARS } from '../types'

// Groq's OpenAI-compatible endpoint. Free tier at console.groq.com.
const LLM_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const FETCH_TIMEOUT_MS = 15000
const LLM_TIMEOUT_MS = 30000
const MAX_EXTRACT_CHARS = 12000
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024 // hard cap on remote article HTML

// Output length caps for each agent — keeps any single mis-behaving response
// from blowing past column expectations in skim_articles.
const MAX_TITLE_CHARS = 120
const MAX_THE_NEWS_CHARS = 600
const MAX_WHY_CHARS = 400
const MAX_MODULE_NAME_CHARS = 80
const MAX_INSPIRATION_CHARS = 500
const MAX_TAG_CHARS = 40
const MAX_TAG_COUNT = 8

export type PipelineModel = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant'

export class AgentPipelineError extends Error {
  constructor(public stage: string, message: string) {
    super(message)
    this.name = 'AgentPipelineError'
  }
}

// ─── SSRF protection ────────────────────────────────────────────────────
// First line of defense: reject obviously-internal hostnames before any
// outbound fetch. Note this does NOT prevent DNS rebinding — production
// deployments should also restrict outbound network access at the network
// layer (e.g. block RFC1918 at the egress).
function isInternalHostname(rawHost: string): boolean {
  const host = rawHost.toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  if (host === '169.254.169.254') return true // EC2 / GCP / Azure IMDS

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const o = v4.slice(1, 5).map((n) => Number(n))
    if (o.some((n) => n > 255 || !Number.isFinite(n))) return true
    if (o[0] === 0) return true
    if (o[0] === 127) return true
    if (o[0] === 10) return true
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true
    if (o[0] === 192 && o[1] === 168) return true
    if (o[0] === 169 && o[1] === 254) return true
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true
    if (o[0] >= 224) return true
    return false
  }

  if (host === '::1' || host === '::') return true
  if (host.startsWith('fc') || host.startsWith('fd')) return true
  if (host.startsWith('fe80:')) return true
  if (host.startsWith('::ffff:')) return isInternalHostname(host.slice(7))

  return false
}

function assertSafeUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new AgentPipelineError('fetch', 'Invalid URL')
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new AgentPipelineError('fetch', 'URL must use http:// or https://')
  }
  if (isInternalHostname(parsed.hostname)) {
    throw new AgentPipelineError('fetch', 'Refusing to fetch from internal / loopback / link-local hosts')
  }
  return parsed
}

// ─── Step 1: Fetch + extract ────────────────────────────────────────────
// Streams the response body with a hard byte cap; rejects non-HTML content.
export async function fetchAndExtract(url: string): Promise<{ text: string; title?: string }> {
  assertSafeUrl(url)

  let html: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ARI-Skim/1.0; +https://ari.software)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      throw new AgentPipelineError('fetch', `Source returned ${res.status} ${res.statusText}`)
    }

    // Re-validate the final URL after redirects.
    if (res.url) assertSafeUrl(res.url)

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    if (contentType && !contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('text/plain')) {
      throw new AgentPipelineError('fetch', `Unsupported content-type: ${contentType}`)
    }

    html = await readResponseCapped(res, MAX_RESPONSE_BYTES)
  } catch (err) {
    if (err instanceof AgentPipelineError) throw err
    const message = err instanceof Error ? err.message : 'Unknown fetch error'
    throw new AgentPipelineError('fetch', `Could not fetch article: ${message}`)
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim()

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length < 200) {
    throw new AgentPipelineError(
      'extract',
      'Could not extract enough article text. The page may be behind a login wall or rendered client-side.',
    )
  }

  return { text: text.slice(0, MAX_EXTRACT_CHARS), title }
}

async function readResponseCapped(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared && declared > maxBytes) {
    throw new AgentPipelineError('fetch', 'Article exceeds size cap')
  }
  if (!res.body) return res.text()

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new AgentPipelineError('fetch', 'Article exceeds size cap')
      }
      chunks.push(value)
    }
  }
  const merged = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged)
}

// ─── LLM call helper (Groq via OpenAI-compatible endpoint) ──────────────
async function callAgent(
  stage: string,
  model: PipelineModel,
  systemPrompt: string,
  userContent: string,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new AgentPipelineError(
      stage,
      'GROQ_API_KEY is not configured. Add it to .env.local to run the Skim agent pipeline. Get a free key at https://console.groq.com.',
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)

  try {
    const res = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new AgentPipelineError(stage, `Groq returned ${res.status}: ${detail.slice(0, 200)}`)
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content
    if (!content) {
      throw new AgentPipelineError(stage, 'Groq returned no content')
    }
    return JSON.parse(content) as Record<string, unknown>
  } catch (err) {
    if (err instanceof AgentPipelineError) throw err
    if (err instanceof SyntaxError) {
      throw new AgentPipelineError(stage, 'Groq returned non-JSON content')
    }
    const message = err instanceof Error ? err.message : 'Unknown agent error'
    throw new AgentPipelineError(stage, message)
  } finally {
    clearTimeout(timer)
  }
}

function requireString(raw: Record<string, unknown>, key: string, stage: string, maxLen: number): string {
  const v = raw[key]
  if (typeof v !== 'string' || !v.trim()) {
    throw new AgentPipelineError(stage, `Agent returned no "${key}"`)
  }
  return v.trim().slice(0, maxLen)
}

// ─── Step 2: News Distiller ─────────────────────────────────────────────
const NEWS_DISTILLER_PROMPT = `You are the News Distiller — one agent in a team that processes emerging tech news for builders, indie hackers, and productivity maximizers.

INPUT: the raw text of a tech article.

YOUR JOB:
1. Write a punchy, action-oriented title that captures what shipped or changed. Use sharp verbs (lands, ships, drops, eats, hits, breaks, crosses). Casual but professional. Max 80 characters. NO clickbait, NO question marks, NO "You Won't Believe".
2. Write "The News": 1-2 sentences explaining exactly what happened. Concrete facts only. No opinions. No hedging.

OUTPUT strict JSON:
{ "skim_title": "...", "the_news": "..." }`

async function runNewsDistiller(model: PipelineModel, articleText: string): Promise<{ skim_title: string; the_news: string }> {
  const raw = await callAgent('news-distiller', model, NEWS_DISTILLER_PROMPT, articleText)
  return {
    skim_title: requireString(raw, 'skim_title', 'news-distiller', MAX_TITLE_CHARS),
    the_news: requireString(raw, 'the_news', 'news-distiller', MAX_THE_NEWS_CHARS),
  }
}

// ─── Step 3: Builder Angle ──────────────────────────────────────────────
const BUILDER_ANGLE_PROMPT = `You are the Builder-Angle Agent — one agent in a team. Your readers are indie hackers, founders, and builders using ARI, a self-hosted AI-native workspace where they build custom modules in minutes.

INPUT: the article text plus a one-sentence summary of what happened.

YOUR JOB: Write ONE sentence explaining why this matters to a builder. Focus on capability change — what they can now do that they could not yesterday. Not editorial, not hype. Just the unlock.

OUTPUT strict JSON:
{ "why_it_matters": "..." }`

async function runBuilderAngle(model: PipelineModel, articleText: string, theNews: string): Promise<{ why_it_matters: string }> {
  const raw = await callAgent('builder-angle', model, BUILDER_ANGLE_PROMPT, `THE NEWS: ${theNews}\n\nARTICLE:\n${articleText}`)
  return { why_it_matters: requireString(raw, 'why_it_matters', 'builder-angle', MAX_WHY_CHARS) }
}

// ─── Step 4: ARI Spark ──────────────────────────────────────────────────
const ARI_SPARK_PROMPT = `You are the ARI Spark Agent — the most important agent in the team. You translate tech news into a SPECIFIC, NAMED ARI module idea that the reader could ship today.

ABOUT ARI: a self-hosted, AI-native workspace where users build custom modules in minutes. Modules can be: a CRM, a habit tracker, a finance dashboard, a custom AI agent, a webhook listener, an integration with an external API, a media library — anything the user can imagine.

INPUT: the article text plus a summary plus the builder angle.

YOUR JOB:
1. Invent ONE specific, named ARI module that builds DIRECTLY on this article's news.
2. Give the module a memorable, builder-friendly name (e.g. "Codebase Auditor", "Subscription Watcher", "Voice Capture", "Synthetic Data Lab", "n8n Bridge"). 1-3 words.
3. Write the inspiration line in this exact format: "Build a [Module Name] module in ARI that [concrete action grounded in the article]."

TONE: motivating, casual, sharp. Make the builder want to start typing right now.

OUTPUT strict JSON:
{ "suggested_module_name": "Codebase Auditor", "ari_inspiration": "Build a Codebase Auditor module in ARI that ingests your whole project weekly and outputs a security and quality review." }`

async function runAriSpark(
  model: PipelineModel,
  articleText: string,
  theNews: string,
  whyItMatters: string,
): Promise<{ suggested_module_name: string; ari_inspiration: string }> {
  const userContent = `THE NEWS: ${theNews}\n\nWHY IT MATTERS: ${whyItMatters}\n\nARTICLE:\n${articleText}`
  const raw = await callAgent('ari-spark', model, ARI_SPARK_PROMPT, userContent)
  return {
    suggested_module_name: requireString(raw, 'suggested_module_name', 'ari-spark', MAX_MODULE_NAME_CHARS),
    ari_inspiration: requireString(raw, 'ari_inspiration', 'ari-spark', MAX_INSPIRATION_CHARS),
  }
}

// ─── Step 5: Pillar + Tagger ────────────────────────────────────────────
const PILLAR_TAGGER_PROMPT = `You are the Pillar + Tag Agent — one agent in a team. You classify articles into ARI's four content pillars and extract free-form tags.

ARI'S FOUR PILLARS:
- "ai-llms" — AI/LLM capabilities: new models (Claude, GPT, open-source), function calling, agent frameworks, training breakthroughs
- "automation" — Workflow automation, webhooks, pipelines, integration platforms, developer tooling, devops
- "productivity" — Personal productivity frameworks: knowledge management, health/finance/time tracking, voice notes, second-brain tools
- "nocode-ai" — Speed-build proof-of-concepts, no-code/low-code AI hacks, vibe-coding wins, "built X in N hours" stories
- "other" — only if NOTHING else fits

INPUT: the article text plus a one-sentence summary.

YOUR JOB:
1. Pick exactly ONE pillar value from the list above.
2. Extract 3-6 free-form tags. Lowercase. Multi-word tags use hyphens (e.g. "open-source", "long-context"). Specific over generic ("voice-first" not "voice", "anthropic" not "ai-company").

OUTPUT strict JSON:
{ "pillar": "ai-llms", "tags": ["anthropic", "long-context", "agents"] }`

function isPillar(value: string): value is SkimPillar {
  return (SKIM_PILLARS as readonly string[]).includes(value)
}

async function runPillarTagger(
  model: PipelineModel,
  articleText: string,
  theNews: string,
): Promise<{ pillar: SkimPillar; tags: string[] }> {
  const raw = await callAgent('pillar-tagger', model, PILLAR_TAGGER_PROMPT, `THE NEWS: ${theNews}\n\nARTICLE:\n${articleText}`)
  const pillarRaw = typeof raw.pillar === 'string' ? raw.pillar.toLowerCase() : ''
  const pillar: SkimPillar = isPillar(pillarRaw) ? pillarRaw : 'other'
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : []
  const tags = tagsRaw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= MAX_TAG_CHARS)
    .slice(0, MAX_TAG_COUNT)
  return { pillar, tags }
}

// ─── Orchestrator ───────────────────────────────────────────────────────
export interface PipelineInput {
  url: string
  prefetchedText?: string
  prefetchedTitle?: string
  model?: PipelineModel
}

export interface PipelineResult extends AgentBreakdown {
  original_title?: string
}

// Critical path: News Distiller → ARI Spark depends on Builder-Angle output,
// but Pillar+Tagger only needs the_news, so it runs alongside the Builder→Spark
// chain. 4 sequential calls → 3 sequential wall-clock segments.
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const model = input.model ?? DEFAULT_MODEL

  let articleText: string
  let originalTitle: string | undefined
  if (input.prefetchedText) {
    articleText = input.prefetchedText.slice(0, MAX_EXTRACT_CHARS)
    originalTitle = input.prefetchedTitle
  } else {
    const extracted = await fetchAndExtract(input.url)
    articleText = extracted.text
    originalTitle = extracted.title
  }

  const distilled = await runNewsDistiller(model, articleText)

  const [classified, sparkChain] = await Promise.all([
    runPillarTagger(model, articleText, distilled.the_news),
    (async () => {
      const angle = await runBuilderAngle(model, articleText, distilled.the_news)
      const spark = await runAriSpark(model, articleText, distilled.the_news, angle.why_it_matters)
      return { ...spark, why_it_matters: angle.why_it_matters }
    })(),
  ])

  return {
    skim_title: distilled.skim_title,
    the_news: distilled.the_news,
    why_it_matters: sparkChain.why_it_matters,
    ari_inspiration: sparkChain.ari_inspiration,
    suggested_module_name: sparkChain.suggested_module_name,
    pillar: classified.pillar,
    tags: classified.tags,
    original_title: originalTitle,
  }
}
