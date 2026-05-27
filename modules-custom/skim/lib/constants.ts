// Skim — shared constants. Single source of truth for things referenced
// from both pages and API routes.

import type { SkimSourceKind } from '../types'

export const DEFAULT_SKIM_MODEL = 'llama-3.3-70b-versatile' as const

export interface StarterSource {
  name: string
  feed_url: string
  kind: SkimSourceKind
}

// Curated starter feeds shown in both the onboarding screen and the sources
// page. Order matters — the first three are surfaced in onboarding. Feeds
// are chosen to map across Skim's pillars: AI & LLMs, Automation,
// Productivity, and No-Code AI.
export const STARTER_SOURCES: StarterSource[] = [
  // General tech firehose
  { name: 'TLDR Tech', feed_url: 'https://tldr.tech/api/rss/tech', kind: 'rss' },
  { name: 'Hacker News front page', feed_url: 'https://hnrss.org/frontpage', kind: 'hackernews' },
  // AI & LLMs
  { name: 'TLDR AI', feed_url: 'https://tldr.tech/api/rss/ai', kind: 'rss' },
  { name: 'r/MachineLearning', feed_url: 'https://www.reddit.com/r/MachineLearning/.rss', kind: 'reddit' },
  { name: 'r/LocalLLaMA', feed_url: 'https://www.reddit.com/r/LocalLLaMA/.rss', kind: 'reddit' },
  { name: 'r/OpenAI', feed_url: 'https://www.reddit.com/r/OpenAI/.rss', kind: 'reddit' },
  { name: 'Simon Willison', feed_url: 'https://simonwillison.net/atom/everything/', kind: 'rss' },
  // Builder / Productivity / Automation
  { name: 'TLDR Founders', feed_url: 'https://tldr.tech/api/rss/founders', kind: 'rss' },
  { name: 'r/n8n', feed_url: 'https://www.reddit.com/r/n8n/.rss', kind: 'reddit' },
  { name: 'r/SideProject', feed_url: 'https://www.reddit.com/r/SideProject/.rss', kind: 'reddit' },
]

export const ONBOARDING_STARTER_SOURCES = STARTER_SOURCES.slice(0, 3)
