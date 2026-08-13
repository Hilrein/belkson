import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type MessengerSetting = {
  id: 'telegram' | 'max' | 'vk' | string
  label: string
  value: string
  description?: string
  isActive: boolean
  updatedAt?: string
}

type MessengerSettingsContextValue = {
  settings: MessengerSetting[]
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (nextSettings: MessengerSetting[]) => Promise<void>
  getSetting: (id: 'telegram' | 'max' | 'vk') => MessengerSetting | undefined
}

const DEFAULT_SETTINGS: MessengerSetting[] = []

const MessengerSettingsContext = createContext<MessengerSettingsContextValue | null>(null)

export function MessengerSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<MessengerSetting[]>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/messenger-settings')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.settings) && data.settings.length > 0) {
          setSettings(data.settings)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch messenger settings from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSettings = async (nextSettings: MessengerSetting[]) => {
    setSettings(nextSettings)

    try {
      const res = await fetch('/api/messenger-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.settings)) {
          setSettings(data.settings)
        }
      }
    } catch (err) {
      console.warn('Failed to update messenger settings in DB:', err)
    }
  }

  const getSetting = (id: 'telegram' | 'max' | 'vk') => {
    return settings.find((s) => s.id === id) || DEFAULT_SETTINGS.find((s) => s.id === id)
  }

  return (
    <MessengerSettingsContext.Provider
      value={{
        settings,
        loading,
        fetchSettings,
        updateSettings,
        getSetting,
      }}
    >
      {children}
    </MessengerSettingsContext.Provider>
  )
}

export function useMessengerSettings() {
  const ctx = useContext(MessengerSettingsContext)
  if (!ctx) {
    throw new Error('useMessengerSettings must be used within a MessengerSettingsProvider')
  }
  return ctx
}
