# Skim — architecture

A team of AI agents reads emerging tech news as a builder would — and finishes every article with a specific, named **ARI module idea** the user can ship today. The "Build this module" CTA closes the loop into ARI's `/ari-create-module` skill.

## Pipeline diagram

```mermaid
flowchart LR
    subgraph Ingest["INGEST"]
      A1[User pastes URL]
      A2[RSS sources<br/>TLDR · HN · Reddit · company blogs]
    end

    A1 --> B[Fetch + Extract<br/>HTML → clean text]
    A2 --> B

    subgraph Pipeline["AI AGENT TEAM — OpenAI"]
      B --> C[News Distiller<br/>⚡ catchy title + The News]
      C --> D[Builder-Angle Agent<br/>Why It Matters to a Builder]
      D --> E[ARI Spark Agent<br/>Idea: Build a custom [Module] in ARI…]
      E --> F[Pillar Classifier<br/>AI · Automation · Productivity · No-Code AI]
      F --> G[Tagger<br/>free-form tags]
    end

    G --> H[(Postgres<br/>skim_articles<br/>RLS · per-user)]
    H --> I[Skim feed<br/>pillar filters · search · group by date]
    I --> J[Article drawer<br/>The News · Why · Spark]
    J --> K{{Build this module}}
    K -.->|opens /ari-create-module<br/>prefilled with the Spark| L[ARI module creator]

    classDef agent fill:#fef3c7,stroke:#f59e0b
    classDef hero fill:#ddd6fe,stroke:#7c3aed,stroke-width:2px
    classDef db fill:#dbeafe,stroke:#3b82f6
    class C,D,E,F,G agent
    class K hero
    class H db
```

## Why a *team* of agents

Each agent does one job with one prompt:

1. **News Distiller** — punchy ⚡ title + 1–2-sentence summary
2. **Builder-Angle Agent** — single sentence on capability change
3. **ARI Spark Agent** — invents a named ARI module grounded in the article (the differentiator)
4. **Pillar Classifier + Tagger** — categorizes into ARI's four pillars + free-form tags

Specialization = sharper output than any single-shot prompt. The output schema is the same shape every time, which is what makes the UI possible.

## Files

| Layer | Path |
|---|---|
| Module manifest | `modules-custom/skim/module.json` |
| Database schema (idempotent) | `modules-custom/skim/database/schema.sql` |
| Drizzle ORM tables | `modules-custom/skim/database/schema.ts` |
| Agent pipeline (5 OpenAI calls) | `modules-custom/skim/lib/agents.ts` |
| RSS parser | `modules-custom/skim/lib/rss.ts` |
| API routes | `modules-custom/skim/api/{sources,articles,ingest,settings}/` |
| Feed UI | `modules-custom/skim/app/page.tsx` |
| Article card + drawer + animation | `modules-custom/skim/components/` |
| TanStack Query hooks | `modules-custom/skim/hooks/use-skim.ts` |

## Tech stack

- **Next.js 16** + React 19 + TypeScript
- **Drizzle ORM** with per-user RLS via `withRLS()`
- **Better Auth** session cookies (no Authorization header needed)
- **OpenAI** (`gpt-4o-mini` default, `gpt-4o` opt-in) — direct `fetch` to `/v1/chat/completions`, no SDK
- **TanStack Query** for caching, optimistic updates
- **rss-parser** for feed ingestion
- **shadcn/ui** components, Tailwind CSS
