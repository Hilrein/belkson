import type { Product, RegionId } from './shop'

export type ZaraMainCategory =
  | 'all'
  | 'girl'
  | 'boy'
  | 'baby_girl'
  | 'baby_boy'
  | 'mini'
  | 'shoes_acc'

export type ZaraSubcategory =
  | 'all'
  | 'jackets_coats'
  | 'dresses_jumpsuits'
  | 'sweaters_hoodies'
  | 'shirts_tops'
  | 'trousers_jeans'
  | 'sets'
  | 'shoes'
  | 'accessories'

export interface SubcategoryMeta {
  id: ZaraSubcategory
  label: string
  parentCategories: ZaraMainCategory[]
}

export const ZARA_SUBCATEGORIES: SubcategoryMeta[] = [
  { id: 'all', label: 'Все товары', parentCategories: ['all', 'girl', 'boy', 'baby_girl', 'baby_boy', 'mini', 'shoes_acc'] },
  { id: 'jackets_coats', label: 'Куртки и пальто', parentCategories: ['girl', 'boy', 'baby_girl', 'baby_boy'] },
  { id: 'dresses_jumpsuits', label: 'Платья и комбинезоны', parentCategories: ['girl', 'baby_girl'] },
  { id: 'sweaters_hoodies', label: 'Свитшоты и худи', parentCategories: ['girl', 'boy', 'baby_girl', 'baby_boy'] },
  { id: 'shirts_tops', label: 'Рубашки и блузки', parentCategories: ['girl', 'boy', 'baby_girl', 'baby_boy'] },
  { id: 'trousers_jeans', label: 'Брюки и джинсы', parentCategories: ['girl', 'boy', 'baby_girl', 'baby_boy'] },
  { id: 'sets', label: 'Комплекты и костюмы', parentCategories: ['baby_girl', 'baby_boy', 'mini'] },
  { id: 'shoes', label: 'Обувь', parentCategories: ['shoes_acc', 'girl', 'boy', 'baby_girl', 'baby_boy'] },
  { id: 'accessories', label: 'Аксессуары и сумки', parentCategories: ['shoes_acc', 'girl', 'boy'] },
]

export type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'newest'

export interface CatalogQueryOptions {
  region: RegionId
  category: ZaraMainCategory
  subcategory?: ZaraSubcategory
  size?: string
  priceMinRub?: number
  priceMaxRub?: number
  sortBy?: SortOption
  search?: string
  page: number
  pageSize: number
}

export interface CatalogPaginatedResponse {
  products: Product[]
  page: number
  pageSize: number
  totalCount: number
  hasMore: boolean
  availableSubcategories: { id: ZaraSubcategory; label: string; count: number }[]
  availableSizes: string[]
  priceRangeRub: { min: number; max: number }
}
