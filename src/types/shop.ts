export type StoreId = 'belkson' | 'zara' | 'hm' | 'next'
export type RegionId = 'spain' | 'uk' | 'poland' | 'germany' | 'kazakhstan'
export type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'newest'

export type ProductCategory =
  | 'all'
  | 'girl'
  | 'boy'
  | 'baby_girl'
  | 'baby_boy'
  | 'mini'
  | 'shoes_acc'

export interface ProductVariant {
  color: string
  colorHex?: string
  sizes: string[]
  images: string[]
}

export interface Product {
  id: string
  title: string
  brand: string
  region: RegionId
  category: ProductCategory
  originalPrice: number
  currencySymbol: string
  priceRub: number
  description: string
  composition?: string
  sku: string
  originalUrl: string
  images: string[]
  sizes: string[]
  colors: string[]
  variants?: ProductVariant[]
  isNew?: boolean
  isBestSeller?: boolean
  stock?: number
}
