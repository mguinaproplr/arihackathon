// Skim — refresh all enabled sources.
// POST /api/modules/skim/sources/refresh
//
// For each enabled feed: parse the RSS (in parallel), dedupe against existing
// articles by (user_id, url), and run the agent pipeline on up to
// MAX_NEW_ITEMS_PER_REFRESH new items. Returns counts. v1 is on-demand only
// — no background cron.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { RefreshResponseSchema } from '@/modules/skim/lib/validation'
import { skimSources, skimArticles } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { parseFeed } from '@/modules/skim/lib/rss'
import { runPipeline } from '@/modules/skim/lib/agents'
import { getSkimModel } from '@/modules/skim/lib/get-skim-model'

// Caps to keep refresh under typical request-timeout limits. Real-world
// tuning would push this into a background job; v1 stays inline for
// simplicity.
const MAX_NEW_ITEMS_PER_REFRESH = 5
const MAX_ITEMS_PER_SOURCE = 2

interface Candidate {
  sourceId: string
  sourceName: string
  url: string
  title: string
  pubDate?: string
}

registry.registerPath({
  method: 'post',
  path: '/api/modules/skim/sources/refresh',
  operationId: 'refreshSkimSources',
  summary: 'Poll every enabled source and run the agent pipeline on new items',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Refresh result counts', content: { 'application/json': { schema: RefreshResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function POST(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    // Independent reads in parallel.
    const [model, enabledSources] = await Promise.all([
      getSkimModel(user.id, withRLS),
      withRLS((db) =>
        db
          .select()
          .from(skimSources)
          .where(and(eq(skimSources.userId, user.id), eq(skimSources.enabled, true))),
      ),
    ])

    // Parse every feed concurrently. Network I/O dominates this phase — going
    // serial would make 5 feeds take 5× longer than necessary.
    const polledAt = new Date().toISOString()
    const feedResults = await Promise.allSettled(enabledSources.map((source) => parseFeed(source.feedUrl)))

    const candidates: Candidate[] = []
    let failedSources = 0
    const polledIds: string[] = []

    for (let i = 0; i < enabledSources.length; i++) {
      const source = enabledSources[i]
      polledIds.push(source.id)
      const result = feedResults[i]
      if (result.status !== 'fulfilled') {
        failedSources += 1
        console.error(`[skim refresh] source ${source.id} failed:`, result.reason instanceof Error ? result.reason.message : result.reason)
        continue
      }
      const { source_name, items } = result.value
      if (items.length === 0) continue

      const itemUrls = items.map((i) => i.link)
      const existing = await withRLS((db) =>
        db
          .select({ url: skimArticles.url })
          .from(skimArticles)
          .where(and(eq(skimArticles.userId, user.id), inArray(skimArticles.url, itemUrls))),
      )
      const seen = new Set(existing.map((e) => e.url))

      items
        .filter((i) => !seen.has(i.link))
        .slice(0, MAX_ITEMS_PER_SOURCE)
        .forEach((i) =>
          candidates.push({
            sourceId: source.id,
            sourceName: source.name || source_name,
            url: i.link,
            title: i.title,
            pubDate: i.pub_date,
          }),
        )
    }

    // Batch the last_polled_at update — one round trip instead of N.
    if (polledIds.length > 0) {
      await withRLS((db) =>
        db
          .update(skimSources)
          .set({ lastPolledAt: polledAt, updatedAt: polledAt })
          .where(and(eq(skimSources.userId, user.id), inArray(skimSources.id, polledIds))),
      )
    }

    const toProcess = candidates.slice(0, MAX_NEW_ITEMS_PER_REFRESH)

    const results = await Promise.allSettled(
      toProcess.map(async (c) => {
        try {
          const breakdown = await runPipeline({ url: c.url, model })
          await withRLS((db) =>
            db
              .insert(skimArticles)
              .values({
                userId: user.id,
                sourceId: c.sourceId,
                url: c.url,
                originalTitle: breakdown.original_title || c.title,
                skimTitle: breakdown.skim_title,
                sourceName: c.sourceName,
                theNews: breakdown.the_news,
                whyItMatters: breakdown.why_it_matters,
                ariInspiration: breakdown.ari_inspiration,
                suggestedModuleName: breakdown.suggested_module_name,
                pillar: breakdown.pillar,
                tags: breakdown.tags,
                publishedAt: c.pubDate ? new Date(c.pubDate).toISOString() : null,
                status: 'ready',
              })
              .onConflictDoNothing({ target: [skimArticles.userId, skimArticles.url] }),
          )
          return 'ready' as const
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          await withRLS((db) =>
            db
              .insert(skimArticles)
              .values({
                userId: user.id,
                sourceId: c.sourceId,
                url: c.url,
                originalTitle: c.title,
                sourceName: c.sourceName,
                publishedAt: c.pubDate ? new Date(c.pubDate).toISOString() : null,
                status: 'failed',
                errorMessage: message.slice(0, 500),
              })
              .onConflictDoNothing({ target: [skimArticles.userId, skimArticles.url] }),
          )
          return 'failed' as const
        }
      }),
    )

    const newArticles = results.filter((r) => r.status === 'fulfilled' && r.value === 'ready').length

    return NextResponse.json({
      refreshed: enabledSources.length,
      new_articles: newArticles,
      failed_sources: failedSources,
    })
  } catch (error) {
    console.error('POST /api/modules/skim/sources/refresh error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
