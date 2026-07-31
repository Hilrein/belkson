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
}

app.post('/products', handleCreateProduct)
app.post('/api/products', handleCreateProduct)

async function handleUpdateProduct(c: any) {
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

/* ─── Official Stores DB & API ────────────────────────────────────── */

type CountryItem = {
  name: string
  url: string
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
      return { name: item.trim(), url: '' }
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        name: String(obj.name ?? '').trim(),
        url: String(obj.url ?? '').trim(),
      }
    }
    return { name: '—', url: '' }
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

app.onError((err, c) => {
  console.error(err)
  return c.json(
    { error: err instanceof Error ? err.message : 'Server error' },
    500,
  )
})

export default app
