-- Belkson catalog schema for Neon (PostgreSQL)
-- Run in Neon SQL Editor, or: npm run db:migrate

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  sku         TEXT NOT NULL UNIQUE,
  price_rub   INTEGER NOT NULL CHECK (price_rub >= 0),
  category    TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '—',
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
