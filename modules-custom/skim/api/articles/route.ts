// Skim — articles list with filters.
// GET /api/modules/skim/articles

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateQueryParams, createErrorResponse, toSnakeCase } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { listArticlesQuerySchema, ArticleListResponseSchema } from '@/modules/skim/lib/validation'
import { skimArticles } from '@/lib/db/schema'
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/skim/articles',
  operationId: 'listSkimArticles',
  summary: 'List Skim articles with optional filters',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  request: { query: listArticlesQuerySchema },
  responses: {
    200: { description: 'Articles list', content: { 'application/json': { schema: ArticleListResponseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryValidation = validateQueryParams(searchParams, listArticlesQuerySchema)
    if (!queryValidation.success) return queryValidation.response
    const q = queryValidation.data

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const conditions: SQL[] = [eq(skimArticles.userId, user.id)]
    if (q.pillar) conditions.push(eq(skimArticles.pillar, q.pillar))
    if (q.source_id) conditions.push(eq(skimArticles.sourceId, q.source_id))
    if (q.status) conditions.push(eq(skimArticles.status, q.status))
    if (q.is_read) conditions.push(eq(skimArticles.isRead, q.is_read === 'true'))
    if (q.is_saved) conditions.push(eq(skimArticles.isSaved, q.is_saved === 'true'))
    if (q.q && q.q.trim()) {
      const pattern = `%${q.q.trim()}%`
      const searchClause = or(
        ilike(skimArticles.skimTitle, pattern),
        ilike(skimArticles.originalTitle, pattern),
        ilike(skimArticles.theNews, pattern),
        ilike(skimArticles.ariInspiration, pattern),
        ilike(skimArticles.suggestedModuleName, pattern),
      )
      if (searchClause) conditions.push(searchClause)
    }

    const limit = q.limit ?? 100
    const offset = q.offset ?? 0

    const rows = await withRLS((db) =>
      db
        .select()
        .from(skimArticles)
        .where(and(...conditions))
        .orderBy(desc(skimArticles.createdAt))
        .limit(limit)
        .offset(offset),
    )

    return NextResponse.json({ articles: toSnakeCase(rows), count: rows.length })
  } catch (error) {
    console.error('GET /api/modules/skim/articles error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
