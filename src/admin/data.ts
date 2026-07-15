/** Admin-only UI constants. Catalog data lives in src/store/catalog.ts */

export {
  CATEGORIES,
  CURRENCIES,
  type CatalogProduct as Product,
  type CurrencyCode,
  type ProductStatus,
} from '../store/catalog'

export const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Панель управления', href: '#', active: false },
  { icon: 'inventory_2', label: 'Товары', href: '/admin', active: true },
  { icon: 'shopping_cart', label: 'Выкуп с сайтов', href: '#', active: false },
  { icon: 'settings', label: 'Настройки', href: '#', active: false },
  { icon: 'article', label: 'Инфо-страницы', href: '#', active: false },
] as const

