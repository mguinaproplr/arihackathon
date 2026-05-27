// Skim — side drawer showing the full article breakdown:
// The News / Why It Matters to a Builder / ARI Inspiration + Build CTA.

'use client'

import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bookmark, BookmarkCheck, ExternalLink, Sparkles, Wrench, Zap, Trash2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PILLAR_LABELS, PILLAR_CLASSES, type SkimArticle } from '@/modules/skim/types'

interface ArticleDrawerProps {
  article: SkimArticle | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleSaved: () => void
  onMarkBuilt: () => void
  onDelete: () => void
  onBuildModule: () => void
}

export function ArticleDrawer({
  article,
  open,
  onOpenChange,
  onToggleSaved,
  onMarkBuilt,
  onDelete,
  onBuildModule,
}: ArticleDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        {!article ? (
          <>
            <VisuallyHidden>
              <SheetTitle>Article</SheetTitle>
              <SheetDescription>No article selected</SheetDescription>
            </VisuallyHidden>
          </>
        ) : (
          <ArticleDrawerContent
            article={article}
            onToggleSaved={onToggleSaved}
            onMarkBuilt={onMarkBuilt}
            onDelete={onDelete}
            onBuildModule={onBuildModule}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function ArticleDrawerContent({
  article,
  onToggleSaved,
  onMarkBuilt,
  onDelete,
  onBuildModule,
}: Omit<ArticleDrawerProps, 'open' | 'onOpenChange' | 'article'> & { article: SkimArticle }) {
  const pillar = article.pillar ?? 'other'

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={cn(PILLAR_CLASSES[pillar])}>
          {PILLAR_LABELS[pillar]}
        </Badge>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onToggleSaved} title={article.is_saved ? 'Unsave' : 'Save'}>
            {article.is_saved ? <BookmarkCheck className="w-4 h-4 text-amber-500" /> : <Bookmark className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div>
        <SheetTitle className="text-2xl leading-tight flex items-start gap-2">
          <Zap className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
          <span>{article.skim_title || article.original_title || 'Untitled'}</span>
        </SheetTitle>
        <SheetDescription className="mt-1">
          {article.source_name && <span>{article.source_name}</span>}
          {article.source_name && article.published_at && <span> · </span>}
          {article.published_at && <span>{new Date(article.published_at).toLocaleDateString()}</span>}
        </SheetDescription>
      </div>

      {article.status === 'failed' ? (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Pipeline failed</p>
          {article.error_message && <p className="text-xs text-red-600/80 dark:text-red-400/80">{article.error_message}</p>}
        </div>
      ) : (
        <>
          {article.the_news && (
            <Section title="The News">
              <p>{article.the_news}</p>
            </Section>
          )}
          {article.why_it_matters && (
            <Section title="Why It Matters to a Builder">
              <p>{article.why_it_matters}</p>
            </Section>
          )}

          {article.ari_inspiration && (
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/40 dark:to-blue-950/40 border border-purple-200 dark:border-purple-800 p-4">
              <h3 className="text-xs uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <Sparkles className="w-3.5 h-3.5" /> ARI Inspiration
              </h3>
              <p className="text-sm leading-relaxed mb-3 italic">{article.ari_inspiration}</p>
              <div className="flex items-center gap-2">
                <Button onClick={onBuildModule} className="flex-1">
                  <Wrench className="w-4 h-4 mr-2" /> Build this module in ARI
                </Button>
                {article.has_built_module ? (
                  <Button variant="outline" disabled className="px-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={onMarkBuilt} title="Mark as built" className="px-3">
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {article.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                #{tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Open original source <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{title}</h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
