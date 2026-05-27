// Skim — settings (onboarding flag, AI model preference).
// GET /api/modules/skim/settings
// PUT /api/modules/skim/settings
//
// JSONB-merged upsert pattern: the PUT preserves keys it doesn't touch.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { SkimSettingsSchema, SettingsSavedSchema } from '@/modules/skim/lib/validation'
import { moduleSettings } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/skim/settings',
  operationId: 'getSkimSettings',
  summary: 'Fetch the user’s Skim settings',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Settings object', content: { 'application/json': { schema: SkimSettingsSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'put',
  path: '/api/modules/skim/settings',
  operationId: 'updateSkimSettings',
  summary: 'Update Skim settings (JSONB merge)',
  tags: ['skim'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: SkimSettingsSchema } } } },
  responses: {
    200: { description: 'Saved', content: { 'application/json': { schema: SettingsSavedSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    // Defense-in-depth: explicit user_id filter alongside RLS.
    const rows = await withRLS((db) =>
      db
        .select({ settings: moduleSettings.settings })
        .from(moduleSettings)
        .where(and(eq(moduleSettings.userId, user.id), eq(moduleSettings.moduleId, 'skim')))
        .limit(1),
    )

    return NextResponse.json(rows[0]?.settings ?? {})
  } catch (error) {
    console.error('GET /api/modules/skim/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, SkimSettingsSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const patch = JSON.stringify(validation.data)
    await withRLS((db) =>
      db
        .insert(moduleSettings)
        .values({ userId: user.id, moduleId: 'skim', settings: validation.data })
        .onConflictDoUpdate({
          target: [moduleSettings.userId, moduleSettings.moduleId],
          set: {
            settings: sql`COALESCE(${moduleSettings.settings}, '{}'::jsonb) || ${patch}::jsonb`,
            updatedAt: sql`timezone('utc'::text, now())`,
          },
        }),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/modules/skim/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
