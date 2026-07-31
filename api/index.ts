/**
 * Vercel Node.js serverless entry for /api/*
 *
 * Constraints discovered on this project:
 * - Static top-level `import` of hono/neon → FUNCTION_INVOCATION_FAILED
 * - Dynamic `import()` of local sibling modules → module not found in /var/task
 * - Dynamic `import()` of npm packages + all logic in THIS file → works
 */
import { scrapeZara, scrapeHM, scrapeNext, scrapeZaraKidsCatalog } from '../server/parsers.js'
import { getNextCatalogFromDb, getNextSyncStatus, syncNextCatalog } from '../server/nextCatalogSync.js'

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
    badge:
      row.badge === 'NEW' && !row.is_new
        ? undefined
        : (row.badge ?? undefined),
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
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  )

  app.get('/health', (c) => c.json({ ok: true, status: 'ok' }))
  app.get('/api/health', (c) => c.json({ ok: true, status: 'ok' }))

  async function handleCatalog(c: any) {
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
  }

  app.get('/catalog', handleCatalog)
  app.get('/api/catalog', handleCatalog)

  async function handleZaraCatalog(c: any) {
    try {
      const region = c.req.query('region') || 'spain'
      const category = c.req.query('category') || 'all'
      const subcategory = c.req.query('subcategory') || 'all'
      const size = c.req.query('size') || 'all'
      const priceMin = c.req.query('priceMin') ? Number(c.req.query('priceMin')) : undefined
      const priceMax = c.req.query('priceMax') ? Number(c.req.query('priceMax')) : undefined
      const sortBy = c.req.query('sortBy') || 'featured'
      const search = c.req.query('search') || ''
      const page = c.req.query('page') ? Number(c.req.query('page')) : 1
      const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 24

      const result = await scrapeZaraKidsCatalog({
        region,
        category,
        subcategory,
        size,
        priceMin,
        priceMax,
        sortBy,
        search,
        page,
        pageSize,
      })

      return c.json(result)
    } catch (err) {
      console.error('Error in /zara/catalog route:', err)
      return c.json(
        {
          error: err instanceof Error ? err.message : 'Не удалось загрузить каталог Zara',
        },
        502
      )
    }
  }

  app.get('/zara/catalog', handleZaraCatalog)
  app.get('/api/zara/catalog', handleZaraCatalog)

  async function handleHMCatalog(c: any) {
    try {
      const region = c.req.query('region') || 'uk'
      const category = c.req.query('category') || 'all'
      const subcategory = c.req.query('subcategory') || 'all'
      const size = c.req.query('size') || 'all'
      const priceMinRub = c.req.query('priceMin') || c.req.query('priceMinRub') ? Number(c.req.query('priceMin') || c.req.query('priceMinRub')) : undefined
      const priceMaxRub = c.req.query('priceMax') || c.req.query('priceMaxRub') ? Number(c.req.query('priceMax') || c.req.query('priceMaxRub')) : undefined
      const sortBy = c.req.query('sortBy') || 'featured'
      const search = c.req.query('search') || ''
      const page = c.req.query('page') ? Number(c.req.query('page')) : 1
      const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 24

      const { scrapeHMCatalog } = await import('../server/hmParser.js')
      const result = await scrapeHMCatalog({
        region: region as any,
        category,
        subcategory,
        size,
        priceMinRub,
        priceMaxRub,
        sortBy: sortBy as any,
        search,
        page,
        pageSize,
      })

      return c.json(result)
    } catch (err) {
      console.error('Error in /hm/catalog route:', err)
      return c.json(
        {
          error: err instanceof Error ? err.message : 'Не удалось загрузить каталог H&M',
        },
        502
      )
    }
  }

  app.get('/hm/catalog', handleHMCatalog)
  app.get('/api/hm/catalog', handleHMCatalog)

  async function handleNextCatalog(c: any) {
    try {
      const region = c.req.query('region') || 'kazakhstan'
      const category = c.req.query('category') || 'all'
      const subcategory = c.req.query('subcategory') || 'all'
      const size = c.req.query('size') || 'all'
      const priceMin = c.req.query('priceMin') || c.req.query('priceMinRub') ? Number(c.req.query('priceMin') || c.req.query('priceMinRub')) : undefined
      const priceMax = c.req.query('priceMax') || c.req.query('priceMaxRub') ? Number(c.req.query('priceMax') || c.req.query('priceMaxRub')) : undefined
      const sortBy = c.req.query('sortBy') || 'featured'
      const search = c.req.query('search') || ''
      const page = c.req.query('page') ? Number(c.req.query('page')) : 1
      const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 24

      const result = await getNextCatalogFromDb(sql, {
        region,
        category,
        subcategory,
        size,
        priceMin,
        priceMax,
        sortBy,
        search,
        page,
        pageSize,
      })

      return c.json(result)
    } catch (err) {
      console.error('Error in /next/catalog route:', err)
      return c.json({ error: err instanceof Error ? err.message : 'Не удалось загрузить каталог Next' }, 500)
    }
  }

  app.get('/next/catalog', handleNextCatalog)
  app.get('/api/next/catalog', handleNextCatalog)

  function isInternalRequestAuthorized(c: any): boolean {
    const secret = process.env.CRON_SECRET?.trim()
    return Boolean(secret) && c.req.header('authorization') === `Bearer ${secret}`
  }

  async function handleNextSync(c: any) {
    if (!isInternalRequestAuthorized(c)) return c.json({ error: 'Unauthorized' }, 401)
    try {
      const body = c.req.method === 'POST' ? await c.req.json().catch(() => ({})) : {}
      const result = await syncNextCatalog(sql, {
        region: String(body.region ?? c.req.param('region') ?? c.req.query('region') ?? 'kazakhstan'),
        category: String(body.category ?? c.req.query('category') ?? 'all'),
      })
      return c.json({ ok: true, sync: result })
    } catch (err) {
      console.error('Error in Next sync:', err)
      return c.json({ error: err instanceof Error ? err.message : 'Next sync failed' }, 502)
    }
  }

  async function handleNextSyncStatus(c: any) {
    if (!isInternalRequestAuthorized(c)) return c.json({ error: 'Unauthorized' }, 401)
    return c.json(await getNextSyncStatus(sql))
  }

  app.post('/internal/next/sync', handleNextSync)
  app.post('/api/internal/next/sync', handleNextSync)
  app.get('/internal/next/sync', handleNextSync)
  app.get('/api/internal/next/sync', handleNextSync)
  app.get('/internal/next/sync/status', handleNextSyncStatus)
  app.get('/api/internal/next/sync/status', handleNextSyncStatus)
  app.get('/internal/next/sync/:region', handleNextSync)
  app.get('/api/internal/next/sync/:region', handleNextSync)

  async function handleExternalShop(c: any) {
    const shop = c.req.param('shop').toLowerCase()
    const country = c.req.param('country')?.toLowerCase()
    let data
    switch (shop) {
      case 'zara':
        data = await scrapeZara(country)
        break
      case 'hm':
        data = await scrapeHM(country)
        break
      case 'next':
        data = await scrapeNext(country)
        break
      default:
        return c.json({ error: 'Shop not found' }, 404)
    }
    return c.json({ products: data })
  }

  app.get('/external/:shop/:country?', handleExternalShop)
  app.get('/api/external/:shop/:country?', handleExternalShop)

  /* ─── Purchase Terms DB & API ────────────────────────────────────── */

  const DEFAULT_DYNAMIC_VARIANTS = [
    {
      id: 'v1',
      badge: 'Вариант 1',
      title: 'Порядок и условия выкупа',
      isActive: true,
      steps: [
        { id: '1', icon: 'search', title: 'Выбор товара', description: 'Выбираете вещи на официальных сайтах Zara, H&M или Next.' },
        { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете ссылки на товары в Telegram или Instagram.' },
        { id: '3', icon: 'calculate', title: 'Расчёт стоимости', description: 'Считаем итоговую сумму с доставкой и комиссией.' },
        { id: '4', icon: 'payment', title: 'Оплата', description: 'Оплачиваете удобным способом.' },
        { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Выкупаем товар и доставляем вам.' },
      ],
    },
    {
      id: 'v2',
      badge: 'Вариант 2',
      title: 'Порядок и условия выкупа',
      isActive: true,
      steps: [
        { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.' },
        { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.' },
        { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.' },
        { id: '4', icon: 'payment', title: 'Оплата', description: 'Вы производите оплату удобным способом.' },
        { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.' },
      ],
    },
    {
      id: 'v3',
      badge: 'Вариант 3',
      title: 'Порядок и условия выкупа',
      isActive: true,
      steps: [
        { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.' },
        { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.' },
        { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.' },
        { id: '4', icon: 'payment', title: 'Оплата', description: 'Вы производите оплату удобным способом.' },
        { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.' },
      ],
    },
  ]

  async function ensureSiteSettingsTable() {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL
        )
      `
    } catch (e) {
      console.warn('ensureSiteSettingsTable error:', e)
    }
  }

  async function handleGetPurchaseTerms(c: any) {
    await ensureSiteSettingsTable()
    try {
      const rows = (await sql`
        SELECT key, value FROM site_settings WHERE key IN ('purchase_terms_dynamic', 'purchase_terms_all', 'purchase_terms_v3')
      `) as { key: string; value: string }[]

      const dynamicRow = rows.find((r) => r.key === 'purchase_terms_dynamic')
      if (dynamicRow?.value) {
        const variants = typeof dynamicRow.value === 'string' ? JSON.parse(dynamicRow.value) : dynamicRow.value
        if (Array.isArray(variants)) {
          return c.json({ variants })
        }
      }
    } catch (err) {
      console.warn('Failed to fetch purchase terms from Neon DB:', err)
    }

    return c.json({ variants: DEFAULT_DYNAMIC_VARIANTS })
  }

  async function handleUpdatePurchaseTerms(c: any) {
    const body = await c.req.json()
    const variants = Array.isArray(body.variants) ? body.variants : DEFAULT_DYNAMIC_VARIANTS
    const valueData = JSON.stringify(variants)

    await ensureSiteSettingsTable()
    await sql`
      INSERT INTO site_settings (key, value)
      VALUES ('purchase_terms_dynamic', ${valueData})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return c.json({ variants })
  }

  app.get('/purchase-terms', handleGetPurchaseTerms)
  app.get('/api/purchase-terms', handleGetPurchaseTerms)
  app.put('/purchase-terms', handleUpdatePurchaseTerms)
  app.put('/api/purchase-terms', handleUpdatePurchaseTerms)

  /* ─── Official Stores DB & API ────────────────────────────────────── */
  async function ensureOfficialStoresTable() {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS official_stores (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          countries JSONB DEFAULT '[]'::jsonb,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    } catch (e) {
      console.warn('ensureOfficialStoresTable error:', e)
    }
  }

  async function handleGetOfficialStores(c: any) {
    await ensureOfficialStoresTable()
    const rows = await sql`SELECT * FROM official_stores ORDER BY sort_order ASC, id ASC`
    return c.json({
      stores: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        isActive: Boolean(r.is_active),
        countries: typeof r.countries === 'string' ? JSON.parse(r.countries) : (r.countries || []),
        sortOrder: r.sort_order,
      }))
    })
  }

  async function handleCreateOfficialStore(c: any) {
    await ensureOfficialStoresTable()
    const body = await c.req.json()
    const name = String(body.name || '').trim()
    const slug = String(body.slug || name.toLowerCase().replace(/\s+/g, '-')).trim()
    const countries = Array.isArray(body.countries) ? JSON.stringify(body.countries) : '[]'
    const rows = await sql`
      INSERT INTO official_stores (name, slug, is_active, countries, sort_order)
      VALUES (${name}, ${slug}, ${body.isActive ?? true}, ${countries}, ${body.sortOrder ?? 0})
      RETURNING *
    `
    const r = rows[0]
    return c.json({
      store: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        isActive: Boolean(r.is_active),
        countries: typeof r.countries === 'string' ? JSON.parse(r.countries) : (r.countries || []),
        sortOrder: r.sort_order,
      }
    })
  }

  async function handleUpdateOfficialStore(c: any) {
    await ensureOfficialStoresTable()
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const countries = Array.isArray(body.countries) ? JSON.stringify(body.countries) : '[]'
    const rows = await sql`
      UPDATE official_stores
      SET name = COALESCE(${body.name}, name),
          is_active = COALESCE(${body.isActive}, is_active),
          countries = ${countries},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    const r = rows[0]
    if (!r) return c.json({ error: 'Not found' }, 404)
    return c.json({
      store: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        isActive: Boolean(r.is_active),
        countries: typeof r.countries === 'string' ? JSON.parse(r.countries) : (r.countries || []),
        sortOrder: r.sort_order,
      }
    })
  }

  async function handleDeleteOfficialStore(c: any) {
    await ensureOfficialStoresTable()
    const id = Number(c.req.param('id'))
    await sql`DELETE FROM official_stores WHERE id = ${id}`
    return c.json({ ok: true, id })
  }

  app.get('/official-stores', handleGetOfficialStores)
  app.get('/api/official-stores', handleGetOfficialStores)
  app.post('/official-stores', handleCreateOfficialStore)
  app.post('/api/official-stores', handleCreateOfficialStore)
  app.put('/official-stores/:id', handleUpdateOfficialStore)
  app.put('/api/official-stores/:id', handleUpdateOfficialStore)
  app.delete('/official-stores/:id', handleDeleteOfficialStore)
  app.delete('/api/official-stores/:id', handleDeleteOfficialStore)

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
