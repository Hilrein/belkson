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
  messenger: 'Telegram' | 'Max'
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
    messenger: 'Telegram' | 'Max'
  }) => Promise<Order | null>
  updateOrderStatus: (id: number, status: OrderStatus) => Promise<void>
  deleteOrder: (id: number) => Promise<void>
}

const STORAGE_KEY = 'belkson.orders.v1'

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(false)

  const saveLocal = (next: Order[]) => {
    setOrders(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore storage quota */
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.orders)) {
          saveLocal(data.orders)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch orders from backend API:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const createOrder = async (payload: {
    items: CartLine[]
    totalRub: number
    discountLabel?: string
    deliveryMethod?: string
    addressNotes?: string
    messenger: 'Telegram' | 'Max'
  }): Promise<Order | null> => {
    const formattedItems: OrderItem[] = payload.items.map((line) => ({
      productId: line.productId,
      name: line.name,
      image: line.image,
      priceRub: line.priceRub,
      quantity: line.quantity,
      sizes: line.sizes,
    }))

    const reqBody = {
      items: formattedItems,
      totalRub: payload.totalRub,
      discountLabel: payload.discountLabel ?? '',
      deliveryMethod: payload.deliveryMethod ?? '',
      addressNotes: payload.addressNotes ?? '',
      messenger: payload.messenger,
    }

    let created: Order | null = null

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.order) {
          created = data.order
        }
      }
    } catch (err) {
      console.warn('Failed to send order to backend API:', err)
    }

    if (!created) {
      // Fallback local order object
      created = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        items: formattedItems,
        totalRub: payload.totalRub,
        discountLabel: payload.discountLabel,
        deliveryMethod: payload.deliveryMethod,
        addressNotes: payload.addressNotes,
        messenger: payload.messenger,
        status: 'new',
      }
    }

    saveLocal([created, ...orders.filter((o) => o.id !== created!.id)])
    return created
  }

  const updateOrderStatus = async (id: number, status: OrderStatus) => {
    saveLocal(orders.map((o) => (o.id === id ? { ...o, status } : o)))

    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.warn(`Failed to update order ${id} status:`, err)
    }
  }

  const deleteOrder = async (id: number) => {
    saveLocal(orders.filter((o) => o.id !== id))

    try {
      await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.warn(`Failed to delete order ${id}:`, err)
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
