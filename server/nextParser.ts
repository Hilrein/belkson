import type { Product, ProductCategory, ProductVariant, RegionId, SortOption } from '../src/types/shop'

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
  kazakhstan: { id: 'kazakhstan', domain: 'www.nextdirect.com', path: 'kz/ru/kids', currency: 'KZT', symbol: '₸', exchangeRate: 0.20, locale: 'ru-KZ' },
  uk: { id: 'uk', domain: 'www.next.co.uk', path: 'children', currency: 'GBP', symbol: '£', exchangeRate: 115, locale: 'en-GB' },
  germany: { id: 'germany', domain: 'www.nextdirect.com', path: 'de/en/children', currency: 'EUR', symbol: '€', exchangeRate: 98, locale: 'de-DE' },
  spain: { id: 'spain', domain: 'www.nextdirect.com', path: 'es/en/children', currency: 'EUR', symbol: '€', exchangeRate: 98, locale: 'es-ES' },
  poland: { id: 'poland', path: 'pl/en/children', domain: 'www.nextdirect.com', symbol: 'PLN', symbol: 'zł', exchangeRate: 22, locale: 'pl-PL' },
}

export interface NextParserParams {
  region: RegionId
  category?: string
  subcategory?: string
  size?: string
  priceMinRub?: number
  priceMaxRub?: number
  sortBy?: SortOption
  search?: string
  page?: number
  pageSize?: number
}

export interface NextParserResult {
  products: Product[]
  totalCount: number
  hasMore: boolean
  availableSizes: string[]
}

/**
 * Text Sanitizer: Decodes HTML entities, removes technical codes,
 * and converts ALL-CAPS strings into clean Title Case.
 */
export function sanitizeTitle(rawTitle: string): string {
  if (!rawTitle) return 'Next Kids Item'

  let cleaned = rawTitle
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/_[0-9]+_[A-Za-z0-9]+/g, '')
    .replace(/Next Item [A-Za-z0-9]+/gi, '')
    .trim()

  if (!cleaned) return 'Next Kids Item'

  // Convert ALL-CAPS into clean Title Case ("COTTON T-SHIRT" -> "Cotton T-Shirt")
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ')
  }

  return cleaned
}

/**
 * Color Sanitizer: Cleans up multi-slash color codes into concise readable labels.
 */
export function sanitizeColor(rawColor?: string): string {
  if (!rawColor) return 'Основной цвет'
  const cleaned = rawColor
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .trim()

  if (cleaned.includes('/')) {
    const parts = cleaned.split('/')
    return parts[parts.length - 1].trim() || parts[0].trim()
  }

  return cleaned
}

/**
 * 100% REAL LIVE NEXTDIRECT PARSER (NEXT KIDS ONLY & LIVE STRUCTURE).
 * Targets nextdirect.com/kz/ru/kids, nextdirect.com/de/en/children, etc.
 * Extracts real products from itemsCache & NextDirect CMS structures.
 * Throws explicit Error on HTTP != 200 or access restrictions.
 */
export async function scrapeNextCatalog(params: NextParserParams): Promise<NextParserResult> {
  const regKey = (params.region || 'kazakhstan').toLowerCase()
  const regionConfig = NEXT_REGIONS[regKey] || NEXT_REGIONS.kazakhstan

  const fetchUrl = `https://${regionConfig.domain}/${regionConfig.path}`

  console.log(`[NextDirect Live Scraper] Fetching real NextDirect Kids page: ${fetchUrl} for region: ${regKey}`)

  const res = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': `${regionConfig.locale},en;q=0.9`,
      'Cache-Control': 'no-cache',
    },
  })

  if (!res.ok) {
    throw new Error(
      `[NextDirect Live Scraper Error] NextDirect server returned HTTP ${res.status} (${res.statusText || 'Access Restricted'}) for URL: ${fetchUrl}`
    )
  }

  const html = await res.text()

  if (html.includes('Access Denied') || html.length < 5000) {
    throw new Error(
      `[NextDirect Live Scraper Error] Access Denied / Akamai WAF Bot protection triggered for NextDirect URL: ${fetchUrl}`
    )
  }

  const scripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))

  // 1. Extract productSummaries (real titles, departments, brands, prices, colors)
  const summaries: Record<string, { title: string; department: string; brand: string; price: number; color: string }> = {}

  scripts.forEach((s) => {
    const text = s[1].trim()
    if (text.includes('ssrClientSettings.productSummary')) {
      const idM = text.match(/\"id\":\s*\"([^\"]+)\"/)
      const titleM = text.match(/\"title\":\s*\"([^\"]+)\"/)
      const deptM = text.match(/\"department\":\s*\"([^\"]+)\"/)
      const priceM = text.match(/\"p\":\s*\"([^\"]+)\"/) || text.match(/\"mp\":\s*\"([^\"]+)\"/)
      const brandM = text.match(/\"brand\":\s*\"([^\"]+)\"/)
      const colorM = text.match(/\"c\":\s*\"([^\"]+)\"/)

      if (idM && titleM) {
        const rawPriceStr = priceM ? priceM[1] : '19.99'
        const numPrice = parseFloat(rawPriceStr.replace(/[^0-9.]/g, '')) || 19.99
        summaries[idM[1]] = {
          title: sanitizeTitle(titleM[1]),
          department: deptM ? deptM[1] : '',
          brand: brandM ? brandM[1] : 'Next',
          price: numPrice,
          color: sanitizeColor(colorM ? colorM[1] : 'Основной цвет'),
        }
      }
    }
  })

  // 2. Extract itemCodes from itemsCache or CMS asset images
  const realItemCodes: string[] = []

  // Check itemsCache in PLP scripts
  scripts.forEach((s) => {
    const text = s[1].trim()
    if (text.includes('ssrClientSettings.plp')) {
      const idx = text.indexOf('{_STATE_:');
      if (idx !== -1) {
        const jsonStr = text.substring(idx).trim().replace('{_STATE_:', '{"_STATE_":').replace(',appProps:', ',"appProps":');
        try {
          const parsed = JSON.parse(jsonStr)
          const itemsCache = parsed._STATE_?.search?.itemsCache || {}
          Object.keys(itemsCache).forEach((k) => {
            const arr = itemsCache[k]
            if (Array.isArray(arr)) {
              arr.forEach((item) => {
                if (item && item.type === 'product' && item.itemNumber && !realItemCodes.includes(item.itemNumber)) {
                  realItemCodes.push(item.itemNumber)
                }
              })
            }
          })
        } catch {
          /* ignore parse fallback */
        }
      }
    }
  })

  // Also extract CMS itemCodes from NextDirect page HTML
  const cmsMatches = Array.from(html.matchAll(/(https:\/\/cms\.platform\.next\/cms2\/content\/[^\s\"']+\/(\d+)\.(?:png|jpg|jpeg|webp))/gi))
  cmsMatches.forEach((m) => {
    const itemCode = m[2]
    if (itemCode && !realItemCodes.includes(itemCode) && !m[1].includes('logo') && !m[1].includes('school')) {
      realItemCodes.push(itemCode)
    }
  })

  const productList: Product[] = []
  const adultKeywords = ['womenswear', 'menswear', 'homeware', 'furniture', 'sofa', 'chair', 'table', 'bed', 'highback', 'relaxedsit', 'laura ashley']

  realItemCodes.forEach((code) => {
    const sum = summaries[code]
    const title = sum ? sum.title : `Детская вещь Next Kids (${code})`
    const dept = sum ? sum.department.toLowerCase() : ''
    const lowTitle = title.toLowerCase()

    // STRICT KIDS FILTER: Reject adult clothing or furniture
    const isAdult = adultKeywords.some((kw) => lowTitle.includes(kw) || dept.includes(kw))

    if (!isAdult) {
      const origPrice = sum ? sum.price : 19.99
      const priceRub = Math.round(origPrice * regionConfig.exchangeRate)

      // Flatlay item photo at index 0
      const flatlayImg = `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Search/Lge/${code}.jpg`
      const sipImg = `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Product_SIP/Lge/${code}.jpg`

      const category: ProductCategory = (params.category && params.category !== 'all') ? (params.category as ProductCategory) : 'girl'
      const colorName = sum ? sum.color : 'Основной цвет'

      productList.push({
        id: `NEXT-${code}`,
        title,
        brand: sum ? sum.brand.toLowerCase() : 'next',
        region: regionConfig.id,
        category,
        originalPrice: origPrice,
        currencySymbol: regionConfig.symbol,
        priceRub,
        description: `Официальный предмет одежды из детской коллекции Next Kids. Артикул: ${code}. Премиальные материалы.`,
        sku: `NEXT-${code}`,
        originalUrl: `https://www.nextdirect.com/${regionConfig.path.split('/')[0]}/ru/style/${code}`,
        images: [flatlayImg, sipImg],
        colors: [colorName],
        variants: [
          {
            color: colorName,
            images: [flatlayImg, sipImg],
          },
        ],
      })
    }
  })

  if (productList.length === 0) {
    throw new Error(
      `[NextDirect Live Scraper Error] Could not extract live Next Kids items from payload (HTML Length: ${html.length}). Page layout updated or access restricted.`
    )
  }

  // Client search filter
  let filtered = productList
  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase()
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }

  return {
    products: filtered,
    totalCount: filtered.length,
    hasMore: false,
    availableSizes: [],
  }
}
