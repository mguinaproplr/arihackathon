// Skim — the wow-moment dialog. URL paste + the animated 5-step agent pipeline.
//
// Animation runs in parallel with the actual API call. If the API resolves
// before the animation finishes, we fast-forward; if the animation gets
// ahead, we hold on the last step until the response lands.

'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const AGENT_STEPS = [
  'Fetching article',
  'News Distiller: writing headline + summary',
  'Builder-Angle Agent: why it matters',
  'ARI Spark Agent: generating module idea',
  'Pillar Classifier + Tagger',
] as const

const STEP_INTERVAL_MS = 1400

interface AgentPipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (url: string) => Promise<void>
}

export function AgentPipelineDialog({ open, onOpenChange, onSubmit }: AgentPipelineDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!open) {
      setUrl('')
      setError(null)
      setProcessing(false)
      setCurrentStep(0)
      clearTimers()
    }
  }, [open])

  // Belt-and-braces cleanup on unmount in case the parent yanks us mid-flow.
  useEffect(() => () => clearTimers(), [])

  const validate = (value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) return 'Paste a URL first'
    try {
      const parsed = new URL(trimmed)
      if (!/^https?:$/i.test(parsed.protocol)) return 'URL must start with http:// or https://'
    } catch {
      return 'That doesn’t look like a valid URL'
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validate(url)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setProcessing(true)
    setCurrentStep(0)

    intervalRef.current = setInterval(() => {
      setCurrentStep((s) => (s < AGENT_STEPS.length - 1 ? s + 1 : s))
    }, STEP_INTERVAL_MS)

    try {
      await onSubmit(url.trim())
      // Fast-forward animation if API beat it.
      clearTimers()
      setCurrentStep(AGENT_STEPS.length)
      closeTimerRef.current = setTimeout(() => onOpenChange(false), 500)
    } catch (err) {
      clearTimers()
      setProcessing(false)
      setCurrentStep(0)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !processing && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        {processing ? (
          <>
            <VisuallyHidden>
              <DialogTitle>Running the Skim agent pipeline</DialogTitle>
              <DialogDescription>A team of AI agents is processing your article.</DialogDescription>
            </VisuallyHidden>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-semibold">Running the agent team…</h3>
                  <p className="text-xs text-muted-foreground">5 focused agents, one job each.</p>
                </div>
              </div>
              <ol className="space-y-2.5">
                {AGENT_STEPS.map((label, i) => {
                  const done = currentStep > i
                  const active = currentStep === i
                  return (
                    <li
                      key={label}
                      className={cn(
                        'flex items-center gap-2.5 text-sm transition-colors',
                        done && 'text-emerald-600',
                        active && 'text-foreground',
                        !done && !active && 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                          done && 'bg-emerald-100 dark:bg-emerald-950',
                          active && 'bg-foreground text-background',
                          !done && !active && 'bg-muted',
                        )}
                      >
                        {done ? <Check className="w-3 h-3" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : i + 1}
                      </span>
                      <span className="leading-tight">{label}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <DialogTitle>Skim a new article</DialogTitle>
            </div>
            <DialogDescription>
              Paste any article URL. A team of AI agents will distill it — and finish with a module idea you can ship inside ARI.
            </DialogDescription>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (error) setError(null)
                  }}
                  maxLength={2048}
                  autoFocus
                  className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Skim it</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
