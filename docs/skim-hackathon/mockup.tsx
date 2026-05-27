// Skim — Claude-artifact paste-ready mockup.
//
// HOW TO USE:
// 1. Open claude.ai → new chat
// 2. Say "Create a React artifact from this code"
// 3. Paste this file. The artifact renders the live mockup with working
//    filters, search, paste-URL animation, and the "Build this module" CTA.

import { useState } from 'react';
import { Newspaper, Sparkles, Search, Plus, RefreshCw, X, ArrowRight, Check, Wrench, ExternalLink, Bookmark, Zap } from 'lucide-react';

const PILLARS = ['All', 'AI & LLMs', 'Automation', 'Productivity', 'No-Code AI'] as const;

const PILLAR_STYLES: Record<string, string> = {
  'AI & LLMs': 'bg-purple-100 text-purple-700 border-purple-200',
  'Automation': 'bg-blue-100 text-blue-700 border-blue-200',
  'Productivity': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'No-Code AI': 'bg-amber-100 text-amber-700 border-amber-200',
};

const AGENT_STEPS = [
  'Extracting article text',
  'News Distiller: writing headline + summary',
  'Builder-Angle Agent: why it matters',
  'ARI Spark Agent: generating module idea',
  'Pillar classifier + tagger',
];

type Article = {
  id: string;
  skimTitle: string;
  source: string;
  pillar: keyof typeof PILLAR_STYLES;
  tags: string[];
  theNews: string;
  whyItMatters: string;
  ariInspiration: string;
  suggestedModule: string;
  publishedAt: string;
  isSaved: boolean;
};

const ARTICLES: Article[] = [
  {
    id: '1',
    skimTitle: '1M-Token Claude Lands — Whole-Codebase Reasoning in One Shot',
    source: 'TechCrunch',
    pillar: 'AI & LLMs',
    tags: ['Anthropic', 'long-context', 'agents'],
    theNews: 'Anthropic released Claude Opus 4.7 with a 1M-token context window and a formal Agent SDK aimed at enterprise coding and multi-step workflows.',
    whyItMatters: 'You can now feed an entire small-to-medium codebase into a single prompt — no chunking, no retrieval hacks for most repos.',
    ariInspiration: 'Build a Codebase Auditor module in ARI that ingests your whole project weekly and outputs a security and quality review.',
    suggestedModule: 'Codebase Auditor',
    publishedAt: '2h ago',
    isSaved: true,
  },
  {
    id: '2',
    skimTitle: 'Stripe Ships Agent-Native APIs With Spend Limits',
    source: 'Stripe blog',
    pillar: 'Automation',
    tags: ['Stripe', 'AI agents', 'payments'],
    theNews: 'Stripe launched a new API surface designed for AI agents, with per-call spending limits, capability scoping, and audit logs baked in.',
    whyItMatters: 'Agents can finally transact on your behalf without exposing full account access — the missing piece for safe agent-commerce.',
    ariInspiration: 'Build a Subscription Watcher module in ARI that uses Stripe agent APIs to auto-cancel duplicate or unused subscriptions on a monthly budget.',
    suggestedModule: 'Subscription Watcher',
    publishedAt: '5h ago',
    isSaved: false,
  },
  {
    id: '3',
    skimTitle: 'Open-Source 70B Beats Llama 3 — Trained 100% on Synthetic Data',
    source: 'Hacker News',
    pillar: 'AI & LLMs',
    tags: ['open-source', 'synthetic-data', 'training'],
    theNews: 'A research group released a 70B open-weights model trained entirely on synthetic data, within 2 points of Llama 3.1 70B on standard benchmarks.',
    whyItMatters: 'You can fine-tune capable models without scraping or licensing real data — the data bottleneck for niche use cases just collapsed.',
    ariInspiration: 'Build a Synthetic Data Lab module in ARI that helps you generate, label, and export training data for your own niche tasks.',
    suggestedModule: 'Synthetic Data Lab',
    publishedAt: 'yesterday',
    isSaved: false,
  },
  {
    id: '4',
    skimTitle: 'n8n Crosses 100k Stars — Open-Source Zapier Eats Lunch',
    source: 'r/selfhosted',
    pillar: 'Automation',
    tags: ['n8n', 'self-hosted', 'workflows'],
    theNews: 'Self-hosted workflow tool n8n hit 100k GitHub stars on the back of native LLM nodes for Claude, GPT, and Llama models.',
    whyItMatters: 'Self-hosted automation now has feature parity with paid SaaS — without per-step pricing or vendor lock-in.',
    ariInspiration: 'Build an n8n Bridge module in ARI that fires any n8n workflow from inside ARI — turn any article, task, or note into an automation trigger.',
    suggestedModule: 'n8n Bridge',
    publishedAt: 'yesterday',
    isSaved: true,
  },
  {
    id: '5',
    skimTitle: 'Voice-First Note Apps Are Quietly Eating Notion',
    source: 'TLDR',
    pillar: 'Productivity',
    tags: ['voice', 'second-brain', 'Whisper'],
    theNews: 'A new wave of voice-first capture apps (Granola, Wispr Flow, Voicenotes) use Whisper + GPT to transcribe and structure thoughts in real time.',
    whyItMatters: 'The friction of writing things down is collapsing — your second brain can now grow while you walk, drive, or pace.',
    ariInspiration: 'Build a Voice Capture module in ARI that turns daily voice notes into journal entries and auto-extracts action items into tasks.',
    suggestedModule: 'Voice Capture',
    publishedAt: '3 days ago',
    isSaved: false,
  },
  {
    id: '6',
    skimTitle: 'Indie Hacker Built a Full CRM in 4 Hours With Claude Code',
    source: 'Indie Hackers',
    pillar: 'No-Code AI',
    tags: ['Claude Code', 'CRM', 'speed-build'],
    theNews: 'An indie builder shipped a working CRM with auth, billing, and email in under 4 hours using Claude Code, posting the full session as a video.',
    whyItMatters: 'AI coding assistants have crossed the threshold where one person can ship production software in an afternoon — the build-to-ship loop is now hours, not weeks.',
    ariInspiration: 'Build a Speedrun Tracker module in ARI that logs how long each of your custom modules took to ship — gamify your own builder velocity.',
    suggestedModule: 'Speedrun Tracker',
    publishedAt: '4 days ago',
    isSaved: false,
  },
];

export default function Skim() {
  const [activePillar, setActivePillar] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [processingStep, setProcessingStep] = useState<number>(-1);

  const filtered = ARTICLES.filter(
    (a) =>
      (activePillar === 'All' || a.pillar === activePillar) &&
      (!search ||
        a.skimTitle.toLowerCase().includes(search.toLowerCase()) ||
        a.theNews.toLowerCase().includes(search.toLowerCase()) ||
        a.ariInspiration.toLowerCase().includes(search.toLowerCase())),
  );

  const selected = ARTICLES.find((a) => a.id === selectedId);

  const handlePaste = () => {
    if (!pasteUrl) return;
    setProcessingStep(0);
    AGENT_STEPS.forEach((_, i) => setTimeout(() => setProcessingStep(i + 1), (i + 1) * 750));
    setTimeout(() => {
      setProcessingStep(-1);
      setPasteUrl('');
      setPasteOpen(false);
    }, AGENT_STEPS.length * 750 + 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Skim</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Tech news, turned into ARI modules</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh sources
            </button>
            <button
              onClick={() => setPasteOpen(true)}
              className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Paste URL
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search news + module ideas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {PILLARS.map((p) => (
              <button
                key={p}
                onClick={() => setActivePillar(p)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap border transition-colors ${
                  activePillar === p
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">No articles match those filters.</div>
        )}
        {filtered.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedId(article.id)}
            className="group p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${PILLAR_STYLES[article.pillar]}`}>{article.pillar}</span>
              <span className="text-xs text-slate-500">{article.source}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">{article.publishedAt}</span>
              {article.isSaved && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500 ml-auto" />}
            </div>
            <h3 className="text-base font-semibold mb-1 flex items-start gap-1.5 group-hover:text-slate-700">
              <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>{article.skimTitle}</span>
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-3">{article.theNews}</p>

            <div className="rounded-md bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-purple-700 font-medium mb-0.5">ARI Inspiration</p>
                <p className="text-sm text-slate-700 leading-snug">
                  Build a <strong>{article.suggestedModule}</strong> module — {article.ariInspiration.replace(new RegExp(`^Build a ${article.suggestedModule} module in ARI that\\s+`, 'i'), '')}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Opening /ari-create-module pre-filled with: ${article.suggestedModule}`);
                }}
                className="text-xs px-2.5 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center gap-1 flex-shrink-0"
              >
                <Wrench className="w-3 h-3" /> Build this
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {article.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-slate-500">#{tag}</span>
              ))}
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {pasteOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4"
          onClick={() => processingStep === -1 && setPasteOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Skim a new article</h2>
            </div>

            {processingStep === -1 ? (
              <>
                <p className="text-sm text-slate-500 mb-3">Paste any article URL — a team of AI agents will summarize it for you.</p>
                <input
                  type="text"
                  placeholder="https://..."
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 mb-3"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setPasteOpen(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">
                    Cancel
                  </button>
                  <button
                    onClick={handlePaste}
                    disabled={!pasteUrl}
                    className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                  >
                    Skim it
                  </button>
                </div>
              </>
            ) : (
              <div className="py-2">
                <p className="text-sm text-slate-500 mb-4">Running the agent pipeline…</p>
                <ol className="space-y-2">
                  {AGENT_STEPS.map((label, i) => {
                    const done = processingStep > i;
                    const active = processingStep === i;
                    return (
                      <li
                        key={label}
                        className={`flex items-center gap-2 text-sm transition-colors ${
                          done ? 'text-emerald-600' : active ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            done ? 'bg-emerald-100' : active ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-100'
                          }`}
                        >
                          {done ? <Check className="w-3 h-3" /> : i + 1}
                        </span>
                        {label}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-20 bg-black/40 flex justify-end" onClick={() => setSelectedId(null)}>
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PILLAR_STYLES[selected.pillar]}`}>{selected.pillar}</span>
                <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-2xl font-semibold mb-2 leading-tight flex items-start gap-2">
                <Zap className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                <span>{selected.skimTitle}</span>
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <span>{selected.source}</span>
                <span>·</span>
                <span>{selected.publishedAt}</span>
              </div>

              <div className="mb-5">
                <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">The News</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selected.theNews}</p>
              </div>

              <div className="mb-5">
                <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Why It Matters to a Builder</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selected.whyItMatters}</p>
              </div>

              <div className="mb-6 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 p-4">
                <h3 className="text-xs uppercase tracking-wide text-purple-700 font-medium mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> ARI Inspiration
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed mb-3">
                  <em>Idea: Build a custom <strong>{selected.suggestedModule}</strong> module in ARI that {selected.ariInspiration.split('that ')[1] || selected.ariInspiration}</em>
                </p>
                <button
                  onClick={() => alert(`Opening /ari-create-module pre-filled with: ${selected.suggestedModule}`)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-4 h-4" /> Build this module in ARI
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">#{tag}</span>
                  ))}
                </div>
              </div>

              <a href="#" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                Open original source <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
