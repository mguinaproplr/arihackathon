import { z } from 'zod'
import '@/lib/openapi/registry'

const uuidSchema = z.string().uuid('Invalid id format')

const sourceKindEnum = z.enum(['rss', 'reddit', 'hackernews', 'googlenews', 'other'], {
  errorMap: () => ({ message: 'Source kind must be one of: rss, reddit, hackernews, googlenews, other' }),
})

const pillarEnum = z.enum(['ai-llms', 'automation', 'productivity', 'nocode-ai', 'other'], {
  errorMap: () => ({ message: 'Pillar must be one of: ai-llms, automation, productivity, nocode-ai, other' }),
})

const articleStatusEnum = z.enum(['pending', 'processing', 'ready', 'failed'])

const httpUrl = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .max(2048, 'URL must be 2048 characters or fewer')
  .url('Must be a valid URL')
  .regex(/^https?:\/\//i, 'URL must start with http:// or https://')

// ─── Sources ───────────────────────────────────────────────────────────
export const createSourceSchema = z
  .object({
    name: z.string().trim().min(1, 'Source name is required').max(120, 'Source name must be 120 characters or fewer'),
    feed_url: httpUrl,
    kind: sourceKindEnum.default('rss'),
  })
  .openapi('SkimCreateSourceBody')

export const updateSourceSchema = z
  .object({
    name: z.string().trim().min(1, 'Source name is required').max(120, 'Source name must be 120 characters or fewer').optional(),
    enabled: z.boolean().optional(),
  })
  .openapi('SkimUpdateSourceBody')

export const SourceSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string(),
    name: z.string(),
    feed_url: z.string(),
    kind: sourceKindEnum,
    enabled: z.boolean(),
    last_polled_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .openapi('SkimSource')

export const SourceListResponseSchema = z
  .object({
    sources: z.array(SourceSchema),
    count: z.number().int().nonnegative(),
  })
  .openapi('SkimSourceListResponse')

export const SourceSingleResponseSchema = z
  .object({ source: SourceSchema })
  .openapi('SkimSourceSingleResponse')

export const RefreshResponseSchema = z
  .object({
    refreshed: z.number().int().nonnegative(),
    new_articles: z.number().int().nonnegative(),
    failed_sources: z.number().int().nonnegative(),
  })
  .openapi('SkimRefreshResponse')

// ─── Articles ──────────────────────────────────────────────────────────
export const listArticlesQuerySchema = z.object({
  pillar: pillarEnum.optional(),
  source_id: uuidSchema.optional(),
  status: articleStatusEnum.optional(),
  is_read: z.enum(['true', 'false']).optional(),
  is_saved: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200, 'Search query must be 200 characters or fewer').optional(),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(200, 'Limit must be 200 or fewer').optional(),
  offset: z.coerce.number().int().min(0, 'Offset must be 0 or greater').optional(),
})

export const updateArticleSchema = z
  .object({
    is_read: z.boolean().optional(),
    is_saved: z.boolean().optional(),
    has_built_module: z.boolean().optional(),
  })
  .openapi('SkimUpdateArticleBody')

export const ArticleSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string(),
    source_id: z.string().uuid().nullable().optional(),
    url: z.string(),
    original_title: z.string().nullable().optional(),
    skim_title: z.string().nullable().optional(),
    source_name: z.string().nullable().optional(),
    the_news: z.string().nullable().optional(),
    why_it_matters: z.string().nullable().optional(),
    ari_inspiration: z.string().nullable().optional(),
    suggested_module_name: z.string().nullable().optional(),
    pillar: pillarEnum.nullable().optional(),
    tags: z.array(z.string()),
    published_at: z.string().nullable().optional(),
    status: articleStatusEnum,
    error_message: z.string().nullable().optional(),
    is_read: z.boolean(),
    is_saved: z.boolean(),
    has_built_module: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .openapi('SkimArticle')

export const ArticleListResponseSchema = z
  .object({
    articles: z.array(ArticleSchema),
    count: z.number().int().nonnegative(),
  })
  .openapi('SkimArticleListResponse')

export const ArticleSingleResponseSchema = z
  .object({ article: ArticleSchema })
  .openapi('SkimArticleSingleResponse')

// ─── Ingest (the wow path) ─────────────────────────────────────────────
export const ingestSchema = z
  .object({
    url: httpUrl,
  })
  .openapi('SkimIngestBody')

// ─── Settings ──────────────────────────────────────────────────────────
export const SkimSettingsSchema = z
  .object({
    onboardingCompleted: z.boolean().optional(),
    aiModel: z.enum(['gpt-4o-mini', 'gpt-4o']).optional(),
  })
  .strict()
  .openapi('SkimSettings')

export const SettingsSavedSchema = z.object({ success: z.literal(true) }).openapi('SkimSettingsSaved')

export const DeleteSuccessSchema = z
  .object({ success: z.literal(true), message: z.string() })
  .openapi('SkimDeleteResponse')
