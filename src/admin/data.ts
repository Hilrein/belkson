/** Admin-only UI constants. Catalog data lives in src/store/catalog.ts */

export {
  CATEGORIES,
  SUBCATEGORIES,
  CURRENCIES,
  type CatalogProduct as Product,
  type CurrencyCode,
  type ProductStatus,
} from '../store/catalog'

export const NAV_ITEMS = [
  { icon: 'receipt_long', label: 'Заказы', id: 'orders', href: '#' },
  { icon: 'inventory_2', label: 'Товары', id: 'products', href: '/admin' },
  { icon: 'view_carousel', label: 'Баннеры главной', id: 'hero-banners', href: '#' },
  { icon: 'chat', label: 'Мессенджеры', id: 'messengers', href: '#' },
  { icon: 'contact_phone', label: 'Контакты', id: 'contacts', href: '#' },
  { icon: 'info', label: 'О нас', id: 'about', href: '#' },
  { icon: 'shopping_cart', label: 'Выкуп с сайтов', id: 'official-stores', href: '#' },
  { icon: 'sell', label: 'Скидки и акции', id: 'discounts', href: '#' },
  { icon: 'checklist', label: 'Условия выкупа', id: 'purchase-terms', href: '#' },
] as const

