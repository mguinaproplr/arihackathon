// Skim — settings subpage (/skim/settings).

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSkimSources, useSkimArticles, useSkimSettings, useUpdateSkimSettings } from '../../hooks/use-skim'
import type { SkimSettings } from '../../types'

const DEFAULT_MODEL: SkimSettings['aiModel'] = 'gpt-4o-mini'

export default function SkimSettingsPage() {
  const { toast } = useToast()
  const { data: settings, isLoading } = useSkimSettings()
  const updateSettings = useUpdateSkimSettings()
  const { data: sources = [] } = useSkimSources()
  const { data: articles = [] } = useSkimArticles({ limit: 200 })

  const model = settings?.aiModel ?? DEFAULT_MODEL

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

  const replayOnboarding = () => {
    updateSettings.mutate(
      { onboardingCompleted: false },
      { onSuccess: () => toast({ title: 'Onboarding reset', description: 'Visit /skim to see the welcome flow again.' }) },
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl font-medium">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure how the Skim agent team works.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI model</CardTitle>
          <CardDescription>Used by every agent in the pipeline. gpt-4o-mini is fast and cheap; gpt-4o is sharper but slower.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger id="model" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini">gpt-4o-mini (recommended)</SelectItem>
              <SelectItem value="gpt-4o">gpt-4o</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Requires <code className="px-1 py-0.5 rounded bg-muted text-xs">OPENAI_API_KEY</code> in <code className="px-1 py-0.5 rounded bg-muted text-xs">.env.local</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Skim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-medium">{sources.length}</div>
              <p className="text-xs text-muted-foreground">{sources.length === 1 ? 'source' : 'sources'}</p>
            </div>
            <div>
              <div className="text-2xl font-medium">{articles.length}</div>
              <p className="text-xs text-muted-foreground">articles</p>
            </div>
            <div>
              <div className="text-2xl font-medium">{articles.filter((a) => a.has_built_module).length}</div>
              <p className="text-xs text-muted-foreground">modules sparked</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding</CardTitle>
          <CardDescription>Show the welcome screen the next time you open Skim.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={replayOnboarding} disabled={updateSettings.isPending}>
            <RotateCcw className="w-4 h-4 mr-2" /> Replay onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
