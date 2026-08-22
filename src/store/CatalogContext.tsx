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
  error: string | null
  refresh: () => Promise<void>
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
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    let firstPageDone = false
    try {
      setError(null)
      setLoading(true)

      // Chunked loading — avoids Neon 64 MB HTTP 507 by fetching 50 items at a time
      // First page hides splash immediately, remaining pages stream in background.
      const limit = 50
      let page = 1
      let all: CatalogProduct[] = []

      while (true) {
        const chunk = await api.getCatalogPage(page, limit)
        if (!firstPageDone) {
          setCurrencyState(chunk.currency)
        }
        all = page === 1 ? chunk.products : [...all, ...chunk.products]
        setProducts(all)

        if (!firstPageDone) {
          setLoading(false)
          firstPageDone = true
        }

        const hasMore =
          typeof chunk.hasMore === 'boolean'
            ? chunk.hasMore
            : chunk.products.length === limit && all.length < (chunk.total ?? Infinity)

        if (!hasMore || chunk.products.length === 0) break
        page += 1
        if (page > 500) break // safety: ~25k products
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не удалось загрузить каталог'
      setError(message)
      setProducts([])
    } finally {
      if (!firstPageDone) setLoading(false)
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
      error,
      refresh,
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
      error,
      refresh,
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
