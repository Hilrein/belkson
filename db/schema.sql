-- Belkson catalog schema for Neon (PostgreSQL)
-- Run in Neon SQL Editor, or: npm run db:migrate

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  sku         TEXT NOT NULL UNIQUE,
  price_rub   INTEGER NOT NULL CHECK (price_rub >= 0),
  category    TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '—',
  brand       TEXT NOT NULL DEFAULT '',
  stock       INTEGER NOT NULL DEFAULT 10 CHECK (stock >= 0),
  sizes       JSONB NOT NULL DEFAULT '[]'::jsonb,
  images      JSONB NOT NULL DEFAULT '[]'::jsonb,
  status      TEXT NOT NULL DEFAULT 'В наличии'
                CHECK (status IN ('В наличии', 'Мало', 'Нет в наличии')),
  image       TEXT NOT NULL,
  is_new      BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  badge       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO site_settings (key, value)
VALUES ('currency', 'RUB')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_is_new ON products (is_new);
CREATE INDEX IF NOT EXISTS idx_products_is_favorite ON products (is_favorite);

-- Showcase (Новинки/Любимчики) — частичные индексы для быстрых витринных запросов
CREATE INDEX IF NOT EXISTS idx_products_is_new_active ON products (id DESC) WHERE is_new = true AND status <> 'Нет в наличии';
CREATE INDEX IF NOT EXISTS idx_products_is_favorite_active ON products (id DESC) WHERE is_favorite = true AND status <> 'Нет в наличии';

-- Cached external Next catalogue. This is intentionally separate from the
-- manually managed `products` catalogue above.
CREATE TABLE IF NOT EXISTS next_catalog_products (
  id                  BIGSERIAL PRIMARY KEY,
  region              TEXT NOT NULL,
  sku                 TEXT NOT NULL,
  title               TEXT NOT NULL,
  brand               TEXT NOT NULL DEFAULT 'next',
  category            TEXT NOT NULL,
  original_price      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency_symbol     TEXT NOT NULL DEFAULT '',
  price_rub           INTEGER NOT NULL CHECK (price_rub >= 0),
  description         TEXT NOT NULL DEFAULT '',
  original_url        TEXT NOT NULL DEFAULT '',
  images              JSONB NOT NULL DEFAULT '[]'::jsonb,
  sizes               JSONB NOT NULL DEFAULT '[]'::jsonb,
  colors              JSONB NOT NULL DEFAULT '[]'::jsonb,
  variants            JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_new              BOOLEAN NOT NULL DEFAULT FALSE,
  is_best_seller      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  missing_syncs       INTEGER NOT NULL DEFAULT 0 CHECK (missing_syncs >= 0),
  last_seen_sync_id   BIGINT,
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region, sku)
);

CREATE INDEX IF NOT EXISTS idx_next_catalog_active_region
  ON next_catalog_products (region, is_active, category);

CREATE TABLE IF NOT EXISTS next_sync_runs (
  id                BIGSERIAL PRIMARY KEY,
  region            TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'all',
  status            TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  source_count      INTEGER NOT NULL DEFAULT 0,
  created_count     INTEGER NOT NULL DEFAULT 0,
  updated_count     INTEGER NOT NULL DEFAULT 0,
  hidden_count      INTEGER NOT NULL DEFAULT 0,
  error             TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_next_sync_runs_latest ON next_sync_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS next_sync_queue (
  id                BIGSERIAL PRIMARY KEY,
  region            TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'all',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  next_attempt_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region, category, status)
);

-- Automatic cart discounts / promotions.
-- Cart applies the best applicable discount whose threshold_rub <= subtotal.
CREATE TABLE IF NOT EXISTS discounts (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'percent'
                  CHECK (type IN ('percent', 'fixed')),
  threshold_rub INTEGER NOT NULL DEFAULT 0 CHECK (threshold_rub >= 0),
  value         NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO discounts (title, type, threshold_rub, value, is_active, sort_order)
VALUES
  ('Скидка 5% от 5 000 ₽', 'percent', 5000, 5, true, 1),
  ('Скидка 10% от 10 000 ₽', 'percent', 10000, 10, true, 2)
ON CONFLICT DO NOTHING;
