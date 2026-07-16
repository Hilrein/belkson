/**
 * Vercel Node.js serverless entry for /api/*
 *
 * Constraints discovered on this project:
 * - Static top-level `import` of hono/neon → FUNCTION_INVOCATION_FAILED
 * - Dynamic `import()` of local sibling modules → module not found in /var/task
 * - Dynamic `import()` of npm packages + all logic in THIS file → works
 */
type NodeReq = {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

type NodeRes = {
  statusCode: number
  setHeader: (k: string, v: string) => void
  end: (b?: string) => void
}

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

export const config = {
  maxDuration: 60,
}

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add it in Vercel → Project Settings → Environment Variables.',
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
    badge: row.badge ?? undefined,
  }
}

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
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer()
    return `data:image/webp;base64,${out.toString('base64')}`
  } catch (err) {
    console.error('Image normalize failed, keeping original:', err)
    return raw
  }
}

async function buildApp() {
  const { Hono } = await import('hono')
  const { cors } = await import('hono/cors')
  const { neon } = await import('@neondatabase/serverless')

  const sql = neon(resolveDatabaseUrl())
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

  app.post('/products', async (c) => {
    const body = await c.req.json()
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

    const rows = (await sql`
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

  app.delete('/products/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

    const rows = (await sql`
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
      { error: err instanceof Error ? err.message : 'Server error' },
      500,
    )
  })

  return app
}

export default async function handler(req: NodeReq, res: NodeRes) {
  try {
    const app = await buildApp()

    const host = String(
      req.headers['x-forwarded-host'] || req.headers.host || 'localhost',
    )
    const proto = String(req.headers['x-forwarded-proto'] || 'https')
    const path = req.url || '/api'
    const method = (req.method || 'GET').toUpperCase()

    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v)
      } else {
        headers.set(key, value)
      }
    }

    let body: string | undefined
    if (method !== 'GET' && method !== 'HEAD') {
      if (typeof req.body === 'string') {
        body = req.body
      } else if (req.body !== undefined && req.body !== null) {
        if (!headers.has('content-type')) {
          headers.set('content-type', 'application/json')
        }
        body = JSON.stringify(req.body)
      }
    }

    const request = new Request(`${proto}://${host}${path}`, {
      method,
      headers,
      body,
    })

    const response = await app.fetch(request)
    const text = await response.text()

    res.statusCode = response.status
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return
      res.setHeader(key, value)
    })
    res.end(text)
  } catch (e) {
    console.error('API handler error:', e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'Server error',
      }),
    )
  }
}
