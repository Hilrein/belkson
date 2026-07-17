/**
 * Full Belkson Hono API (single module for Vercel packaging).
 * Used by: api/index.ts (Vercel) and server/app.ts (local Vite / dev:api).
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/* ─── DB ─────────────────────────────────────────────────────────── */

type DbProduct = {
  id: number
  name: string
  sku: string
  price_rub: number
  category: string
  color: string
  status: string
  image: string
  is_new: boolean
  is_favorite: boolean
  badge: string | null
}

let sql: NeonQueryFunction<false, false> | null = null

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env (local) or Vercel Project → Settings → Environment Variables.',
    )
  }
  const sslmode = process.env.sslmode?.trim()
  if (sslmode && !/[?&]sslmode=/.test(raw)) {
    return `${raw}${raw.includes('?') ? '&' : '?'}sslmode=${sslmode}`
  }
  if (!/[?&]sslmode=/.test(raw)) {
    return `${raw}${raw.includes('?') ? '&' : '?'}sslmode=require`
  }
  return raw
}

function getSql() {
  if (!sql) sql = neon(resolveDatabaseUrl())
  return sql
}

function mapProduct(row: DbProduct) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    priceRub: Number(row.price_rub),
    category: String(row.category ?? '').trim() || 'Малыши',
    color: row.color,
    status: row.status as 'В наличии' | 'Мало' | 'Нет в наличии',
    image: row.image,
    isNew: Boolean(row.is_new),
    isFavorite: Boolean(row.is_favorite),
    badge:
      row.badge === 'NEW' && !row.is_new
        ? undefined
        : (row.badge ?? undefined),
  }
}

/* ─── Images (sharp loaded on demand) ────────────────────────────── */

const MAX_EDGE = 1000
const WEBP_QUALITY = 78

async function normalizeProductImage(
  image: string | undefined | null,
): Promise<string> {
  const raw = String(image ?? '').trim()
  if (!raw) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (!raw.startsWith('data:image/')) return raw

  const match = raw.match(/^data:image\/[\w+.+-]+;base64,(.+)$/i)
  if (!match?.[1]) return raw

  try {
    const { default: sharp } = await import('sharp')
    const input = Buffer.from(match[1], 'base64')
    const out = await sharp(input)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer()
    return `data:image/webp;base64,${out.toString('base64')}`
  } catch (err) {
    console.error('Image normalize failed, keeping original:', err)
    return raw
  }
}

/* ─── Routes ─────────────────────────────────────────────────────── */

const app = new Hono().basePath('/api')

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.get('/health', (c) => c.json({ ok: true }))

app.get('/catalog', async (c) => {
  const client = getSql()
  const [products, settings] = await Promise.all([
    client`SELECT * FROM products ORDER BY id DESC` as Promise<DbProduct[]>,
    client`SELECT value FROM site_settings WHERE key = 'currency' LIMIT 1` as Promise<
      { value: string }[]
    >,
  ])

  return c.json({
    products: products.map(mapProduct),
    currency: settings[0]?.value ?? 'RUB',
  })
})

app.post('/products', async (c) => {
  const body = await c.req.json()
  const client = getSql()

  const name = String(body.name ?? '').trim() || 'Без названия'
  const sku =
    String(body.sku ?? '').trim() || `BLK-${Date.now().toString().slice(-6)}`
  const priceRub = Math.max(0, Math.round(Number(body.priceRub) || 0))
  const category =
    String(body.category ?? 'Малыши')
      .replace(/\u00a0/g, ' ')
      .trim()
      .replace(/\s+/g, ' ') || 'Малыши'
  const color = String(body.color ?? '—').trim() || '—'
  const status = String(body.status ?? 'В наличии')
  const image = await normalizeProductImage(String(body.image ?? ''))
  const isNew = Boolean(body.isNew)
  const isFavorite = Boolean(body.isFavorite)
  const badge = body.badge ? String(body.badge) : null

  const rows = (await client`
    INSERT INTO products
      (name, sku, price_rub, category, color, status, image, is_new, is_favorite, badge)
    VALUES
      (${name}, ${sku}, ${priceRub}, ${category}, ${color}, ${status}, ${image}, ${isNew}, ${isFavorite}, ${badge})
    RETURNING *
  `) as DbProduct[]

  return c.json(mapProduct(rows[0]), 201)
})

app.put('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const body = await c.req.json()
  const client = getSql()

  const existing = (await client`
    SELECT * FROM products WHERE id = ${id} LIMIT 1
  `) as DbProduct[]
  if (!existing[0]) return c.json({ error: 'Not found' }, 404)

  const cur = existing[0]
  const name = body.name !== undefined ? String(body.name).trim() : cur.name
  const sku = body.sku !== undefined ? String(body.sku).trim() : cur.sku
  const priceRub =
    body.priceRub !== undefined
      ? Math.max(0, Math.round(Number(body.priceRub) || 0))
      : Number(cur.price_rub)
  const category =
    body.category !== undefined
      ? String(body.category).replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ') ||
        cur.category
      : cur.category
  const color =
    body.color !== undefined
      ? String(body.color).trim() || '—'
      : cur.color
  const status = body.status !== undefined ? String(body.status) : cur.status
  const image =
    body.image !== undefined
      ? await normalizeProductImage(String(body.image))
      : cur.image
  const isNew = body.isNew !== undefined ? Boolean(body.isNew) : cur.is_new
  const isFavorite =
    body.isFavorite !== undefined ? Boolean(body.isFavorite) : cur.is_favorite
  let badge: string | null =
    body.badge !== undefined
      ? body.badge
        ? String(body.badge)
        : null
      : cur.badge
  if (body.isNew === false) badge = null
  else if (body.isNew === true && !badge) badge = 'NEW'

  const rows = (await client`
    UPDATE products SET
      name = ${name},
      sku = ${sku},
      price_rub = ${priceRub},
      category = ${category},
      color = ${color},
      status = ${status},
      image = ${image},
      is_new = ${isNew},
      is_favorite = ${isFavorite},
      badge = ${badge},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as DbProduct[]

  return c.json(mapProduct(rows[0]))
})

app.delete('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const client = getSql()
  const rows = (await client`
    DELETE FROM products WHERE id = ${id} RETURNING id
  `) as { id: number }[]

  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
})

app.put('/settings/currency', async (c) => {
  const body = await c.req.json()
  const currency = String(body.currency ?? 'RUB')
  if (!['RUB', 'EUR', 'USD'].includes(currency)) {
    return c.json({ error: 'Invalid currency' }, 400)
  }

  const client = getSql()
  await client`
    INSERT INTO site_settings (key, value)
    VALUES ('currency', ${currency})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `

  return c.json({ currency })
})

app.onError((err, c) => {
  console.error(err)
  return c.json(
    { error: err instanceof Error ? err.message : 'Server error' },
    500,
  )
})

export default app
