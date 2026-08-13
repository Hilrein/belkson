# Editable Promo Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the promo section on the homepage fully editable via the Admin Panel and save changes to PostgreSQL database via API.

**Architecture:** Create a backend API endpoint (`/api/promo-block`), a React context (`PromoBlockContext.tsx`) for global state management, integrate dynamic rendering in `HomePage.tsx`, and add a dedicated editing tab in `AdminPage.tsx`.

**Tech Stack:** React 19, TypeScript, Hono, Neon PostgreSQL (`site_settings` table), Tailwind CSS v4.

## Global Constraints

- Backend store: `site_settings` table in Neon Postgres, using key `'promo_block'`.
- Default values must match `1.png` design exactly if database record is empty.
- Keep exact CSS layout and visual aesthetics of `#prochee` section on `HomePage.tsx`.

---

### Task 1: Backend API Endpoints for Promo Block

**Files:**
- Modify: `api/app-core.ts`

**Interfaces:**
- Produces: `GET /api/promo-block` and `PUT /api/promo-block` endpoints.

- [ ] **Step 1: Inspect `api/app-core.ts` where site settings endpoints are defined**
- [ ] **Step 2: Add GET `/api/promo-block` and PUT `/api/promo-block` handlers to `api/app-core.ts`**

```ts
// Handlers for promo-block
async function handleGetPromoBlock(c: Context) {
  try {
    const res = await queryNeon("SELECT value FROM site_settings WHERE key = 'promo_block'");
    if (res.rows && res.rows.length > 0 && res.rows[0].value) {
      const data = JSON.parse(res.rows[0].value);
      return c.json(data);
    }
  } catch (err) {
    console.warn('Failed to fetch promo_block setting:', err);
  }
  return c.json(DEFAULT_PROMO_BLOCK);
}

async function handleUpdatePromoBlock(c: Context) {
  const body = await c.req.json();
  const valStr = JSON.stringify(body);
  await queryNeon(
    `INSERT INTO site_settings (key, value) VALUES ('promo_block', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [valStr]
  );
  return c.json({ success: true, data: body });
}
```

- [ ] **Step 3: Register `/api/promo-block` routes in `app-core.ts`**
- [ ] **Step 4: Verify build with `npm run build` inside `Belkson/Belkson`**
- [ ] **Step 5: Commit changes**

---

### Task 2: React Context (`PromoBlockContext.tsx`) & Provider Setup

**Files:**
- Create: `src/store/PromoBlockContext.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `PromoBlockProvider` and `usePromoBlock()` hook.

- [ ] **Step 1: Create `src/store/PromoBlockContext.tsx`**

```tsx
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
```

- [ ] **Step 2: Wrap application in `src/App.tsx` with `PromoBlockProvider`**
- [ ] **Step 3: Run build to verify type safety**
- [ ] **Step 4: Commit changes**

---

### Task 3: Dynamic Rendering on HomePage (`HomePage.tsx`)

**Files:**
- Modify: `src/HomePage.tsx:347-419`

**Interfaces:**
- Consumes: `usePromoBlock()` from `src/store/PromoBlockContext.tsx`.

- [ ] **Step 1: Import `usePromoBlock` in `HomePage.tsx`**
- [ ] **Step 2: Update `<section id="prochee">` in `HomePage.tsx` to dynamically output content from `usePromoBlock()`**
- [ ] **Step 3: Run build to check syntax and rendering**
- [ ] **Step 4: Commit changes**

---

### Task 4: Admin Page Editor Tab (`AdminPage.tsx`)

**Files:**
- Modify: `src/admin/AdminPage.tsx`

**Interfaces:**
- Consumes: `usePromoBlock()` from `src/store/PromoBlockContext.tsx`.

- [ ] **Step 1: Add "Промо-блок" tab to AdminPage navigation list**
- [ ] **Step 2: Implement Promo Block Editor component/section in `AdminPage.tsx`**
- [ ] **Step 3: Include controls for active state, main card, features items list (add/remove), secondary card**
- [ ] **Step 4: Test save interaction**
- [ ] **Step 5: Run build verification (`npm run build`)**
- [ ] **Step 6: Commit changes**
