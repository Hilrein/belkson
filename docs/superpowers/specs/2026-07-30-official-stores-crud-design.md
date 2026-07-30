# Design Spec: Official Stores CRUD & Mega-Menu Management

## Overview
This specification details the architecture, database schema, API endpoints, admin management interface, and storefront integration for the "Official Stores Purchase" ("Выкуп с официальных сайтов") feature.

The goal is to allow administrators to add, edit, reorder, toggle, and delete official stores (such as Zara, H&M, Next, etc.) and their supported countries/regions directly from the Admin Panel, storing all changes in Neon PostgreSQL and rendering them dynamically across desktop mega-menus and mobile navigation.

---

## 1. Database Schema (Neon PostgreSQL)

A new table `official_stores` will be managed in Neon PostgreSQL.

```sql
CREATE TABLE IF NOT EXISTS official_stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  countries JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Initial Seed Data
If the table is empty on startup, the system seeds default stores:
1. **Zara**: `["Spain", "UK", "Poland", "Germany", "Kazakhstan"]`
2. **H&M**: `["UK", "Germany", "Poland", "USA"]`
3. **Next**: `["UK", "Kazakhstan", "Germany", "Spain"]`

---

## 2. API Specifications (Hono Server)

All endpoints are added to `api/app-core.ts` under `/api/official-stores`:

1. `GET /api/official-stores`
   - **Response**: `200 OK` with JSON array `[ { id, name, countries: string[], sortOrder, isActive, createdAt, updatedAt } ]` sorted by `sort_order ASC, id ASC`.

2. `POST /api/official-stores`
   - **Body**: `{ name: string, countries: string[], sortOrder?: number, isActive?: boolean }`
   - **Response**: `201 Created` with created store object.

3. `PUT /api/official-stores/:id`
   - **Body**: `{ name?: string, countries?: string[], sortOrder?: number, isActive?: boolean }`
   - **Response**: `200 OK` with updated store object.

4. `DELETE /api/official-stores/:id`
   - **Response**: `200 OK` with `{ ok: true, id: number }`.

---

## 3. Frontend Architecture & State Management

### 3.1 Store Management Context (`src/store/OfficialStoresContext.tsx`)
- Fetches official stores on load.
- Exposes:
  - `stores: OfficialStore[]`
  - `loading: boolean`
  - `error: string | null`
  - `addStore(data): Promise<void>`
  - `updateStore(id, data): Promise<void>`
  - `deleteStore(id): Promise<void>`
  - `refresh(): Promise<void>`

---

## 4. Admin Panel Integration (`src/admin/AdminPage.tsx`)

### 4.1 Navigation Tab Switcher
- Clicking **"Товары"** displays the catalog table.
- Clicking **"Выкуп с сайтов"** switches the view to the **Official Stores Management Panel**.

### 4.2 Official Stores View
- **Header**: Title "Выкуп с официальных сайтов" and `+ Добавить магазин` button.
- **Store Cards / Table**:
  - Displays Store Name, status badge (Active / Inactive), and tag pills for countries (e.g. `[Spain]` `[UK]` `[Poland]`).
  - Action buttons:
    - **Edit** (Pencil icon) -> opens slide-over drawer populated with store details.
    - **Delete** (Trash icon) -> prompts confirmation modal and deletes store.
    - **Toggle Active** (Switch) -> toggles store visibility instantly.

### 4.3 Add / Edit Slide-Over Drawer
- **Input Field**: Store Name (text input).
- **Countries Tag Input**:
  - Text input with `+ Добавить` button or `Enter` key.
  - Interactive tag pills with `×` remove buttons.
- **Save / Cancel** buttons with loading state indicator.

---

## 5. Storefront Integration (`src/components/StorefrontLayout.tsx`)

### 5.1 Mega-Menu (Desktop)
- Replaces static Zara/H&M/Next JSX with dynamic mapping over `stores.filter(s => s.isActive)`.
- Renders columns for each active store with its list of countries.

### 5.2 Navigation Drawer (Mobile)
- Dynamically renders active stores list in the mobile menu drawer under "Выкуп с официальных сайтов".
