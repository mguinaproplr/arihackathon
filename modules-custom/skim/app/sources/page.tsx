// Skim — sources management page (subpage at /skim/sources).

'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2, Rss, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useSkimSources,
  useCreateSkimSource,
  useUpdateSkimSource,
  useDeleteSkimSource,
  useRefreshSkimSources,
} from '../../hooks/use-skim'
import type { SkimSourceKind } from '../../types'

interface FormState {
  name: string
  feed_url: string
  kind: SkimSourceKind
}

const EMPTY_FORM: FormState = { name: '', feed_url: '', kind: 'rss' }

const STARTER_SOURCES: Array<{ name: string; feed_url: string; kind: SkimSourceKind }> = [
  { name: 'TLDR Tech', feed_url: 'https://tldr.tech/api/rss/tech', kind: 'rss' },
  { name: 'Hacker News front page', feed_url: 'https://hnrss.org/frontpage', kind: 'hackernews' },
  { name: 'r/MachineLearning', feed_url: 'https://www.reddit.com/r/MachineLearning/.rss', kind: 'reddit' },
  { name: 'r/LocalLLaMA', feed_url: 'https://www.reddit.com/r/LocalLLaMA/.rss', kind: 'reddit' },
]

export default function SkimSourcesPage() {
  const { toast } = useToast()
  const { data: sources = [], isLoading } = useSkimSources()
  const createSource = useCreateSkimSource()
  const updateSource = useUpdateSkimSource()
  const deleteSource = useDeleteSkimSource()
  const refresh = useRefreshSkimSources()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const validate = (f: FormState): Partial<Record<keyof FormState, string>> => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!f.name.trim()) e.name = 'Source name is required'
    else if (f.name.length > 120) e.name = 'Source name must be 120 characters or fewer'
    if (!f.feed_url.trim()) e.feed_url = 'Feed URL is required'
    else {
      try {
        const u = new URL(f.feed_url.trim())
        if (!/^https?:$/i.test(u.protocol)) e.feed_url = 'URL must start with http:// or https://'
      } catch {
        e.feed_url = 'That doesn’t look like a valid URL'
      }
    }
    return e
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleSave = () => {
    const fieldErrors = validate(form)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    createSource.mutate(
      { name: form.name.trim(), feed_url: form.feed_url.trim(), kind: form.kind },
      {
        onSuccess: () => {
          setDialogOpen(false)
          toast({ title: 'Source added', description: 'Hit Refresh to pull articles from it.' })
        },
        onError: (err) => {
          toast({
            variant: 'destructive',
            title: 'Could not add source',
            description: err instanceof Error ? err.message : 'Unknown error',
          })
        },
      },
    )
  }

  const handleQuickAdd = async (s: (typeof STARTER_SOURCES)[number]) => {
    try {
      await createSource.mutateAsync(s)
      toast({ title: `${s.name} added` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({
        variant: 'destructive',
        title: `Could not add ${s.name}`,
        description: message,
      })
    }
  }

  const handleRefresh = async () => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-medium">Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">RSS feeds Skim pulls articles from.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refresh.isPending || sources.length === 0}>
            {refresh.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh all
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add source
          </Button>
        </div>
      </div>

      {/* Quick-add starter sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" /> Starter pack
          </CardTitle>
          <CardDescription>Add a popular feed in one click.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STARTER_SOURCES.map((s) => {
              const exists = sources.some((existing) => existing.feed_url === s.feed_url)
              return (
                <Button key={s.feed_url} variant="outline" size="sm" disabled={exists} onClick={() => handleQuickAdd(s)}>
                  {exists ? '✓ ' : '+ '}
                  {s.name}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sources list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your sources</CardTitle>
          <CardDescription>
            {sources.length} {sources.length === 1 ? 'source' : 'sources'} subscribed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Rss className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sources yet — add one above to start the firehose.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <Rss className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{source.name}</p>
                      <Badge variant="secondary" className="text-xs">{source.kind}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{source.feed_url}</p>
                    {source.last_polled_at && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        Last polled {new Date(source.last_polled_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={(enabled) => updateSource.mutate({ id: source.id, enabled })}
                    aria-label={`Enable ${source.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${source.name}"? Articles already saved will stay.`)) {
                        deleteSource.mutate(source.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add-source dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add a source</DialogTitle>
          <DialogDescription>Paste an RSS feed URL. Skim will pull new articles when you hit Refresh.</DialogDescription>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-name">Name</Label>
              <Input
                id="source-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. TLDR Tech"
                maxLength={120}
                className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-url">Feed URL</Label>
              <Input
                id="source-url"
                value={form.feed_url}
                onChange={(e) => updateField('feed_url', e.target.value)}
                placeholder="https://..."
                maxLength={2048}
                className={cn(errors.feed_url && 'border-red-500 focus-visible:ring-red-500')}
              />
              {errors.feed_url && <p className="text-xs text-red-500">{errors.feed_url}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-kind">Kind</Label>
              <Select value={form.kind} onValueChange={(v: SkimSourceKind) => updateField('kind', v)}>
                <SelectTrigger id="source-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rss">RSS / Atom feed</SelectItem>
                  <SelectItem value="hackernews">Hacker News</SelectItem>
                  <SelectItem value="reddit">Reddit subreddit</SelectItem>
                  <SelectItem value="googlenews">Google News query</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createSource.isPending}>
                {createSource.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
