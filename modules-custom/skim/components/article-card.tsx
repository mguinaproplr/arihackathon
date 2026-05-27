// Skim — single article card in the feed.
//
// Heroes: the ⚡ skim title and the ARI Inspiration callout with a
// "Build this module" CTA.

'use client'

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bookmark, Sparkles, Wrench, Zap, AlertCircle, Loader2 } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { PILLAR_LABELS, PILLAR_CLASSES, type SkimArticle } from '@/modules/skim/types'
import { stripInspirationPrefix } from '@/modules/skim/lib/format'

interface ArticleCardProps {
  article: SkimArticle
  onOpen: () => void
  onBuildModule: () => void
}

function ArticleCardImpl({ article, onOpen, onBuildModule }: ArticleCardProps) {
  if (article.status === 'failed') return <FailedArticleCard article={article} onOpen={onOpen} />
  if (article.status === 'processing' || article.status === 'pending') {
    return <ProcessingArticleCard article={article} />
  }

  const pillar = article.pillar ?? 'other'

  return (
    <div
      onClick={onOpen}
      className="group p-4 bg-card border border-border rounded-lg hover:border-foreground/20 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge variant="outline" className={cn('text-xs', PILLAR_CLASSES[pillar])}>
          {PILLAR_LABELS[pillar]}
        </Badge>
        {article.source_name && <span className="text-xs text-muted-foreground">{article.source_name}</span>}
        <span className="text-xs text-muted-foreground/60">·</span>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(new Date(article.created_at))}</span>
        {article.is_saved && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500 ml-auto" />}
      </div>

      <h3 className="text-base font-semibold mb-1 flex items-start gap-1.5 leading-tight group-hover:text-foreground/80">
        <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <span>{article.skim_title || article.original_title || 'Untitled'}</span>
      </h3>
      {article.the_news && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">{article.the_news}</p>}

      {article.ari_inspiration && (
        <div className="rounded-md bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/40 dark:to-blue-950/40 border border-purple-200/60 dark:border-purple-800/60 p-3 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-purple-700 dark:text-purple-300 font-medium mb-0.5">ARI Inspiration</p>
            <p className="text-sm leading-snug">
              {article.suggested_module_name ? (
                <>
                  Build a <strong>{article.suggested_module_name}</strong> module — {stripInspirationPrefix(article.ari_inspiration, article.suggested_module_name)}
                </>
              ) : (
                article.ari_inspiration
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="default"
            className="flex-shrink-0 h-7 px-2.5"
            onClick={(e) => {
              e.stopPropagation()
              onBuildModule()
            }}
          >
            <Wrench className="w-3 h-3 mr-1" /> Build this
          </Button>
        </div>
      )}

      {article.tags.length > 0 && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {article.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function FailedArticleCard({ article, onOpen }: { article: SkimArticle; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="p-4 bg-card border border-red-200 dark:border-red-900/60 rounded-lg cursor-pointer hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-xs font-medium text-red-600 dark:text-red-400">Pipeline failed</span>
        <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(new Date(article.created_at))}</span>
      </div>
      <p className="text-sm font-medium mb-1 truncate">{article.original_title || article.url}</p>
      {article.error_message && (
        <p className="text-xs text-muted-foreground line-clamp-2">{article.error_message}</p>
      )}
    </div>
  )
}

function ProcessingArticleCard({ article }: { article: SkimArticle }) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg flex items-center gap-3">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{article.original_title || article.url}</p>
        <p className="text-xs text-muted-foreground">Agents are working…</p>
      </div>
    </div>
  )
}

// Re-render only when the article shape or callbacks actually change. The
// feed parent re-renders on every keystroke / filter change; without memo,
// 100 visible cards would each re-render unnecessarily.
export const ArticleCard = memo(ArticleCardImpl)
