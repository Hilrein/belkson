import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  type CatalogProduct,
  type CurrencyCode,
  formatPrice,
} from './catalog'
import { api } from '../lib/api'

export type CatalogFilters = {
  category?: string
  subcategory?: string
  q?: string
  isNew?: boolean
  isFavorite?: boolean
  isSale?: boolean
  includeOutOfStock?: boolean
}

type CatalogContextValue = {
  products: CatalogProduct[]
  currency: CurrencyCode
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  total: number
  error: string | null
  refresh: (filters?: CatalogFilters) => Promise<void>
  loadMore: () => Promise<void>
  refreshShowcase: () => Promise<void>
  showcaseLoading: boolean
  setCurrency: (c: CurrencyCode) => Promise<void>
  format: (priceRub: number) => string
  addProduct: (input: Omit<CatalogProduct, 'id'>) => Promise<CatalogProduct>
  updateProduct: (id: number, patch: Partial<CatalogProduct>) => Promise<void>
  deleteProduct: (id: number) => Promise<void>
  newArrivals: CatalogProduct[]
  favorites: CatalogProduct[]
  inStock: CatalogProduct[]
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [currency, setCurrencyState] = useState<CurrencyCode>('RUB')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [newArrivals, setNewArrivals] = useState<CatalogProduct[]>([])
  const [favorites, setFavorites] = useState<CatalogProduct[]>([])
  const [showcaseLoading, setShowcaseLoading] = useState(true)
  const activeFiltersRef = useRef<CatalogFilters | undefined>(undefined)

  const LIMIT = 20

  const refreshShowcase = useCallback(async () => {
    try {
      setShowcaseLoading(true)
      const [newRes, favRes] = await Promise.all([
        api.getShowcase('new', 50),
        api.getShowcase('favorite', 50),
      ])
      setNewArrivals(newRes.products)
      setFavorites(favRes.products)
      if (newRes.currency) setCurrencyState(newRes.currency)
    } catch (e) {
      console.warn('Failed to load showcase:', e)
    } finally {
      setShowcaseLoading(false)
    }
  }, [])

  const refresh = useCallback(async (filters?: CatalogFilters) => {
    activeFiltersRef.current = filters
    try {
      setError(null)
      setLoading(true)
      setHasMore(false)

      const chunk = await api.getCatalogPage(1, LIMIT, filters?.q ?? '', {
        category: filters?.category,
        subcategory: filters?.subcategory,
        isNew: filters?.isNew,
        isFavorite: filters?.isFavorite,
        isSale: filters?.isSale,
        includeOutOfStock: filters?.includeOutOfStock,
      })
      setCurrencyState(chunk.currency)
      setProducts(chunk.products)
      setTotal(chunk.total ?? chunk.products.length)
      setHasMore(Boolean(chunk.hasMore))
      setPage(1)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не удалось загрузить каталог'
      setError(message)
      setProducts([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return
    const filters = activeFiltersRef.current
    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const chunk = await api.getCatalogPage(nextPage, LIMIT, filters?.q ?? '', {
        category: filters?.category,
        subcategory: filters?.subcategory,
        isNew: filters?.isNew,
        isFavorite: filters?.isFavorite,
        isSale: filters?.isSale,
        includeOutOfStock: filters?.includeOutOfStock,
      })
      setProducts((prev) => [...prev, ...chunk.products])
      setTotal(chunk.total ?? total)
      setHasMore(Boolean(chunk.hasMore))
      setPage(nextPage)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не удалось загрузить каталог'
      setError(message)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, loading, hasMore, page, total])

  const setCurrency = useCallback(async (next: CurrencyCode) => {
    const res = await api.setCurrency(next)
    setCurrencyState(res.currency)
  }, [])

  const addProduct = useCallback(async (input: Omit<CatalogProduct, 'id'>) => {
    const created = await api.createProduct(input)
    setProducts((prev) => [created, ...prev])
    setTotal((prev) => prev + 1)
    // showcase may have new item
    if (created.isNew) setNewArrivals((prev) => [created, ...prev])
    if (created.isFavorite) setFavorites((prev) => [created, ...prev])
    return created
  }, [])

  const updateProduct = useCallback(
    async (id: number, patch: Partial<CatalogProduct>) => {
      // Optimistic update for instant 0ms response
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
      // optimistic showcase
      if (patch.isNew !== undefined || patch.isFavorite !== undefined || patch.status !== undefined) {
        // проще перезагрузить витрину, чем гадать
        void refreshShowcase()
      } else {
        // точечно обновим если только флаг
        setNewArrivals((prev) => {
          if (patch.isNew === true) {
            const existing = prev.find((p) => p.id === id)
            if (!existing) {
              const prod = products.find((p) => p.id === id)
              if (prod) return [{ ...prod, ...patch } as CatalogProduct, ...prev]
            }
          }
          if (patch.isNew === false) return prev.filter((p) => p.id !== id)
          return prev.map((p) => (p.id === id ? { ...p, ...patch } as CatalogProduct : p))
        })
        setFavorites((prev) => {
          if (patch.isFavorite === true) {
            const existing = prev.find((p) => p.id === id)
            if (!existing) {
              const prod = products.find((p) => p.id === id)
              if (prod) return [{ ...prod, ...patch } as CatalogProduct, ...prev]
            }
          }
          if (patch.isFavorite === false) return prev.filter((p) => p.id !== id)
          return prev.map((p) => (p.id === id ? { ...p, ...patch } as CatalogProduct : p))
        })
      }
      try {
        await api.updateProduct(id, patch)
      } catch (err) {
        void refresh()
        void refreshShowcase()
        throw err
      }
    },
    [refresh, refreshShowcase, products],
  )

  const deleteProduct = useCallback(async (id: number) => {
    await api.deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setNewArrivals((prev) => prev.filter((p) => p.id !== id))
    setFavorites((prev) => prev.filter((p) => p.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
  }, [])

  const format = useCallback(
    (priceRub: number) => formatPrice(priceRub, currency),
    [currency],
  )

  // showcase — уже все отмеченные со всей БД, сортированы id DESC (свежие сверху), статус <> 'Нет в наличии' уже на сервере
  const inStock = useMemo(
    () => products.filter((p) => p.status !== 'Нет в наличии'),
    [products],
  )

  const value = useMemo(
    () => ({
      products,
      currency,
      loading,
      loadingMore,
      hasMore,
      total,
      error,
      refresh,
      loadMore,
      refreshShowcase,
      showcaseLoading,
      setCurrency,
      format,
      addProduct,
      updateProduct,
      deleteProduct,
      newArrivals,
      favorites,
      inStock,
    }),
    [
      products,
      currency,
      loading,
      loadingMore,
      hasMore,
      total,
      error,
      refresh,
      loadMore,
      refreshShowcase,
      showcaseLoading,
      setCurrency,
      format,
      addProduct,
      updateProduct,
      deleteProduct,
      newArrivals,
      favorites,
      inStock,
    ],
  )

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
