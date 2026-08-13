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
  subcategory?: string | null
  color: string
  brand: string
  sizes: unknown
  images: unknown
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
    subcategory: row.subcategory ? String(row.subcategory).trim() : '',
    color: row.color,
    brand: row.brand ?? '',
    stock: row.stock != null ? Number(row.stock) : 10,
    sizes: parseStringArray(row.sizes),
    images: parseStringArray(row.images),
    status: row.status as 'В наличии' | 'Мало' | 'Нет в наличии',
    image: row.image,
    isNew: Boolean(row.is_new),
    isFavorite: Boolean(row.is_favorite),
    isSale: Boolean(row.is_sale),
    salePriceRub: row.sale_price_rub != null ? Number(row.sale_price_rub) : undefined,
    badge:
      row.badge === 'NEW' && !row.is_new
        ? undefined
        : (row.badge ?? undefined),
  }
}

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? '')).filter((v) => v.trim().length > 0)
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v ?? '')).filter((v) => v.trim().length > 0)
      }
    } catch {
      /* not JSON — ignore */
    }
  }
  return []
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

  async function ensureProductColumns() {
    try {
      await sql`
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 10,
          ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS is_sale BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS sale_price_rub NUMERIC(10, 2)
      `
    } catch (e) {
      console.warn('ensure product columns error:', e)
    }
  }

  function normalizeSizes(raw: unknown): string[] {
    const list = parseStringArray(raw)
    return [...new Set(list)].slice(0, 50)
  }

  function normalizeImages(raw: unknown): string[] {
    const list = parseStringArray(raw)
    return [...new Set(list)].slice(0, 20)
  }

  async function handleCatalog(c: any) {
    await ensureProductColumns()
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

  async function handleCreateProduct(c: any) {
    const body = await c.req.json()
    await ensureProductColumns()

    const name = String(body.name ?? '').trim() || 'Без названия'
    const sku =
      String(body.sku ?? '').trim() || `BLK-${Date.now().toString().slice(-6)}`
    const priceRub = Math.max(0, Math.round(Number(body.priceRub) || 0))
    const category =
      String(body.category ?? 'Малыши')
        .replace(/\u00a0/g, ' ')
        .trim()
        .replace(/\s+/g, ' ') || 'Малыши'
    const subcategory = String(body.subcategory ?? '').trim()
    const color = String(body.color ?? '—').trim() || '—'
    const brand = String(body.brand ?? '').trim()
    const stock = body.stock !== undefined ? Math.max(0, Math.round(Number(body.stock) || 0)) : 10
    const sizes = normalizeSizes(body.sizes)
    const rawImages = normalizeImages(body.images)
    const images: string[] = []
    for (const img of rawImages) {
      const normalized = await normalizeProductImage(img)
      if (normalized) images.push(normalized)
    }
    const status = String(body.status ?? (stock === 0 ? 'Нет в наличии' : 'В наличии'))
    const image = await normalizeProductImage(String(body.image ?? ''))
    const isNew = Boolean(body.isNew)
    const isFavorite = Boolean(body.isFavorite)
    const isSale = Boolean(body.isSale)
    const salePriceRub = body.salePriceRub != null && Number(body.salePriceRub) > 0 ? Number(body.salePriceRub) : null
    const badge = body.badge ? String(body.badge) : null

    const rows = (await sql`
      INSERT INTO products
        (name, sku, price_rub, category, subcategory, color, brand, stock, sizes, images, status, image, is_new, is_favorite, is_sale, sale_price_rub, badge)
      VALUES
        (${name}, ${sku}, ${priceRub}, ${category}, ${subcategory}, ${color}, ${brand}, ${stock}, ${JSON.stringify(sizes)}, ${JSON.stringify(images)}, ${status}, ${image}, ${isNew}, ${isFavorite}, ${isSale}, ${salePriceRub}, ${badge})
      RETURNING *
    `) as DbProduct[]

    return c.json(mapProduct(rows[0]), 201)
  }

  app.post('/products', handleCreateProduct)
  app.post('/api/products', handleCreateProduct)

  async function handleUpdateProduct(c: any) {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

    const body = await c.req.json()
    await ensureProductColumns()

    const existing = (await sql`
      SELECT * FROM products WHERE id = ${id} LIMIT 1
    `) as DbProduct[]
    if (!existing[0]) return c.json({ error: 'Not found' }, 404)

    const cur = existing[0]
    const name = body.name !== undefined ? String(body.name).trim() || cur.name : cur.name
    const sku = body.sku !== undefined ? String(body.sku).trim() : cur.sku
    const priceRub =
      body.priceRub !== undefined
        ? Math.max(0, Math.round(Number(body.priceRub) || 0))
        : Number(cur.price_rub)
    const category =
      body.category !== undefined
        ? String(body.category)
            .replace(/\u00a0/g, ' ')
            .trim()
            .replace(/\s+/g, ' ') || cur.category
        : cur.category
    const subcategory =
      body.subcategory !== undefined
        ? String(body.subcategory).trim()
        : (cur.subcategory ?? '')
    const color =
      body.color !== undefined ? String(body.color).trim() || '—' : cur.color
    const brand =
      body.brand !== undefined ? String(body.brand).trim() : (cur.brand ?? '')
    const stock =
      body.stock !== undefined
        ? Math.max(0, Math.round(Number(body.stock) || 0))
        : (cur.stock != null ? Number(cur.stock) : 10)
    const sizes =
      body.sizes !== undefined ? normalizeSizes(body.sizes) : parseStringArray(cur.sizes)
    const images =
      body.images !== undefined
        ? await (async () => {
            const raw = normalizeImages(body.images)
            const list: string[] = []
            for (const img of raw) {
              const normalized = await normalizeProductImage(img)
              if (normalized) list.push(normalized)
            }
            return list
          })()
        : parseStringArray(cur.images)
    const status = body.status !== undefined ? String(body.status) : (stock === 0 ? 'Нет в наличии' : cur.status)
    const image =
      body.image !== undefined
        ? await normalizeProductImage(String(body.image))
        : cur.image
    const isNew = body.isNew !== undefined ? Boolean(body.isNew) : cur.is_new
    const isFavorite =
      body.isFavorite !== undefined ? Boolean(body.isFavorite) : cur.is_favorite
    const isSale =
      body.isSale !== undefined ? Boolean(body.isSale) : Boolean(cur.is_sale)
    const salePriceRub =
      body.salePriceRub !== undefined
        ? (body.salePriceRub != null && Number(body.salePriceRub) > 0 ? Number(body.salePriceRub) : null)
        : (cur.sale_price_rub != null ? Number(cur.sale_price_rub) : null)

    let badge: string | null =
      body.badge !== undefined
        ? body.badge
          ? String(body.badge)
          : null
        : cur.badge
    if (body.isNew === false) badge = null
    else if (body.isNew === true && !badge) badge = 'NEW'

    const rows = (await sql`
      UPDATE products SET
        name = ${name},
        sku = ${sku},
        price_rub = ${priceRub},
        category = ${category},
        subcategory = ${subcategory},
        color = ${color},
        brand = ${brand},
        stock = ${stock},
        sizes = ${JSON.stringify(sizes)},
        images = ${JSON.stringify(images)},
        status = ${status},
        image = ${image},
        is_new = ${isNew},
        is_favorite = ${isFavorite},
        is_sale = ${isSale},
        sale_price_rub = ${salePriceRub},
        badge = ${badge},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `) as DbProduct[]

    return c.json(mapProduct(rows[0]))
  }

  app.put('/products/:id', handleUpdateProduct)
  app.put('/api/products/:id', handleUpdateProduct)

  async function handleDeleteProduct(c: any) {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

    const rows = (await sql`
      DELETE FROM products WHERE id = ${id} RETURNING id
    `) as { id: number }[]

    if (!rows[0]) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true, id })
  }

  app.delete('/products/:id', handleDeleteProduct)
  app.delete('/api/products/:id', handleDeleteProduct)

  async function handleUpdateCurrency(c: any) {
    const body = await c.req.json()
    const currency = String(body.currency ?? 'RUB')
    if (!['RUB', 'EUR', 'USD'].includes(currency)) {
      return c.json({ error: 'Invalid currency' }, 400)
    }

    await ensureSiteSettingsTable()
    await sql`
      INSERT INTO site_settings (key, value)
      VALUES ('currency', ${currency})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return c.json({ currency })
  }

  app.put('/settings/currency', handleUpdateCurrency)
  app.put('/api/settings/currency', handleUpdateCurrency)

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

  function normalizeCountries(raw: unknown): { name: string; url: string; rate: string }[] {
    let list: unknown[] = []
    if (typeof raw === 'string') {
      try { list = JSON.parse(raw) as unknown[] } catch { list = [] }
    } else if (Array.isArray(raw)) {
      list = raw
    }
    return list.map((item) => {
      if (typeof item === 'string') return { name: item.trim(), url: '', rate: '' }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        return {
          name: String(obj.name ?? '').trim(),
          url: String(obj.url ?? '').trim(),
          rate: obj.rate != null ? String(obj.rate).trim() : '',
        }
      }
      return { name: '—', url: '', rate: '' }
    })
  }

  async function handleGetOfficialStores(c: any) {
    await ensureOfficialStoresTable()
    const rows = await sql`SELECT * FROM official_stores ORDER BY sort_order ASC, id ASC`
    return c.json(rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      countries: normalizeCountries(r.countries),
      sortOrder: Number(r.sort_order ?? 0),
      isActive: Boolean(r.is_active),
    })))
  }

  async function handleCreateOfficialStore(c: any) {
    await ensureOfficialStoresTable()
    const body = await c.req.json()
    const name = String(body.name || '').trim()
    const slug = String(body.slug || name.toLowerCase().replace(/\s+/g, '-')).trim()
    const countries = JSON.stringify(normalizeCountries(body.countries))
    const rows = await sql`
      INSERT INTO official_stores (name, slug, is_active, countries, sort_order)
      VALUES (${name}, ${slug}, ${body.isActive ?? true}, ${countries}::jsonb, ${body.sortOrder ?? 0})
      RETURNING *
    `
    const r = rows[0]
    return c.json({
      id: r.id,
      name: r.name,
      countries: normalizeCountries(r.countries),
      sortOrder: Number(r.sort_order ?? 0),
      isActive: Boolean(r.is_active),
    })
  }

  async function handleUpdateOfficialStore(c: any) {
    await ensureOfficialStoresTable()
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const countries = body.countries !== undefined
      ? JSON.stringify(normalizeCountries(body.countries))
      : undefined
    const rows = await sql`
      UPDATE official_stores
      SET name = COALESCE(${body.name ?? null}, name),
          is_active = COALESCE(${body.isActive ?? null}, is_active),
          countries = COALESCE(${countries ?? null}::jsonb, countries),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    const r = rows[0]
    if (!r) return c.json({ error: 'Not found' }, 404)
    return c.json({
      id: r.id,
      name: r.name,
      countries: normalizeCountries(r.countries),
      sortOrder: Number(r.sort_order ?? 0),
      isActive: Boolean(r.is_active),
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

  /* ─── Discounts / Promotions DB & API ────────────────────────────── */
  async function ensureDiscountsTable() {
    try {
      const existing = await sql`SELECT to_regclass('discounts') AS cls`
      if (existing[0]?.cls) return
      await sql`
        CREATE TABLE IF NOT EXISTS discounts (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
          threshold_rub INTEGER NOT NULL DEFAULT 0 CHECK (threshold_rub >= 0),
          value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (value >= 0),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      await sql`
        INSERT INTO discounts (title, type, threshold_rub, value, is_active, sort_order)
        VALUES
          ('Скидка 5% от 5 000 ₽', 'percent', 5000, 5, true, 1),
          ('Скидка 10% от 10 000 ₽', 'percent', 10000, 10, true, 2)
      `
    } catch (e) {
      console.warn('ensureDiscountsTable error:', e)
    }
  }

  function mapDiscount(r: any) {
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      thresholdRub: Number(r.threshold_rub),
      value: Number(r.value),
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order ?? 0),
    }
  }

  function parseDiscountBody(body: any) {
    return {
      title: String(body.title ?? '').trim() || 'Скидка',
      type: body.type === 'fixed' ? 'fixed' : 'percent',
      thresholdRub: Math.max(0, Math.round(Number(body.thresholdRub) || 0)),
      value: Math.max(0, Number(body.value) || 0),
      sortOrder: Math.round(Number(body.sortOrder) || 0),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    }
  }

  async function handleGetDiscounts(c: any) {
    await ensureDiscountsTable()
    const rows = await sql`SELECT * FROM discounts ORDER BY sort_order ASC, id ASC`
    return c.json({ discounts: rows.map(mapDiscount) })
  }

  async function handleCreateDiscount(c: any) {
    await ensureDiscountsTable()
    const body = await c.req.json()
    const { title, type, thresholdRub, value, sortOrder, isActive } = parseDiscountBody(body)
    const rows = await sql`
      INSERT INTO discounts (title, type, threshold_rub, value, is_active, sort_order)
      VALUES (${title}, ${type}, ${thresholdRub}, ${value}, ${isActive}, ${sortOrder})
      RETURNING *
    `
    return c.json({ discount: mapDiscount(rows[0]) }, 201)
  }

  async function handleUpdateDiscount(c: any) {
    await ensureDiscountsTable()
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const existing = await sql`SELECT * FROM discounts WHERE id = ${id} LIMIT 1`
    const cur = existing[0]
    if (!cur) return c.json({ error: 'Not found' }, 404)
    const title = body.title !== undefined ? String(body.title).trim() || 'Скидка' : cur.title
    const type = body.type === 'fixed' ? 'fixed' : body.type === 'percent' ? 'percent' : cur.type
    const thresholdRub =
      body.thresholdRub !== undefined
        ? Math.max(0, Math.round(Number(body.thresholdRub) || 0))
        : Number(cur.threshold_rub)
    const value =
      body.value !== undefined ? Math.max(0, Number(body.value) || 0) : Number(cur.value)
    const sortOrder =
      body.sortOrder !== undefined
        ? Math.round(Number(body.sortOrder) || 0)
        : Number(cur.sort_order)
    const isActive =
      body.isActive !== undefined ? Boolean(body.isActive) : Boolean(cur.is_active)
    const rows = await sql`
      UPDATE discounts
      SET title = ${title},
          type = ${type},
          threshold_rub = ${thresholdRub},
          value = ${value},
          is_active = ${isActive},
          sort_order = ${sortOrder},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    const r = rows[0]
    return c.json({ discount: mapDiscount(r) })
  }

  async function handleDeleteDiscount(c: any) {
    await ensureDiscountsTable()
    const id = Number(c.req.param('id'))
    const rows = await sql`DELETE FROM discounts WHERE id = ${id} RETURNING id`
    if (!rows[0]) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true, id })
  }

  app.get('/discounts', handleGetDiscounts)
  app.get('/api/discounts', handleGetDiscounts)
  app.post('/discounts', handleCreateDiscount)
  app.post('/api/discounts', handleCreateDiscount)
  app.put('/discounts/:id', handleUpdateDiscount)
  app.put('/api/discounts/:id', handleUpdateDiscount)
  app.delete('/discounts/:id', handleDeleteDiscount)
  app.delete('/api/discounts/:id', handleDeleteDiscount)

  /* ─── ORDERS ─────────────────────────────────────────────────────────── */

  type DbOrderRow = {
    id: number
    created_at: string
    items: unknown
    total_rub: number
    discount_label: string | null
    delivery_method: string | null
    address_notes: string | null
    messenger: string
    status: string
  }

  async function ensureOrdersTable() {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          total_rub NUMERIC NOT NULL DEFAULT 0,
          discount_label TEXT NOT NULL DEFAULT '',
          delivery_method TEXT NOT NULL DEFAULT '',
          address_notes TEXT NOT NULL DEFAULT '',
          messenger TEXT NOT NULL DEFAULT 'Telegram',
          status TEXT NOT NULL DEFAULT 'new'
        )
      `
    } catch (err) {
      console.warn('ensureOrdersTable error:', err)
    }
  }

  function mapOrder(r: DbOrderRow) {
    let items = []
    try {
      items = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items ?? [])
    } catch {
      items = []
    }
    return {
      id: r.id,
      createdAt: r.created_at,
      items,
      totalRub: Number(r.total_rub ?? 0),
      discountLabel: r.discount_label ?? undefined,
      deliveryMethod: r.delivery_method ?? undefined,
      addressNotes: r.address_notes ?? undefined,
      messenger: r.messenger as 'Telegram' | 'Max' | 'VK',
      status: r.status as 'new' | 'completed' | 'cancelled',
    }
  }

  async function handleGetOrders(c: any) {
    await ensureOrdersTable()
    const rows = (await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`) as DbOrderRow[]
    return c.json({ orders: rows.map(mapOrder) })
  }

  async function handlePostOrder(c: any) {
    const body = await c.req.json()
    await ensureOrdersTable()

    const items = Array.isArray(body.items) ? body.items : []
    const totalRub = Number(body.totalRub ?? 0)
    const discountLabel = String(body.discountLabel ?? '')
    const deliveryMethod = String(body.deliveryMethod ?? '')
    const addressNotes = String(body.addressNotes ?? '')
    const messenger = body.messenger === 'VK' ? 'VK' : body.messenger === 'Max' ? 'Max' : 'Telegram'

    const rows = (await sql`
      INSERT INTO orders (items, total_rub, discount_label, delivery_method, address_notes, messenger, status)
      VALUES (${JSON.stringify(items)}::jsonb, ${totalRub}, ${discountLabel}, ${deliveryMethod}, ${addressNotes}, ${messenger}, 'new')
      RETURNING *
    `) as DbOrderRow[]

    return c.json({ order: mapOrder(rows[0]) }, 201)
  }

  async function handlePatchOrder(c: any) {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)
    const body = await c.req.json()
    await ensureOrdersTable()

    const status = ['new', 'completed', 'cancelled'].includes(body.status) ? body.status : 'new'

    const rows = (await sql`
      UPDATE orders SET status = ${status} WHERE id = ${id} RETURNING *
    `) as DbOrderRow[]

    if (!rows[0]) return c.json({ error: 'Not found' }, 404)
    return c.json({ order: mapOrder(rows[0]) })
  }

  async function handleDeleteOrder(c: any) {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)
    await ensureOrdersTable()
    const rows = (await sql`DELETE FROM orders WHERE id = ${id} RETURNING id`) as { id: number }[]
    if (!rows[0]) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true, id })
  }

  app.get('/orders', handleGetOrders)
  app.get('/api/orders', handleGetOrders)
  app.post('/orders', handlePostOrder)
  app.post('/api/orders', handlePostOrder)
  app.patch('/orders/:id', handlePatchOrder)
  app.patch('/api/orders/:id', handlePatchOrder)
  app.delete('/orders/:id', handleDeleteOrder)
  app.delete('/api/orders/:id', handleDeleteOrder)

  /* ─── MESSENGER SETTINGS ─────────────────────────────────────────── */

  type DbMessengerSettingRow = {
    id: string
    label: string
    value: string
    description?: string
    is_active: boolean
    updated_at: string
  }

  async function ensureMessengerSettingsTable() {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS messenger_settings (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL DEFAULT '',
          value TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          is_active BOOLEAN NOT NULL DEFAULT true,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`
        ALTER TABLE messenger_settings ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
      `
    } catch (err) {
      console.warn('ensureMessengerSettingsTable error:', err)
    }
  }

  function mapMessengerSetting(r: DbMessengerSettingRow) {
    return {
      id: r.id,
      label: r.label,
      value: r.value,
      description: r.description || '',
      isActive: Boolean(r.is_active),
      updatedAt: r.updated_at,
    }
  }

  async function handleGetMessengerSettings(c: any) {
    await ensureMessengerSettingsTable()
    const rows = (await sql`SELECT * FROM messenger_settings ORDER BY updated_at ASC, id ASC`) as DbMessengerSettingRow[]
    return c.json({ settings: rows.map(mapMessengerSetting) })
  }

  async function handlePutMessengerSettings(c: any) {
    const body = await c.req.json()
    await ensureMessengerSettingsTable()

    const list = Array.isArray(body) ? body : Array.isArray(body.settings) ? body.settings : [body]

    const validIds: string[] = []
    for (const item of list) {
      if (!item || !item.id) continue
      const id = String(item.id).trim()
      if (!id) continue
      validIds.push(id)

      const label = item.label !== undefined ? String(item.label) : id.toUpperCase()
      const value = item.value !== undefined ? String(item.value).trim() : ''
      const description = item.description !== undefined ? String(item.description).trim() : ''
      const isActive = item.isActive === true

      await sql`
        INSERT INTO messenger_settings (id, label, value, description, is_active, updated_at)
        VALUES (${id}, ${label}, ${value}, ${description}, ${isActive}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `
    }

    if (validIds.length > 0) {
      await sql`DELETE FROM messenger_settings WHERE NOT (id = ANY(${validIds}))`
    } else {
      await sql`DELETE FROM messenger_settings`
    }

    const rows = (await sql`SELECT * FROM messenger_settings ORDER BY updated_at ASC, id ASC`) as DbMessengerSettingRow[]
    return c.json({ settings: rows.map(mapMessengerSetting) })
  }

  async function handleDeleteMessengerSetting(c: any) {
    const id = c.req.param('id')
    await ensureMessengerSettingsTable()
    if (id) {
      await sql`DELETE FROM messenger_settings WHERE id = ${id}`
    }
    const rows = (await sql`SELECT * FROM messenger_settings ORDER BY updated_at ASC, id ASC`) as DbMessengerSettingRow[]
    return c.json({ settings: rows.map(mapMessengerSetting) })
  }

  app.get('/messenger-settings', handleGetMessengerSettings)
  app.get('/api/messenger-settings', handleGetMessengerSettings)
  app.put('/messenger-settings', handlePutMessengerSettings)
  app.put('/api/messenger-settings', handlePutMessengerSettings)
  app.delete('/messenger-settings/:id', handleDeleteMessengerSetting)
  app.delete('/api/messenger-settings/:id', handleDeleteMessengerSetting)

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
