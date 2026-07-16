/**
 * Inline Hono app (no server/* imports) to isolate Vercel crash.
 */
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ ok: true, via: 'inline-hono' }))

app.get('/catalog', async (c) => {
  const url = process.env.DATABASE_URL
  if (!url) {
    return c.json({ error: 'DATABASE_URL missing' }, 500)
  }
  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(url)
    const products = await sql`SELECT id, name, sku, price_rub, category, color, status, image, is_new, is_favorite, badge FROM products ORDER BY id DESC`
    const settings = await sql`SELECT value FROM site_settings WHERE key = 'currency' LIMIT 1`
    return c.json({
      products: (products as Record<string, unknown>[]).map((row) => ({
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
      currency: (settings as { value: string }[])[0]?.value ?? 'RUB',
    })
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : 'catalog failed' },
      500,
    )
  }
})

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

export default handle(app)
