# Skim — hackathon pitch & demo script

## One-line

**Skim turns tech news into ARI modules.** A team of AI agents reads emerging tech as a builder would, and finishes every article with a specific, named module idea you can ship in minutes.

## Pitch

- **Problem.** Builders see emerging tech and think *"I could build something with that"* — and then never do. The gap between reading a release and shipping a module is too big.
- **Skim.** Paste any tech URL or subscribe an RSS feed. A team of AI agents distills the article into a ⚡ catchy title, The News, Why It Matters to a Builder, and an **ARI Inspiration** — a specific module idea named and grounded in the article. One click drops you into ARI's module creator with the spec pre-filled.
- **Why a team of agents, not one prompt.** Specialization. The News Distiller writes punchy headlines. The Builder-Angle Agent translates capability into builder-language. The **ARI Spark Agent** invents a named module idea grounded in the news — that's the differentiator. Specialized agents give structured, consistent output no single-shot prompt can match.
- **Why inside ARI.** Other news apps stop at "here's what happened." Skim closes the loop: news → spark → working module — without leaving the app. It's the inspiration layer for ARI's module ecosystem.

## Tagline options

- *From article to ARI module in 60 seconds.*
- *News, but for builders who ship.*
- *Stop reading. Start building.*

## Demo script (60–90s)

1. *"I'm Maria — I built Skim. It turns tech news into ARI modules."* (5s)
2. Open ARI → Skim. Feed already shows 4–5 cards, each with ⚡ headline + Spark line visible. (5s)
3. *"Every card already has a module idea attached — but watch what happens with a fresh article."* (3s)
4. **Paste URL** → modal opens → 5 agent steps animate. *"Extractor, News Distiller, Builder-Angle, ARI Spark, Pillar + Tags. About 8 seconds."* (12s)
5. New card lands at top. Click → drawer opens with **The News / Why It Matters / ARI Inspiration**. Read the Spark out loud. (15s)
6. **Click "Build this module"** → dialog opens with the exact `/ari-create-module` prompt pre-filled with the suggested module name and breakdown. Hit Copy. (10s)
7. *"That's the loop. Read at 9am, ship by lunch."* (5s)
8. *"Skim is the front door — it turns the firehose of tech news into a pipeline of specific things to build, inside the OS that already lets you build them."* (10s)

## Backup if the live demo fails

- Have **3 articles pre-ingested** before going on stage. If the live paste fails, click into a pre-ingested card and walk through the same flow without the agent animation.
- Have a **screen recording** of a successful paste handy.
- Have the **Claude artifact mockup** loaded in a tab to show what the polished UX looks like.

## Talking points for Q&A

- **Cost per article.** Five Llama 3.3 70B calls via Groq's free tier. **$0 for the demo**; if you ever paid for it, Groq's pricing makes it negligible per article.
- **What about LinkedIn / Twitter / paywalled content.** The extractor falls back gracefully and surfaces the failure. Future: paste raw text directly.
- **Why on-demand refresh, not background polling.** v1 is intentionally synchronous so the user sees the agent team work. v2 wraps in a cron + queue.
- **Security.** Standard ARI stack — Better Auth session, Drizzle `withRLS()`, RLS policies, Zod validation on every endpoint, OpenAPI-annotated routes visible in `/api-docs`.
- **What if the AI gets the module idea wrong.** The ARI Spark is a suggestion, not a contract. The user opens Claude Code, refines the prompt, ships their version.
