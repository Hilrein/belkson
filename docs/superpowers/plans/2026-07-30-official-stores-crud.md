# Official Stores CRUD & Mega-Menu Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Выкуп с официальных сайтов" menu items fully manageable (CRUD) from the Admin panel with Neon PostgreSQL persistence and dynamic storefront rendering.

**Architecture:** A Hono backend route set manages `official_stores` in Neon Postgres, wrapped by a React `OfficialStoresContext` on the frontend, feeding an Admin management view (with tab switcher, active toggles, and slide-over edit modal) and rendering dynamically in `StorefrontLayout` (mega-menu and mobile menu).

**Tech Stack:** React 19, TypeScript, Hono, Neon Database (`@neondatabase/serverless`), Vite, Tailwind CSS v4.

## Global Constraints
- Neon PostgreSQL storage via `@neondatabase/serverless` query function `getSql()` in `api/app-core.ts`.
- REST API mounted on `/api/official-stores`.
- Clean TypeScript types without using `any`.
- Keep existing code styling and design tokens.

---

### Task 1: Backend Database & API Endpoints in Hono

**Files:**
- Modify: `Belkson/api/app-core.ts`

**Interfaces:**
- Produces: `GET /api/official-stores`, `POST /api/official-stores`, `PUT /api/official-stores/:id`, `DELETE /api/official-stores/:id`

- [ ] **Step 1: Define types, SQL table init & seed function in `api/app-core.ts`**

Add `DbOfficialStore` interface and `initOfficialStoresTable()` to `api/app-core.ts`:

```typescript
type DbOfficialStore = {
  id: number
  name: string
  countries: string | string[] | { name: string; url?: string }[]
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

async function ensureOfficialStoresTable() {
  const client = getSql()
  await client`
    CREATE TABLE IF NOT EXISTS official_stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      countries JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  const existing = await client`SELECT COUNT(*)::int as count FROM official_stores` as { count: number }[]
  if (existing[0]?.count === 0) {
    await client`
      INSERT INTO official_stores (name, countries, sort_order, is_active)
      VALUES 
        ('Zara', '["Spain", "UK", "Poland", "Germany", "Kazakhstan"]'::jsonb, 1, true),
        ('H&M', '["UK", "Germany", "Poland", "USA"]'::jsonb, 2, true),
        ('Next', '["UK", "Kazakhstan", "Germany", "Spain"]'::jsonb, 3, true);
    `
  }
}
```

- [ ] **Step 2: Add Hono REST API handlers for `/official-stores`**

In `api/app-core.ts`, add the routes:

```typescript
app.get('/official-stores', async (c) => {
  const client = getSql()
  await ensureOfficialStoresTable()
  const rows = (await client`
    SELECT * FROM official_stores ORDER BY sort_order ASC, id ASC
  `) as DbOfficialStore[]

  const stores = rows.map((r) => ({
    id: r.id,
    name: r.name,
    countries: typeof r.countries === 'string' ? JSON.parse(r.countries) : (r.countries || []),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  return c.json(stores)
})

app.post('/official-stores', async (c) => {
  const body = await c.req.json()
  const client = getSql()
  await ensureOfficialStoresTable()

  const name = String(body.name ?? '').trim()
  if (!name) return c.json({ error: 'Name is required' }, 400)

  const countries = Array.isArray(body.countries) ? body.countries : []
  const sortOrder = Number(body.sortOrder ?? 0)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true

  const rows = (await client`
    INSERT INTO official_stores (name, countries, sort_order, is_active)
    VALUES (${name}, ${JSON.stringify(countries)}::jsonb, ${sortOrder}, ${isActive})
    RETURNING *
  `) as DbOfficialStore[]

  const r = rows[0]
  return c.json({
    id: r.id,
    name: r.name,
    countries: typeof r.countries === 'string' ? JSON.parse(r.countries) : (r.countries || []),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }, 201)
})

app.put('/official-stores/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const body = await c.req.json()
  const client = getSql()
  await ensureOfficialStoresTable()

  const existing = (await client`
    SELECT * FROM official_stores WHERE id = ${id} LIMIT 1
  `) as DbOfficialStore[]
  if (!existing[0]) return c.json({ error: 'Not found' }, 404)

  const cur = existing[0]
  const name = body.name !== undefined ? String(body.name).trim() : cur.name
  const countries = body.countries !== undefined ? (Array.isArray(body.countries) ? body.countries : []) : (typeof cur.countries === 'string' ? JSON.parse(cur.countries) : cur.countries)
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : Number(cur.sort_order)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(cur.is_active)

  const rows = (await client`
    UPDATE official_stores SET
      name = ${name},
      countries = ${JSON.stringify(countries)}::jsonb,
      sort_order = ${sortOrder},
      is_active = ${isActive},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as DbOfficialStore[]

  const r = rows[0]
  return c.json({
    id: r.id,
    name: r.name,
    countries: typeof r.countries === 'string' ? JSON.parse(r.countries) : (r.countries || []),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })
})

app.delete('/official-stores/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const client = getSql()
  await ensureOfficialStoresTable()
  const rows = (await client`
    DELETE FROM official_stores WHERE id = ${id} RETURNING id
  `) as { id: number }[]

  if (!rows[0]) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true, id })
})
```

- [ ] **Step 3: Test API locally using curl or node script**

Run dev API or check compilation with `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add Belkson/api/app-core.ts
git commit -m "feat(api): add official_stores table schema and CRUD routes"
```

---

### Task 2: React Context for Official Stores

**Files:**
- Create: `Belkson/src/store/OfficialStoresContext.tsx`
- Modify: `Belkson/src/App.tsx`

**Interfaces:**
- Produces: `useOfficialStores(): { stores, loading, error, addStore, updateStore, deleteStore, refresh }`

- [ ] **Step 1: Create `src/store/OfficialStoresContext.tsx`**

```typescript
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

export function OfficialStoresProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<OfficialStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/official-stores')
      if (!res.ok) throw new Error('Failed to fetch official stores')
      const data = await res.json()
      setStores(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching official stores:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Fallback default stores
      setStores([
        { id: 1, name: 'Zara', countries: ['Spain', 'UK', 'Poland', 'Germany', 'Kazakhstan'], sortOrder: 1, isActive: true },
        { id: 2, name: 'H&M', countries: ['UK', 'Germany', 'Poland', 'USA'], sortOrder: 2, isActive: true },
        { id: 3, name: 'Next', countries: ['UK', 'Kazakhstan', 'Germany', 'Spain'], sortOrder: 3, isActive: true },
      ])
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
    <OfficialStoresContext.Provider value={{ stores, loading, error, addStore, updateStore, deleteStore, refresh }}>
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
```

- [ ] **Step 2: Wrap app in `OfficialStoresProvider` inside `src/App.tsx`**

Modify `Belkson/src/App.tsx` to wrap router children with `<OfficialStoresProvider>`.

- [ ] **Step 3: Commit**

```bash
git add Belkson/src/store/OfficialStoresContext.tsx Belkson/src/App.tsx
git commit -m "feat(store): add OfficialStoresProvider context and hook"
```

---

### Task 3: Admin UI Tab Navigation & Official Stores CRUD Panel

**Files:**
- Modify: `Belkson/src/admin/data.ts`
- Modify: `Belkson/src/admin/AdminPage.tsx`

**Interfaces:**
- Consumes: `useOfficialStores()`

- [ ] **Step 1: Update `NAV_ITEMS` in `src/admin/data.ts`**

Update `NAV_ITEMS` array to support tab identification:

```typescript
export const NAV_ITEMS = [
  { icon: 'inventory_2', label: 'Товары', id: 'products', active: true },
  { icon: 'shopping_cart', label: 'Выкуп с сайтов', id: 'official-stores', active: false },
] as const
```

- [ ] **Step 2: Add Admin Stores View & Drawer inside `src/admin/AdminPage.tsx`**

In `AdminPage.tsx`:
1. Add `activeTab` state (`'products' | 'official-stores'`).
2. Update sidebar navigation click handlers to set `activeTab`.
3. When `activeTab === 'official-stores'`, render the **Official Stores Management Panel**:
   - Header with `+ Добавить магазин` button.
   - List of stores with their status badge, list of country tags, active toggle switch, edit button, and delete button.
   - Drawer for adding/editing a store (Title, Country input tag builder, Save button).
   - Delete confirmation modal.

- [ ] **Step 3: Verify Admin Panel tab switching and CRUD features**

Check in browser or build script that clicking "Выкуп с сайтов" opens the Stores panel, allows adding a store, editing country tags, toggling active state, and deleting a store.

- [ ] **Step 4: Commit**

```bash
git add Belkson/src/admin/data.ts Belkson/src/admin/AdminPage.tsx
git commit -m "feat(admin): implement activeTab switching and Official Stores CRUD view"
```

---

### Task 4: Storefront Mega-Menu & Mobile Navigation Integration

**Files:**
- Modify: `Belkson/src/components/StorefrontLayout.tsx`

**Interfaces:**
- Consumes: `useOfficialStores()`

- [ ] **Step 1: Update Desktop Mega-Menu in `StorefrontLayout.tsx`**

In `StorefrontLayout.tsx`:
- Import `useOfficialStores`.
- Filter `activeStores = stores.filter(s => s.isActive)`.
- Replace hardcoded `Zara`, `H&M`, `Next` JSX blocks in the desktop mega menu (around lines 255-320) with:

```tsx
<div className="w-[min(700px,calc(100vw-2rem))] bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_-12px_rgba(138,65,147,0.15)] border border-surface-dim p-8 xl:p-10 flex gap-6 xl:gap-8 overflow-x-auto">
  {activeStores.map((store) => (
    <div key={store.id} className="flex-1 min-w-[140px]">
      <h3 className="font-display-lg-mobile text-2xl text-primary mb-6 font-normal pb-4 border-b border-surface-dim">
        {store.name}
      </h3>
      <ul className="flex flex-col gap-2">
        {store.countries.map((c) => (
          <li key={c}>
            <a
              className="text-on-surface-variant hover:bg-[#ce7ed5] hover:text-white px-4 py-3 rounded-2xl transition-colors block font-normal text-sm"
              href="#"
            >
              {c}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Update Mobile Navigation Drawer in `StorefrontLayout.tsx`**

In the mobile drawer section (around line 520), dynamically list all active stores:

```tsx
<div className="flex flex-col gap-5">
  <h3 className="font-headline-md text-sm uppercase tracking-wider text-outline mb-1">
    Выкуп с официальных сайтов
  </h3>
  {activeStores.map((store) => (
    <a
      key={store.id}
      className="text-on-surface font-body-lg text-lg hover:text-[#ce7ed5] transition-colors"
      href="#"
      onClick={toggleNavDrawer}
    >
      {store.name}
    </a>
  ))}
</div>
```

- [ ] **Step 3: Run build test & verification**

Run `npm run build` in `Belkson/Belkson` to ensure no TypeScript or JSX build errors exist.

- [ ] **Step 4: Commit**

```bash
git add Belkson/src/components/StorefrontLayout.tsx
git commit -m "feat(storefront): render official stores dynamically from DB in mega-menu and mobile drawer"
```
