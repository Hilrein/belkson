import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type HeroBanner = {
  id: number
  badge: string
  title: string
  subtitle: string
  image: string
  buttonText: string
  buttonUrl: string
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

type HeroBannersContextValue = {
  banners: HeroBanner[]
  loading: boolean
  error: string | null
  addBanner: (data: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateBanner: (id: number, data: Partial<HeroBanner>) => Promise<void>
  deleteBanner: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

const DEFAULT_BANNERS: HeroBanner[] = [
  {
    id: 1,
    badge: 'Коллекция 2026',
    title: 'Весенняя нежность',
    subtitle: 'Мягкая одежда для малышей: прогулки, игры и каждый день.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAinqGQ_I7Pc4wChF5iNq9qjd8AVRzRQEk3BYcM3j9nxcvoMh4k403DisASeSApeAI0QNjlG6-OiUwzvtVf3SQsFauj2OZ5ZMJ1u-56QRGwrXQuvkVoYvjejd5RTIYtx2XiUKomHcOOXWMRZ3gXtCMSavcQ6Vf-OOhHqXBCitAhtplDxW3Q8He1TPLiOaOGVSsuci5neHsxrJqzbGM-v2qYmktOgg9l4Z8M9p9vYaDXSodfkgfoHkk8kKumfWXEfoz1dogFUQASIMap',
    buttonText: 'Смотреть новинки',
    buttonUrl: '/catalog?category=new',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    badge: 'Премиум трикотаж',
    title: 'Создано для комфорта',
    subtitle: 'Нежные ткани и удобная посадка для активного дня ребёнка.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB8XYOqM6k1V0yN9OxYE3KD3vUisD4kg3HENS3WhujMMEi1vweZXTfbqxf_gMVmXS3BxO3xhuNShDRdDGpgd_dC2YWaMLWhh9DaJoQymdWpGNX-7E3zC5JpTWwLPoqWwsZD46MK841lM3bvdLReNjLgKBzZOZDuQj6x8yCoihcD7f3TOr6gE1i-HO9NlZA9-TQfrglWzkecr7PxoNuovqPLQCtN8W5d1rQk7XGWDqLQwJiargBAigg616CwuYyRyCXzdpUihQVawbcF',
    buttonText: 'В каталог',
    buttonUrl: '/catalog',
    sortOrder: 2,
    isActive: true,
  },
]

const HeroBannersContext = createContext<HeroBannersContextValue | null>(null)

export function HeroBannersProvider({ children }: { children: ReactNode }) {
  const [banners, setBanners] = useState<HeroBanner[]>(DEFAULT_BANNERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hero-banners')
      if (!res.ok) throw new Error('Failed to fetch hero banners')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data)
      } else {
        setBanners(DEFAULT_BANNERS)
      }
      setError(null)
    } catch (err) {
      console.warn('Error fetching hero banners, fallback to defaults:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setBanners(DEFAULT_BANNERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const addBanner = async (data: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await fetch('/api/hero-banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { error?: string }
        if (body?.error) detail = `: ${body.error}`
      } catch {}
      const msg = `Failed to create hero banner${detail} (HTTP ${res.status} ${res.statusText})`
      console.error(msg, { data, detail })
      throw new Error(msg)
    }
    await refresh()
  }

  const updateBanner = async (id: number, data: Partial<HeroBanner>) => {
    const res = await fetch(`/api/hero-banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { error?: string }
        if (body?.error) detail = `: ${body.error}`
      } catch {}
      const msg = `Failed to update hero banner${detail} (HTTP ${res.status} ${res.statusText})`
      console.error(msg, { id, data, detail })
      throw new Error(msg)
    }
    await refresh()
  }

  const deleteBanner = async (id: number) => {
    const res = await fetch(`/api/hero-banners/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { error?: string }
        if (body?.error) detail = `: ${body.error}`
      } catch {}
      const msg = `Failed to delete hero banner${detail} (HTTP ${res.status})`
      console.error(msg, { id, detail })
      throw new Error(msg)
    }
    await refresh()
  }

  return (
    <HeroBannersContext.Provider
      value={{ banners, loading, error, addBanner, updateBanner, deleteBanner, refresh }}
    >
      {children}
    </HeroBannersContext.Provider>
  )
}

export function useHeroBanners() {
  const ctx = useContext(HeroBannersContext)
  if (!ctx) {
    throw new Error('useHeroBanners must be used within HeroBannersProvider')
  }
  return ctx
}
