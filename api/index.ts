/**
 * Node-style handler + dynamic import of Hono (avoid top-level ESM crash).
 */
export default async function handler(
  req: {
    method?: string
    url?: string
    headers: Record<string, string | string[] | undefined>
  },
  res: {
    statusCode: number
    setHeader: (k: string, v: string) => void
    end: (b?: string) => void
  },
) {
  try {
    const { Hono } = await import('hono')
    const { neon } = await import('@neondatabase/serverless')

    const app = new Hono().basePath('/api')

    app.get('/health', (c) => c.json({ ok: true, via: 'dynamic-hono' }))

    app.get('/catalog', async (c) => {
      const url = process.env.DATABASE_URL
      if (!url) return c.json({ error: 'DATABASE_URL missing' }, 500)
      const sql = neon(url.includes('sslmode=') ? url : `${url}${url.includes('?') ? '&' : '?'}sslmode=require`)
      const products = (await sql`
        SELECT id, name, sku, price_rub, category, color, status, image, is_new, is_favorite, badge
        FROM products ORDER BY id DESC
      `) as Record<string, unknown>[]
      const settings = (await sql`
        SELECT value FROM site_settings WHERE key = 'currency' LIMIT 1
      `) as { value: string }[]
      return c.json({
        products: products.map((row) => ({
          id: row.id,
          name: row.name,
          sku: row.sku,
          priceRub: Number(row.price_rub),
          category: row.category,
          color: row.color,
          status: row.status,
          image: row.image,
          isNew: Boolean(row.is_new),
          isFavorite: Boolean(row.is_favorite),
          badge: row.badge ?? undefined,
        })),
        currency: settings[0]?.value ?? 'RUB',
      })
    })

    // Convert Node req → Fetch Request
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
    const proto = String(req.headers['x-forwarded-proto'] || 'https')
    const path = req.url || '/api'
    const request = new Request(`${proto}://${host}${path}`, {
      method: req.method || 'GET',
      headers: headersToFetch(req.headers),
    })

    const response = await app.fetch(request)
    const body = await response.text()
    res.statusCode = response.status
    response.headers.forEach((value, key) => {
      // Skip hop-by-hop
      if (key.toLowerCase() === 'transfer-encoding') return
      res.setHeader(key, value)
    })
    res.end(body)
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'handler failed',
        stack: e instanceof Error ? e.stack : undefined,
      }),
    )
  }
}

function headersToFetch(
  headers: Record<string, string | string[] | undefined>,
): Headers {
  const out = new Headers()
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) out.append(key, v)
    } else {
      out.set(key, value)
    }
  }
  return out
}
