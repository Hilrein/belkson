import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type CountryItem = {
  name: string
  url: string
  rate?: string
}

export type OfficialStore = {
  id: number
  name: string
  countries: CountryItem[]
  sortOrder: number
  isActive: boolean
}

type OfficialStoresContextValue = {
  stores: OfficialStore[]
  loading: boolean
  error: string | null
  addStore: (data: { name: string; countries: (string | CountryItem)[]; sortOrder?: number; isActive?: boolean }) => Promise<void>
  updateStore: (id: number, data: Partial<OfficialStore>) => Promise<void>
  deleteStore: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

const OfficialStoresContext = createContext<OfficialStoresContextValue | null>(null)

const DEFAULT_STORES: OfficialStore[] = [
  {
    id: 1,
    name: 'Zara',
    countries: [
      { name: 'Spain', url: 'https://www.zara.com/es/', rate: '105 ₽' },
      { name: 'UK', url: 'https://www.zara.com/uk/', rate: '130 ₽' },
      { name: 'Poland', url: 'https://www.zara.com/pl/', rate: '26 ₽' },
      { name: 'Germany', url: 'https://www.zara.com/de/', rate: '105 ₽' },
      { name: 'Kazakhstan', url: 'https://www.zara.com/kz/', rate: '0.22 ₽' },
    ],
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    name: 'H&M',
    countries: [
      { name: 'UK', url: 'https://www2.hm.com/en_gb/index.html', rate: '130 ₽' },
      { name: 'Germany', url: 'https://www2.hm.com/de_de/index.html', rate: '105 ₽' },
      { name: 'Poland', url: 'https://www2.hm.com/pl_pl/index.html', rate: '26 ₽' },
      { name: 'USA', url: 'https://www2.hm.com/en_us/index.html', rate: '98 ₽' },
    ],
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    name: 'Next',
    countries: [
      { name: 'UK', url: 'https://www.next.co.uk', rate: '130 ₽' },
      { name: 'Kazakhstan', url: 'https://www.next.kz', rate: '0.22 ₽' },
      { name: 'Germany', url: 'https://www.next.de', rate: '105 ₽' },
      { name: 'Spain', url: 'https://www.next.es', rate: '105 ₽' },
    ],
    sortOrder: 3,
    isActive: true,
  },
]

export function OfficialStoresProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<OfficialStore[]>(DEFAULT_STORES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/official-stores')
      if (!res.ok) throw new Error('Failed to fetch official stores')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setStores(data)
      } else {
        setStores(DEFAULT_STORES)
      }
      setError(null)
    } catch (err) {
      console.warn('Error fetching official stores, fallback to defaults:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const addStore = async (data: {
    name: string
    countries: (string | CountryItem)[]
    sortOrder?: number
    isActive?: boolean
  }) => {
    const res = await fetch('/api/official-stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create store')
    await refresh()
  }

  const updateStore = async (id: number, data: Partial<OfficialStore>) => {
    const res = await fetch(`/api/official-stores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update store')
    await refresh()
  }

  const deleteStore = async (id: number) => {
    const res = await fetch(`/api/official-stores/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete store')
    await refresh()
  }

  return (
    <OfficialStoresContext.Provider
      value={{ stores, loading, error, addStore, updateStore, deleteStore, refresh }}
    >
      {children}
    </OfficialStoresContext.Provider>
  )
}

export function useOfficialStores() {
  const ctx = useContext(OfficialStoresContext)
  if (!ctx) {
    throw new Error('useOfficialStores must be used within OfficialStoresProvider')
  }
  return ctx
}
