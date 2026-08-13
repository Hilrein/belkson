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
    title: '',
    badge: '',
    content:
      'Добро пожаловать в магазин детской одежды BELKSON\n\nМеня зовут Юлия\n\nЗдесь вы найдете детскую одежду любимых брендов H&M, ZARA, C&A, Next и другие бренды, которых нет в России.\nТолько оригиналы. Реплику не предлагаю.',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'about_order',
    title: '',
    badge: '',
    content:
      'Для заказа пишите в личные сообщения VK, Telegram, MAX или оформляйте заказ на нашем сайте.',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'about_buyer',
    title: '',
    badge: '',
    content:
      'Услуги байера — через меня вы можете сделать заказ с любых официальных сайтов Европы, Турции и Казахстана.',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'about_stock',
    title: '',
    badge: '',
    content:
      'Всё, что есть на сайте — в наличии. Ждать доставку не нужно, отправляем в течение 1–2 рабочих дней.\nПо запросу делаем замеры, видео и дополнительные фото вещей.',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'about_loyalty',
    title: 'Программа лояльности',
    badge: '',
    content:
      'При покупке от 5 000 руб. — скидка 5% на чек\nОт 10 000 руб. — скидка 10%\n\nПодарок в каждом заказе.',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'about_thanks',
    title: '',
    badge: '',
    content:
      'Хороших покупок и спасибо, что выбираете меня.',
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
