import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type CatalogProduct,
  type CurrencyCode,
  formatPrice,
} from './catalog'
import { api } from '../lib/api'

type CatalogContextValue = {
  products: CatalogProduct[]
  currency: CurrencyCode
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  total: number
  error: string | null
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
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
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [newArrivals, setNewArrivals] = useState<CatalogProduct[]>([])
  const [favorites, setFavorites] = useState<CatalogProduct[]>([])

  const LIMIT = 50

  const refreshShowcase = useCallback(async () => {
    try {
      const [newRes, favRes] = await Promise.all([
        api.getCatalogPage(1, 50, '', { isNew: true }),
        api.getCatalogPage(1, 50, '', { isFavorite: true }),
      ])
      setNewArrivals(newRes.products)
      setFavorites(favRes.products)
    } catch (e) {
      console.warn('Failed to load showcase:', e)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      setHasMore(false)

      // Load first page only — remaining pages load on scroll (avoids 507 + lazy)
      const chunk = await api.getCatalogPage(1, LIMIT)
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
    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const chunk = await api.getCatalogPage(nextPage, LIMIT)
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

  useEffect(() => {
    void refresh()
    void refreshShowcase()
  }, [refresh, refreshShowcase])

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
