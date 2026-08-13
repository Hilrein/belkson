import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from './store/CatalogContext'
import { useCart } from './store/CartContext'
import {
  CATEGORIES,
  SUBCATEGORIES,
  categoriesMatch,
  normalizeCategory,
  type CatalogProduct,
} from './store/catalog'
import { BaseCatalogLayout } from './components/shop/BaseCatalogLayout'
import { QuickViewModal } from './components/shop/QuickViewModal'
import type { Product, SortOption } from './types/shop'

const FILTER_ALL = 'all'
const FILTER_NEW = 'new'
const FILTER_FAVORITE = 'favorite'

export default function CatalogPage() {
  const { products, format } = useCatalog()
  const { openAddToCartModal } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null)

  const rawCategoryParam = searchParams.get('category')
  const activeFilter = useMemo(() => {
    if (!rawCategoryParam) return FILTER_ALL
    let decoded = rawCategoryParam
    try {
      if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
        decoded = decodeURIComponent(decoded)
      }
    } catch {
      /* keep as-is */
    }
    return decoded.trim() || FILTER_ALL
  }, [rawCategoryParam])

  const rawSubcategoryParam = searchParams.get('subcategory')
  const activeSubcategory = useMemo(() => {
    if (!rawSubcategoryParam) return 'all'
    let decoded = rawSubcategoryParam
    try {
      if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
        decoded = decodeURIComponent(decoded)
      }
    } catch {
      /* keep as-is */
    }
    return decoded.trim() || 'all'
  }, [rawSubcategoryParam])

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
  }, [searchParams])

  const setFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams)
      if (value === FILTER_ALL) next.delete('category')
      else next.set('category', value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const setSubcategoryFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams)
      if (value === 'all' || !value) next.delete('subcategory')
      else next.set('subcategory', value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleAddToCart = useCallback(
    (product: CatalogProduct, e?: MouseEvent) => {
      e?.stopPropagation()
      e?.preventDefault()
      openAddToCartModal(product)
    },
    [openAddToCartModal]
  )

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.status !== 'Нет в наличии')
    if (activeFilter === FILTER_NEW) {
      list = list.filter((p) => p.isNew)
    } else if (activeFilter === FILTER_FAVORITE) {
      list = list.filter((p) => p.isFavorite)
    } else if (activeFilter !== FILTER_ALL) {
      list = list.filter((p) => categoriesMatch(p.category, activeFilter))
    }

    if (activeSubcategory !== 'all') {
      list = list.filter((p) => categoriesMatch(p.subcategory, activeSubcategory))
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          normalizeCategory(p.category).includes(q) ||
          (p.subcategory && normalizeCategory(p.subcategory).includes(q))
      )
    }

    if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => a.priceRub - b.priceRub)
    } else if (sortBy === 'price_desc') {
      list = [...list].sort((a, b) => b.priceRub - a.priceRub)
    } else if (sortBy === 'newest') {
      list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
    }

    return list
  }, [products, activeFilter, activeSubcategory, query, sortBy])

  const navItems = useMemo(() => {
    const fixed: { id: string; label: string }[] = [
      { id: FILTER_ALL, label: 'Смотреть всё' },
      { id: FILTER_NEW, label: 'Новинки' },
      { id: FILTER_FAVORITE, label: 'Любимчики' },
      ...CATEGORIES.map((c) => ({ id: c, label: c })),
    ]
    const known = new Set(fixed.map((f) => normalizeCategory(f.id)))
    const extra = new Map<string, string>()
    for (const p of products) {
      if (p.status === 'Нет в наличии') continue
      const raw = String(p.category ?? '').trim()
      if (!raw) continue
      const key = normalizeCategory(raw)
      if (!known.has(key) && !extra.has(key)) extra.set(key, raw)
    }
    return [
      ...fixed,
      ...[...extra.values()].map((c) => ({ id: c, label: c })),
    ]
  }, [products])

  const subcategoryItems = useMemo(() => {
    return [
      { id: 'all', label: 'Все подкатегории' },
      ...SUBCATEGORIES.map((sub) => ({ id: sub, label: sub })),
    ]
  }, [])

  const onQueryChange = (value: string) => {
    setQuery(value)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const handleResetAll = () => {
    onQueryChange('')
    setFilter(FILTER_ALL)
    setSubcategoryFilter('all')
    setSortBy('featured')
  }

  // Convert CatalogProduct to Product for QuickViewModal
  const modalProduct: Product | null = useMemo(() => {
    if (!quickViewProduct) return null
    const sizes =
      quickViewProduct.sizes && quickViewProduct.sizes.length > 0
        ? quickViewProduct.sizes
        : ['68-74 см', '74-80 см', '80-86 см', '86-92 см', '92-98 см']
    return {
      id: String(quickViewProduct.id),
      title: quickViewProduct.name,
      brand: quickViewProduct.brand || 'belkson',
      region: 'spain',
      category: 'girl',
      originalPrice: Math.round(quickViewProduct.priceRub / 100),
      currencySymbol: '€',
      priceRub: quickViewProduct.priceRub,
      description: `${
        quickViewProduct.brand ? `Бренд: ${quickViewProduct.brand}. ` : ''
      }${quickViewProduct.name} из авторской коллекции Belkson. Премиальный комфортный трикотаж для детей. Артикул: ${quickViewProduct.sku}.`,
      composition: '100% органический хлопок',
      sku: quickViewProduct.sku,
      originalUrl: '',
      images: [quickViewProduct.image, ...(quickViewProduct.images || [])].filter(Boolean),
      sizes,
      colors: [quickViewProduct.color || 'Стандартный'],
      isNew: quickViewProduct.isNew,
      isBestSeller: quickViewProduct.isFavorite,
      stock: quickViewProduct.stock != null ? quickViewProduct.stock : 10,
    }
  }, [quickViewProduct])

  return (
    <>
      <QuickViewModal
        product={modalProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={() => {
          if (quickViewProduct) {
            openAddToCartModal(quickViewProduct)
            setQuickViewProduct(null)
          }
        }}
      />

      <BaseCatalogLayout<CatalogProduct>
        title="Каталог Belkson"
        subtitle="Мягкие вещи для малышей — выбирайте по возрасту или листайте всё."
        categoryTabs={navItems}
        activeCategory={activeFilter}
        onSelectCategory={setFilter}
        subcategories={subcategoryItems}
        activeSubcategory={activeSubcategory}
        onSelectSubcategory={setSubcategoryFilter}
        searchQuery={query}
        onSearchChange={onQueryChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        items={filtered}
        totalCount={filtered.length}
        onResetAll={handleResetAll}
        renderItem={(product) => (
          <article
            key={product.id}
            onClick={() => setQuickViewProduct(product)}
            className="group flex flex-col cursor-pointer"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-3 md:mb-4">
              <img
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                alt={product.name}
                src={product.image}
              />
              {product.isNew && (
                <span className="absolute top-3 left-3 text-[10px] tracking-[0.12em] uppercase font-semibold text-primary bg-surface/90 px-2 py-1">
                  New
                </span>
              )}
              {product.status === 'Мало' && (
                <span className="absolute top-3 right-3 text-[10px] tracking-[0.12em] uppercase font-medium text-on-surface-variant bg-surface/90 px-2 py-1">
                  Мало
                </span>
              )}
              <button
                type="button"
                onClick={(e) => handleAddToCart(product, e)}
                className="hidden md:block absolute inset-x-0 bottom-0 py-3 bg-primary text-on-primary text-[11px] tracking-[0.14em] uppercase font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10"
              >
                В корзину
              </button>
            </div>
            <div className="flex flex-col gap-1 px-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {product.brand && (
                    <p className="text-[10px] tracking-[0.12em] uppercase font-semibold text-on-surface-variant mb-0.5">
                      {product.brand}
                    </p>
                  )}
                  <h2 className="text-sm md:text-[15px] font-medium text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h2>
                </div>
                <span className="text-sm md:text-[15px] font-medium text-primary shrink-0 tabular-nums">
                  {format(product.priceRub)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-xs text-on-surface-variant truncate">
                  {product.color}
                  {product.category ? ` · ${product.category}` : ''}
                </p>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>В наличии: {product.stock != null ? product.stock : 10} шт.</span>
                </span>
              </div>
              {product.sizes && product.sizes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.sizes.slice(0, 5).map((size) => (
                    <span
                      key={size}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-surface-dim text-on-surface-variant"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => handleAddToCart(product, e)}
                className="md:hidden mt-2 self-start text-[11px] tracking-[0.12em] uppercase font-semibold text-primary border-b border-primary/40 pb-0.5"
              >
                В корзину
              </button>
            </div>
          </article>
        )}
      />
    </>
  )
}
