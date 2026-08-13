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
import { StorefrontProductCard } from './components/shop/StorefrontProductCard'
import type { Product, SortOption } from './types/shop'

const FILTER_ALL = 'all'
const FILTER_SALE = 'sale'
const FILTER_NEW = 'new'
const FILTER_FAVORITE = 'favorite'

export default function CatalogPage() {
  const { products } = useCatalog()
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
      // If product has sale price, override priceRub for cart
      const finalProduct = product.isSale && product.salePriceRub ? { ...product, priceRub: product.salePriceRub } : product
      openAddToCartModal(finalProduct)
    },
    [openAddToCartModal]
  )

  const rawSizeParam = searchParams.get('size')
  const selectedSize = rawSizeParam || 'all'

  const setSizeFilter = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams)
      if (value === 'all' || !value) next.delete('size')
      else next.set('size', value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const availableSizes = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.sizes && p.sizes.length > 0) {
        for (const s of p.sizes) {
          if (s && s.trim()) set.add(s.trim())
        }
      }
    }
    const extractNum = (str: string) => {
      const match = str.match(/\d+/)
      return match ? parseInt(match[0], 10) : 999
    }
    return Array.from(set).sort((a, b) => extractNum(a) - extractNum(b))
  }, [products])

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.status !== 'Нет в наличии')
    if (activeFilter === FILTER_SALE) {
      list = list.filter((p) => p.isSale)
    } else if (activeFilter === FILTER_NEW) {
      list = list.filter((p) => p.isNew)
    } else if (activeFilter === FILTER_FAVORITE) {
      list = list.filter((p) => p.isFavorite)
    } else if (activeFilter !== FILTER_ALL) {
      list = list.filter((p) => categoriesMatch(p.category, activeFilter))
    }

    if (activeSubcategory !== 'all') {
      list = list.filter((p) => categoriesMatch(p.subcategory, activeSubcategory))
    }

    if (selectedSize !== 'all') {
      list = list.filter((p) =>
        p.sizes && p.sizes.some((s) => s.toLowerCase().trim() === selectedSize.toLowerCase().trim())
      )
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

    const getMinSizeNum = (p: CatalogProduct) => {
      if (!p.sizes || p.sizes.length === 0) return 999
      let min = 999
      for (const s of p.sizes) {
        const match = s.match(/\d+/)
        if (match) {
          const val = parseInt(match[0], 10)
          if (val < min) min = val
        }
      }
      return min
    }

    if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => (a.isSale && a.salePriceRub ? a.salePriceRub : a.priceRub) - (b.isSale && b.salePriceRub ? b.salePriceRub : b.priceRub))
    } else if (sortBy === 'price_desc') {
      list = [...list].sort((a, b) => (b.isSale && b.salePriceRub ? b.salePriceRub : a.priceRub) - (a.isSale && a.salePriceRub ? a.salePriceRub : a.priceRub))
    } else if (sortBy === 'size_asc') {
      list = [...list].sort((a, b) => getMinSizeNum(a) - getMinSizeNum(b))
    } else if (sortBy === 'size_desc') {
      list = [...list].sort((a, b) => getMinSizeNum(b) - getMinSizeNum(a))
    } else if (sortBy === 'newest') {
      list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
    }

    return list
  }, [products, activeFilter, activeSubcategory, selectedSize, query, sortBy])

  const navItems = useMemo(() => {
    const fixed: { id: string; label: string }[] = [
      { id: FILTER_ALL, label: 'Смотреть всё' },
      { id: FILTER_SALE, label: 'Sale %' },
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
    setSizeFilter('all')
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
      category: 'all',
      originalPrice: Math.round(quickViewProduct.priceRub / 100),
      currencySymbol: '€',
      priceRub: quickViewProduct.priceRub,
      isSale: quickViewProduct.isSale,
      salePriceRub: quickViewProduct.salePriceRub,
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
        availableSizes={availableSizes}
        selectedSize={selectedSize}
        onSelectSize={setSizeFilter}
        searchQuery={query}
        onSearchChange={onQueryChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        items={filtered}
        totalCount={filtered.length}
        onResetAll={handleResetAll}
        renderItem={(product) => (
          <StorefrontProductCard
            key={product.id}
            product={product}
            onQuickView={setQuickViewProduct}
            onAddToCart={handleAddToCart}
          />
        )}
      />
    </>
  )
}
