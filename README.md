# Skim — an ARI hackathon module

**Skim turns tech news into ARI modules.** A team of AI agents reads emerging tech as a builder would, and finishes every article with a specific, named module idea you can ship in minutes.

Paste a URL or subscribe an RSS feed → 5 specialized agents (Extractor → News Distiller → Builder-Angle → ARI Spark → Pillar/Tagger) produce a structured card: **⚡ Title**, **The News**, **Why It Matters to a Builder**, and an **ARI Inspiration** — a named module idea grounded in the article. One click drops the suggestion into ARI's `/ari-create-module` skill, pre-filled.

## What's in this repo

```
modules-custom/skim/         # The full ARI custom module (drop-in)
  ├── module.json            # Manifest (registers routes, schema, widgets)
  ├── database/schema.sql    # Idempotent schema for skim_sources + skim_articles
  ├── lib/agents.ts          # The 5-agent OpenAI pipeline
  ├── api/                   # sources, articles, settings routes (RLS + Zod)
  ├── app/                   # /skim feed, /skim/sources, /skim/settings pages
  ├── components/            # cards, drawer, agent pipeline animation, widget
  └── hooks/use-skim.ts      # TanStack Query hooks

docs/skim-hackathon/
  ├── pitch.md               # One-line, pitch, demo script, Q&A talking points
  ├── architecture.md        # Pipeline diagram + file map + tech stack
  └── mockup.tsx             # Claude artifact UX mockup
```

## Install into an existing ARI instance

ARI's module system auto-loads anything in `modules-custom/`. To try Skim:

```bash
# from your ARI checkout
cp -R /path/to/this-repo/modules-custom/skim modules-custom/skim
pnpm add rss-parser@^3.13.0      # or visit /modules in ARI and re-install
./ari start
```

Then enable Skim from `/modules` and set your OpenAI key in `/settings`. The schema auto-applies on first boot (idempotent SQL).

## Tech stack

Next.js 16 · React 19 · Drizzle ORM (with `withRLS()`) · Better Auth · OpenAI `gpt-4o-mini` (direct `fetch`, no SDK) · TanStack Query · rss-parser · shadcn/ui + Tailwind.

See [docs/skim-hackathon/architecture.md](docs/skim-hackathon/architecture.md) for the full pipeline diagram and [docs/skim-hackathon/pitch.md](docs/skim-hackathon/pitch.md) for the demo script.
