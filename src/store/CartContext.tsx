import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CatalogProduct } from './catalog'

export type CartLine = {
  productId: number
  name: string
  image: string
  priceRub: number
  color: string
  quantity: number
}

type CartContextValue = {
  items: CartLine[]
  totalCount: number
  totalRub: number
  addToCart: (product: CatalogProduct, qty?: number) => void
  removeFromCart: (productId: number) => void
  setQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
}

const STORAGE_KEY = 'belkson.cart.v1'

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartLine[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCart(items: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => loadCart())

  useEffect(() => {
    saveCart(items)
  }, [items])

  const addToCart = useCallback((product: CatalogProduct, qty = 1) => {
    const n = Math.max(1, qty)
    setItems((prev) => {
      const i = prev.findIndex((l) => l.productId === product.id)
      if (i === -1) {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            image: product.image,
            priceRub: product.priceRub,
            color: product.color,
            quantity: n,
          },
        ]
      }
      return prev.map((l, idx) =>
        idx === i ? { ...l, quantity: l.quantity + n } : l,
      )
    })
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setItems((prev) => prev.filter((l) => l.productId !== productId))
  }, [])

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.productId !== productId)
      return prev.map((l) =>
        l.productId === productId ? { ...l, quantity } : l,
      )
    })
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalCount = useMemo(
    () => items.reduce((s, l) => s + l.quantity, 0),
    [items],
  )

  const totalRub = useMemo(
    () => items.reduce((s, l) => s + l.priceRub * l.quantity, 0),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      totalCount,
      totalRub,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
    }),
    [
      items,
      totalCount,
      totalRub,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
