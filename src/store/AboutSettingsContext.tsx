import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type AboutSetting = {
  id: string
  title: string
  content: string
  badge?: string
  sortOrder?: number
  isActive: boolean
  updatedAt?: string
}

type AboutSettingsContextValue = {
  items: AboutSetting[]
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (nextItems: AboutSetting[]) => Promise<void>
  deleteSetting: (id: string) => Promise<void>
}

const DEFAULT_ITEMS: AboutSetting[] = [
  {
    id: 'about_mission',
    title: 'О бренде Belkson',
    badge: 'Миссия и оригинальность',
    content:
      'Belkson — сервисный байер-проект для комфортного выкупа оригинальных товаров из мировых магазинов (ZARA, H&M, NEXT и многих других). Мы обеспечиваем прямую доставку, гарантируем подлинность каждого заказа и берем на себя всю логистику.',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'about_quality',
    title: '100% Гарантия качества',
    badge: 'Подлинность',
    content:
      'Все заказы формируются непосредственно в официальных розничных сетях и онлайн-бутиках европейских стран. Мы тщательно проверяем вещи на соответствие размерам и отсутствие брака перед отправкой клиентской службой.',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'about_delivery',
    title: 'Быстрая доставка и поддержка',
    badge: 'Сервис',
    content:
      'Мы выстраиваем максимально прозрачный сервис выкупа: фиксированные прозрачные курсы валют, оперативную обработку заказов в Telegram и MAX и регулярное информирование о каждом этапе движения вашей посылки.',
    sortOrder: 3,
    isActive: true,
  },
]

const AboutSettingsContext = createContext<AboutSettingsContextValue | null>(null)

export function AboutSettingsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AboutSetting[]>(DEFAULT_ITEMS)
  const [loading, setLoading] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/about-settings')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch about settings from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSettings = async (nextItems: AboutSetting[]) => {
    setItems(nextItems)

    try {
      const res = await fetch('/api/about-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextItems),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.items)) {
          setItems(data.items)
        }
      }
    } catch (err) {
      console.warn('Failed to update about settings in DB:', err)
    }
  }

  const deleteSetting = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    try {
      const res = await fetch(`/api/about-settings/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.items)) {
          setItems(data.items)
        }
      }
    } catch (err) {
      console.warn('Failed to delete about setting in DB:', err)
    }
  }

  return (
    <AboutSettingsContext.Provider
      value={{
        items,
        loading,
        fetchSettings,
        updateSettings,
        deleteSetting,
      }}
    >
      {children}
    </AboutSettingsContext.Provider>
  )
}

export function useAboutSettings() {
  const ctx = useContext(AboutSettingsContext)
  if (!ctx) {
    throw new Error('useAboutSettings must be used within an AboutSettingsProvider')
  }
  return ctx
}
