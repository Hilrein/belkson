import { useEffect, useRef, useState, useCallback, useMemo, type MouseEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useCart } from './store/CartContext'
import type { CatalogProduct } from './store/catalog'
import type { Product, RegionId } from './types/shop'
import type { SortOption } from './types/shop'
import { ProductCard } from './components/shop/ProductCard'
import { QuickViewModal } from './components/shop/QuickViewModal'
import { BaseCatalogLayout } from './components/shop/BaseCatalogLayout'
import { getShopConfig, type ShopConfig } from './config/shopConfigs'

interface ExternalShopPageProps {
  config?: ShopConfig
}

export default function ExternalShopPage({ config: customConfig }: ExternalShopPageProps) {
  const { shop = 'zara', country = 'spain' } = useParams<{ shop?: string; country?: string }>()
  const { openAddToCartModal } = useCart()

  // Dynamically resolve shop configuration from passed props or URL route param
  const shopConfig = useMemo(() => {
    return customConfig || getShopConfig(shop)
  }, [customConfig, shop])

  const [products, setProducts] = useState<Product[]>([])
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Dynamic Filters State
  const [selectedMainCat, setSelectedMainCat] = useState<string>('all')
  const [selectedSubcat, setSelectedSubcat] = useState<string>('all')
  const [selectedSize, setSelectedSize] = useState<string>('all')
  const [priceMinRub, setPriceMinRub] = useState<number | undefined>(undefined)
  const [priceMaxRub, setPriceMaxRub] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination State
  const [page, setPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [availableSizes, setAvailableSizes] = useState<string[]>([])

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const regionId = (country ? country.toLowerCase() : 'spain') as RegionId

  // Dynamic catalog loader consuming shopConfig.fetchCatalog
  const loadCatalog = useCallback(
    async (isAppend = false, pageNum = 1) => {
      if (isAppend) setLoadingMore(true)
      else setLoadingInitial(true)

      try {
        const res = await shopConfig.fetchCatalog({
          region: regionId,
          category: selectedMainCat,
          subcategory: selectedSubcat,
          size: selectedSize,
          priceMinRub,
          priceMaxRub,
          sortBy,
          search: searchQuery,
          page: pageNum,
          pageSize: 24,
        })

        if (isAppend) {
          setProducts((prev) => [...prev, ...res.products])
        } else {
          setProducts(res.products)
        }

        setHasMore(res.hasMore)
        setTotalCount(res.totalCount)
        setAvailableSizes(res.availableSizes || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки каталога')
      } finally {
        setLoadingInitial(false)
        setLoadingMore(false)
      }
    },
    [
      shopConfig,
      regionId,
      selectedMainCat,
      selectedSubcat,
      selectedSize,
      priceMinRub,
      priceMaxRub,
      sortBy,
      searchQuery,
    ]
  )

  useEffect(() => {
    setPage(1)
    loadCatalog(false, 1)
  }, [loadCatalog])

  // Infinite Scroll Observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || loadingInitial) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingInitial) {
          const nextPage = page + 1
          setPage(nextPage)
          loadCatalog(true, nextPage)
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadingInitial, page, loadCatalog])

  const handleResetAllFilters = () => {
    setSelectedMainCat('all')
    setSelectedSubcat('all')
    setSelectedSize('all')
    setPriceMinRub(undefined)
    setPriceMaxRub(undefined)
    setSortBy('featured')
    setSearchQuery('')
  }

  const handleAddToCart = (
    product: Product,
    color: string,
    qty = 1,
    e?: MouseEvent
  ) => {
    e?.stopPropagation()
    e?.preventDefault()

    const numericId = Math.abs(
      product.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
    )

    const catalogItem: CatalogProduct = {
      id: numericId,
      name: `[${shopConfig.name}] ${product.title} (Цвет: ${color})`,
      sku: product.sku,
      priceRub: product.priceRub,
      category: shopConfig.name,
      color: color,
      status: 'В наличии',
      image: product.images[0] || '',
      isNew: product.isNew || false,
      isFavorite: false,
    }

    openAddToCartModal(catalogItem)
    setAddedId(product.id)

    setTimeout(() => {
      setAddedId(null)
    }, 2500)
  }

  const activeSubcats = useMemo(() => {
    if (!shopConfig.subcategories.length) return []
    return shopConfig.subcategories.filter(
      (s) =>
        s.id === 'all' ||
        selectedMainCat === 'all' ||
        s.parentCategories.includes(selectedMainCat)
    )
  }, [shopConfig, selectedMainCat])

  return (
    <>
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(prod, col, q, e) => handleAddToCart(prod, col, q, e)}
      />

      <BaseCatalogLayout<Product>
        title={`Каталог ${shopConfig.name}`}
        subtitle={shopConfig.description}
        categoryTabs={shopConfig.mainCategories}
        activeCategory={selectedMainCat}
        onSelectCategory={(catId) => {
          setSelectedMainCat(catId)
          setSelectedSubcat('all')
        }}
        subcategories={activeSubcats}
        activeSubcategory={selectedSubcat}
        onSelectSubcategory={setSelectedSubcat}
        availableSizes={availableSizes}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        priceMinRub={priceMinRub}
        priceMaxRub={priceMaxRub}
        onPriceChange={(min, max) => {
          setPriceMinRub(min)
          setPriceMaxRub(max)
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        items={products}
        totalCount={totalCount}
        loadingInitial={loadingInitial}
        loadingMore={loadingMore}
        error={error}
        onResetAll={handleResetAllFilters}
        sentinelRef={sentinelRef}
        renderItem={(product) => (
          <ProductCard
            key={product.id}
            product={product}
            addedId={addedId}
            onAddToCart={(prod, col, q, e) => handleAddToCart(prod, col, q || 1, e)}
            onQuickView={(prod) => setQuickViewProduct(prod)}
          />
        )}
      />
    </>
  )
}
