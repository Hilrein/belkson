import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CartLine } from './CartContext'

export type OrderItem = {
  productId: number
  name: string
  image: string
  priceRub: number
  quantity: number
  sizes?: string[]
}

export type OrderStatus = 'new' | 'completed' | 'cancelled'

export type Order = {
  id: number
  createdAt: string
  items: OrderItem[]
  totalRub: number
  discountLabel?: string
  deliveryMethod?: string
  addressNotes?: string
  messenger: 'Telegram' | 'Max' | 'VK'
  status: OrderStatus
}

type OrdersContextValue = {
  orders: Order[]
  loading: boolean
  newOrdersCount: number
  fetchOrders: () => Promise<void>
  createOrder: (payload: {
    items: CartLine[]
    totalRub: number
    discountLabel?: string
    deliveryMethod?: string
    addressNotes?: string
    messenger: 'Telegram' | 'Max' | 'VK'
  }) => Promise<Order | null>
  updateOrderStatus: (id: number, status: OrderStatus) => Promise<void>
  deleteOrder: (id: number) => Promise<void>
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.orders)) {
          setOrders(data.orders)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch orders from database API:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only auto-fetch and poll orders on /admin routes to avoid loading all orders on storefront
    const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
    if (!isAdmin) return

    fetchOrders()
    // Auto-refresh orders every 20 seconds for live admin updates
    const interval = setInterval(() => {
      fetch('/api/orders')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.orders)) {
            setOrders(data.orders)
          }
        })
        .catch(() => {})
    }, 20000)

    return () => clearInterval(interval)
  }, [])

  const createOrder = async (payload: {
    items: CartLine[]
    totalRub: number
    discountLabel?: string
    deliveryMethod?: string
    addressNotes?: string
    messenger: 'Telegram' | 'Max' | 'VK'
  }): Promise<Order | null> => {
    const formattedItems: OrderItem[] = payload.items.map((line) => ({
      productId: line.productId,
      name: line.name,
      image: line.image,
      priceRub: line.priceRub,
      quantity: line.quantity,
      sizes: line.selectedSizes && line.selectedSizes.length > 0 ? line.selectedSizes : line.sizes,
    }))

    const reqBody = {
      items: formattedItems,
      totalRub: payload.totalRub,
      discountLabel: payload.discountLabel ?? '',
      deliveryMethod: payload.deliveryMethod ?? '',
      addressNotes: payload.addressNotes ?? '',
      messenger: payload.messenger,
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.order) {
          const newOrder: Order = data.order
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)])
          return newOrder
        }
      }
    } catch (err) {
      console.warn('Failed to send order to database API:', err)
    }

    return null
  }

  const updateOrderStatus = async (id: number, status: OrderStatus) => {
    // Optimistic UI update
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.order) {
          setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)))
        }
      }
    } catch (err) {
      console.warn(`Failed to update order ${id} status:`, err)
    }
  }

  const deleteOrder = async (id: number) => {
    // Optimistic UI update
    setOrders((prev) => prev.filter((o) => o.id !== id))

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        // If server deletion failed, re-fetch orders from DB to remain accurate
        void fetchOrders()
      }
    } catch (err) {
      console.warn(`Failed to delete order ${id} from database:`, err)
      void fetchOrders()
    }
  }

  const newOrdersCount = orders.filter((o) => o.status === 'new').length

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        newOrdersCount,
        fetchOrders,
        createOrder,
        updateOrderStatus,
        deleteOrder,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) {
    throw new Error('useOrders must be used within an OrdersProvider')
  }
  return ctx
}
