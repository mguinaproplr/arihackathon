// Skim — settings panel shown in /settings → Features when Skim is enabled.

'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSkimSettings, useUpdateSkimSettings } from '../hooks/use-skim'
import type { SkimSettings } from '../types'
import { DEFAULT_SKIM_MODEL } from '../lib/constants'

export function SkimSettingsPanel() {
  const { toast } = useToast()
  const { data: settings, isLoading } = useSkimSettings()
  const updateSettings = useUpdateSkimSettings()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  const model = settings?.aiModel ?? DEFAULT_SKIM_MODEL

  const handleModelChange = (value: SkimSettings['aiModel']) => {
    updateSettings.mutate(
      { aiModel: value },
      {
        onSuccess: () => toast({ title: 'Model preference saved' }),
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: 'Could not save',
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
      },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Skim</h3>
        <p className="text-sm text-muted-foreground">An AI agent team that turns tech news into ARI module ideas.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skim-model">AI model</Label>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger id="skim-model" className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o-mini">gpt-4o-mini (recommended)</SelectItem>
            <SelectItem value="gpt-4o">gpt-4o</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Used by every agent. Requires <code className="px-1 py-0.5 rounded bg-muted text-xs">OPENAI_API_KEY</code>.
        </p>
      </div>

      <Button variant="outline" onClick={() => (window.location.href = '/skim')}>
        Open Skim <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
      </Button>
    </div>
  )
}
