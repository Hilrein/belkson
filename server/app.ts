import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getSql, mapProduct, type DbProduct } from './db'

const app = new Hono().basePath('/api')

async function normalizeProductImage(image: string | undefined | null) {
  // Dynamic import keeps sharp off the cold-start path for GET /catalog
  const { normalizeProductImage: normalize } = await import('./image')
  return normalize(image)
}

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

app.get('/health', (c) => c.json({ ok: true }))

/** List products + currency */
app.get('/catalog', async (c) => {
  const sql = getSql()
  const [products, settings] = await Promise.all([
    sql`SELECT * FROM products ORDER BY id DESC` as Promise<DbProduct[]>,
    sql`SELECT value FROM site_settings WHERE key = 'currency' LIMIT 1` as Promise<
      { value: string }[]
    >,
  ])

  return c.json({
    products: products.map(mapProduct),
    currency: settings[0]?.value ?? 'RUB',
  })
})

/** Create product */
app.post('/products', async (c) => {
  const body = await c.req.json()
  const sql = getSql()

  const name = String(body.name ?? '').trim() || 'Без названия'
  const sku =
    String(body.sku ?? '').trim() || `BLK-${Date.now().toString().slice(-6)}`
  const priceRub = Math.max(0, Math.round(Number(body.priceRub) || 0))
  const category = String(body.category ?? 'Дети')
  const color = String(body.color ?? '—').trim() || '—'
  const status = String(body.status ?? 'В наличии')
  const image = await normalizeProductImage(String(body.image ?? ''))
  const isNew = Boolean(body.isNew)
  const isFavorite = Boolean(body.isFavorite)
  const badge = body.badge ? String(body.badge) : null

  const rows = (await sql`
    INSERT INTO products
      (name, sku, price_rub, category, color, status, image, is_new, is_favorite, badge)
    VALUES
      (${name}, ${sku}, ${priceRub}, ${category}, ${color}, ${status}, ${image}, ${isNew}, ${isFavorite}, ${badge})
    RETURNING *
  `) as DbProduct[]

  return c.json(mapProduct(rows[0]), 201)
})

/** Update product */
app.put('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const body = await c.req.json()
  const sql = getSql()

  const existing = (await sql`
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
    body.category !== undefined ? String(body.category) : cur.category
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
  const badge =
    body.badge !== undefined
      ? body.badge
        ? String(body.badge)
        : null
      : cur.badge

  const rows = (await sql`
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

/** Delete product */
app.delete('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const sql = getSql()
  const rows = (await sql`
    DELETE FROM products WHERE id = ${id} RETURNING id
  `) as { id: number }[]

  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
})

/** Update site currency */
app.put('/settings/currency', async (c) => {
  const body = await c.req.json()
  const currency = String(body.currency ?? 'RUB')
  if (!['RUB', 'EUR', 'USD'].includes(currency)) {
    return c.json({ error: 'Invalid currency' }, 400)
  }

  const sql = getSql()
  await sql`
    INSERT INTO site_settings (key, value)
    VALUES ('currency', ${currency})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `

  return c.json({ currency })
})

app.onError((err, c) => {
  console.error(err)
  return c.json(
    {
      error: err instanceof Error ? err.message : 'Server error',
    },
    500,
  )
})

export default app
