import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ContactItem = {
  id: string
  label: string
  value: string
  description?: string
  isActive: boolean
  sortOrder?: number
  updatedAt?: string
}

type ContactsSettingsContextValue = {
  items: ContactItem[]
  loading: boolean
  fetchContacts: () => Promise<void>
  updateContacts: (nextItems: ContactItem[]) => Promise<void>
  deleteContact: (id: string) => Promise<void>
}

const DEFAULT_CONTACTS: ContactItem[] = [
  {
    id: 'telegram_channel',
    label: 'Telegram',
    value: 'https://t.me/Belksonshop',
    description: 'Официальный канал с анонсами новинок и выкупов',
    isActive: true,
  },
  {
    id: 'max_messenger',
    label: 'MAX',
    value: 'https://web.max.ru/u/f9LHodD0cOKVbrxghT0d8KoNtlR6WdagEWPgauFxCl5D2WpF9Euc-C2vFWo',
    description: 'Мессенджер MAX для консультаций и оформления заказов',
    isActive: true,
  },
  {
    id: 'vk_community',
    label: 'VK',
    value: 'https://vk.com/club94968923',
    description: 'Новости бренда, фотографии коллекций и консультации',
    isActive: true,
  },
]

const ContactsSettingsContext = createContext<ContactsSettingsContextValue | null>(null)

export function ContactsSettingsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ContactItem[]>(DEFAULT_CONTACTS)
  const [loading, setLoading] = useState(false)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts-settings')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.items)) {
          setItems(data.items)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch contacts settings from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const updateContacts = async (nextItems: ContactItem[]) => {
    setItems(nextItems)
    try {
      const res = await fetch('/api/contacts-settings', {
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
      console.warn('Failed to update contacts settings in DB:', err)
    }
  }

  const deleteContact = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    try {
      const res = await fetch(`/api/contacts-settings/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.items)) {
          setItems(data.items)
        }
      }
    } catch (err) {
      console.warn('Failed to delete contact item in DB:', err)
    }
  }

  return (
    <ContactsSettingsContext.Provider
      value={{
        items,
        loading,
        fetchContacts,
        updateContacts,
        deleteContact,
      }}
    >
      {children}
    </ContactsSettingsContext.Provider>
  )
}

export function useContactsSettings() {
  const ctx = useContext(ContactsSettingsContext)
  if (!ctx) {
    throw new Error('useContactsSettings must be used within a ContactsSettingsProvider')
  }
  return ctx
}
