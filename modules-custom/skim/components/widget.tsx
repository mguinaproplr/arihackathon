// Skim — dashboard widget. Shows the latest 3 ready articles with a focus on
// each one's "ARI Inspiration" line — the loop into custom-module building.

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Newspaper, Loader2, AlertCircle, Sparkles, Zap } from 'lucide-react'
import { useSkimArticles } from '../hooks/use-skim'

export default function SkimWidget() {
  const { data: articles = [], isLoading, isError, refetch } = useSkimArticles({ status: 'ready', limit: 3 })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Newspaper className="w-4 h-4" />
          Skim — latest
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => (window.location.href = '/skim')}>
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" /> Couldn’t load.
            <button onClick={() => refetch()} className="underline ml-1">
              Retry
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-xs text-muted-foreground">No articles yet.</p>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = '/skim')}>
              Open Skim
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <div key={a.id} className="space-y-1.5 pb-3 last:pb-0 last:border-none border-b border-border/50">
                <p className="text-sm font-medium leading-snug flex items-start gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{a.skim_title || a.original_title}</span>
                </p>
                {a.suggested_module_name && a.ari_inspiration && (
                  <div className="text-xs flex items-start gap-1 text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">
                      <strong className="text-foreground">{a.suggested_module_name}</strong> — {a.ari_inspiration.replace(new RegExp(`^Build a ${a.suggested_module_name} module in ARI that\\s+`, 'i'), '')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
