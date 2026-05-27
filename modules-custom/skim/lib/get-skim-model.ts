// Skim — single source of truth for resolving the user's preferred AI model
// from module_settings. Used by ingest and sources/refresh.

import { moduleSettings } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import type { PipelineModel } from './agents'
import { DEFAULT_SKIM_MODEL } from './constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RLSFn = <T>(fn: (db: any) => Promise<T>) => Promise<T>

export async function getSkimModel(userId: string, withRLS: RLSFn): Promise<PipelineModel> {
  const rows = await withRLS<Array<{ settings: unknown }>>((db) =>
    db
      .select({ settings: moduleSettings.settings })
      .from(moduleSettings)
      .where(and(eq(moduleSettings.userId, userId), eq(moduleSettings.moduleId, 'skim')))
      .limit(1),
  )
  const stored = (rows[0]?.settings ?? {}) as { aiModel?: PipelineModel }
  return stored.aiModel === 'gpt-4o' ? 'gpt-4o' : DEFAULT_SKIM_MODEL
}
