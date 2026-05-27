// Skim — main feed page. Onboarding + agent pipeline dialog + article feed.
//
// Layout note: the module routing system already provides the sidebar /
// header chrome. Do NOT add SidebarProvider, AppSidebar, etc. here.

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useModuleEnabled } from '@/lib/modules/module-hooks'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, Sparkles, Newspaper, Plus, RefreshCw, Search, Zap, Copy, Wrench, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useSkimArticles,
  useSkimSources,
  useCreateSkimSource,
  useIngestSkimUrl,
  useRefreshSkimSources,
  useSkimSettings,
  useUpdateSkimSettings,
  useUpdateSkimArticle,
  useDeleteSkimArticle,
} from '../hooks/use-skim'
import { PILLAR_LABELS, SKIM_PILLARS, type SkimArticle, type SkimPillar } from '../types'
import { ArticleCard } from '../components/article-card'
import { ArticleDrawer } from '../components/article-drawer'
import { AgentPipelineDialog } from '../components/agent-pipeline-animation'

interface StarterSource {
  name: string
  feed_url: string
  kind: 'rss' | 'hackernews' | 'reddit'
}

const STARTER_SOURCES: StarterSource[] = [
  { name: 'TLDR Tech', feed_url: 'https://tldr.tech/api/rss/tech', kind: 'rss' },
  { name: 'Hacker News front page', feed_url: 'https://hnrss.org/frontpage', kind: 'hackernews' },
  { name: 'r/MachineLearning', feed_url: 'https://www.reddit.com/r/MachineLearning/.rss', kind: 'reddit' },
]

export default function SkimPage() {
  const { toast } = useToast()

  const { data: settings, isLoading: settingsLoading } = useSkimSettings()
  const updateSettings = useUpdateSkimSettings()

  const { enabled: quotesEnabled, loading: quotesLoading } = useModuleEnabled('quotes')
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author?: string } | null>(null)

  useEffect(() => {
    if (!quotesEnabled || quotesLoading) return
    let cancelled = false
    fetch('/api/modules/quotes/quotes')
      .then((res) => (res.ok ? res.json() : []))
      .then((quotes: Array<{ quote: string; author?: string }>) => {
        if (!cancelled && Array.isArray(quotes) && quotes.length > 0) {
          setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)])
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [quotesEnabled, quotesLoading])

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!settings?.onboardingCompleted) {
    return <OnboardingScreen onComplete={() => updateSettings.mutate({ onboardingCompleted: true })} toastFn={toast} />
  }

  return <SkimFeed randomQuote={randomQuote} />
}

// ─── Onboarding ─────────────────────────────────────────────────────────
function OnboardingScreen({ onComplete, toastFn }: { onComplete: () => void; toastFn: ReturnType<typeof useToast>['toast'] }) {
  const createSource = useCreateSkimSource()
  const [adding, setAdding] = useState(false)

  const handleAddStarterPack = async () => {
    setAdding(true)
    let added = 0
    let skipped = 0
    for (const src of STARTER_SOURCES) {
      try {
        await createSource.mutateAsync(src)
        added += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        if (message.toLowerCase().includes('already')) {
          skipped += 1
        } else {
          toastFn({ variant: 'destructive', title: `Could not add ${src.name}`, description: message })
        }
      }
    }
    setAdding(false)
    toastFn({
      title: `${added} source${added === 1 ? '' : 's'} added`,
      description: skipped > 0 ? `${skipped} already existed` : 'Hit Refresh to pull your first articles.',
    })
    onComplete()
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome to Skim</CardTitle>
          <CardDescription>
            A team of AI agents reads emerging tech news as a builder would — and finishes every article with a specific
            ARI module idea you can ship today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Starter pack</p>
            {STARTER_SOURCES.map((s) => (
              <div key={s.feed_url} className="text-sm flex items-center justify-between gap-2">
                <span>{s.name}</span>
                <Badge variant="secondary" className="text-xs">{s.kind}</Badge>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={handleAddStarterPack} disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Subscribe & explore
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onComplete} disabled={adding}>
            Skip — I’ll add my own
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main feed ──────────────────────────────────────────────────────────
function SkimFeed({ randomQuote }: { randomQuote: { quote: string; author?: string } | null }) {
  const { toast } = useToast()
  const [pillar, setPillar] = useState<SkimPillar | 'all'>('all')
  const [search, setSearch] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<SkimArticle | null>(null)
  const [buildDialogArticle, setBuildDialogArticle] = useState<SkimArticle | null>(null)

  const filters = useMemo(
    () => ({
      pillar: pillar === 'all' ? undefined : (pillar as SkimPillar),
      q: search.trim() || undefined,
      limit: 100,
    }),
    [pillar, search],
  )

  const { data: articles = [], isLoading } = useSkimArticles(filters)
  const { data: sources = [] } = useSkimSources()
  const ingest = useIngestSkimUrl()
  const refresh = useRefreshSkimSources()
  const updateArticle = useUpdateSkimArticle()
  const deleteArticle = useDeleteSkimArticle()

  const grouped = useMemo(() => groupByDate(articles), [articles])

  const handleIngest = async (url: string) => {
    try {
      const article = await ingest.mutateAsync(url)
      toast({
        title: 'Article skimmed',
        description: article.suggested_module_name
          ? `New module idea: ${article.suggested_module_name}`
          : 'Saved to your feed',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Couldn’t skim that article',
        description: err instanceof Error ? err.message : 'Unknown error',
      })
      throw err
    }
  }

  const handleRefresh = async () => {
    if (sources.length === 0) {
      toast({ title: 'No sources yet', description: 'Add an RSS feed first from the Sources page.' })
      return
    }
    try {
      const result = await refresh.mutateAsync()
      toast({
        title: `Refreshed ${result.refreshed} source${result.refreshed === 1 ? '' : 's'}`,
        description:
          result.new_articles > 0
            ? `${result.new_articles} new article${result.new_articles === 1 ? '' : 's'} processed`
            : 'No new articles found',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const openBuildDialog = (article: SkimArticle) => {
    setBuildDialogArticle(article)
    updateArticle.mutate({ id: article.id, has_built_module: true })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-medium">Skim</h1>
          {randomQuote ? (
            <p className="text-sm text-[#aa2020] mt-1">{randomQuote.quote}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Tech news, turned into ARI modules.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refresh.isPending}>
            {refresh.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh sources
          </Button>
          <Button onClick={() => setPasteOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Paste URL
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles & module ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            maxLength={200}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <PillarChip value="all" active={pillar === 'all'} onClick={() => setPillar('all')}>
            All
          </PillarChip>
          {SKIM_PILLARS.filter((p) => p !== 'other').map((p) => (
            <PillarChip key={p} value={p} active={pillar === p} onClick={() => setPillar(p)}>
              {PILLAR_LABELS[p]}
            </PillarChip>
          ))}
        </div>
      </div>

      {/* Empty / loading / list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState onPaste={() => setPasteOpen(true)} hasSources={sources.length > 0} onRefresh={handleRefresh} />
      ) : (
        <div className="space-y-6">
          {grouped.map(([bucket, items]) => (
            <div key={bucket} className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bucket}</h2>
              <div className="space-y-3">
                {items.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onOpen={() => {
                      setSelectedArticle(article)
                      if (!article.is_read) updateArticle.mutate({ id: article.id, is_read: true })
                    }}
                    onBuildModule={() => openBuildDialog(article)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paste dialog with agent animation */}
      <AgentPipelineDialog open={pasteOpen} onOpenChange={setPasteOpen} onSubmit={handleIngest} />

      {/* Article drawer */}
      <ArticleDrawer
        article={selectedArticle}
        open={selectedArticle !== null}
        onOpenChange={(o) => !o && setSelectedArticle(null)}
        onToggleSaved={() => {
          if (!selectedArticle) return
          updateArticle.mutate({ id: selectedArticle.id, is_saved: !selectedArticle.is_saved })
          setSelectedArticle({ ...selectedArticle, is_saved: !selectedArticle.is_saved })
        }}
        onMarkBuilt={() => {
          if (!selectedArticle) return
          updateArticle.mutate({ id: selectedArticle.id, has_built_module: true })
          setSelectedArticle({ ...selectedArticle, has_built_module: true })
          toast({ title: 'Marked as built', description: 'Great work.' })
        }}
        onDelete={() => {
          if (!selectedArticle) return
          deleteArticle.mutate(selectedArticle.id)
          setSelectedArticle(null)
        }}
        onBuildModule={() => {
          if (selectedArticle) openBuildDialog(selectedArticle)
        }}
      />

      {/* Build-this-module dialog: closes the loop into /ari-create-module */}
      <BuildModuleDialog article={buildDialogArticle} onClose={() => setBuildDialogArticle(null)} />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────
function PillarChip({
  active,
  onClick,
  children,
}: {
  value: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 text-xs rounded-full whitespace-nowrap border transition-colors',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background text-muted-foreground border-border hover:border-foreground/30',
      )}
    >
      {children}
    </button>
  )
}

function EmptyState({ onPaste, hasSources, onRefresh }: { onPaste: () => void; hasSources: boolean; onRefresh: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        <Newspaper className="w-10 h-10 mx-auto text-muted-foreground" />
        <div>
          <p className="font-medium">Nothing skimmed yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Paste any tech article URL — the agent team will produce a summary, key takeaways, and a custom ARI module idea.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={onPaste}>
            <Plus className="w-4 h-4 mr-2" /> Paste URL
          </Button>
          {hasSources && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh feeds
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function BuildModuleDialog({ article, onClose }: { article: SkimArticle | null; onClose: () => void }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const open = article !== null

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  if (!article) return null

  const moduleName = article.suggested_module_name || 'New Module'
  const command = `/ari-create-module\n\nBuild a ${moduleName} module in ARI inspired by this Skim breakdown:\n\nTHE NEWS\n${article.the_news ?? ''}\n\nWHY IT MATTERS\n${article.why_it_matters ?? ''}\n\nMODULE IDEA\n${article.ari_inspiration ?? ''}\n\nSOURCE\n${article.url}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      toast({ title: 'Copied to clipboard', description: 'Paste it into Claude Code in your ARI project.' })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Select the text manually instead.' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-5 h-5 text-purple-600" />
          <DialogTitle>Build the {moduleName} module</DialogTitle>
        </div>
        <DialogDescription>
          Open Claude Code in your ARI project and paste the prompt below. The <code className="px-1 py-0.5 rounded bg-muted text-xs">/ari-create-module</code> skill takes it from there.
        </DialogDescription>
        <div className="mt-3 rounded-md border bg-muted/40 p-3 max-h-72 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">{command}</pre>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy prompt'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Grouping ───────────────────────────────────────────────────────────
function groupByDate(articles: SkimArticle[]): Array<[string, SkimArticle[]]> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekAgo = startOfToday - 6 * 86400000

  const buckets: Record<string, SkimArticle[]> = { Today: [], 'This week': [], Older: [] }
  for (const a of articles) {
    const t = new Date(a.created_at).getTime()
    if (t >= startOfToday) buckets.Today.push(a)
    else if (t >= weekAgo) buckets['This week'].push(a)
    else buckets.Older.push(a)
  }
  return (Object.entries(buckets) as Array<[string, SkimArticle[]]>).filter(([, items]) => items.length > 0)
}
