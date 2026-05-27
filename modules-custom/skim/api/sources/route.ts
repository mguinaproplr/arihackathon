// Skim — sources collection (RSS feeds the user subscribes to).
// GET    /api/modules/skim/sources       — list
// POST   /api/modules/skim/sources       — create

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse, toSnakeCase } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import {
  createSourceSchema,
  SourceListResponseSchema,
  SourceSingleResponseSchema,
} from '@/modules/skim/lib/validation'
import { skimSources } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/skim/sources',
  operationId: 'listSkimSources',
  summary: 'List the user’s Skim sources (RSS feeds)',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Sources list', content: { 'application/json': { schema: SourceListResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/modules/skim/sources',
  operationId: 'createSkimSource',
  summary: 'Subscribe to a new RSS feed',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: createSourceSchema } } } },
  responses: {
    201: { description: 'Created source', content: { 'application/json': { schema: SourceSingleResponseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    409: { description: 'Feed URL already subscribed', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const rows = await withRLS((db) =>
      db.select().from(skimSources).where(eq(skimSources.userId, user.id)).orderBy(desc(skimSources.createdAt)),
    )

    return NextResponse.json({ sources: toSnakeCase(rows), count: rows.length })
  } catch (error) {
    console.error('GET /api/modules/skim/sources error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, createSourceSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const { name, feed_url, kind } = validation.data

    const existing = await withRLS((db) =>
      db
        .select({ id: skimSources.id })
        .from(skimSources)
        .where(and(eq(skimSources.userId, user.id), eq(skimSources.feedUrl, feed_url)))
        .limit(1),
    )
    if (existing.length > 0) {
      return createErrorResponse('Feed URL already subscribed', 409)
    }

    const inserted = await withRLS((db) =>
      db
        .insert(skimSources)
        .values({ userId: user.id, name, feedUrl: feed_url, kind })
        .returning(),
    )

    return NextResponse.json({ source: toSnakeCase(inserted[0]) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/modules/skim/sources error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
