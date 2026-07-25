import type { Product, ProductCategory, ProductVariant, RegionId } from '../src/types/shop'

export interface NextRegionConfig {
  id: RegionId
  domain: string
  path: string
  currency: string
  symbol: string
  exchangeRate: number
  locale: string
}

export const NEXT_REGIONS: Record<string, NextRegionConfig> = {
  kazakhstan: { id: 'kazakhstan', domain: 'www.nextdirect.com', path: 'kz/ru', currency: 'KZT', symbol: '₸', exchangeRate: 0.20, locale: 'ru-KZ' },
  uk: { id: 'uk', domain: 'www.next.co.uk', path: 'uk/en', currency: 'GBP', symbol: '£', exchangeRate: 115, locale: 'en-GB' },
  germany: { id: 'germany', domain: 'www.nextdirect.com', path: 'de/en', currency: 'EUR', symbol: '€', exchangeRate: 98, locale: 'de-DE' },
  spain: { id: 'spain', domain: 'www.nextdirect.com', path: 'es/en', currency: 'EUR', symbol: '€', exchangeRate: 98, locale: 'es-ES' },
  poland: { id: 'poland', domain: 'www.nextdirect.com', path: 'pl/en', currency: 'PLN', symbol: 'zł', exchangeRate: 22, locale: 'pl-PL' },
}

export interface NextParserParams {
  region?: string
  category?: string
  subcategory?: string
  size?: string
  priceMin?: number
  priceMinRub?: number
  priceMax?: number
  priceMaxRub?: number
  sortBy?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface ServerNextCatalogResponse {
  products: Product[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
  availableSubcategories: { id: string; label: string; count: number }[]
  availableSizes: string[]
  priceRangeRub: { min: number; max: number }
  /** False means at least one source page failed; never use it to remove DB rows. */
  isComplete: boolean
}

const NEXT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ru-KZ,ru;q=0.9,en-US;q=0.8',
  'Cache-Control': 'no-cache',
}

class ServerCache {
  private store = new Map<string, { timestamp: number; data: Product[] }>()
  private readonly ttlMs = 10 * 60 * 1000

  get(key: string): Product[] | null {
    const entry = this.store.get(key)
    if (!entry || Date.now() - entry.timestamp > this.ttlMs) return null
    return entry.data
  }

  set(key: string, data: Product[]): void { this.store.set(key, { timestamp: Date.now(), data }) }
  clear(): void { this.store.clear() }
}

export const nextServerCache = new ServerCache()

type NextSummary = Record<string, unknown>
type KidsSource = { path: string; category: ProductCategory }

/** Only children sections — never Next's general search or adult departments. */
function getKidsSources(category: string): KidsSource[] {
  if (category === 'girl') return [{ path: 'shop/girls', category: 'girl' }]
  if (category === 'boy') return [{ path: 'shop/boys', category: 'boy' }]
  if (category === 'baby_girl') return [{ path: 'shop/baby', category: 'baby_girl' }]
  if (category === 'baby_boy') return [{ path: 'shop/baby', category: 'baby_boy' }]
  if (category === 'mini') return [{ path: 'shop/baby', category: 'mini' }]
  if (category === 'shoes_acc') return [{ path: 'shop/girls', category: 'shoes_acc' }, { path: 'shop/boys', category: 'shoes_acc' }]
  return [
    { path: 'shop/girls', category: 'girl' },
    { path: 'shop/boys', category: 'boy' },
    { path: 'shop/baby', category: 'mini' },
  ]
}

function extractBalancedObject(source: string, from: number): string | null {
  const start = source.indexOf('{', from)
  if (start < 0) return null
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = start; index < source.length; index++) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") { quote = char; continue }
    if (char === '{') depth++
    if (char === '}' && --depth === 0) return source.slice(start, index + 1)
  }
  return null
}

/** Reads every product card; a Next page frequently stores many cards in one script. */
export function extractNextSummaryData(html: string): NextSummary[] {
  const summaries: NextSummary[] = []
  const scripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1])
  for (const script of scripts) {
    const marker = /(?:["']summaryData["']|\bsummaryData\b)\s*[:=]/g
    while (marker.exec(script)) {
      const json = extractBalancedObject(script, marker.lastIndex)
      if (!json) continue
      try {
        const parsed = JSON.parse(json) as NextSummary
        const summary = parsed.summaryData && typeof parsed.summaryData === 'object' ? parsed.summaryData as NextSummary : parsed
        if (Array.isArray(summary.colourways)) summaries.push(summary)
      } catch {
        // A malformed card must not discard the other cards in the response.
      }
    }
  }
  return summaries
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const raw = value.replace(/[^\d,.-]/g, '')
  if (!raw) return null
  const normalized = raw.includes(',') && raw.includes('.') ? raw.replace(/,/g, '') : raw.replace(',', '.')
  const price = Number.parseFloat(normalized)
  return Number.isFinite(price) ? price : null
}

function strings(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item.trim()]
    if (!item || typeof item !== 'object') return []
    const option = item as Record<string, unknown>
    return strings(option.name ?? option.label ?? option.s)
  })
}

function toProduct(summary: NextSummary, region: string, info: NextRegionConfig, category: ProductCategory): Product | null {
  const colourways = Array.isArray(summary.colourways) ? summary.colourways as NextSummary[] : []
  const main = colourways[0] || {}
  const code = String(summary.id ?? main.id ?? '').trim()
  const originalPrice = parsePrice(main.sp ?? main.mp ?? main.p ?? summary.price)
  if (!code || originalPrice === null) return null
  let title = String(main.t ?? summary.productName ?? summary.name ?? 'Next Kids').trim()
  if (title.includes(' - ')) title = title.split(' - ').slice(1).join(' - ') || title
  const variants: ProductVariant[] = colourways.map((colourway) => {
    const variantCode = String(colourway.id ?? code)
    return {
      color: String(colourway.c ?? colourway.colour ?? 'Основной цвет'),
      sizes: Array.from(new Set([...strings(colourway.sizes), ...strings(colourway.sizeOptions), ...strings(colourway.s)])),
      images: [
        `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/SearchINT/Lge/${variantCode}.jpg`,
        `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Product_SIP/Lge/${variantCode}.jpg`,
      ],
    }
  })
  const sizes = Array.from(new Set([...strings(summary.sizes), ...variants.flatMap((variant) => variant.sizes)]))
  const colors = Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean)))
  const productPath = String(main.url ?? summary.url ?? `style/${code}`).replace(/^\//, '')
  return {
    id: `next-real-${region}-${code}`,
    title,
    brand: 'next',
    region: info.id,
    category,
    originalPrice,
    currencySymbol: info.symbol,
    priceRub: Math.round(originalPrice * info.exchangeRate),
    description: `Товар детской коллекции Next (${info.currency}). Артикул: ${code}.`,
    sku: `NEXT-${code}`,
    originalUrl: `https://${info.domain}/${info.path}/${productPath}`,
    images: [
      `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/SearchINT/Lge/${code}.jpg`,
      `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Product_SIP/Lge/${code}.jpg`,
    ],
    sizes,
    colors: colors.length ? colors : ['Основной цвет'],
    variants,
    isNew: Boolean(summary.showNewIn ?? main.showNewIn),
    isBestSeller: Boolean(summary.colourwaysHasRating ?? main.rating),
  }
}

function mergeProduct(existing: Product, next: Product): Product {
  return {
    ...existing,
    colors: Array.from(new Set([...existing.colors, ...next.colors])),
    sizes: Array.from(new Set([...existing.sizes, ...next.sizes])),
    variants: [...(existing.variants || []), ...(next.variants || [])].filter((variant, index, list) => list.findIndex((candidate) => candidate.color === variant.color) === index),
  }
}

async function fetchKidsSource(info: NextRegionConfig, source: KidsSource): Promise<{ summaries: NextSummary[]; complete: boolean }> {
  const summaries: NextSummary[] = []
  let complete = true
  // Two catalogue pages keep the Vercel task bounded; future pagination can be
  // added without ever querying adult/search endpoints.
  for (const sourcePage of [1, 2]) {
    const url = new URL(`https://${info.domain}/${info.path}/${source.path}`)
    if (sourcePage > 1) url.searchParams.set('p', String(sourcePage))
    try {
      const response = await fetch(url, { headers: { ...NEXT_HEADERS, 'Accept-Language': info.locale } })
      const html = await response.text()
      if (!response.ok) {
        complete = false
        console.warn(`[Next Scraper] ${source.path} page ${sourcePage} returned ${response.status}`)
        continue
      }
      summaries.push(...extractNextSummaryData(html))
    } catch (error) {
      complete = false
      console.warn(`[Next Scraper] ${source.path} page ${sourcePage} failed:`, error)
    }
  }
  return { summaries, complete }
}

export async function scrapeNextCatalog(options: NextParserParams): Promise<ServerNextCatalogResponse> {
  const region = (options.region || 'kazakhstan').toLowerCase()
  const category = (options.category || 'all').toLowerCase()
  const page = Math.max(1, Number(options.page) || 1)
  const requestedPageSize = Number(options.pageSize)
  // pageSize=0 is reserved for the server-side Neon synchronizer.
  const pageSize = requestedPageSize === 0 ? Number.MAX_SAFE_INTEGER : Math.min(100, Math.max(1, requestedPageSize || 24))
  const info = NEXT_REGIONS[region] || NEXT_REGIONS.kazakhstan
  const sources = getKidsSources(category)
  const cacheKey = `next-kids:v3:${region}:${category}`
  let allProducts = nextServerCache.get(cacheKey)
  let isComplete = Boolean(allProducts)

  if (!allProducts) {
    const bySku = new Map<string, Product>()
    isComplete = true
    for (const source of sources) {
      const result = await fetchKidsSource(info, source)
      isComplete &&= result.complete
      for (const summary of result.summaries) {
        const product = toProduct(summary, region, info, source.category)
        if (!product) continue
        const existing = bySku.get(product.sku)
        bySku.set(product.sku, existing ? mergeProduct(existing, product) : product)
      }
    }
    allProducts = [...bySku.values()]
    if (!allProducts.length) throw new Error(`[Next Scraper Error] Детские страницы Next не вернули распознаваемых товаров для ${region}.`)
    if (isComplete) nextServerCache.set(cacheKey, allProducts)
  }

  let filtered = [...allProducts]
  if (options.size && options.size !== 'all') filtered = filtered.filter((product) => product.sizes.includes(options.size!))
  const min = options.priceMinRub ?? options.priceMin
  const max = options.priceMaxRub ?? options.priceMax
  if (min && min > 0) filtered = filtered.filter((product) => product.priceRub >= min)
  if (max && max > 0) filtered = filtered.filter((product) => product.priceRub <= max)
  if (options.search?.trim()) {
    const query = options.search.toLocaleLowerCase()
    filtered = filtered.filter((product) => `${product.title} ${product.description} ${product.sku}`.toLocaleLowerCase().includes(query))
  }
  if (options.sortBy === 'price_asc') filtered.sort((a, b) => a.priceRub - b.priceRub)
  if (options.sortBy === 'price_desc') filtered.sort((a, b) => b.priceRub - a.priceRub)
  if (options.sortBy === 'newest') filtered.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)))
  const prices = filtered.map((product) => product.priceRub)
  const start = (page - 1) * pageSize
  const countCategory = (value: ProductCategory) => allProducts.filter((product) => product.category === value).length
  return {
    products: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount: filtered.length,
    hasMore: start + pageSize < filtered.length,
    availableSubcategories: [
      { id: 'all', label: 'Все товары', count: filtered.length },
      { id: 'older_girls', label: 'Older Girls (3–16 лет)', count: countCategory('girl') },
      { id: 'younger_girls', label: 'Younger Girls (3M–6 лет)', count: countCategory('girl') },
      { id: 'baby', label: 'Baby (0–3 года)', count: countCategory('mini') + countCategory('baby_girl') + countCategory('baby_boy') },
    ],
    availableSizes: Array.from(new Set(filtered.flatMap((product) => product.sizes))).sort(),
    priceRangeRub: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    isComplete,
  }
}
