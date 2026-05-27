// Skim — RSS feed parsing.
//
// Server-only. Used by /api/modules/skim/sources/refresh to pull new items
// from the user's subscribed feeds. Uses rss-parser (declared in module.json
// npmDependencies). Imported dynamically so a missing dependency throws a
// clear error at runtime rather than failing the whole build.

export interface FeedItem {
  title: string
  link: string
  pub_date?: string
  source_name: string
}

const PARSE_TIMEOUT_MS = 10000

export async function parseFeed(feedUrl: string): Promise<{ source_name: string; items: FeedItem[] }> {
  let ParserCtor: new (opts?: { timeout?: number }) => {
    parseURL: (url: string) => Promise<{ title?: string; items?: Array<{ title?: string; link?: string; pubDate?: string; isoDate?: string }> }>
  }
  try {
    // rss-parser is declared in module.json `npmDependencies` and `pnpm add`'d
    // automatically when the user enables Skim from /modules. Before that
    // happens, TS has no types and the import would static-error — we
    // suppress that here and the runtime catch handles a genuinely missing
    // package by surfacing a clear setup message.
    // @ts-ignore -- runtime-only dependency installed on module enable
    const mod = (await import('rss-parser')) as { default: typeof ParserCtor }
    ParserCtor = mod.default
  } catch {
    throw new Error('rss-parser is not installed. Re-enable the Skim module from /modules so its npmDependencies install, or run pnpm add rss-parser manually.')
  }

  const parser = new ParserCtor({ timeout: PARSE_TIMEOUT_MS })

  let feed
  try {
    feed = await parser.parseURL(feedUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse feed'
    throw new Error(`Could not parse RSS feed: ${message}`)
  }

  let host = feedUrl
  try {
    host = new URL(feedUrl).hostname
  } catch {
    // keep raw feedUrl if it doesn't parse — should not happen since the API
    // validates http(s) URLs upstream, but be defensive.
  }

  const source_name = (feed.title || host).trim()

  const items: FeedItem[] = (feed.items || [])
    .map((item) => ({
      title: (item.title || 'Untitled').trim(),
      link: (item.link || '').trim(),
      pub_date: item.isoDate || item.pubDate,
      source_name,
    }))
    .filter((i) => i.link.startsWith('http'))

  return { source_name, items }
}
