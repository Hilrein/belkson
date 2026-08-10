import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type DiscountType = 'percent' | 'fixed'

export type Discount = {
  id: number
  title: string
  type: DiscountType
  thresholdRub: number
  value: number
  isActive: boolean
  sortOrder: number
}

type DiscountsContextValue = {
  discounts: Discount[]
  loading: boolean
  error: string | null
  addDiscount: (data: Omit<Discount, 'id'>) => Promise<void>
  updateDiscount: (id: number, data: Partial<Discount>) => Promise<void>
  deleteDiscount: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

const DiscountsContext = createContext<DiscountsContextValue | null>(null)

export const DEFAULT_DISCOUNTS: Discount[] = [
  {
    id: 1,
    title: 'Скидка 5% от 5 000 ₽',
    type: 'percent',
    thresholdRub: 5000,
    value: 5,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    title: 'Скидка 10% от 10 000 ₽',
    type: 'percent',
    thresholdRub: 10000,
    value: 10,
    isActive: true,
    sortOrder: 2,
  },
]

export function DiscountsProvider({ children }: { children: ReactNode }) {
  const [discounts, setDiscounts] = useState<Discount[]>(DEFAULT_DISCOUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/discounts')
      if (!res.ok) throw new Error('Failed to fetch discounts')
      const data = await res.json()
      if (data && Array.isArray(data.discounts) && data.discounts.length > 0) {
        setDiscounts(data.discounts)
      } else {
        setDiscounts(DEFAULT_DISCOUNTS)
      }
      setError(null)
    } catch (err) {
      console.warn('Error fetching discounts, fallback to defaults:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const addDiscount = async (data: Omit<Discount, 'id'>) => {
    const res = await fetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create discount')
    await refresh()
  }

  const updateDiscount = async (id: number, data: Partial<Discount>) => {
    const res = await fetch(`/api/discounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update discount')
    await refresh()
  }

  const deleteDiscount = async (id: number) => {
    const res = await fetch(`/api/discounts/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete discount')
    await refresh()
  }

  return (
    <DiscountsContext.Provider
      value={{ discounts, loading, error, addDiscount, updateDiscount, deleteDiscount, refresh }}
    >
      {children}
    </DiscountsContext.Provider>
  )
}

export function useDiscounts() {
  const ctx = useContext(DiscountsContext)
  if (!ctx) {
    throw new Error('useDiscounts must be used within DiscountsProvider')
  }
  return ctx
}
