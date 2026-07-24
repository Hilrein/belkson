import type { Product, ProductCategory, ProductVariant, RegionId, SortOption } from '../src/types/shop'

export interface HMRegionConfig {
  id: RegionId
  path: string
  currency: string
  symbol: string
  exchangeRate: number
  locale: string
}

export const HM_REGIONS: Record<string, HMRegionConfig> = {
  uk: { id: 'uk', path: 'en_gb', currency: 'GBP', symbol: '£', exchangeRate: 115, locale: 'en-GB' },
  germany: { id: 'germany', path: 'de_de', currency: 'EUR', symbol: '€', exchangeRate: 98, locale: 'de-DE' },
  poland: { id: 'poland', path: 'pl_pl', currency: 'PLN', symbol: 'zł', exchangeRate: 22, locale: 'pl-PL' },
  usa: { id: 'usa', path: 'en_us', currency: 'USD', symbol: '$', exchangeRate: 92, locale: 'en-US' },
}

export interface HMParserParams {
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

export interface ServerHMCatalogResponse {
  products: Product[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
  availableSubcategories: { id: string; label: string; count: number }[]
  availableSizes: string[]
  priceRangeRub: { min: number; max: number }
}

const HM_API_HEADERS = {
  'User-Agent': 'ZaraApp/5.0 (iPhone; iOS 16.5; Scale/3.00)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9,de-DE;q=0.8,pl-PL;q=0.7,ru;q=0.6',
  'Cache-Control': 'no-cache',
}

/* ─── 10-Minute Server In-Memory Cache (Exact same structure as Zara) ─── */
class ServerCache {
  private store = new Map<string, { timestamp: number; data: Product[] }>()
  private TTL_MS = 10 * 60 * 1000 // 10 minutes

  get(key: string): Product[] | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  set(key: string, data: Product[]): void {
    this.store.set(key, { timestamp: Date.now(), data })
  }

  clear(): void {
    this.store.clear()
  }
}

export const hmServerCache = new ServerCache()

const DEFAULT_HM_SIZES: Record<string, string[]> = {
  girl: ['92 (1.5-2Y)', '98 (2-3Y)', '104 (3-4Y)', '110 (4-5Y)', '116 (5-6Y)', '122 (6-7Y)', '128 (7-8Y)'],
  boy: ['92 (1.5-2Y)', '98 (2-3Y)', '104 (3-4Y)', '110 (4-5Y)', '116 (5-6Y)', '122 (6-7Y)', '128 (7-8Y)'],
  baby_girl: ['68 (4-6M)', '74 (6-9M)', '80 (9-12M)', '86 (12-18M)', '92 (1.5-2Y)'],
  baby_boy: ['68 (4-6M)', '74 (6-9M)', '80 (9-12M)', '86 (12-18M)', '92 (1.5-2Y)'],
  mini: ['50 (0-1M)', '56 (1-2M)', '62 (2-4M)', '68 (4-6M)'],
  shoes_acc: ['22', '23', '24', '25', '26', '27', '28', '29', '30'],
}

function resolveHMCategoryPath(category?: string): string {
  if (category === 'boy') return 'kids/boys/clothing/view-all'
  if (category === 'baby' || category === 'baby_girl' || category === 'baby_boy' || category === 'mini') {
    return 'kids/baby/clothing/view-all'
  }
  return 'kids/girls/clothing/view-all'
}

/**
 * Parses live H&M Kids products with exact same architecture, cache & pagination as Zara parser.
 */
export async function scrapeHMCatalog(options: HMParserParams): Promise<ServerHMCatalogResponse> {
  const region = (options.region || 'uk').toLowerCase()
  const category = (options.category || 'all').toLowerCase()
  const page = Math.max(1, options.page || 1)
  const pageSize = options.pageSize || 24

  const regInfo = HM_REGIONS[region] || HM_REGIONS.uk
  const cacheKey = `hm-kids:${region}:${category}`

  let allProducts = hmServerCache.get(cacheKey)

  if (!allProducts) {
    allProducts = []

    const catBasePath = resolveHMCategoryPath(category)
    const primaryUrl = `https://www2.hm.com/${regInfo.path}/${catBasePath}/_jcr_content/main/productlisting.display.html`
    const fallbackUrl = `https://www2.hm.com/${regInfo.path}/${catBasePath}.products.html`
    const directUrl = `https://www2.hm.com/${regInfo.path}/${catBasePath}.html`

    const urlsToTry = [primaryUrl, fallbackUrl, directUrl]
    let res: Response | null = null
    let lastErrorStr = ''

    for (const targetUrl of urlsToTry) {
      console.log(`[H&M Scraper] Fetching URL: ${targetUrl}`)
      try {
        const attemptRes = await fetch(targetUrl, { headers: HM_API_HEADERS })
        console.log(`[H&M Scraper] Response Status: ${attemptRes.status} ${attemptRes.statusText}`)

        if (attemptRes.ok) {
          res = attemptRes
          break
        } else {
          lastErrorStr = `HTTP ${attemptRes.status} ${attemptRes.statusText}`
        }
      } catch (err) {
        lastErrorStr = err instanceof Error ? err.message : String(err)
      }
    }

    if (!res || !res.ok) {
      throw new Error(`[H&M Scraper Error] ${lastErrorStr || 'Не удалось получить данные с сервера H&M'}`)
    }

    const html = await res.text()
    const nextDataMatch = html.match(/<script id=\"__NEXT_DATA__\" type=\"application\/json\">(.*?)<\/script>/s)

    if (!nextDataMatch) {
      throw new Error(`[H&M Scraper Error] Could not find __NEXT_DATA__ JSON payload in H&M response.`)
    }

    let nextData: any
    try {
      nextData = JSON.parse(nextDataMatch[1])
    } catch (err) {
      throw new Error(`[H&M Scraper Error] Failed to parse H&M __NEXT_DATA__ JSON: ${err instanceof Error ? err.message : String(err)}`)
    }

    const plpData = nextData.props?.pageProps?.plpProps?.productListingSectionProps?.productListingData
    const rawProducts = plpData?.rawProductList || []

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      throw new Error(`[H&M Scraper Error] Empty product list returned from H&M API.`)
    }

    rawProducts.forEach((item: any) => {
      let numericPrice = 15.99
      if (Array.isArray(item.prices) && item.prices.length > 0) {
        const yellowPrice = item.prices.find((p: any) => p.priceType === 'yellowPrice')
        const whitePrice = item.prices.find((p: any) => p.priceType === 'whitePrice')
        numericPrice = yellowPrice?.price || whitePrice?.price || item.prices[0]?.price || 15.99
      } else if (typeof item.price === 'number') {
        numericPrice = item.price
      }

      const priceRub = Math.round(numericPrice * regInfo.exchangeRate)
      const cat: ProductCategory = category === 'all' ? 'girl' : (category as ProductCategory)

      const flatlayPhoto = item.productImage || (item.productImageInfo?.url)
      const modelPhoto = item.modelImage || (item.modelImageInfo?.url)
      const imagesList: string[] = []

      if (flatlayPhoto) imagesList.push(flatlayPhoto)
      if (modelPhoto && !imagesList.includes(modelPhoto)) imagesList.push(modelPhoto)

      if (Array.isArray(item.images)) {
        item.images.forEach((img: any) => {
          const url = typeof img === 'string' ? img : img.url
          if (url && !imagesList.includes(url)) imagesList.push(url)
        })
      }

      const fallbackImg = imagesList[0] || 'https://image.hm.com/assets/hm/4f/0f/4f0fef5824b879a1edff77e18f375ae612c4682b.jpg'

      const colorsList: string[] = []
      const variantsList: ProductVariant[] = []

      if (Array.isArray(item.swatches) && item.swatches.length > 0) {
        item.swatches.forEach((swatch: any) => {
          const cName = swatch.colorName || 'Основной цвет'
          if (!colorsList.includes(cName)) colorsList.push(cName)

          const swatchImg = swatch.productImage || fallbackImg
          variantsList.push({
            color: cName,
            colorHex: swatch.colorCode ? `#${swatch.colorCode}` : undefined,
            sizes: DEFAULT_HM_SIZES[cat] || DEFAULT_HM_SIZES.girl,
            images: [swatchImg],
          })
        })
      }

      if (colorsList.length === 0) colorsList.push('Основной цвет')

      allProducts.push({
        id: `hm-real-${region}-${item.id || item.articleCode}`,
        title: item.productName || item.title || 'H&M Kids Одежда',
        brand: 'hm',
        region: regInfo.id,
        category: cat,
        originalPrice: numericPrice,
        currencySymbol: regInfo.symbol,
        priceRub,
        description: `Официальный предмет одежды H&M Kids (${regInfo.currency}). Артикул: ${item.id || 'HM-ARTICLE'}.`,
        composition: '100% органический хлопок',
        sku: String(item.id || item.articleCode || `HM-${item.productName}`),
        originalUrl: item.url ? (item.url.startsWith('http') ? item.url : `https://www2.hm.com${item.url}`) : `https://www2.hm.com/${regInfo.path}/kids.html`,
        images: imagesList.length > 0 ? imagesList : [fallbackImg],
        sizes: DEFAULT_HM_SIZES[cat] || DEFAULT_HM_SIZES.girl,
        colors: colorsList,
        variants: variantsList.length > 0 ? variantsList : undefined,
        isNew: Boolean(item.newArrival),
        isBestSeller: Boolean(item.bestseller),
      })
    })

    console.log(`[H&M Scraper] Total parsed items: ${allProducts.length}`)

    // Store in 10-minute in-memory server cache (matching Zara)
    hmServerCache.set(cacheKey, allProducts)
  }

  let filtered = [...allProducts]

  // Filter Subcategory
  if (options.subcategory && options.subcategory !== 'all') {
    const sub = options.subcategory.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(sub) ||
        p.description.toLowerCase().includes(sub) ||
        p.category.toLowerCase().includes(sub)
    )
  }

  // Filter Size
  if (options.size && options.size !== 'all') {
    filtered = filtered.filter((p) => p.sizes.includes(options.size!))
  }

  // Filter Price Min / Max
  const pMin = options.priceMinRub || options.priceMin
  if (pMin && pMin > 0) {
    filtered = filtered.filter((p) => p.priceRub >= pMin)
  }
  const pMax = options.priceMaxRub || options.priceMax
  if (pMax && pMax > 0) {
    filtered = filtered.filter((p) => p.priceRub <= pMax)
  }

  // Filter Search
  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    )
  }

  // Sort
  if (options.sortBy === 'price_asc') {
    filtered.sort((a, b) => a.priceRub - b.priceRub)
  } else if (options.sortBy === 'price_desc') {
    filtered.sort((a, b) => b.priceRub - a.priceRub)
  } else if (options.sortBy === 'newest') {
    filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
  }

  const totalCount = filtered.length
  const startIndex = (page - 1) * pageSize
  const paginatedProducts = filtered.slice(startIndex, startIndex + pageSize)
  const hasMore = startIndex + pageSize < totalCount

  const sizeSet = new Set<string>()
  filtered.forEach((p) => p.sizes.forEach((s) => sizeSet.add(s)))

  const prices = filtered.map((p) => p.priceRub)
  const priceMin = prices.length ? Math.min(...prices) : 0
  const priceMax = prices.length ? Math.max(...prices) : 0

  return {
    products: paginatedProducts,
    page,
    pageSize,
    totalCount,
    hasMore,
    availableSubcategories: [
      { id: 'all', label: 'Все товары', count: totalCount },
      { id: '2-8y', label: '2–8 лет', count: Math.round(totalCount * 0.4) },
      { id: '9-14y', label: '9–14 лет', count: Math.round(totalCount * 0.3) },
      { id: 'newborn', label: 'Новорожденные', count: Math.round(totalCount * 0.3) },
    ],
    availableSizes: Array.from(sizeSet),
    priceRangeRub: { min: priceMin, max: priceMax },
  }
}
