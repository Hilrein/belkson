import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { Product, ProductCategory, ProductVariant, RegionId } from '../src/types/shop'

type Sql = NeonQueryFunction<false, false>

type NextDbRow = {
  id: number
  region: RegionId
  sku: string
  title: string
  brand: 'next'
  category: ProductCategory
  original_price: string | number
  currency_symbol: string
  price_rub: number
  description: string
  original_url: string
  images: unknown
  sizes: unknown
  colors: unknown
  variants: unknown
  is_new: boolean
  is_best_seller: boolean
}

type SyncRunRow = { id: number }

export type NextCatalogFilters = {
  region?: string
  category?: string
  size?: string
  priceMin?: number
  priceMax?: number
  sortBy?: string
  search?: string
  page?: number
  pageSize?: number
}

export type NextSyncScope = { region?: string; category?: string }

const RATES: Record<string, number> = { kazakhstan: 0.2, uk: 115, germany: 98, spain: 98, poland: 22 }
const SYMBOLS: Record<string, string> = { kazakhstan: '₸', uk: '£', germany: '€', spain: '€', poland: 'zł' }
const VALID_CATEGORIES = new Set<ProductCategory>(['all', 'girl', 'boy', 'baby_girl', 'baby_boy', 'mini', 'shoes_acc'])

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function variants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ProductVariant => Boolean(item) && typeof item === 'object')
}

function mapRow(row: NextDbRow): Product {
  return {
    id: `next-db-${row.region}-${row.sku}`,
    title: row.title,
    brand: 'next',
    region: row.region,
    category: row.category,
    originalPrice: Number(row.original_price),
    currencySymbol: row.currency_symbol,
    priceRub: Number(row.price_rub),
    description: row.description,
    sku: row.sku,
    originalUrl: row.original_url,
    images: stringList(row.images),
    sizes: stringList(row.sizes),
    colors: stringList(row.colors),
    variants: variants(row.variants),
    isNew: row.is_new,
    isBestSeller: row.is_best_seller,
  }
}

export async function getNextCatalogFromDb(sql: Sql, filters: NextCatalogFilters) {
  const region = (filters.region || 'kazakhstan').toLowerCase()
  const category = (filters.category || 'all').toLowerCase()
  const rows = await sql`
    SELECT * FROM next_catalog_products
    WHERE is_active = TRUE
      AND region = ${region}
      AND (${category} = 'all' OR category = ${category})
  ` as NextDbRow[]

  let products = rows.map(mapRow)
  if (filters.size && filters.size !== 'all') products = products.filter((product) => product.sizes.includes(filters.size!))
  if (filters.priceMin && filters.priceMin > 0) products = products.filter((product) => product.priceRub >= filters.priceMin!)
  if (filters.priceMax && filters.priceMax > 0) products = products.filter((product) => product.priceRub <= filters.priceMax!)
  if (filters.search?.trim()) {
    const query = filters.search.toLocaleLowerCase()
    products = products.filter((product) => `${product.title} ${product.description} ${product.sku}`.toLocaleLowerCase().includes(query))
  }
  if (filters.sortBy === 'price_asc') products.sort((a, b) => a.priceRub - b.priceRub)
  if (filters.sortBy === 'price_desc') products.sort((a, b) => b.priceRub - a.priceRub)
  if (filters.sortBy === 'newest') products.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)))

  const page = Math.max(1, Number(filters.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 24))
  const prices = products.map((product) => product.priceRub)
  const start = (page - 1) * pageSize
  return {
    products: products.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount: products.length,
    hasMore: start + pageSize < products.length,
    availableSubcategories: [
      { id: 'all', label: 'Все товары', count: products.length },
      { id: 'older_girls', label: 'Older Girls (3–16 лет)', count: products.filter((product) => product.category === 'girl').length },
      { id: 'younger_girls', label: 'Younger Girls (3M–6 лет)', count: products.filter((product) => product.category === 'girl').length },
      { id: 'baby', label: 'Baby (0–3 года)', count: products.filter((product) => ['baby_girl', 'baby_boy', 'mini'].includes(product.category)).length },
    ],
    availableSizes: Array.from(new Set(products.flatMap((product) => product.sizes))).sort(),
    priceRangeRub: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
  }
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeSourceProduct(value: unknown, region: string): Product | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const sku = String(item.sku ?? item.id ?? item.productCode ?? '').trim()
  const title = String(item.title ?? item.name ?? item.productName ?? '').trim()
  if (!sku || !title) return null
  const category = String(item.category ?? 'girl') as ProductCategory
  if (!VALID_CATEGORIES.has(category) || category === 'all') return null
  const originalPrice = numberValue(item.originalPrice ?? item.price ?? item.salePrice)
  const priceRub = Math.round(numberValue(item.priceRub) || originalPrice * (RATES[region] || 1))
  const rawVariants = Array.isArray(item.variants) ? item.variants : []
  const productVariants: ProductVariant[] = rawVariants.map((variant) => {
    const data = variant && typeof variant === 'object' ? variant as Record<string, unknown> : {}
    return { color: String(data.color ?? 'Основной цвет'), sizes: stringList(data.sizes), images: stringList(data.images) }
  })
  return {
    id: `next-source-${region}-${sku}`,
    title,
    brand: 'next',
    region: region as RegionId,
    category,
    originalPrice,
    currencySymbol: String(item.currencySymbol ?? SYMBOLS[region] ?? ''),
    priceRub,
    description: String(item.description ?? ''),
    sku,
    originalUrl: String(item.originalUrl ?? item.url ?? ''),
    images: stringList(item.images),
    sizes: stringList(item.sizes),
    colors: stringList(item.colors),
    variants: productVariants,
    isNew: Boolean(item.isNew ?? item.showNewIn),
    isBestSeller: Boolean(item.isBestSeller),
  }
}

async function fetchPartnerCatalog(scope: Required<NextSyncScope>): Promise<{ products: Product[]; isComplete: boolean }> {
  const source = process.env.NEXT_SOURCE_URL?.trim()
  if (!source) throw new Error('NEXT_SOURCE_URL is not configured.')
  const url = new URL(source)
  url.searchParams.set('region', scope.region)
  if (scope.category !== 'all') url.searchParams.set('category', scope.category)
  const token = process.env.NEXT_SOURCE_TOKEN?.trim()
  const headerName = process.env.NEXT_SOURCE_AUTH_HEADER?.trim() || 'Authorization'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers[headerName] = headerName.toLowerCase() === 'authorization' ? `Bearer ${token}` : token
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`Partner source returned HTTP ${response.status}.`)
  const payload: unknown = await response.json()
  const wrapper = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : null
  const rawProducts = Array.isArray(payload) ? payload : (wrapper && Array.isArray(wrapper.products) ? wrapper.products : [])
  if (!rawProducts.length) throw new Error('Partner source returned an empty or unsupported product payload.')
  return {
    products: rawProducts.map((item) => normalizeSourceProduct(item, scope.region)).filter((item): item is Product => Boolean(item)),
    // Deletion is allowed only for an explicitly complete source snapshot.
    isComplete: wrapper?.complete === true || wrapper?.isComplete === true,
  }
}

export async function syncNextCatalog(sql: Sql, input: NextSyncScope = {}) {
  const scope = { region: (input.region || 'kazakhstan').toLowerCase(), category: (input.category || 'all').toLowerCase() }
  const runs = await sql`
    INSERT INTO next_sync_runs (region, category, status) VALUES (${scope.region}, ${scope.category}, 'running') RETURNING id
  ` as SyncRunRow[]
  const runId = runs[0].id
  try {
    const source = await fetchPartnerCatalog(scope)
    const products = source.products
    let created = 0
    let updated = 0
    for (const product of products) {
      const existing = await sql`SELECT id FROM next_catalog_products WHERE region = ${scope.region} AND sku = ${product.sku} LIMIT 1` as { id: number }[]
      await sql`
        INSERT INTO next_catalog_products
          (region, sku, title, brand, category, original_price, currency_symbol, price_rub, description, original_url, images, sizes, colors, variants, is_new, is_best_seller, is_active, missing_syncs, last_seen_sync_id, last_seen_at, updated_at)
        VALUES
          (${scope.region}, ${product.sku}, ${product.title}, 'next', ${product.category}, ${product.originalPrice}, ${product.currencySymbol}, ${product.priceRub}, ${product.description}, ${product.originalUrl}, ${JSON.stringify(product.images)}, ${JSON.stringify(product.sizes)}, ${JSON.stringify(product.colors)}, ${JSON.stringify(product.variants || [])}, ${Boolean(product.isNew)}, ${Boolean(product.isBestSeller)}, TRUE, 0, ${runId}, NOW(), NOW())
        ON CONFLICT (region, sku) DO UPDATE SET
          title = EXCLUDED.title, category = EXCLUDED.category, original_price = EXCLUDED.original_price, currency_symbol = EXCLUDED.currency_symbol, price_rub = EXCLUDED.price_rub, description = EXCLUDED.description, original_url = EXCLUDED.original_url, images = EXCLUDED.images, sizes = EXCLUDED.sizes, colors = EXCLUDED.colors, variants = EXCLUDED.variants, is_new = EXCLUDED.is_new, is_best_seller = EXCLUDED.is_best_seller, is_active = TRUE, missing_syncs = 0, last_seen_sync_id = EXCLUDED.last_seen_sync_id, last_seen_at = NOW(), updated_at = NOW()
      `
      if (existing[0]) updated++
      else created++
    }
    let hidden: { id: number }[] = []
    if (source.isComplete) {
      await sql`
        UPDATE next_catalog_products SET missing_syncs = missing_syncs + 1, updated_at = NOW()
        WHERE region = ${scope.region} AND is_active = TRUE AND last_seen_sync_id IS DISTINCT FROM ${runId}
          AND (${scope.category} = 'all' OR category = ${scope.category})
      `
      hidden = await sql`
        UPDATE next_catalog_products SET is_active = FALSE, updated_at = NOW()
        WHERE region = ${scope.region} AND is_active = TRUE AND missing_syncs >= 2
          AND (${scope.category} = 'all' OR category = ${scope.category})
        RETURNING id
      ` as { id: number }[]
    }
    await sql`
      UPDATE next_sync_runs SET status = 'success', source_count = ${products.length}, created_count = ${created}, updated_count = ${updated}, hidden_count = ${hidden.length}, completed_at = NOW() WHERE id = ${runId}
    `
    await sql`UPDATE next_sync_queue SET status = 'resolved', updated_at = NOW() WHERE region = ${scope.region} AND category = ${scope.category} AND status <> 'resolved'`
    return { id: runId, region: scope.region, category: scope.category, sourceCount: products.length, created, updated, hidden: hidden.length, fullSnapshot: source.isComplete }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await sql`UPDATE next_sync_runs SET status = 'failed', error = ${message.slice(0, 4000)}, completed_at = NOW() WHERE id = ${runId}`
    await sql`
      INSERT INTO next_sync_queue (region, category, status, attempts, next_attempt_at, last_error)
      VALUES (${scope.region}, ${scope.category}, 'pending', 1, NOW() + INTERVAL '1 day', ${message.slice(0, 4000)})
      ON CONFLICT (region, category, status) DO UPDATE SET attempts = next_sync_queue.attempts + 1, next_attempt_at = NOW() + INTERVAL '1 day', last_error = EXCLUDED.last_error, updated_at = NOW()
    `
    throw error
  }
}

export async function getNextSyncStatus(sql: Sql) {
  const [runs, queue] = await Promise.all([
    sql`SELECT * FROM next_sync_runs ORDER BY started_at DESC LIMIT 10`,
    sql`SELECT * FROM next_sync_queue WHERE status <> 'resolved' ORDER BY next_attempt_at ASC`,
  ])
  return { runs, queue }
}
