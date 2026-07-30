import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type OfficialStore = {
  id: number
  name: string
  countries: string[]
  sortOrder: number
  isActive: boolean
}

type OfficialStoresContextValue = {
  stores: OfficialStore[]
  loading: boolean
  error: string | null
  addStore: (data: { name: string; countries: string[]; sortOrder?: number; isActive?: boolean }) => Promise<void>
  updateStore: (id: number, data: Partial<OfficialStore>) => Promise<void>
  deleteStore: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

const OfficialStoresContext = createContext<OfficialStoresContextValue | null>(null)

const DEFAULT_STORES: OfficialStore[] = [
  { id: 1, name: 'Zara', countries: ['Spain', 'UK', 'Poland', 'Germany', 'Kazakhstan'], sortOrder: 1, isActive: true },
  { id: 2, name: 'H&M', countries: ['UK', 'Germany', 'Poland', 'USA'], sortOrder: 2, isActive: true },
  { id: 3, name: 'Next', countries: ['UK', 'Kazakhstan', 'Germany', 'Spain'], sortOrder: 3, isActive: true },
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

  const addStore = async (data: { name: string; countries: string[]; sortOrder?: number; isActive?: boolean }) => {
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
