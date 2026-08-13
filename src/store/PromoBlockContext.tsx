import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface PromoMainCard {
  image: string
  badge: string
  title: string
  description: string
  buttonText: string
  buttonLink: string
}

export interface PromoFeaturesCard {
  title: string
  items: string[]
}

export interface PromoSecondaryCard {
  image: string
  title: string
  linkText: string
  linkUrl: string
}

export interface PromoBlockData {
  isActive: boolean
  mainCard: PromoMainCard
  featuresCard: PromoFeaturesCard
  secondaryCard: PromoSecondaryCard
}

export const DEFAULT_PROMO_BLOCK: PromoBlockData = {
  isActive: true,
  mainCard: {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCcIoQstGiOoJsMha05qt-pi349QXUPBjNWLU-2s49dciEvoFl57vggXvK6J6EH9iyk6QZ2cfwKYheAz5kBYR0AOtjWwR4v_UsxNqxwQsJa7sFCbRMloAb-Yx04owsdwUXHC8VD8ug1TJEyOlcuOAdgkhRrRLGSbAaZjwME82bZDf-BKuNjuqV7PiJRg9MCi3H8yJCe-4owZdsYLAX-YB8Bz6I4gBzcHKiAE5CRzPxertAFZesXtzXVzA1sMm2LuDZYvbUW9ZpGAQu',
    badge: 'Новая коллекция',
    title: 'Коллекция для переменки',
    description: 'Одежда для приключений из экологичных и прочных тканей.',
    buttonText: 'Смотреть коллекцию',
    buttonLink: '/catalog',
  },
  featuresCard: {
    title: 'С заботой о планете',
    items: [
      'Органический хлопок',
      'Без агрессивных красителей',
      'Мягко для чувствительной кожи',
    ],
  },
  secondaryCard: {
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzfXQLCjEcOYa9JWefnJxVNtMvLW77hvpFU-BmxSFAJblnOkg2kDVj_ipKEcO19Gp6j7rjf7okmqUwjlf9JBeE44txITjk8ge7lKAVPCWjvMhYz_xHzqHbWeOWZBvYTmomsPaeXXrmt_5PbSQ8LjavhTyA3GXovY9RaVwRhZM2pLTrJVSQCT-7vcWsQKesLEN-0h3zXilKIgvkwCBKS5bXQoxOAC6OQ2QoXttUxQV4bPS9dRDamgduZScmoYtxUg1DPSdhpUTa7O1B',
    title: 'Базовые вещи для малышей',
    linkText: 'Купить',
    linkUrl: '/catalog',
  },
}

type PromoBlockContextValue = {
  data: PromoBlockData
  loading: boolean
  updateData: (newData: PromoBlockData) => Promise<void>
  refresh: () => Promise<void>
}

const PromoBlockContext = createContext<PromoBlockContextValue | null>(null)

export function PromoBlockProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PromoBlockData>(DEFAULT_PROMO_BLOCK)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/promo-block')
      if (res.ok) {
        const val = await res.json()
        if (val && typeof val === 'object' && 'mainCard' in val) {
          setData(val)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch promo block settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const updateData = async (newData: PromoBlockData) => {
    setData(newData)
    try {
      await fetch('/api/promo-block', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      })
    } catch (err) {
      console.warn('Failed to update promo block settings:', err)
    }
  }

  return (
    <PromoBlockContext.Provider value={{ data, loading, updateData, refresh }}>
      {children}
    </PromoBlockContext.Provider>
  )
}

export function usePromoBlock() {
  const ctx = useContext(PromoBlockContext)
  if (!ctx) throw new Error('usePromoBlock must be used within PromoBlockProvider')
  return ctx
}
