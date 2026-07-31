import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type PurchaseTermStep = {
  id: string
  icon: string
  title: string
  description: string
}

export type PurchaseVariant = {
  id: string
  badge: string
  title: string
  isActive: boolean
  steps: PurchaseTermStep[]
}

type PurchaseTermsContextValue = {
  variants: PurchaseVariant[]
  loading: boolean
  error: string | null
  updateVariants: (variants: PurchaseVariant[]) => Promise<void>
  refresh: () => Promise<void>
}

export const DEFAULT_DYNAMIC_VARIANTS: PurchaseVariant[] = [
  {
    id: 'v1',
    badge: 'Вариант 1',
    title: 'Порядок и условия выкупа',
    isActive: true,
    steps: [
      { id: '1', icon: 'search', title: 'Выбор товара', description: 'Выбираете вещи на официальных сайтах Zara, H&M или Next.' },
      { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете ссылки на товары в Telegram или Instagram.' },
      { id: '3', icon: 'calculate', title: 'Расчёт стоимости', description: 'Считаем итоговую сумму с доставкой и комиссией.' },
      { id: '4', icon: 'payment', title: 'Оплата', description: 'Оплачиваете удобным способом.' },
      { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Выкупаем товар и доставляем вам.' },
    ],
  },
  {
    id: 'v2',
    badge: 'Вариант 2',
    title: 'Порядок и условия выкупа',
    isActive: true,
    steps: [
      { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.' },
      { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.' },
      { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.' },
      { id: '4', icon: 'payment', title: 'Оплата', description: 'Вы производите оплату удобным способом.' },
      { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.' },
    ],
  },
  {
    id: 'v3',
    badge: 'Вариант 3',
    title: 'Порядок и условия выкупа',
    isActive: true,
    steps: [
      { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.' },
      { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.' },
      { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.' },
      { id: '4', icon: 'payment', title: 'Оплата', description: 'Вы производите оплату удобным способом.' },
      { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.' },
    ],
  },
]

const PurchaseTermsContext = createContext<PurchaseTermsContextValue | null>(null)

export function PurchaseTermsProvider({ children }: { children: ReactNode }) {
  const [variants, setVariants] = useState<PurchaseVariant[]>(DEFAULT_DYNAMIC_VARIANTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/purchase-terms')
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Failed to fetch purchase terms from DB')
      }
      const data = await res.json()
      if (data && typeof data === 'object' && Array.isArray(data.variants)) {
        setVariants(data.variants)
      } else {
        setVariants(DEFAULT_DYNAMIC_VARIANTS)
      }
      setError(null)
    } catch (err) {
      console.error('Error fetching purchase terms from DB:', err)
      setError(err instanceof Error ? err.message : 'Database error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const updateVariants = async (newVariants: PurchaseVariant[]) => {
    const res = await fetch('/api/purchase-terms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants: newVariants }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => null)
      throw new Error(errData?.error || 'Failed to update purchase terms in DB')
    }

    const data = await res.json()
    if (data && Array.isArray(data.variants)) {
      setVariants(data.variants)
    } else {
      await refresh()
    }
  }

  return (
    <PurchaseTermsContext.Provider
      value={{ variants, loading, error, updateVariants, refresh }}
    >
      {children}
    </PurchaseTermsContext.Provider>
  )
}

export function usePurchaseTerms() {
  const ctx = useContext(PurchaseTermsContext)
  if (!ctx) {
    throw new Error('usePurchaseTerms must be used within PurchaseTermsProvider')
  }
  return ctx
}
