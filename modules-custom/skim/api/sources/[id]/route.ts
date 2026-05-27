// Skim — single source operations.
// PATCH  /api/modules/skim/sources/[id]   — update (rename, toggle enabled)
// DELETE /api/modules/skim/sources/[id]   — delete

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse, toSnakeCase } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import {
  updateSourceSchema,
  SourceSingleResponseSchema,
  DeleteSuccessSchema,
} from '@/modules/skim/lib/validation'
import { skimSources } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const idParam = z.string().uuid('Invalid source id')

registry.registerPath({
  method: 'patch',
  path: '/api/modules/skim/sources/{id}',
  operationId: 'updateSkimSource',
  summary: 'Update a Skim source (rename or toggle enabled)',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: updateSourceSchema } } } },
  responses: {
    200: { description: 'Updated source', content: { 'application/json': { schema: SourceSingleResponseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Source not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/modules/skim/sources/{id}',
  operationId: 'deleteSkimSource',
  summary: 'Delete a Skim source',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Deleted', content: { 'application/json': { schema: DeleteSuccessSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Source not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const parsedId = idParam.safeParse(id)
    if (!parsedId.success) return createErrorResponse('Invalid source id', 400)

    const validation = await validateRequestBody(request, updateSourceSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (validation.data.name !== undefined) updates.name = validation.data.name
    if (validation.data.enabled !== undefined) updates.enabled = validation.data.enabled

    const updated = await withRLS((db) =>
      db
        .update(skimSources)
        .set(updates)
        .where(and(eq(skimSources.id, parsedId.data), eq(skimSources.userId, user.id)))
        .returning(),
    )

    if (updated.length === 0) return createErrorResponse('Source not found', 404)

    return NextResponse.json({ source: toSnakeCase(updated[0]) })
  } catch (error) {
    console.error('PATCH /api/modules/skim/sources/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const parsedId = idParam.safeParse(id)
    if (!parsedId.success) return createErrorResponse('Invalid source id', 400)

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const deleted = await withRLS((db) =>
      db
        .delete(skimSources)
        .where(and(eq(skimSources.id, parsedId.data), eq(skimSources.userId, user.id)))
        .returning({ id: skimSources.id }),
    )

    if (deleted.length === 0) return createErrorResponse('Source not found', 404)

    return NextResponse.json({ success: true, message: 'Source deleted' })
  } catch (error) {
    console.error('DELETE /api/modules/skim/sources/[id] error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
