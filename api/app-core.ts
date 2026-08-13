/**
 * Full Belkson Hono API (single module for Vercel packaging).
 * Used by: api/index.ts (Vercel) and server/app.ts (local Vite / dev:api).
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { scrapeZara, scrapeHM, scrapeNext, scrapeZaraKidsCatalog } from '../server/parsers.js'
import { scrapeHMCatalog } from '../server/hmParser.js'
import { getNextCatalogFromDb, getNextSyncStatus, syncNextCatalog } from '../server/nextCatalogSync.js'

/* ─── DB ─────────────────────────────────────────────────────────── */

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

async function ensureProductColumns(client: NeonQueryFunction<false, false>) {
  try {
    await client`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 10,
        ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS is_sale BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS sale_price_rub NUMERIC(10, 2)
    `
  } catch (err) {
    console.warn('ensureProductColumns error:', err)
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

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
)

// Health check endpoints
app.get('/health', (c) => c.json({ ok: true, status: 'ok' }))
app.get('/api/health', (c) => c.json({ ok: true, status: 'ok' }))

async function handleCatalogRequest(c: any) {
  const client = getSql()
  await ensureProductColumns(client)
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
}

app.get('/catalog', handleCatalogRequest)
app.get('/api/catalog', handleCatalogRequest)

/**
 * Real Zara Kids catalog proxy route
 */
async function handleZaraCatalogRequest(c: any) {
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

app.get('/zara/catalog', handleZaraCatalogRequest)
app.get('/api/zara/catalog', handleZaraCatalogRequest)

async function handleHMCatalogRequest(c: any) {
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

    const result = await scrapeHMCatalog({
      region,
      category,
      subcategory,
      size,
      priceMinRub,
      priceMaxRub,
      sortBy,
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

app.get('/hm/catalog', handleHMCatalogRequest)
app.get('/api/hm/catalog', handleHMCatalogRequest)

async function handleNextCatalogRequest(c: any) {
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

    const result = await getNextCatalogFromDb(getSql(), {
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
    return c.json(
      { error: err instanceof Error ? err.message : 'Не удалось загрузить каталог Next' },
      500,
    )
  }
}

app.get('/next/catalog', handleNextCatalogRequest)
app.get('/api/next/catalog', handleNextCatalogRequest)

function isInternalRequestAuthorized(c: any): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return c.req.header('authorization') === `Bearer ${secret}`
}

async function handleNextSync(c: any) {
  if (!isInternalRequestAuthorized(c)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const body = c.req.method === 'POST' ? await c.req.json().catch(() => ({})) : {}
    const result = await syncNextCatalog(getSql(), {
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
  return c.json(await getNextSyncStatus(getSql()))
}

app.post('/internal/next/sync', handleNextSync)
app.post('/api/internal/next/sync', handleNextSync)
app.get('/internal/next/sync', handleNextSync)
app.get('/api/internal/next/sync', handleNextSync)
app.get('/internal/next/sync/status', handleNextSyncStatus)
app.get('/api/internal/next/sync/status', handleNextSyncStatus)
app.get('/internal/next/sync/:region', handleNextSync)
app.get('/api/internal/next/sync/:region', handleNextSync)

async function handleExternalShopRequest(c: any) {
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

app.get('/external/:shop/:country?', handleExternalShopRequest)
app.get('/api/external/:shop/:country?', handleExternalShopRequest)

async function handleCreateProduct(c: any) {
  const body = await c.req.json()
  const client = getSql()
  await ensureProductColumns(client)

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

  const rows = (await client`
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
  const client = getSql()
  await ensureProductColumns(client)

  const existing = (await client`
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
      ? String(body.category).replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ') ||
        cur.category
      : cur.category
  const subcategory =
    body.subcategory !== undefined
      ? String(body.subcategory).trim()
      : (cur.subcategory ?? '')
  const color =
    body.color !== undefined
      ? String(body.color).trim() || '—'
      : cur.color
  const brand =
    body.brand !== undefined ? String(body.brand).trim() : (cur.brand ?? '')
  const stock =
    body.stock !== undefined
      ? Math.max(0, Math.round(Number(body.stock) || 0))
      : (cur.stock != null ? Number(cur.stock) : 10)
  const sizes =
    body.sizes !== undefined ? normalizeSizes(body.sizes) : parseStringArray(cur.sizes)
  let images: string[]
  if (body.images !== undefined) {
    const normalized: string[] = []
    for (const img of normalizeImages(body.images)) {
      const processed = await normalizeProductImage(img)
      if (processed) normalized.push(processed)
    }
    images = normalized
  } else {
    images = parseStringArray(cur.images)
  }
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

  const rows = (await client`
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

  const client = getSql()
  const rows = (await client`
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

  const client = getSql()
  await client`
    INSERT INTO site_settings (key, value)
    VALUES ('currency', ${currency})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `

  return c.json({ currency })
}

app.put('/settings/currency', handleUpdateCurrency)
app.put('/api/settings/currency', handleUpdateCurrency)

/* ─── Purchase Terms API (Dynamic Variants) ───────────────────────── */

type PurchaseTermStep = {
  id: string
  icon: string
  title: string
  description: string
}

type PurchaseVariant = {
  id: string
  badge: string
  title: string
  isActive: boolean
  steps: PurchaseTermStep[]
}

const DEFAULT_DYNAMIC_VARIANTS: PurchaseVariant[] = [
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

async function ensureSiteSettingsTable(client: any) {
  try {
    await client`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `
  } catch (err) {
    console.warn('ensureSiteSettingsTable error:', err)
  }
}

async function handleGetPurchaseTerms(c: any) {
  const client = getSql()
  await ensureSiteSettingsTable(client)
  try {
    const rows = (await client`
      SELECT key, value FROM site_settings WHERE key IN ('purchase_terms_dynamic', 'purchase_terms_all', 'purchase_terms_v3')
    `) as { key: string; value: string }[]

    const dynamicRow = rows.find((r) => r.key === 'purchase_terms_dynamic')
    if (dynamicRow?.value) {
      const variants = typeof dynamicRow.value === 'string' ? JSON.parse(dynamicRow.value) : dynamicRow.value
      if (Array.isArray(variants)) {
        return c.json({ variants })
      }
    }

    const allRow = rows.find((r) => r.key === 'purchase_terms_all')
    if (allRow?.value) {
      const data = typeof allRow.value === 'string' ? JSON.parse(allRow.value) : allRow.value
      const migrated: PurchaseVariant[] = [
        { id: 'v1', badge: 'Вариант 1', title: data.v1?.title || 'Порядок и условия выкупа', isActive: true, steps: data.v1?.steps || DEFAULT_DYNAMIC_VARIANTS[0].steps },
        { id: 'v2', badge: 'Вариант 2', title: data.v2?.title || 'Порядок и условия выкупа', isActive: true, steps: data.v2?.steps || DEFAULT_DYNAMIC_VARIANTS[1].steps },
        { id: 'v3', badge: 'Вариант 3', title: data.v3?.title || 'Порядок и условия выкупа', isActive: true, steps: data.v3?.steps || DEFAULT_DYNAMIC_VARIANTS[2].steps },
      ]
      return c.json({ variants: migrated })
    }
  } catch (err) {
    console.warn('Failed to fetch purchase terms setting from Neon DB:', err)
  }
  return c.json({ variants: DEFAULT_DYNAMIC_VARIANTS })
}

async function handleUpdatePurchaseTerms(c: any) {
  try {
    const body = await c.req.json()
    const variants = Array.isArray(body.variants) ? body.variants : DEFAULT_DYNAMIC_VARIANTS

    const valueData = JSON.stringify(variants)

    const client = getSql()
    await ensureSiteSettingsTable(client)
    await client`
      INSERT INTO site_settings (key, value)
      VALUES ('purchase_terms_dynamic', ${valueData})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return c.json({ variants })
  } catch (err: any) {
    console.error('handleUpdatePurchaseTerms Neon DB error:', err)
    return c.json({ error: err?.message || 'Database error' }, 500)
  }
}

app.get('/purchase-terms', handleGetPurchaseTerms)
app.get('/api/purchase-terms', handleGetPurchaseTerms)
app.put('/purchase-terms', handleUpdatePurchaseTerms)
app.put('/api/purchase-terms', handleUpdatePurchaseTerms)

/* ─── Promo Block API ────────────────────────────────────────────── */

export const DEFAULT_PROMO_BLOCK = {
  isActive: true,
  mainCard: {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCcIoQstGiOoJsMha05qt-pi349QXUPBjNWLU-2s49dciEvoFl57vggXvK6J6EH9iyk6QZ2cfwKYheAz5kBYR0AOtjWwR4v_UsxNqxwQsJa7sFCbRMloAb-Yx04owsdwUXHC8VD8ug1TJEyOlcuOAdgkhRrRLGSbAaZjwME82bZDf-BKuNjuqV7PiJRg9MCi3H8yJCe-4owZdsYLAX-YB8Bz6I4gBzcHKiAE5CRzPxertAFZesXtzXVzA1sMm2LuDZYvbUW9ZpGAQu',
    badge: 'Новая коллекция',
    title: 'Коллекция для переменки',
    description: 'Одежда для приключений из экологичных и прочных тканей.',
    buttonText: 'Смотреть коллекцию',
    buttonLink: '/catalog',
  },
  featuresCard: {
    title: 'С заботой о планете',
    items: [
      'Органический хлопок',
      'Без агрессивных красителей',
      'Мягко для чувствительной кожи',
    ],
  },
  secondaryCard: {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzfXQLCjEcOYa9JWefnJxVNtMvLW77hvpFU-BmxSFAJblnOkg2kDVj_ipKEcO19Gp6j7rjf7okmqUwjlf9JBeE44txITjk8ge7lKAVPCWjvMhYz_xHzqHbWeOWZBvYTmomsPaeXXrmt_5PbSQ8LjavhTyA3GXovY9RaVwRhZM2pLTrJVSQCT-7vcWsQKesLEN-0h3zXilKIgvkwCBKS5bXQoxOAC6OQ2QoXttUxQV4bPS9dRDamgduZScmoYtxUg1DPSdhpUTa7O1B',
    title: 'Базовые вещи для малышей',
    linkText: 'Купить',
    linkUrl: '/catalog',
  },
}

async function handleGetPromoBlock(c: any) {
  const client = getSql()
  await ensureSiteSettingsTable(client)
  try {
    const rows = (await client`
      SELECT value FROM site_settings WHERE key = 'promo_block' LIMIT 1
    `) as { value: string }[]
    if (rows[0]?.value) {
      const data = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value
      return c.json(data)
    }
  } catch (err) {
    console.warn('Failed to fetch promo_block setting from Neon DB:', err)
  }
  return c.json(DEFAULT_PROMO_BLOCK)
}

async function handleUpdatePromoBlock(c: any) {
  try {
    const body = await c.req.json()
    const valueData = JSON.stringify(body)

    const client = getSql()
    await ensureSiteSettingsTable(client)
    await client`
      INSERT INTO site_settings (key, value)
      VALUES ('promo_block', ${valueData})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return c.json({ success: true, data: body })
  } catch (err: any) {
    console.error('handleUpdatePromoBlock Neon DB error:', err)
    return c.json({ error: err?.message || 'Database error' }, 500)
  }
}

app.get('/promo-block', handleGetPromoBlock)
app.get('/api/promo-block', handleGetPromoBlock)
app.post('/promo-block', handleUpdatePromoBlock)
app.post('/api/promo-block', handleUpdatePromoBlock)
app.put('/promo-block', handleUpdatePromoBlock)
app.put('/api/promo-block', handleUpdatePromoBlock)

/* ─── Official Stores DB & API ────────────────────────────────────── */

type CountryItem = {
  name: string
  url: string
  rate: string
}

function normalizeCountries(raw: unknown): CountryItem[] {
  let list: unknown[] = []
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw) as unknown[]
    } catch {
      list = []
    }
  } else if (Array.isArray(raw)) {
    list = raw
  }
  return list.map((item) => {
    if (typeof item === 'string') {
      return { name: item.trim(), url: '', rate: '' }
    }
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

async function ensureOfficialStoresTable() {
  const client = getSql()
  await client`
    CREATE TABLE IF NOT EXISTS official_stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      countries JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  const existing = (await client`SELECT COUNT(*)::int as count FROM official_stores`) as { count: number }[]
  if (existing[0]?.count === 0) {
    await client`
      INSERT INTO official_stores (name, countries, sort_order, is_active)
      VALUES 
        ('Zara', '[{"name":"Spain","url":"https://www.zara.com/es/"},{"name":"UK","url":"https://www.zara.com/uk/"},{"name":"Poland","url":"https://www.zara.com/pl/"},{"name":"Germany","url":"https://www.zara.com/de/"},{"name":"Kazakhstan","url":"https://www.zara.com/kz/"}]'::jsonb, 1, true),
        ('H&M', '[{"name":"UK","url":"https://www2.hm.com/en_gb/index.html"},{"name":"Germany","url":"https://www2.hm.com/de_de/index.html"},{"name":"Poland","url":"https://www2.hm.com/pl_pl/index.html"},{"name":"USA","url":"https://www2.hm.com/en_us/index.html"}]'::jsonb, 2, true),
        ('Next', '[{"name":"UK","url":"https://www.next.co.uk"},{"name":"Kazakhstan","url":"https://www.next.kz"},{"name":"Germany","url":"https://www.next.de"},{"name":"Spain","url":"https://www.next.es"}]'::jsonb, 3, true);
    `
  }
}

app.get('/official-stores', async (c) => {
  const client = getSql()
  await ensureOfficialStoresTable()
  const rows = (await client`
    SELECT * FROM official_stores ORDER BY sort_order ASC, id ASC
  `) as DbOfficialStore[]

  const stores = rows.map((r) => ({
    id: r.id,
    name: r.name,
    countries: normalizeCountries(r.countries),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  return c.json(stores)
})

app.post('/official-stores', async (c) => {
  const body = await c.req.json()
  const client = getSql()
  await ensureOfficialStoresTable()

  const name = String(body.name ?? '').trim()
  if (!name) return c.json({ error: 'Name is required' }, 400)

  const countries = normalizeCountries(body.countries)
  const sortOrder = Number(body.sortOrder ?? 0)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true

  const rows = (await client`
    INSERT INTO official_stores (name, countries, sort_order, is_active)
    VALUES (${name}, ${JSON.stringify(countries)}::jsonb, ${sortOrder}, ${isActive})
    RETURNING *
  `) as DbOfficialStore[]

  const r = rows[0]
  return c.json(
    {
      id: r.id,
      name: r.name,
      countries: normalizeCountries(r.countries),
      sortOrder: Number(r.sort_order ?? 0),
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    },
    201,
  )
})

app.put('/official-stores/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const body = await c.req.json()
  const client = getSql()
  await ensureOfficialStoresTable()

  const existing = (await client`
    SELECT * FROM official_stores WHERE id = ${id} LIMIT 1
  `) as DbOfficialStore[]
  if (!existing[0]) return c.json({ error: 'Not found' }, 404)

  const cur = existing[0]
  const name = body.name !== undefined ? String(body.name).trim() : cur.name
  const countries =
    body.countries !== undefined
      ? normalizeCountries(body.countries)
      : normalizeCountries(cur.countries)
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : Number(cur.sort_order)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(cur.is_active)

  const rows = (await client`
    UPDATE official_stores SET
      name = ${name},
      countries = ${JSON.stringify(countries)}::jsonb,
      sort_order = ${sortOrder},
      is_active = ${isActive},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as DbOfficialStore[]

  const r = rows[0]
  return c.json({
    id: r.id,
    name: r.name,
    countries: normalizeCountries(r.countries),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })
})

app.delete('/official-stores/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const client = getSql()
  await ensureOfficialStoresTable()
  const rows = (await client`
    DELETE FROM official_stores WHERE id = ${id} RETURNING id
  `) as { id: number }[]

  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
})

/* ─── Discounts / Promotions DB & API ─────────────────────────────── */

type DbDiscount = {
  id: number
  title: string
  type: 'percent' | 'fixed'
  threshold_rub: number
  value: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

function mapDiscount(r: DbDiscount) {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    thresholdRub: Number(r.threshold_rub),
    value: Number(r.value),
    isActive: Boolean(r.is_active),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

async function ensureDiscountsTable() {
  const client = getSql()
  const existing = (await client`
    SELECT to_regclass('discounts') AS cls
  `) as { cls: string | null }[]
  if (existing[0]?.cls) return
  await client`
    CREATE TABLE IF NOT EXISTS discounts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
      threshold_rub INTEGER NOT NULL DEFAULT 0 CHECK (threshold_rub >= 0),
      value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (value >= 0),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await client`
    INSERT INTO discounts (title, type, threshold_rub, value, is_active, sort_order)
    VALUES
      ('Скидка 5% от 5 000 ₽', 'percent', 5000, 5, true, 1),
      ('Скидка 10% от 10 000 ₽', 'percent', 10000, 10, true, 2)
  `
}

function parseDiscountBody(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim() || 'Скидка'
  const type = body.type === 'fixed' ? 'fixed' : 'percent'
  const thresholdRub = Math.max(0, Math.round(Number(body.thresholdRub) || 0))
  const value = Math.max(0, Number(body.value) || 0)
  const sortOrder = Math.round(Number(body.sortOrder) || 0)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true
  return { title, type, thresholdRub, value, sortOrder, isActive }
}

async function handleGetDiscounts(c: any) {
  const client = getSql()
  await ensureDiscountsTable()
  const rows = (await client`
    SELECT * FROM discounts ORDER BY sort_order ASC, id ASC
  `) as DbDiscount[]
  return c.json({ discounts: rows.map(mapDiscount) })
}

async function handlePostDiscounts(c: any) {
  const body = await c.req.json()
  const client = getSql()
  await ensureDiscountsTable()
  const { title, type, thresholdRub, value, sortOrder, isActive } =
    parseDiscountBody(body)

  const rows = (await client`
    INSERT INTO discounts (title, type, threshold_rub, value, is_active, sort_order)
    VALUES (${title}, ${type}, ${thresholdRub}, ${value}, ${isActive}, ${sortOrder})
    RETURNING *
  `) as DbDiscount[]

  return c.json({ discount: mapDiscount(rows[0]) }, 201)
}

async function handlePutDiscounts(c: any) {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const body = await c.req.json()
  const client = getSql()
  await ensureDiscountsTable()

  const existing = (await client`
    SELECT * FROM discounts WHERE id = ${id} LIMIT 1
  `) as DbDiscount[]
  if (!existing[0]) return c.json({ error: 'Not found' }, 404)

  const cur = existing[0]
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

  const rows = (await client`
    UPDATE discounts SET
      title = ${title},
      type = ${type},
      threshold_rub = ${thresholdRub},
      value = ${value},
      is_active = ${isActive},
      sort_order = ${sortOrder},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as DbDiscount[]

  return c.json({ discount: mapDiscount(rows[0]) })
}

async function handleDeleteDiscounts(c: any) {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const client = getSql()
  await ensureDiscountsTable()
  const rows = (await client`
    DELETE FROM discounts WHERE id = ${id} RETURNING id
  `) as { id: number }[]

  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
}

app.get('/discounts', handleGetDiscounts)
app.get('/api/discounts', handleGetDiscounts)
app.post('/discounts', handlePostDiscounts)
app.post('/api/discounts', handlePostDiscounts)
app.put('/discounts/:id', handlePutDiscounts)
app.put('/api/discounts/:id', handlePutDiscounts)
app.delete('/discounts/:id', handleDeleteDiscounts)
app.delete('/api/discounts/:id', handleDeleteDiscounts)

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
  const client = getSql()
  try {
    await client`
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
  const client = getSql()
  await ensureOrdersTable()
  const rows = (await client`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`) as DbOrderRow[]
  return c.json({ orders: rows.map(mapOrder) })
}

async function handlePostOrder(c: any) {
  const body = await c.req.json()
  const client = getSql()
  await ensureOrdersTable()

  const items = Array.isArray(body.items) ? body.items : []
  const totalRub = Number(body.totalRub ?? 0)
  const discountLabel = String(body.discountLabel ?? '')
  const deliveryMethod = String(body.deliveryMethod ?? '')
  const addressNotes = String(body.addressNotes ?? '')
  const messenger = body.messenger === 'VK' ? 'VK' : body.messenger === 'Max' ? 'Max' : 'Telegram'

  const rows = (await client`
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
  const client = getSql()
  await ensureOrdersTable()

  const status = ['new', 'completed', 'cancelled'].includes(body.status) ? body.status : 'new'

  const rows = (await client`
    UPDATE orders SET status = ${status} WHERE id = ${id} RETURNING *
  `) as DbOrderRow[]

  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ order: mapOrder(rows[0]) })
}

async function handleDeleteOrder(c: any) {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)
  const client = getSql()
  await ensureOrdersTable()
  const rows = (await client`DELETE FROM orders WHERE id = ${id} RETURNING id`) as { id: number }[]
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
  is_active: boolean
  updated_at: string
}

async function ensureMessengerSettingsTable() {
  const client = getSql()
  try {
    await client`
      CREATE TABLE IF NOT EXISTS messenger_settings (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT '',
        value TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await client`
      INSERT INTO messenger_settings (id, label, value, is_active)
      VALUES 
        ('telegram', 'Telegram', 'belkson', true),
        ('max', 'Max', 'https://web.max.ru/u/f9LHodD0cOKVbrxghT0d8KoNtlR6WdagEWPgauFxCl5D2WpF9Euc-C2vFWo', true),
        ('vk', 'VK', '94968923', true)
      ON CONFLICT (id) DO NOTHING
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
    isActive: Boolean(r.is_active),
    updatedAt: r.updated_at,
  }
}

async function handleGetMessengerSettings(c: any) {
  const client = getSql()
  await ensureMessengerSettingsTable()
  const rows = (await client`SELECT * FROM messenger_settings ORDER BY id ASC`) as DbMessengerSettingRow[]
  return c.json({ settings: rows.map(mapMessengerSetting) })
}

async function handlePutMessengerSettings(c: any) {
  const body = await c.req.json()
  const client = getSql()
  await ensureMessengerSettingsTable()

  const list = Array.isArray(body) ? body : Array.isArray(body.settings) ? body.settings : [body]

  for (const item of list) {
    if (!item || !item.id) continue
    const id = String(item.id)
    const label = item.label !== undefined ? String(item.label) : id.toUpperCase()
    const value = item.value !== undefined ? String(item.value).trim() : ''
    const isActive = item.isActive === true

    await client`
      INSERT INTO messenger_settings (id, label, value, is_active, updated_at)
      VALUES (${id}, ${label}, ${value}, ${isActive}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        value = EXCLUDED.value,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `
  }

  const rows = (await client`SELECT * FROM messenger_settings ORDER BY id ASC`) as DbMessengerSettingRow[]
  return c.json({ settings: rows.map(mapMessengerSetting) })
}

/* ─── Hero Banners DB & API ────────────────────────────────────── */

type DbHeroBanner = {
  id: number
  badge: string
  title: string
  subtitle: string
  image: string
  button_text: string
  button_url: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapHeroBanner(r: DbHeroBanner) {
  return {
    id: r.id,
    badge: r.badge,
    title: r.title,
    subtitle: r.subtitle,
    image: r.image,
    buttonText: r.button_text,
    buttonUrl: r.button_url,
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

async function ensureHeroBannersTable() {
  const client = getSql()
  const existing = (await client`
    SELECT to_regclass('hero_banners') AS cls
  `) as { cls: string | null }[]
  if (existing[0]?.cls) return
  await client`
    CREATE TABLE IF NOT EXISTS hero_banners (
      id SERIAL PRIMARY KEY,
      badge TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL,
      button_text TEXT NOT NULL DEFAULT 'В каталог',
      button_url TEXT NOT NULL DEFAULT '/catalog',
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await client`
    INSERT INTO hero_banners (badge, title, subtitle, image, button_text, button_url, sort_order, is_active)
    VALUES
      ('Коллекция 2026', 'Весенняя нежность', 'Мягкая одежда для малышей: прогулки, игры и каждый день.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAinqGQ_I7Pc4wChF5iNq9qjd8AVRzRQEk3BYcM3j9nxcvoMh4k403DisASeSApeAI0QNjlG6-OiUwzvtVf3SQsFauj2OZ5ZMJ1u-56QRGwrXQuvkVoYvjejd5RTIYtx2XiUKomHcOOXWMRZ3gXtCMSavcQ6Vf-OOhHqXBCitAhtplDxW3Q8He1TPLiOaOGVSsuci5neHsxrJqzbGM-v2qYmktOgg9l4Z8M9p9vYaDXSodfkgfoHkk8kKumfWXEfoz1dogFUQASIMap', 'Смотреть новинки', '/catalog?category=new', 1, true),
      ('Премиум трикотаж', 'Создано для комфорта', 'Нежные ткани и удобная посадка для активного дня ребёнка.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8XYOqM6k1V0yN9OxYE3KD3vUisD4kg3HENS3WhujMMEi1vweZXTfbqxf_gMVmXS3BxO3xhuNShDRdDGpgd_dC2YWaMLWhh9DaJoQymdWpGNX-7E3zC5JpTWwLPoqWwsZD46MK841lM3bvdLReNjLgKBzZOZDuQj6x8yCoihcD7f3TOr6gE1i-HO9NlZA9-TQfrglWzkecr7PxoNuovqPLQCtN8W5d1rQk7XGWDqLQwJiargBAigg616CwuYyRyCXzdpUihQVawbcF', 'В каталог', '/catalog', 2, true)
  `
}

async function handleGetHeroBanners(c: any) {
  const client = getSql()
  await ensureHeroBannersTable()
  const rows = (await client`
    SELECT * FROM hero_banners ORDER BY sort_order ASC, id ASC
  `) as DbHeroBanner[]
  return c.json(rows.map(mapHeroBanner))
}

async function handleCreateHeroBanner(c: any) {
  const body = await c.req.json()
  const client = getSql()
  await ensureHeroBannersTable()

  const badge = String(body.badge ?? '').trim()
  const title = String(body.title ?? '').trim() || 'Новый баннер'
  const subtitle = String(body.subtitle ?? '').trim()
  const image = String(body.image ?? '').trim() || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAinqGQ_I7Pc4wChF5iNq9qjd8AVRzRQEk3BYcM3j9nxcvoMh4k403DisASeSApeAI0QNjlG6-OiUwzvtVf3SQsFauj2OZ5ZMJ1u-56QRGwrXQuvkVoYvjejd5RTIYtx2XiUKomHcOOXWMRZ3gXtCMSavcQ6Vf-OOhHqXBCitAhtplDxW3Q8He1TPLiOaOGVSsuci5neHsxrJqzbGM-v2qYmktOgg9l4Z8M9p9vYaDXSodfkgfoHkk8kKumfWXEfoz1dogFUQASIMap'
  const buttonText = String(body.buttonText ?? '').trim() || 'В каталог'
  const buttonUrl = String(body.buttonUrl ?? '').trim() || '/catalog'
  const sortOrder = Math.round(Number(body.sortOrder) || 0)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true

  const rows = (await client`
    INSERT INTO hero_banners (badge, title, subtitle, image, button_text, button_url, sort_order, is_active)
    VALUES (${badge}, ${title}, ${subtitle}, ${image}, ${buttonText}, ${buttonUrl}, ${sortOrder}, ${isActive})
    RETURNING *
  `) as DbHeroBanner[]
  return c.json(mapHeroBanner(rows[0]), 201)
}

async function handleUpdateHeroBanner(c: any) {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)
  const body = await c.req.json()
  const client = getSql()
  await ensureHeroBannersTable()

  const existing = (await client`SELECT * FROM hero_banners WHERE id = ${id} LIMIT 1`) as DbHeroBanner[]
  if (!existing[0]) return c.json({ error: 'Not found' }, 404)
  const cur = existing[0]

  const badge = body.badge !== undefined ? String(body.badge).trim() : cur.badge
  const title = body.title !== undefined ? String(body.title).trim() : cur.title
  const subtitle = body.subtitle !== undefined ? String(body.subtitle).trim() : cur.subtitle
  const image = body.image !== undefined ? String(body.image).trim() : cur.image
  const buttonText = body.buttonText !== undefined ? String(body.buttonText).trim() : cur.button_text
  const buttonUrl = body.buttonUrl !== undefined ? String(body.buttonUrl).trim() : cur.button_url
  const sortOrder = body.sortOrder !== undefined ? Math.round(Number(body.sortOrder)) : Number(cur.sort_order)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(cur.is_active)

  const rows = (await client`
    UPDATE hero_banners SET
      badge = ${badge},
      title = ${title},
      subtitle = ${subtitle},
      image = ${image},
      button_text = ${buttonText},
      button_url = ${buttonUrl},
      sort_order = ${sortOrder},
      is_active = ${isActive},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as DbHeroBanner[]
  return c.json(mapHeroBanner(rows[0]))
}

async function handleDeleteHeroBanner(c: any) {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)
  const client = getSql()
  await ensureHeroBannersTable()
  const rows = (await client`DELETE FROM hero_banners WHERE id = ${id} RETURNING id`) as { id: number }[]
  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
}

/* ─── Admin Auth ─────────────────────────────────────────────────── */

async function ensureAdminAuthTables(client: any) {
  try {
    await client`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    await client`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token VARCHAR(128) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    // Auto-seed default admin credentials if not present
    await client`
      INSERT INTO admin_users (username, password)
      VALUES ('belkson', 'AdminBelkson')
      ON CONFLICT (username) DO NOTHING;
    `
  } catch (err) {
    console.warn('ensureAdminAuthTables error:', err)
  }
}

async function handleAdminLogin(c: any) {
  const client = getSql()
  await ensureAdminAuthTables(client)

  const body = await c.req.json().catch(() => ({}))
  const username = String(body.username || '').trim()
  const password = String(body.password || '').trim()

  if (!username || !password) {
    return c.json({ error: 'Укажите имя пользователя и пароль' }, 400)
  }

  const rows = (await client`
    SELECT id, username, password FROM admin_users WHERE username = ${username}
  `) as { id: number; username: string; password: string }[]

  if (rows.length === 0 || rows[0].password !== password) {
    return c.json({ error: 'Неверный логин или пароль' }, 401)
  }

  const token = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await client`
    INSERT INTO admin_sessions (token, username, expires_at)
    VALUES (${token}, ${username}, ${expiresAt.toISOString()})
  `

  c.header('Set-Cookie', `belkson_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`)

  return c.json({
    success: true,
    user: { username: rows[0].username },
    token,
  })
}

async function handleAdminMe(c: any) {
  const client = getSql()
  await ensureAdminAuthTables(client)

  const cookieHeader = c.req.header('cookie') || ''
  const authHeader = c.req.header('authorization') || ''
  let token = ''

  if (cookieHeader) {
    const match = cookieHeader.match(/belkson_admin_session=([^;]+)/)
    if (match) token = match[1].trim()
  }
  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim()
  }

  if (!token) {
    return c.json({ authenticated: false })
  }

  const rows = (await client`
    SELECT token, username, expires_at FROM admin_sessions WHERE token = ${token} AND expires_at > NOW()
  `) as { token: string; username: string; expires_at: string }[]

  if (rows.length === 0) {
    return c.json({ authenticated: false })
  }

  return c.json({
    authenticated: true,
    user: { username: rows[0].username },
  })
}

async function handleAdminLogout(c: any) {
  const client = getSql()
  await ensureAdminAuthTables(client)

  const cookieHeader = c.req.header('cookie') || ''
  const authHeader = c.req.header('authorization') || ''
  let token = ''

  if (cookieHeader) {
    const match = cookieHeader.match(/belkson_admin_session=([^;]+)/)
    if (match) token = match[1].trim()
  }
  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim()
  }

  if (token) {
    await client`DELETE FROM admin_sessions WHERE token = ${token}`
  }

  c.header('Set-Cookie', 'belkson_admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0')
  return c.json({ success: true })
}

app.post('/admin/login', handleAdminLogin)
app.post('/api/admin/login', handleAdminLogin)
app.get('/admin/me', handleAdminMe)
app.get('/api/admin/me', handleAdminMe)
app.post('/admin/logout', handleAdminLogout)
app.post('/api/admin/logout', handleAdminLogout)

app.get('/hero-banners', handleGetHeroBanners)
app.get('/api/hero-banners', handleGetHeroBanners)
app.post('/hero-banners', handleCreateHeroBanner)
app.post('/api/hero-banners', handleCreateHeroBanner)
app.put('/hero-banners/:id', handleUpdateHeroBanner)
app.put('/api/hero-banners/:id', handleUpdateHeroBanner)
app.delete('/hero-banners/:id', handleDeleteHeroBanner)
app.delete('/api/hero-banners/:id', handleDeleteHeroBanner)

app.onError((err, c) => {
  console.error(err)
  return c.json(
    { error: err instanceof Error ? err.message : 'Server error' },
    500,
  )
})

export default app
