import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type PurchaseTermStep = {
  id: string
  icon: string
  title: string
  description: string
}

export type VariantTermsConfig = {
  title: string
  steps: PurchaseTermStep[]
}

export type AllPurchaseTermsConfig = {
  v1: VariantTermsConfig
  v2: VariantTermsConfig
  v3: VariantTermsConfig
}

type PurchaseTermsContextValue = {
  allTerms: AllPurchaseTermsConfig
  loading: boolean
  error: string | null
  updateAllTerms: (data: AllPurchaseTermsConfig) => Promise<void>
  refresh: () => Promise<void>
}

const DEFAULT_V1: VariantTermsConfig = {
  title: 'Порядок и условия выкупа',
  steps: [
    { id: '1', icon: 'search', title: 'Выбор товара', description: 'Выбираете вещи на официальных сайтах Zara, H&M или Next.' },
    { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете ссылки на товары в Telegram или Instagram.' },
    { id: '3', icon: 'calculate', title: 'Расчёт стоимости', description: 'Считаем итоговую сумму с доставкой и комиссией.' },
    { id: '4', icon: 'payment', title: 'Оплата', description: 'Оплачиваете удобным способом.' },
    { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Выкупаем товар и доставляем вам.' },
  ],
}

const DEFAULT_V2: VariantTermsConfig = {
  title: 'Вариант 2: Порядок и условия выкупа',
  steps: [
    { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.' },
    { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.' },
    { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.' },
    { id: '4', icon: 'payment', title: 'Оплата', description: 'Вы производите оплату удобным способом.' },
    { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.' },
  ],
}

const DEFAULT_V3: VariantTermsConfig = {
  title: 'Вариант 3: Порядок и условия выкупа',
  steps: [
    { id: '1', icon: 'search', title: 'Выбор товара', description: 'Вы выбираете понравившиеся вещи на официальных сайтах Zara, H&M или Next.' },
    { id: '2', icon: 'edit_document', title: 'Оформление заказа', description: 'Присылаете нам ссылки на выбранные товары в Telegram или Instagram.' },
    { id: '3', icon: 'calculate', title: 'Расчет стоимости', description: 'Мы рассчитываем итоговую стоимость с учетом доставки и комиссии.' },
    { id: '4', icon: 'payment', title: 'Оплата', description: 'Вы производите оплату удобным способом.' },
    { id: '5', icon: 'local_shipping', title: 'Доставка', description: 'Мы выкупаем товар и доставляем его вам в кратчайшие сроки.' },
  ],
}

export const DEFAULT_ALL_TERMS: AllPurchaseTermsConfig = {
  v1: DEFAULT_V1,
  v2: DEFAULT_V2,
  v3: DEFAULT_V3,
}

const PurchaseTermsContext = createContext<PurchaseTermsContextValue | null>(null)

export function PurchaseTermsProvider({ children }: { children: ReactNode }) {
  const [allTerms, setAllTerms] = useState<AllPurchaseTermsConfig>(DEFAULT_ALL_TERMS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/purchase-terms')
      if (!res.ok) throw new Error('Failed to fetch purchase terms')
      const data = await res.json()
      if (data && typeof data === 'object') {
        if (data.v1 || data.v2 || data.v3) {
          setAllTerms({
            v1: data.v1 || DEFAULT_V1,
            v2: data.v2 || DEFAULT_V2,
            v3: data.v3 || DEFAULT_V3,
          })
        } else if (Array.isArray(data.steps)) {
          setAllTerms({
            v1: DEFAULT_V1,
            v2: DEFAULT_V2,
            v3: {
              title: data.title || DEFAULT_V3.title,
              steps: data.steps,
            },
          })
        } else {
          setAllTerms(DEFAULT_ALL_TERMS)
        }
      } else {
        setAllTerms(DEFAULT_ALL_TERMS)
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

  const updateAllTerms = async (data: AllPurchaseTermsConfig) => {
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
      value={{ allTerms, loading, error, updateAllTerms, refresh }}
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
