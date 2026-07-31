import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type PurchaseTermStep = {
  id: string
  icon: string
  title: string
  description: string
}

export type PurchaseTermsConfig = {
  title: string
  steps: PurchaseTermStep[]
}

type PurchaseTermsContextValue = {
  terms: PurchaseTermsConfig
  loading: boolean
  error: string | null
  updateTerms: (data: PurchaseTermsConfig) => Promise<void>
  refresh: () => Promise<void>
}

const DEFAULT_TERMS: PurchaseTermsConfig = {
  title: 'Вариант 3: Порядок и условия выкупа',
  steps: [
    {
      id: '1',
      icon: 'search',
      title: 'Выбор товара',
      description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.',
    },
    {
      id: '2',
      icon: 'edit_document',
      title: 'Оформление заказа',
      description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.',
    },
    {
      id: '3',
      icon: 'calculate',
      title: 'Расчет стоимости',
      description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.',
    },
    {
      id: '4',
      icon: 'payment',
      title: 'Оплата',
      description: 'Вы производите оплату удобным способом.',
    },
    {
      id: '5',
      icon: 'local_shipping',
      title: 'Доставка',
      description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.',
    },
  ],
}

const PurchaseTermsContext = createContext<PurchaseTermsContextValue | null>(null)

export function PurchaseTermsProvider({ children }: { children: ReactNode }) {
  const [terms, setTerms] = useState<PurchaseTermsConfig>(DEFAULT_TERMS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/purchase-terms')
      if (!res.ok) throw new Error('Failed to fetch purchase terms')
      const data = await res.json()
      if (data && typeof data === 'object' && Array.isArray(data.steps)) {
        setTerms({
          title: data.title || DEFAULT_TERMS.title,
          steps: data.steps,
        })
      } else {
        setTerms(DEFAULT_TERMS)
      }
      setError(null)
    } catch (err) {
      console.warn('Error fetching purchase terms, using defaults:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const updateTerms = async (data: PurchaseTermsConfig) => {
    const res = await fetch('/api/purchase-terms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update purchase terms')
    await refresh()
  }

  return (
    <PurchaseTermsContext.Provider
      value={{ terms, loading, error, updateTerms, refresh }}
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
