import type { RegionId, StoreId, SortOption } from '../types/shop'
import { zaraCatalogService } from '../services/zaraCatalogService'
import { hmCatalogService } from '../services/hmCatalogService'
import { ZARA_SUBCATEGORIES } from '../types/zaraTaxonomy'

export interface ShopCategoryTab {
  id: string
  label: string
}

export interface ShopSubcategoryItem {
  id: string
  label: string
  parentCategories: string[]
}

export interface FetchCatalogParams {
  region: RegionId
  category: string
  subcategory?: string
  size?: string
  priceMinRub?: number
  priceMaxRub?: number
  sortBy: SortOption
  search?: string
  page: number
  pageSize?: number
}

export interface ShopConfig {
  id: StoreId
  name: string
  brandTitle: string
  description: string
  mainCategories: ShopCategoryTab[]
  subcategories: ShopSubcategoryItem[]
  fetchCatalog: (params: FetchCatalogParams) => Promise<any>
}

export const DEFAULT_SHOP_CATEGORIES: ShopCategoryTab[] = [
  { id: 'all', label: 'Смотреть всё' },
  { id: 'girl', label: 'Девочки' },
  { id: 'boy', label: 'Мальчики' },
  { id: 'baby_girl', label: 'Малышки' },
  { id: 'baby_boy', label: 'Малыши' },
  { id: 'mini', label: 'Новорожденные' },
  { id: 'shoes_acc', label: 'Обувь & Аксессуары' },
]

export const HM_SUBCATEGORIES: ShopSubcategoryItem[] = [
  { id: 'all', label: 'Все товары', parentCategories: ['girl', 'boy', 'baby_girl', 'baby_boy', 'mini'] },
  { id: '2-8y', label: '2–8 лет', parentCategories: ['girl', 'boy'] },
  { id: '9-14y', label: '9–14 лет', parentCategories: ['girl', 'boy'] },
  { id: 'newborn', label: 'Новорожденные (0-9M)', parentCategories: ['baby_girl', 'baby_boy', 'mini'] },
  { id: 'baby_girl', label: 'Малышки (4-24M)', parentCategories: ['baby_girl', 'mini'] },
  { id: 'baby_boy', label: 'Малыши (4-24M)', parentCategories: ['baby_boy', 'mini'] },
]

export const SHOP_CONFIGS: Record<string, ShopConfig> = {
  zara: {
    id: 'zara',
    name: 'Zara Kids',
    brandTitle: 'Zara Kids',
    description: 'Официальные коллекции Zara Kids из Европы. Прямой выкуп с оригинального сайта.',
    mainCategories: DEFAULT_SHOP_CATEGORIES,
    subcategories: ZARA_SUBCATEGORIES,
    fetchCatalog: (params) => zaraCatalogService.fetchZaraKidsCatalog(params as any),
  },
  hm: {
    id: 'hm',
    name: 'H&M Kids',
    brandTitle: 'H&M Kids',
    description: 'Официальные коллекции H&M из Европы и США. Прямой выкуп оригинальной детской одежды.',
    mainCategories: DEFAULT_SHOP_CATEGORIES,
    subcategories: HM_SUBCATEGORIES,
    fetchCatalog: (params) => hmCatalogService.fetchHMCatalog(params as any),
  },
  next: {
    id: 'next',
    name: 'Next Kids',
    brandTitle: 'Next Kids',
    description: 'Британский стиль и качество от Next. Заказы напрямую из европейских магазинов.',
    mainCategories: DEFAULT_SHOP_CATEGORIES,
    subcategories: [],
    fetchCatalog: (params) => zaraCatalogService.fetchZaraKidsCatalog(params as any),
  },
}

export function getShopConfig(shopId?: string): ShopConfig {
  const key = (shopId ? shopId.toLowerCase() : 'zara')
  return SHOP_CONFIGS[key] || SHOP_CONFIGS.zara
}
