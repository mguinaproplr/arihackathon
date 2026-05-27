// Skim — shared constants. Single source of truth for things referenced
// from both pages and API routes.

import type { SkimSourceKind } from '../types'

export const DEFAULT_SKIM_MODEL = 'gpt-4o-mini' as const

export interface StarterSource {
  name: string
  feed_url: string
  kind: SkimSourceKind
}

// Curated starter feeds shown in both the onboarding screen and the sources
// page. Order matters — the first three are surfaced in onboarding.
export const STARTER_SOURCES: StarterSource[] = [
  { name: 'TLDR Tech', feed_url: 'https://tldr.tech/api/rss/tech', kind: 'rss' },
  { name: 'Hacker News front page', feed_url: 'https://hnrss.org/frontpage', kind: 'hackernews' },
  { name: 'r/MachineLearning', feed_url: 'https://www.reddit.com/r/MachineLearning/.rss', kind: 'reddit' },
  { name: 'r/LocalLLaMA', feed_url: 'https://www.reddit.com/r/LocalLLaMA/.rss', kind: 'reddit' },
]

export const ONBOARDING_STARTER_SOURCES = STARTER_SOURCES.slice(0, 3)
