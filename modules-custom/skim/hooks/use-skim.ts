// Skim — TanStack Query hooks. One file, all data flows.

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import type { SkimArticle, SkimSource, SkimSettings, SkimPillar, SkimArticleStatus, SkimSourceKind } from '@/modules/skim/types'

const SOURCES_KEY = ['skim-sources'] as const
const ARTICLES_KEY = ['skim-articles'] as const
const SETTINGS_KEY = ['skim-settings'] as const

interface ZodIssue {
  message: string
  field?: string
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; details?: ZodIssue[]; message?: string }
    if (Array.isArray(body.details) && body.details.length > 0) {
      return body.details.map((d) => d.message).filter(Boolean).join(', ')
    }
    return body.error || body.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

// ─── Sources ────────────────────────────────────────────────────────────
export function useSkimSources() {
  return useQuery({
    queryKey: SOURCES_KEY,
    queryFn: async (): Promise<SkimSource[]> => {
      const res = await fetch('/api/modules/skim/sources')
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { sources: SkimSource[] }
      return data.sources ?? []
    },
  })
}

export interface CreateSourceInput {
  name: string
  feed_url: string
  kind?: SkimSourceKind
}

export function useCreateSkimSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSourceInput): Promise<SkimSource> => {
      const res = await fetch('/api/modules/skim/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { source: SkimSource }
      return data.source
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SOURCES_KEY }),
  })
}

export interface UpdateSourceInput {
  id: string
  name?: string
  enabled?: boolean
}

export function useUpdateSkimSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateSourceInput): Promise<SkimSource> => {
      const res = await fetch(`/api/modules/skim/sources/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { source: SkimSource }
      return data.source
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: SOURCES_KEY })
      const previous = qc.getQueryData<SkimSource[]>(SOURCES_KEY)
      qc.setQueryData<SkimSource[]>(SOURCES_KEY, (old = []) =>
        old.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(SOURCES_KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SOURCES_KEY }),
  })
}

export function useDeleteSkimSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/modules/skim/sources/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await parseError(res))
    },
    onMutate: async (deletedId) => {
      await qc.cancelQueries({ queryKey: SOURCES_KEY })
      const previous = qc.getQueryData<SkimSource[]>(SOURCES_KEY)
      qc.setQueryData<SkimSource[]>(SOURCES_KEY, (old = []) => old.filter((s) => s.id !== deletedId))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(SOURCES_KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SOURCES_KEY }),
  })
}

export interface RefreshResult {
  refreshed: number
  new_articles: number
  failed_sources: number
}

export function useRefreshSkimSources() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<RefreshResult> => {
      const res = await fetch('/api/modules/skim/sources/refresh', { method: 'POST' })
      if (!res.ok) throw new Error(await parseError(res))
      return (await res.json()) as RefreshResult
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SOURCES_KEY })
      qc.invalidateQueries({ queryKey: ARTICLES_KEY })
    },
  })
}

// ─── Articles ───────────────────────────────────────────────────────────
export interface ArticleFilters {
  pillar?: SkimPillar
  source_id?: string
  status?: SkimArticleStatus
  is_read?: boolean
  is_saved?: boolean
  q?: string
  limit?: number
  offset?: number
}

function buildArticleQueryString(filters: ArticleFilters): string {
  const params = new URLSearchParams()
  if (filters.pillar) params.set('pillar', filters.pillar)
  if (filters.source_id) params.set('source_id', filters.source_id)
  if (filters.status) params.set('status', filters.status)
  if (filters.is_read !== undefined) params.set('is_read', String(filters.is_read))
  if (filters.is_saved !== undefined) params.set('is_saved', String(filters.is_saved))
  if (filters.q) params.set('q', filters.q)
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useSkimArticles(
  filters: ArticleFilters = {},
  options?: Omit<UseQueryOptions<SkimArticle[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<SkimArticle[], Error>({
    queryKey: [...ARTICLES_KEY, filters],
    queryFn: async () => {
      const res = await fetch(`/api/modules/skim/articles${buildArticleQueryString(filters)}`)
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { articles: SkimArticle[] }
      return data.articles ?? []
    },
    ...options,
  })
}

export interface UpdateArticleInput {
  id: string
  is_read?: boolean
  is_saved?: boolean
  has_built_module?: boolean
}

export function useUpdateSkimArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateArticleInput): Promise<SkimArticle> => {
      const res = await fetch(`/api/modules/skim/articles/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { article: SkimArticle }
      return data.article
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ARTICLES_KEY })
      const previousMap = new Map<unknown, SkimArticle[] | undefined>()
      qc.getQueriesData<SkimArticle[]>({ queryKey: ARTICLES_KEY }).forEach(([key, data]) => {
        previousMap.set(key, data)
        if (!data) return
        qc.setQueryData<SkimArticle[]>(key, data.map((a) => (a.id === id ? { ...a, ...patch } : a)))
      })
      return { previousMap }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.previousMap) return
      ctx.previousMap.forEach((data, key) => qc.setQueryData(key as readonly unknown[], data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ARTICLES_KEY }),
  })
}

export function useDeleteSkimArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/modules/skim/articles/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await parseError(res))
    },
    onMutate: async (deletedId) => {
      await qc.cancelQueries({ queryKey: ARTICLES_KEY })
      const previousMap = new Map<unknown, SkimArticle[] | undefined>()
      qc.getQueriesData<SkimArticle[]>({ queryKey: ARTICLES_KEY }).forEach(([key, data]) => {
        previousMap.set(key, data)
        if (!data) return
        qc.setQueryData<SkimArticle[]>(key, data.filter((a) => a.id !== deletedId))
      })
      return { previousMap }
    },
    onError: (_err, _id, ctx) => {
      if (!ctx?.previousMap) return
      ctx.previousMap.forEach((data, key) => qc.setQueryData(key as readonly unknown[], data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ARTICLES_KEY }),
  })
}

// ─── Ingest (the wow path) ──────────────────────────────────────────────
export function useIngestSkimUrl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (url: string): Promise<SkimArticle> => {
      const res = await fetch('/api/modules/skim/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      // 422 = pipeline failed; the API still returns the failed article row,
      // but we throw so the UI shows the error. The row is visible on next refetch.
      if (!res.ok) throw new Error(await parseError(res))
      const data = (await res.json()) as { article: SkimArticle }
      return data.article
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ARTICLES_KEY }),
    onError: () => qc.invalidateQueries({ queryKey: ARTICLES_KEY }),
  })
}

// ─── Settings ───────────────────────────────────────────────────────────
export function useSkimSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<Partial<SkimSettings>> => {
      const res = await fetch('/api/modules/skim/settings')
      if (!res.ok) return {}
      return (await res.json()) as Partial<SkimSettings>
    },
  })
}

export function useUpdateSkimSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<SkimSettings>): Promise<void> => {
      const res = await fetch('/api/modules/skim/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(await parseError(res))
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEY })
      const previous = qc.getQueryData<Partial<SkimSettings>>(SETTINGS_KEY)
      qc.setQueryData<Partial<SkimSettings>>(SETTINGS_KEY, (old = {}) => ({ ...old, ...patch }))
      return { previous }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(SETTINGS_KEY, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}
