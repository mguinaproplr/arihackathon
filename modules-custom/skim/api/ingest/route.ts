// Skim — the wow path. Paste a URL → AI agent team produces a builder-ready
// breakdown → row gets inserted with status='ready' and returned.
//
// POST /api/modules/skim/ingest    { "url": "https://..." }

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse, toSnakeCase } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { ingestSchema, ArticleSingleResponseSchema } from '@/modules/skim/lib/validation'
import { skimArticles } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { runPipeline, AgentPipelineError } from '@/modules/skim/lib/agents'
import { getSkimModel } from '@/modules/skim/lib/get-skim-model'

registry.registerPath({
  method: 'post',
  path: '/api/modules/skim/ingest',
  operationId: 'ingestSkimUrl',
  summary: 'Paste a URL and run the full agent pipeline (extract + 4 OpenAI agents)',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: ingestSchema } } } },
  responses: {
    201: { description: 'Article processed and stored', content: { 'application/json': { schema: ArticleSingleResponseSchema } } },
    200: { description: 'Article already exists — returned unchanged', content: { 'application/json': { schema: ArticleSingleResponseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    422: { description: 'Pipeline failed — the failed article row is still persisted', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, ingestSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const { url } = validation.data

    // Independent reads: existing-article check + user's AI-model preference.
    // Running them in parallel cuts a round-trip off the cold path.
    const [existing, model] = await Promise.all([
      withRLS((db) =>
        db
          .select({ id: skimArticles.id, status: skimArticles.status })
          .from(skimArticles)
          .where(and(eq(skimArticles.userId, user.id), eq(skimArticles.url, url)))
          .limit(1),
      ),
      getSkimModel(user.id, withRLS),
    ])

    // If the article already processed cleanly, no need to re-run the pipeline.
    if (existing.length > 0 && existing[0].status === 'ready') {
      const rows = await withRLS((db) =>
        db
          .select()
          .from(skimArticles)
          .where(and(eq(skimArticles.userId, user.id), eq(skimArticles.url, url)))
          .limit(1),
      )
      return NextResponse.json({ article: toSnakeCase(rows[0]) }, { status: 200 })
    }

    try {
      const breakdown = await runPipeline({ url, model })

      const rows = await withRLS((db) =>
        db
          .insert(skimArticles)
          .values({
            userId: user.id,
            url,
            originalTitle: breakdown.original_title,
            skimTitle: breakdown.skim_title,
            sourceName: extractHost(url),
            theNews: breakdown.the_news,
            whyItMatters: breakdown.why_it_matters,
            ariInspiration: breakdown.ari_inspiration,
            suggestedModuleName: breakdown.suggested_module_name,
            pillar: breakdown.pillar,
            tags: breakdown.tags,
            status: 'ready',
          })
          .onConflictDoUpdate({
            target: [skimArticles.userId, skimArticles.url],
            set: {
              originalTitle: breakdown.original_title,
              skimTitle: breakdown.skim_title,
              sourceName: extractHost(url),
              theNews: breakdown.the_news,
              whyItMatters: breakdown.why_it_matters,
              ariInspiration: breakdown.ari_inspiration,
              suggestedModuleName: breakdown.suggested_module_name,
              pillar: breakdown.pillar,
              tags: breakdown.tags,
              status: 'ready',
              errorMessage: null,
              updatedAt: new Date().toISOString(),
            },
          })
          .returning(),
      )

      return NextResponse.json({ article: toSnakeCase(rows[0]) }, { status: 201 })
    } catch (err) {
      const isPipelineErr = err instanceof AgentPipelineError
      const errorMessage = err instanceof Error ? err.message : 'Unknown agent error'
      const stage = isPipelineErr ? (err as AgentPipelineError).stage : 'pipeline'

      // Persist a failed row so the UI shows the attempt + reason. Wrapped in
      // its own try so a DB failure during error-recording doesn't mask the
      // original pipeline error.
      let failedRow: unknown = null
      try {
        const rows = await withRLS((db) =>
          db
            .insert(skimArticles)
            .values({
              userId: user.id,
              url,
              sourceName: extractHost(url),
              status: 'failed',
              errorMessage: errorMessage.slice(0, 500),
            })
            .onConflictDoUpdate({
              target: [skimArticles.userId, skimArticles.url],
              set: {
                status: 'failed',
                errorMessage: errorMessage.slice(0, 500),
                updatedAt: new Date().toISOString(),
              },
            })
            .returning(),
        )
        failedRow = toSnakeCase(rows[0])
      } catch (persistErr) {
        console.error('[skim ingest] could not persist failed row:', persistErr instanceof Error ? persistErr.message : persistErr)
      }

      return createErrorResponse(`Agent pipeline failed at "${stage}": ${errorMessage}`, 422, failedRow ? { article: failedRow } : undefined)
    }
  } catch (error) {
    console.error('POST /api/modules/skim/ingest error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

function extractHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
