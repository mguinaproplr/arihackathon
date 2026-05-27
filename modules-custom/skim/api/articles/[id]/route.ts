// Skim — single article operations.
// GET    /api/modules/skim/articles/[id]   — fetch single
// PATCH  /api/modules/skim/articles/[id]   — toggle is_read / is_saved / has_built_module
// DELETE /api/modules/skim/articles/[id]   — delete

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse, toSnakeCase } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import {
  updateArticleSchema,
  ArticleSingleResponseSchema,
  DeleteSuccessSchema,
} from '@/modules/skim/lib/validation'
import { skimArticles } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const idParam = z.string().uuid('Invalid article id')

registry.registerPath({
  method: 'get',
  path: '/api/modules/skim/articles/{id}',
  operationId: 'getSkimArticle',
  summary: 'Fetch a single Skim article',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Article', content: { 'application/json': { schema: ArticleSingleResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Article not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/modules/skim/articles/{id}',
  operationId: 'updateSkimArticle',
  summary: 'Update read / saved / has-built-module flags',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: updateArticleSchema } } } },
  responses: {
    200: { description: 'Updated article', content: { 'application/json': { schema: ArticleSingleResponseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Article not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/modules/skim/articles/{id}',
  operationId: 'deleteSkimArticle',
  summary: 'Delete a Skim article',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Deleted', content: { 'application/json': { schema: DeleteSuccessSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Article not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const parsedId = idParam.safeParse(id)
    if (!parsedId.success) return createErrorResponse('Invalid article id', 400)

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const rows = await withRLS((db) =>
      db
        .select()
        .from(skimArticles)
        .where(and(eq(skimArticles.id, parsedId.data), eq(skimArticles.userId, user.id)))
        .limit(1),
    )
    if (rows.length === 0) return createErrorResponse('Article not found', 404)

    return NextResponse.json({ article: toSnakeCase(rows[0]) })
  } catch (error) {
    console.error('GET /api/modules/skim/articles/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const parsedId = idParam.safeParse(id)
    if (!parsedId.success) return createErrorResponse('Invalid article id', 400)

    const validation = await validateRequestBody(request, updateArticleSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (validation.data.is_read !== undefined) updates.isRead = validation.data.is_read
    if (validation.data.is_saved !== undefined) updates.isSaved = validation.data.is_saved
    if (validation.data.has_built_module !== undefined) updates.hasBuiltModule = validation.data.has_built_module

    const updated = await withRLS((db) =>
      db
        .update(skimArticles)
        .set(updates)
        .where(and(eq(skimArticles.id, parsedId.data), eq(skimArticles.userId, user.id)))
        .returning(),
    )
    if (updated.length === 0) return createErrorResponse('Article not found', 404)

    return NextResponse.json({ article: toSnakeCase(updated[0]) })
  } catch (error) {
    console.error('PATCH /api/modules/skim/articles/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const parsedId = idParam.safeParse(id)
    if (!parsedId.success) return createErrorResponse('Invalid article id', 400)

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const deleted = await withRLS((db) =>
      db
        .delete(skimArticles)
        .where(and(eq(skimArticles.id, parsedId.data), eq(skimArticles.userId, user.id)))
        .returning({ id: skimArticles.id }),
    )
    if (deleted.length === 0) return createErrorResponse('Article not found', 404)

    return NextResponse.json({ success: true, message: 'Article deleted' })
  } catch (error) {
    console.error('DELETE /api/modules/skim/articles/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
