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
    try {
      setError(null)
      const data = await api.getCatalog()
      setProducts(data.products)
      setCurrencyState(data.currency)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Не удалось загрузить каталог'
      setError(message)
      setProducts([])
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
      const updated = await api.updateProduct(id, patch)
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    [],
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
