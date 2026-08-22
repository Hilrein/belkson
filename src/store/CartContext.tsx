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
  id: string
  productId: number
  name: string
  image: string
  priceRub: number
  color: string
  sizes?: string[]
  selectedSizes?: string[]
  quantity: number
  /** Sale items do not participate in loyalty program */
  isSale?: boolean
}

export type AddToCartOptions = {
  qty?: number
  selectedColor?: string
  selectedSizes?: string[]
}

type CartContextValue = {
  items: CartLine[]
  totalCount: number
  /** Sum of all line totals before any discount (including sale) */
  subtotalRub: number
  /** Sum of loyalty-eligible lines (non-sale only) */
  loyaltySubtotalRub: number
  /** Sum of sale lines (excluded from loyalty) */
  saleSubtotalRub: number
  /** Ruble amount automatically discounted (0 if none applies) — only from loyalty part */
  discountRub: number
  /** Final payable amount after the automatic discount */
  totalRub: number
  /** The applied discount rule, or null (based on loyalty subtotal) */
  activeDiscount: Discount | null
  /** Next discount rule that becomes available as loyalty subtotal grows, or null */
  nextDiscount: Discount | null
  addToCart: (product: CatalogProduct, options?: AddToCartOptions | number) => void
  removeFromCart: (id: string | number) => void
  setQuantity: (id: string | number, quantity: number) => void
  toggleSize: (id: string | number, size: string) => void
  clearCart: () => void
  productToConfigure: CatalogProduct | null
  openAddToCartModal: (product: CatalogProduct) => void
  closeAddToCartModal: () => void
}

const STORAGE_KEY = 'belkson.cart.v1'

const CartContext = createContext<CartContextValue | null>(null)

function makeCartLineId(productId: number, color: string, selectedSizes?: string[]): string {
  const sizesKey = selectedSizes && selectedSizes.length > 0 ? [...selectedSizes].sort().join(',') : 'nosize'
  return `${productId}_${color || 'nocolor'}_${sizesKey}`
}

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartLine[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => {
      const id = item.id || makeCartLineId(item.productId, item.color, item.selectedSizes || item.sizes)
      return { ...item, id }
    })
  } catch {
    return []
  }
}

function saveCart(items: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => loadCart())
  const [productToConfigure, setProductToConfigure] = useState<CatalogProduct | null>(null)
  const { discounts } = useDiscounts()

  useEffect(() => {
    saveCart(items)
  }, [items])

  const openAddToCartModal = useCallback((product: CatalogProduct) => {
    setProductToConfigure(product)
  }, [])

  const closeAddToCartModal = useCallback(() => {
    setProductToConfigure(null)
  }, [])

  const addToCart = useCallback(
    (product: CatalogProduct, options?: AddToCartOptions | number) => {
      let qty = 1
      let selectedColor: string | undefined
      let selectedSizes: string[] | undefined

      if (typeof options === 'number') {
        qty = options
      } else if (options) {
        qty = options.qty ?? 1
        selectedColor = options.selectedColor
        selectedSizes = options.selectedSizes
      }

      const n = Math.max(1, qty)
      const finalColor = selectedColor || product.color || 'Стандартный'
      const finalSizes = selectedSizes || product.sizes
      const targetId = makeCartLineId(product.id, finalColor, finalSizes)
      const isSale = Boolean(product.isSale)

      setItems((prev) => {
        const i = prev.findIndex((l) => l.id === targetId)
        if (i === -1) {
          return [
            ...prev,
            {
              id: targetId,
              productId: product.id,
              name: product.name,
              image: product.image,
              priceRub: product.priceRub,
              color: finalColor,
              sizes: product.sizes,
              selectedSizes: finalSizes,
              quantity: n,
              isSale,
            },
          ]
        }
        return prev.map((l, idx) =>
          idx === i
            ? {
                ...l,
                // keep original isSale if already set, otherwise use product flag
                isSale: l.isSale ?? isSale,
                quantity: l.quantity + n,
              }
            : l,
        )
      })
    },
    [],
  )

  const removeFromCart = useCallback((id: string | number) => {
    setItems((prev) =>
      prev.filter((l) => l.id !== String(id) && l.productId !== Number(id)),
    )
  }, [])

  const setQuantity = useCallback((id: string | number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((l) => l.id !== String(id) && l.productId !== Number(id))
      }
      return prev.map((l) =>
        l.id === String(id) || l.productId === Number(id) ? { ...l, quantity } : l,
      )
    })
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const toggleSize = useCallback((id: string | number, size: string) => {
    setItems((prev) =>
      prev.map((l) => {
        if (l.id !== String(id) && l.productId !== Number(id)) return l
        const current = l.selectedSizes || []
        const has = current.includes(size)
        const nextSizes = has
          ? current.filter((s) => s !== size)
          : [...current, size]
        const newId = makeCartLineId(l.productId, l.color, nextSizes)
        return {
          ...l,
          id: newId,
          selectedSizes: nextSizes,
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

  // Sale items are excluded from loyalty program
  const loyaltySubtotalRub = useMemo(
    () => items.filter((l) => !l.isSale).reduce((s, l) => s + l.priceRub * l.quantity, 0),
    [items],
  )

  const saleSubtotalRub = useMemo(
    () => items.filter((l) => Boolean(l.isSale)).reduce((s, l) => s + l.priceRub * l.quantity, 0),
    [items],
  )

  /**
   * Best applicable automatic discount: the active rule with the largest
   * threshold still below the LOYALTY subtotal (sale excluded).
   */
  const activeDiscount = useMemo(() => {
    const applicable = discounts
      .filter((d) => d.isActive && d.thresholdRub <= loyaltySubtotalRub)
      .sort((a, b) => b.thresholdRub - a.thresholdRub)
    if (applicable.length === 0) return null
    return applicable[0]
  }, [discounts, loyaltySubtotalRub])

  /** Next rule that becomes available when the loyalty subtotal grows */
  const nextDiscount = useMemo(() => {
    const upcoming = discounts
      .filter((d) => d.isActive && d.thresholdRub > loyaltySubtotalRub)
      .sort((a, b) => a.thresholdRub - b.thresholdRub)
    if (upcoming.length === 0) return null
    return upcoming[0]
  }, [discounts, loyaltySubtotalRub])

  const discountRub = useMemo(() => {
    if (!activeDiscount) return 0
    const amount =
      activeDiscount.type === 'percent'
        ? Math.floor((loyaltySubtotalRub * activeDiscount.value) / 100)
        : Math.floor(activeDiscount.value)
    return Math.max(0, Math.min(loyaltySubtotalRub, amount))
  }, [activeDiscount, loyaltySubtotalRub])

  const totalRub = useMemo(
    () => Math.max(0, subtotalRub - discountRub),
    [subtotalRub, discountRub],
  )

  const value = useMemo(
    () => ({
      items,
      totalCount,
      subtotalRub,
      loyaltySubtotalRub,
      saleSubtotalRub,
      discountRub,
      totalRub,
      activeDiscount,
      nextDiscount,
      addToCart,
      removeFromCart,
      setQuantity,
      toggleSize,
      clearCart,
      productToConfigure,
      openAddToCartModal,
      closeAddToCartModal,
    }),
    [
      items,
      totalCount,
      subtotalRub,
      loyaltySubtotalRub,
      saleSubtotalRub,
      discountRub,
      totalRub,
      activeDiscount,
      nextDiscount,
      addToCart,
      removeFromCart,
      setQuantity,
      toggleSize,
      clearCart,
      productToConfigure,
      openAddToCartModal,
      closeAddToCartModal,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
