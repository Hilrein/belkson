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
    id: 'about_welcome',
    title: 'Добро пожаловать в BELKSON 🧸',
    badge: '',
    content:
      'Меня зовут Юлия ❤️ Здесь вы найдете детскую одежду любимых брендов, которых нет в России. ТОЛЬКО ОРИГИНАЛЫ!!! Реплику не предлагаю.',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'about_order',
    title: 'Как заказать',
    badge: '',
    content:
      'Для заказа пишите в личные сообщения VK, Telegram, MAX или оформляйте заказ на нашем сайте 💖',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'about_buyer',
    title: 'Услуги байера',
    badge: '',
    content:
      'Через меня вы можете сделать заказ с любых официальных сайтов Европы, Турции и Казахстана 🟢',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'about_stock',
    title: 'Всё в наличии',
    badge: '',
    content:
      'Все, что есть на сайте — В НАЛИЧИИ! Ждать доставку не нужно, отправляем в течении 1–2 рабочих дней 🔵 По запросу делаем замеры, видео и дополнительные фото вещей 📷',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'about_loyalty',
    title: 'Программа лояльности',
    badge: '',
    content:
      '🔵 При покупке от 5 000 ₽ — скидка 5% на чек\n🟣 От 10 000 ₽ — скидка 10%\n\n+ подарок в КАЖДОМ заказе 💝',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'about_thanks',
    title: '',
    badge: '',
    content:
      'Хороших покупок и спасибо, что выбираете меня 💕',
    sortOrder: 6,
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
