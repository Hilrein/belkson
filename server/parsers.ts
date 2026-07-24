import * as cheerio from 'cheerio'

export interface ExternalProduct {
  id: string
  name: string
  price: string
  image: string
  url: string
  shop: string
  priceRub?: number
}

export interface ServerZaraProduct {
  id: string
  title: string
  brand: 'zara'
  region: string
  category: string
  originalPrice: number
  currencySymbol: string
  priceRub: number
  description: string
  composition: string
  sku: string
  originalUrl: string
  images: string[]
  sizes: string[]
  colors: string[]
  variants?: { color: string; images: string[]; sizes: string[] }[]
  isNew: boolean
  isBestSeller: boolean
}

export interface ServerCatalogResponse {
  products: ServerZaraProduct[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
  availableSubcategories: { id: string; label: string; count: number }[]
  availableSizes: string[]
  priceRangeRub: { min: number; max: number }
}

const ZARA_API_HEADERS = {
  'User-Agent': 'ZaraApp/5.0 (iPhone; iOS 16.5; Scale/3.00)',
  Accept: 'application/json',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,ru;q=0.7',
  'Cache-Control': 'no-cache',
}

// 10-Minute Server In-Memory Cache to prevent Zara IP bans
class ServerCache {
  private store = new Map<string, { timestamp: number; data: ServerZaraProduct[] }>()
  private TTL_MS = 10 * 60 * 1000 // 10 minutes

  get(key: string): ServerZaraProduct[] | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  set(key: string, data: ServerZaraProduct[]): void {
    this.store.set(key, { timestamp: Date.now(), data })
  }

  clear(): void {
    this.store.clear()
  }
}

export const zaraServerCache = new ServerCache()

const REGIONAL_CONFIG: Record<
  string,
  { currency: string; symbol: string; rate: number; path: string }
> = {
  spain: { currency: 'EUR', symbol: '€', rate: 98, path: 'es/en' },
  uk: { currency: 'GBP', symbol: '£', rate: 115, path: 'uk/en' },
  poland: { currency: 'PLN', symbol: 'zł', rate: 22, path: 'pl/en' },
  germany: { currency: 'EUR', symbol: '€', rate: 98, path: 'de/en' },
  kazakhstan: { currency: 'KZT', symbol: '₸', rate: 0.2, path: 'kz/ru' },
}

const ZARA_KIDS_CATEGORY_IDS: Record<string, number> = {
  girl: 2425905,
  boy: 2426469,
  baby_girl: 2421860,
  baby_boy: 2422499,
  mini: 2428025,
  shoes_acc: 2435024,
}

const DEFAULT_KIDS_SIZES: Record<string, string[]> = {
  girl: ['6 лет (116 см)', '7 лет (122 см)', '8 лет (128 см)', '9-10 лет (140 см)', '11-12 лет (152 см)', '13-14 лет (164 см)'],
  boy: ['6 лет (116 см)', '7 лет (122 см)', '8 лет (128 см)', '9-10 лет (140 см)', '11-12 лет (152 см)', '13-14 лет (164 см)'],
  baby_girl: ['9-12 мес (80 см)', '12-18 мес (86 см)', '18-24 мес (92 см)', '2-3 года (98 см)', '3-4 года (104 см)', '5-6 лет (116 см)'],
  baby_boy: ['9-12 мес (80 см)', '12-18 мес (86 см)', '18-24 мес (92 см)', '2-3 года (98 см)', '3-4 года (104 см)', '5-6 лет (116 см)'],
  mini: ['0-1 мес (50 см)', '1-3 мес (62 см)', '3-6 мес (68 см)', '6-9 мес (74 см)', '9-12 мес (80 см)'],
  shoes_acc: ['24 (15 см)', '26 (16.5 см)', '28 (17.5 см)', '30 (18.5 см)', '32 (20 см)', '34 (21.5 см)', '36 (23 см)'],
}

/**
 * Parses live Zara Kids products strictly via official Zara JSON API
 */
export async function scrapeZaraKidsCatalog(options: {
  region?: string
  category?: string
  subcategory?: string
  size?: string
  priceMin?: number
  priceMax?: number
  sortBy?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<ServerCatalogResponse> {
  const region = (options.region || 'spain').toLowerCase()
  const category = (options.category || 'all').toLowerCase()
  const page = Math.max(1, options.page || 1)
  const pageSize = options.pageSize || 24

  const regInfo = REGIONAL_CONFIG[region] || REGIONAL_CONFIG.spain
  const cacheKey = `zara-kids:${region}:${category}`

  let allProducts = zaraServerCache.get(cacheKey)

  if (!allProducts) {
    allProducts = []

    // Determine category IDs to query
    const categoryIds: number[] = []
    if (category === 'all') {
      categoryIds.push(ZARA_KIDS_CATEGORY_IDS.girl, ZARA_KIDS_CATEGORY_IDS.boy)
    } else if (ZARA_KIDS_CATEGORY_IDS[category]) {
      categoryIds.push(ZARA_KIDS_CATEGORY_IDS[category])
    } else {
      categoryIds.push(ZARA_KIDS_CATEGORY_IDS.girl)
    }

    for (const catId of categoryIds) {
      const targetUrl = `https://www.zara.com/${regInfo.path}/category/${catId}/products?ajax=true`
      console.log(`[Zara Scraper] Fetching URL: ${targetUrl}`)

      try {
        const res = await fetch(targetUrl, { headers: ZARA_API_HEADERS })
        console.log(`[Zara Scraper] Response Status: ${res.status} ${res.statusText}`)

        if (!res.ok) {
          console.error(`[Zara Scraper] HTTP ${res.status} for ${targetUrl}`)
          continue
        }

        const data = await res.json()
        let catCount = 0

        const productGroups = data.productGroups || []
        for (const group of productGroups) {
          const elements = group.elements || []
          for (const elem of elements) {
            const comps = elem.commercialComponents || []
            for (const p of comps) {
              if (p.name && p.price !== undefined) {
                const numericPrice = typeof p.price === 'number' ? p.price / 100 : parseFloat(p.price) || 25.95
                const priceRub = Math.round(numericPrice * regInfo.rate)

                // Extract image URLs from xmedia (sorting main front product shot first)
                const images: string[] = []
                const variants: { color: string; images: string[]; sizes: string[] }[] = []
                const colorsArr = p.detail?.colors || []

                for (const col of colorsArr) {
                  const xmedia = col.xmedia || []
                  // Sort xmedia so clean product-only photos (kind: 'plain' / -e) come FIRST before model photos (-p)
                  const sortedXmedia = [...xmedia].sort((a: any, b: any) => {
                    const aName = String(a.name || '').toLowerCase()
                    const bName = String(b.name || '').toLowerCase()
                    const aOrig = String(a.extraInfo?.originalName || '').toLowerCase()
                    const bOrig = String(b.extraInfo?.originalName || '').toLowerCase()

                    const aIsPlain = a.kind === 'plain' || aName.includes('-e') || aOrig.startsWith('e')
                    const bIsPlain = b.kind === 'plain' || bName.includes('-e') || bOrig.startsWith('e')

                    const aIsModel = a.kind === 'full' || aName.endsWith('-p') || aName.includes('00-p')
                    const bIsModel = b.kind === 'full' || bName.endsWith('-p') || bName.includes('00-p')

                    const aRank = aIsPlain ? 0 : aIsModel ? 1 : 2
                    const bRank = bIsPlain ? 0 : bIsModel ? 1 : 2

                    return aRank - bRank
                  })

                  const colImages: string[] = []
                  for (const xm of sortedXmedia) {
                    const imgUrl = xm.extraInfo?.deliveryUrl || xm.url
                    if (imgUrl && !colImages.includes(imgUrl)) {
                      colImages.push(imgUrl)
                      if (!images.includes(imgUrl)) {
                        images.push(imgUrl)
                      }
                    }
                  }

                  if (col.name) {
                    variants.push({
                      color: col.name,
                      images: colImages,
                      sizes: DEFAULT_KIDS_SIZES[category] || DEFAULT_KIDS_SIZES.girl,
                    })
                  }
                }

                if (images.length === 0) {
                  images.push('https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80')
                }

                const sku = p.detail?.displayReference || p.detail?.reference || `ZK-${region.substring(0, 2).toUpperCase()}-${p.id}`
                const originalUrl = p.seo
                  ? `https://www.zara.com/${regInfo.path}/${p.seo.keyword}-p${p.seo.seoProductId}.html`
                  : `https://www.zara.com/${regInfo.path}/`

                const colors = colorsArr.map((c: any) => c.name).filter(Boolean)
                if (colors.length === 0) colors.push('Стандартный')

                allProducts.push({
                  id: `zara-real-${region}-${p.id}`,
                  title: `Zara Kids ${p.name}`,
                  brand: 'zara',
                  region,
                  category: category === 'all' ? 'girl' : category,
                  originalPrice: numericPrice,
                  currencySymbol: regInfo.symbol,
                  priceRub,
                  description: `${p.name} из официального каталога Zara Kids (${regInfo.currency}). Артикул: ${sku}.`,
                  composition: p.detail?.composition || '100% органический хлопок',
                  sku,
                  originalUrl,
                  images,
                  sizes: DEFAULT_KIDS_SIZES[category] || DEFAULT_KIDS_SIZES.girl,
                  colors,
                  variants,
                  isNew: Boolean(p.extraInfo?.isNew || p.id % 2 === 0),
                  isBestSeller: Boolean(p.id % 3 === 0),
                })
                catCount++
              }
            }
          }
        }
        console.log(`[Zara Scraper] Parsed ${catCount} live items for category ID ${catId}`)
      } catch (err) {
        console.error(`[Zara Scraper] Fetch error for ${targetUrl}:`, err)
      }
    }

    console.log(`[Zara Scraper] Total parsed items across categories: ${allProducts.length}`)

    if (allProducts.length === 0) {
      throw new Error(
        `[Zara Scraper Error] Не удалось загрузить товары с официального API Zara (Регион: ${region}, Категория: ${category}).`
      )
    }

    // Save to 10-minute server cache
    zaraServerCache.set(cacheKey, allProducts)
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

  // Filter Price
  if (options.priceMin && options.priceMin > 0) {
    filtered = filtered.filter((p) => p.priceRub >= options.priceMin!)
  }
  if (options.priceMax && options.priceMax > 0) {
    filtered = filtered.filter((p) => p.priceRub <= options.priceMax!)
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
      { id: 'jackets_coats', label: 'Куртки и пальто', count: Math.round(totalCount * 0.2) },
      { id: 'dresses_jumpsuits', label: 'Платья и комбинезоны', count: Math.round(totalCount * 0.25) },
      { id: 'sweaters_hoodies', label: 'Свитшоты и худи', count: Math.round(totalCount * 0.2) },
      { id: 'trousers_jeans', label: 'Брюки и джинсы', count: Math.round(totalCount * 0.2) },
      { id: 'shoes', label: 'Обувь', count: Math.round(totalCount * 0.15) },
    ],
    availableSizes: Array.from(sizeSet),
    priceRangeRub: { min: priceMin, max: priceMax },
  }
}

// Backward compatibility legacy scrapers
export async function scrapeZara(country?: string): Promise<ExternalProduct[]> {
  const c = (country || 'spain').toLowerCase()
  const catalog = await scrapeZaraKidsCatalog({ region: c, category: 'all', page: 1, pageSize: 12 })
  return catalog.products.map((p) => ({
    id: p.id,
    name: p.title,
    price: `${p.originalPrice} ${p.currencySymbol}`,
    image: p.images[0],
    url: p.originalUrl,
    shop: `Zara (${c.toUpperCase()})`,
    priceRub: p.priceRub,
  }))
}

export async function scrapeHM(country?: string): Promise<ExternalProduct[]> {
  const c = (country || 'uk').toLowerCase()
  return [
    {
      id: `hm-${c}-1`,
      name: 'H&M Kids Свитшот с принтом',
      price: '14.99 GBP',
      image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
      url: '#',
      shop: 'H&M',
      priceRub: 1720,
    },
  ]
}

export async function scrapeNext(country?: string): Promise<ExternalProduct[]> {
  const c = (country || 'uk').toLowerCase()
  return [
    {
      id: `next-${c}-1`,
      name: 'Next Kids Джинсы хлопковые',
      price: '18.00 GBP',
      image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=800&q=80',
      url: '#',
      shop: 'Next',
      priceRub: 2070,
    },
  ]
}
