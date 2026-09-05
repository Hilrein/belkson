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
  search: (q: string) => Promise<void>
  searchQuery: string
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
  const [searchQuery, setSearchQuery] = useState('')

  const LIMIT = 50

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      setHasMore(false)

      // Load first page only — remaining pages load on scroll (avoids 507 + lazy)
      const chunk = await api.getCatalogPage(1, LIMIT, '')
      setCurrencyState(chunk.currency)
      setProducts(chunk.products)
      setTotal(chunk.total ?? chunk.products.length)
      setHasMore(Boolean(chunk.hasMore))
      setPage(1)
      setSearchQuery('')
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
      const chunk = await api.getCatalogPage(nextPage, LIMIT, searchQuery)
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
  }, [loadingMore, loading, hasMore, page, total, searchQuery])

  /** Server-side search across ALL products (not just loaded page). Empty q resets to full catalog. */
  const search = useCallback(async (q: string) => {
    try {
      setError(null)
      setLoading(true)
      setHasMore(false)
      const chunk = await api.getCatalogPage(1, LIMIT, q)
      setCurrencyState(chunk.currency)
      setProducts(chunk.products)
      setTotal(chunk.total ?? chunk.products.length)
      setHasMore(Boolean(chunk.hasMore))
      setPage(1)
      setSearchQuery(q.trim())
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не удалось выполнить поиск'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setCurrency = useCallback(async (next: CurrencyCode) => {
    const res = await api.setCurrency(next)
    setCurrencyState(res.currency)
  }, [])

  const addProduct = useCallback(async (input: Omit<CatalogProduct, 'id'>) => {
    const created = await api.createProduct(input)
    setProducts((prev) => [created, ...prev])
    return created
  }, [])

  const updateProduct = useCallback(
    async (id: number, patch: Partial<CatalogProduct>) => {
      // Optimistic update for instant 0ms response
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
      try {
        await api.updateProduct(id, patch)
      } catch (err) {
        void refresh()
        throw err
      }
    },
    [refresh],
  )

  const deleteProduct = useCallback(async (id: number) => {
    await api.deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const format = useCallback(
    (priceRub: number) => formatPrice(priceRub, currency),
    [currency],
  )

  // Only explicitly tagged products — no "fill with any items" fallback
  // (that made «Новинки» also appear under «Любимчики» when favorites were empty).
  const newArrivals = useMemo(
    () =>
      products.filter((p) => p.isNew && p.status !== 'Нет в наличии'),
    [products],
  )

  const favorites = useMemo(
    () =>
      products.filter((p) => p.isFavorite && p.status !== 'Нет в наличии'),
    [products],
  )

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
      search,
      searchQuery,
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
      search,
      searchQuery,
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
