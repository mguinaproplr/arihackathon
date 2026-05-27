-- Skim module schema
-- AI-powered tech-news digest. Each article runs through a team of AI agents
-- that produce a ⚡ catchy title, "The News", "Why It Matters to a Builder",
-- and an actionable ARI module idea ("ARI Spark").
--
-- Idempotent: safe to run on every module enable.
-- Mirrors modules-custom/skim/database/schema.ts.

-- ─── Sources (RSS feeds the user subscribes to) ─────────────────────────
CREATE TABLE IF NOT EXISTS skim_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'rss',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skim_sources_kind_check CHECK (kind IN ('rss', 'reddit', 'hackernews', 'googlenews', 'other')),
  CONSTRAINT skim_sources_user_feed_unique UNIQUE (user_id, feed_url)
);

CREATE INDEX IF NOT EXISTS idx_skim_sources_user_id ON skim_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_skim_sources_user_enabled ON skim_sources(user_id, enabled);

ALTER TABLE skim_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skim_sources_rls_select ON skim_sources;
CREATE POLICY skim_sources_rls_select ON skim_sources FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS skim_sources_rls_insert ON skim_sources;
CREATE POLICY skim_sources_rls_insert ON skim_sources FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS skim_sources_rls_update ON skim_sources;
CREATE POLICY skim_sources_rls_update ON skim_sources FOR UPDATE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS skim_sources_rls_delete ON skim_sources;
CREATE POLICY skim_sources_rls_delete ON skim_sources FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

-- ─── Articles (one row per ingested URL, with the agent breakdown) ──────
CREATE TABLE IF NOT EXISTS skim_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_id UUID REFERENCES skim_sources(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  original_title TEXT,
  skim_title TEXT,
  source_name TEXT,
  the_news TEXT,
  why_it_matters TEXT,
  ari_inspiration TEXT,
  suggested_module_name TEXT,
  pillar TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  has_built_module BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skim_articles_status_check CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  CONSTRAINT skim_articles_pillar_check CHECK (pillar IS NULL OR pillar IN ('ai-llms', 'automation', 'productivity', 'nocode-ai', 'other')),
  CONSTRAINT skim_articles_user_url_unique UNIQUE (user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_skim_articles_user_id ON skim_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_skim_articles_user_created ON skim_articles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skim_articles_user_status ON skim_articles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_skim_articles_user_pillar ON skim_articles(user_id, pillar);
CREATE INDEX IF NOT EXISTS idx_skim_articles_source_id ON skim_articles(source_id);

ALTER TABLE skim_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skim_articles_rls_select ON skim_articles;
CREATE POLICY skim_articles_rls_select ON skim_articles FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS skim_articles_rls_insert ON skim_articles;
CREATE POLICY skim_articles_rls_insert ON skim_articles FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS skim_articles_rls_update ON skim_articles;
CREATE POLICY skim_articles_rls_update ON skim_articles FOR UPDATE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS skim_articles_rls_delete ON skim_articles;
CREATE POLICY skim_articles_rls_delete ON skim_articles FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));
