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
import { useDiscounts, type Discount } from './DiscountsContext'

export type CartLine = {
  productId: number
  name: string
  image: string
  priceRub: number
  color: string
  sizes?: string[]
  selectedSize?: string
  quantity: number
}

type CartContextValue = {
  items: CartLine[]
  totalCount: number
  /** Sum of all line totals before any discount */
  subtotalRub: number
  /** Ruble amount automatically discounted (0 if none applies) */
  discountRub: number
  /** Final payable amount after the automatic discount */
  totalRub: number
  /** The applied discount rule, or null */
  activeDiscount: Discount | null
  /** Next discount rule that becomes available as subtotal grows, or null */
  nextDiscount: Discount | null
  addToCart: (product: CatalogProduct, qty?: number) => void
  removeFromCart: (productId: number) => void
  setQuantity: (productId: number, quantity: number) => void
  selectSize: (productId: number, size: string) => void
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
  const { discounts } = useDiscounts()

  useEffect(() => {
    saveCart(items)
  }, [items])

  const addToCart = useCallback((product: CatalogProduct, qty = 1) => {
    const n = Math.max(1, qty)
    setItems((prev) => {
      const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined
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
            sizes: product.sizes,
            selectedSize: defaultSize,
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

  const selectSize = useCallback((productId: number, size: string) => {
    setItems((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l
        return {
          ...l,
          selectedSize: l.selectedSize === size ? undefined : size,
        }
      }),
    )
  }, [])

  const totalCount = useMemo(
    () => items.reduce((s, l) => s + l.quantity, 0),
    [items],
  )

  const subtotalRub = useMemo(
    () => items.reduce((s, l) => s + l.priceRub * l.quantity, 0),
    [items],
  )

  /**
   * Best applicable automatic discount: the active rule with the largest
   * threshold still below the subtotal (matches the -5% / -10% ladder).
   */
  const activeDiscount = useMemo(() => {
    const applicable = discounts
      .filter((d) => d.isActive && d.thresholdRub <= subtotalRub)
      .sort((a, b) => b.thresholdRub - a.thresholdRub)
    if (applicable.length === 0) return null
    return applicable[0]
  }, [discounts, subtotalRub])

  /** Next rule that becomes available when the subtotal grows */
  const nextDiscount = useMemo(() => {
    const upcoming = discounts
      .filter((d) => d.isActive && d.thresholdRub > subtotalRub)
      .sort((a, b) => a.thresholdRub - b.thresholdRub)
    if (upcoming.length === 0) return null
    return upcoming[0]
  }, [discounts, subtotalRub])

  const discountRub = useMemo(() => {
    if (!activeDiscount) return 0
    const amount =
      activeDiscount.type === 'percent'
        ? Math.floor((subtotalRub * activeDiscount.value) / 100)
        : Math.floor(activeDiscount.value)
    return Math.max(0, Math.min(subtotalRub, amount))
  }, [activeDiscount, subtotalRub])

  const totalRub = useMemo(
    () => Math.max(0, subtotalRub - discountRub),
    [subtotalRub, discountRub],
  )

  const value = useMemo(
    () => ({
      items,
      totalCount,
      subtotalRub,
      discountRub,
      totalRub,
      activeDiscount,
      nextDiscount,
      addToCart,
      removeFromCart,
      setQuantity,
      selectSize,
      clearCart,
    }),
    [
      items,
      totalCount,
      subtotalRub,
      discountRub,
      totalRub,
      activeDiscount,
      nextDiscount,
      addToCart,
      removeFromCart,
      setQuantity,
      selectSize,
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
