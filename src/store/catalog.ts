/** Shared catalog types + display helpers. Product data lives in Neon via /api. */

export type ProductStatus = 'В наличии' | 'Мало' | 'Нет в наличии'
export type CurrencyCode = 'RUB' | 'EUR' | 'USD'

export type CatalogProduct = {
  id: number
  name: string
  sku: string
  /** Price amount in RUB (base currency for storage) */
  priceRub: number
  category: string
  subcategory?: string
  color: string
  /** Brand name (e.g. "Zara", "Belkson") */
  brand?: string
  /** Available sizes, e.g. ["74-80", "80-86"] */
  sizes?: string[]
  /** Additional photos (main photo stays in `image`) */
  images?: string[]
  status: ProductStatus
  image: string
  /** Show in «Новинки» */
  isNew: boolean
  /** Show in «Наши любимчики» */
  isFavorite: boolean
  /** Optional label; NEW is only shown when isNew is true */
  badge?: string
}

export const CATEGORIES = [
  'Малыши',
  'Девочки',
  'Мальчики',
] as const

export const SUBCATEGORIES = [
  'Комбинезоны и боди',
  'Костюмы',
  'Платья и юбки',
  'Футболки',
  'Кофты и свитшоты',
  'Брюки, джинсы, шорты',
  'Нижнее белье и пижамы',
  'Верхняя одежда',
  'Обувь',
  'Головные уборы',
  'Носки и колготки',
] as const

export type Subcategory = (typeof SUBCATEGORIES)[number]

/** Normalize category for compare / URL (trim, collapse spaces, casefold). */
export function normalizeCategory(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru-RU')
}

export function categoriesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeCategory(a)
  const nb = normalizeCategory(b)
  return na.length > 0 && na === nb
}

export const CURRENCIES: {
  code: CurrencyCode
  label: string
  symbol: string
}[] = [
  { code: 'RUB', label: 'Российский рубль (₽)', symbol: '₽' },
  { code: 'EUR', label: 'Евро (€)', symbol: '€' },
  { code: 'USD', label: 'Доллар США ($)', symbol: '$' },
]

/** Rough rates: 1 unit of currency → RUB */
const TO_RUB: Record<CurrencyCode, number> = {
  RUB: 1,
  EUR: 98,
  USD: 90,
}

/** Placeholder when product has no image yet */
const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgcng9IjEyIiBmaWxsPSIjZThlYWVkIi8+PHBhdGggZD0iTTE3MCAyMjAgbDMwIDQwIGwyMC0xNSBsNDAgNTUgSDE0MHoiIGZpbGw9IiNiZGMxYzYiLz48Y2lyY2xlIGN4PSIyNTAiIGN5PSIyMTAiIHI9IjE4IiBmaWxsPSIjYmRjMWM2Ii8+PC9zdmc+'

export function formatPrice(priceRub: number, currency: CurrencyCode): string {
  const amount = priceRub / TO_RUB[currency]
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '₽'

  if (currency === 'RUB') {
    const rounded = Math.round(amount)
    return `${rounded.toLocaleString('ru-RU')} ${symbol}`
  }

  return `${symbol}${amount.toFixed(2)}`
}

export function defaultProductImage() {
  return PLACEHOLDER
}
