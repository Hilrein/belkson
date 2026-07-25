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
}

const NEXT_API_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ru-KZ,ru;q=0.9,en-US;q=0.8',
  'Cache-Control': 'no-cache',
}

class ServerCache {
  private store = new Map<string, { timestamp: number; data: Product[] }>()
  private readonly ttlMs = 10 * 60 * 1000

  get(key: string, allowStale = false): Product[] | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.ttlMs) {
      return allowStale ? entry.data : null
    }
    return entry.data
  }

  set(key: string, data: Product[]): void { this.store.set(key, { timestamp: Date.now(), data }) }
  clear(): void { this.store.clear() }
}

export const nextServerCache = new ServerCache()

type NextSummary = Record<string, unknown>
type SearchRequest = { term: string; category: ProductCategory }

const categoryRequests: Record<string, SearchRequest[]> = {
  girl: [{ term: 'girls clothing', category: 'girl' }],
  boy: [{ term: 'boys clothing', category: 'boy' }],
  baby_girl: [{ term: 'baby girls clothing', category: 'baby_girl' }],
  baby_boy: [{ term: 'baby boys clothing', category: 'baby_boy' }],
  mini: [{ term: 'baby clothing', category: 'mini' }],
  shoes_acc: [{ term: 'kids shoes accessories', category: 'shoes_acc' }],
  all: [
    { term: 'girls clothing', category: 'girl' },
    { term: 'boys clothing', category: 'boy' },
    { term: 'baby girls clothing', category: 'baby_girl' },
    { term: 'baby boys clothing', category: 'baby_boy' },
    { term: 'kids shoes accessories', category: 'shoes_acc' },
  ],
}

const subcategoryRequests: Record<string, SearchRequest> = {
  older_girls: { term: 'older girls clothing', category: 'girl' },
  younger_girls: { term: 'younger girls clothing', category: 'girl' },
  older_boys: { term: 'older boys clothing', category: 'boy' },
  younger_boys: { term: 'younger boys clothing', category: 'boy' },
  baby: { term: 'baby clothing', category: 'mini' },
}

function getSearchRequests(category: string, subcategory?: string): SearchRequest[] {
  const selectedSubcategory = subcategory && subcategory !== 'all' ? subcategoryRequests[subcategory] : undefined
  return selectedSubcategory ? [selectedSubcategory] : (categoryRequests[category] || categoryRequests.all)
}

/** Extract a JSON object without being confused by braces inside a product title. */
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

/**
 * Next has used both `summaryData: {...}` and `summaryData = {...}` in its PLP.
 * A script can contain many cards, so every occurrence is parsed instead of only
 * the first one (the old implementation silently skipped the rest of that script).
 */
export function extractNextSummaryData(html: string): NextSummary[] {
  const summaries: NextSummary[] = []
  const scripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1])
  for (const script of scripts) {
    const marker = /(?:["']summaryData["']|\bsummaryData\b)\s*[:=]/g
    while (marker.exec(script)) {
      const json = extractBalancedObject(script, marker.lastIndex)
      if (!json) continue
      try {
        const parsed = JSON.parse(json)
        const summary = parsed.summaryData || parsed
        if (summary && typeof summary === 'object' && Array.isArray(summary.colourways)) summaries.push(summary)
      } catch {
        // One malformed card must not discard the remaining catalogue cards.
      }
    }
  }
  return summaries
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\s/g, '')
  if (!cleaned) return null
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/,/g, '')
    : cleaned.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item.trim()]
    if (!item || typeof item !== 'object') return []
    const option = item as Record<string, unknown>
    return stringValues(option.name ?? option.label ?? option.s)
  })
}

function productFromSummary(summary: NextSummary, region: string, info: NextRegionConfig, category: ProductCategory): Product | null {
  const colourways = Array.isArray(summary.colourways) ? summary.colourways as NextSummary[] : []
  const main = colourways[0] || {}
  const itemCode = String(summary.id || main.id || '').trim()
  if (!itemCode) return null
  const originalPrice = parsePrice(main.sp ?? main.mp ?? main.p ?? summary.sp ?? summary.price)
  if (originalPrice === null) return null
  let title = String(main.t || summary.productName || summary.name || 'Одежда Next Kids').trim()
  if (title.includes(' - ')) title = title.split(' - ').slice(1).join(' - ') || title
  const colours = Array.from(new Set(colourways.map((colourway: NextSummary) => String(colourway.c || colourway.colour || '').trim()).filter(Boolean)))
  const variants: ProductVariant[] = colourways.map((colourway: NextSummary) => {
    const code = String(colourway.id || itemCode)
    const sizes = Array.from(new Set([
      ...stringValues(colourway.sizes), ...stringValues(colourway.sizeOptions), ...stringValues(colourway.s),
    ]))
    return {
      color: String(colourway.c || colourway.colour || 'Основной цвет'),
      sizes,
      images: [
        `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/SearchINT/Lge/${code}.jpg`,
        `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Product_SIP/Lge/${code}.jpg`,
      ],
    }
  })
  const sizes = Array.from(new Set([
    ...stringValues(summary.sizes),
    ...variants.flatMap((variant) => variant.sizes),
  ]))
  const baseImage = `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/SearchINT/Lge/${itemCode}.jpg`
  const productPath = String(main.url || summary.url || `style/${itemCode}`).replace(/^\//, '')

  return {
    id: `next-real-${region}-${itemCode}`,
    title,
    brand: 'next',
    region: info.id,
    category,
    originalPrice,
    currencySymbol: info.symbol,
    priceRub: Math.round(originalPrice * info.exchangeRate),
    description: `Официальный товар детской коллекции Next (${info.currency}). Артикул: ${itemCode}.`,
    sku: `NEXT-${itemCode}`,
    originalUrl: `https://${info.domain}/${info.path}/${productPath}`,
    images: [baseImage, `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Product_SIP/Lge/${itemCode}.jpg`],
    sizes,
    colors: colours.length ? colours : ['Основной цвет'],
    variants,
    isNew: Boolean(summary.showNewIn || main.showNewIn),
    isBestSeller: Boolean(summary.colourwaysHasRating || main.rating),
  }
}

function mergeProducts(existing: Product, next: Product): Product {
  return {
    ...existing,
    colors: Array.from(new Set([...existing.colors, ...next.colors])),
    sizes: Array.from(new Set([...existing.sizes, ...next.sizes])),
    variants: [...(existing.variants || []), ...(next.variants || [])].filter((variant, index, list) =>
      list.findIndex((candidate) => candidate.color === variant.color) === index),
  }
}

async function fetchSearchPage(info: NextRegionConfig, request: SearchRequest): Promise<NextSummary[]> {
  const targetUrl = new URL(`https://${info.domain}/${info.path}/search`)
  targetUrl.searchParams.set('w', request.term)
  const response = await fetch(targetUrl, { headers: { ...NEXT_API_HEADERS, 'Accept-Language': info.locale } })
  const html = await response.text()
  if (!response.ok) {
    const blocked = response.status === 403 || /access denied|captcha|robot/i.test(html)
    const reason = blocked ? 'Next заблокировал автоматический запрос (anti-bot)' : `HTTP ${response.status} ${response.statusText}`
    throw new Error(`[Next Scraper Error] ${reason}: ${targetUrl}`)
  }
  return extractNextSummaryData(html)
}

export async function scrapeNextCatalog(options: NextParserParams): Promise<ServerNextCatalogResponse> {
  const region = (options.region || 'kazakhstan').toLowerCase()
  const category = (options.category || 'all').toLowerCase()
  const page = Math.max(1, Number(options.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 24))
  const info = NEXT_REGIONS[region] || NEXT_REGIONS.kazakhstan
  const requests = getSearchRequests(category, options.subcategory)
  const cacheKey = `next-kids:v2:${region}:${category}:${options.subcategory || 'all'}`
  // Keep a stale copy as a last-resort response when Next temporarily blocks us.
  // It is preferable to showing the visitor a 502 for a catalogue that was just
  // successfully loaded a few minutes earlier.
  const staleProducts = nextServerCache.get(cacheKey, true)
  let allProducts = nextServerCache.get(cacheKey)

  if (!allProducts) {
    const results: { request: SearchRequest; summaries: NextSummary[] }[] = []
    const failures: string[] = []

    // Fetch sequentially. Five simultaneous requests to Next are much more
    // likely to trigger its rate limiting / anti-bot protection.
    for (const request of requests) {
      try {
        results.push({ request, summaries: await fetchSearchPage(info, request) })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${request.term}: ${message}`)
        console.warn(`[Next Scraper] Search segment failed (${request.term}): ${message}`)
      }
    }
    const bySku = new Map<string, Product>()
    for (const { request, summaries } of results) {
      for (const summary of summaries) {
        const product = productFromSummary(summary, region, info, request.category)
        if (!product) continue
        const previous = bySku.get(product.sku)
        bySku.set(product.sku, previous ? mergeProducts(previous, product) : product)
      }
    }
    const freshProducts = [...bySku.values()]
    if (freshProducts.length) {
      allProducts = freshProducts
      nextServerCache.set(cacheKey, allProducts)
    } else if (staleProducts?.length) {
      console.warn('[Next Scraper] Next is unavailable; serving stale catalogue cache.')
      allProducts = staleProducts
    } else {
      throw new Error(`[Next Scraper Error] Не удалось загрузить каталог Next. ${failures.join(' | ') || 'Next вернул страницу без распознаваемых карточек товаров.'}`)
    }
  }

  let filtered = [...allProducts]
  if (options.size && options.size !== 'all') filtered = filtered.filter((product) => product.sizes.includes(options.size!))
  const min = options.priceMinRub ?? options.priceMin
  const max = options.priceMaxRub ?? options.priceMax
  if (min && min > 0) filtered = filtered.filter((product) => product.priceRub >= min)
  if (max && max > 0) filtered = filtered.filter((product) => product.priceRub <= max)
  if (options.search?.trim()) {
    const term = options.search.toLocaleLowerCase()
    filtered = filtered.filter((product) => `${product.title} ${product.description} ${product.sku}`.toLocaleLowerCase().includes(term))
  }
  if (options.sortBy === 'price_asc') filtered.sort((a, b) => a.priceRub - b.priceRub)
  if (options.sortBy === 'price_desc') filtered.sort((a, b) => b.priceRub - a.priceRub)
  if (options.sortBy === 'newest') filtered.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)))

  const totalCount = filtered.length
  const start = (page - 1) * pageSize
  const prices = filtered.map((product) => product.priceRub)
  const counts = (id: string) => id === 'all' ? totalCount : allProducts!.filter((product) => product.category === id).length
  return {
    products: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount,
    hasMore: start + pageSize < totalCount,
    availableSubcategories: [
      { id: 'all', label: 'Все товары', count: counts('all') },
      { id: 'older_girls', label: 'Older Girls (3–16 лет)', count: category === 'girl' ? totalCount : 0 },
      { id: 'younger_girls', label: 'Younger Girls (3M–6 лет)', count: category === 'girl' ? totalCount : 0 },
      { id: 'baby', label: 'Baby (0–3 года)', count: allProducts.filter((product) => ['baby_girl', 'baby_boy', 'mini'].includes(product.category)).length },
    ],
    availableSizes: Array.from(new Set(filtered.flatMap((product) => product.sizes))).sort(),
    priceRangeRub: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
  }
}
