// Skim — frontend types. Shape matches API responses after toSnakeCase().

export type SkimPillar = 'ai-llms' | 'automation' | 'productivity' | 'nocode-ai' | 'other'

export const SKIM_PILLARS: SkimPillar[] = ['ai-llms', 'automation', 'productivity', 'nocode-ai', 'other']

export const PILLAR_LABELS: Record<SkimPillar, string> = {
  'ai-llms': 'AI & LLMs',
  'automation': 'Automation',
  'productivity': 'Productivity',
  'nocode-ai': 'No-Code AI',
  'other': 'Other',
}

// Tailwind classes for pillar badges. Kept here so the card, drawer, and any
// future surface (widget, dashboard) stay visually consistent.
export const PILLAR_CLASSES: Record<SkimPillar, string> = {
  'ai-llms': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  'automation': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  'productivity': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  'nocode-ai': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  'other': 'bg-muted text-muted-foreground border-border',
}

export type SkimSourceKind = 'rss' | 'reddit' | 'hackernews' | 'googlenews' | 'other'

export type SkimArticleStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface SkimSource {
  id: string
  user_id: string
  name: string
  feed_url: string
  kind: SkimSourceKind
  enabled: boolean
  last_polled_at?: string | null
  created_at: string
  updated_at: string
}

export interface SkimArticle {
  id: string
  user_id: string
  source_id?: string | null
  url: string
  original_title?: string | null
  skim_title?: string | null
  source_name?: string | null
  the_news?: string | null
  why_it_matters?: string | null
  ari_inspiration?: string | null
  suggested_module_name?: string | null
  pillar?: SkimPillar | null
  tags: string[]
  published_at?: string | null
  status: SkimArticleStatus
  error_message?: string | null
  is_read: boolean
  is_saved: boolean
  has_built_module: boolean
  created_at: string
  updated_at: string
}

export interface SkimSettings {
  onboardingCompleted: boolean
  aiModel: 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant'
}

export interface AgentBreakdown {
  skim_title: string
  the_news: string
  why_it_matters: string
  ari_inspiration: string
  suggested_module_name: string
  pillar: SkimPillar
  tags: string[]
}
