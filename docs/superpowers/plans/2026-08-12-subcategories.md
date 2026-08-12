# Product Subcategories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 11 product subcategories for "Малыши", "Мальчики", "Девочки" across database, API, admin form/table, header dropdowns, and catalog filters.

**Architecture:** Add `subcategory` column to Neon DB `products` table via serverless migration, update Hono API to read/write `subcategory`, update shared catalog constants/types, add Subcategory dropdown to Admin drawer and filter toolbar, add hover subcategory menus to Header Navigation, and add subcategory filter chips on Catalog page.

**Tech Stack:** React 19, TypeScript 6, Hono, Neon PostgreSQL serverless, Vite, Tailwind CSS 4.

## Global Constraints
- Subcategories: `['Комбинезоны и боди', 'Костюмы', 'Платья и юбки', 'Футболки', 'Кофты и свитшоты', 'Брюки, джинсы, шорты', 'Нижнее белье и пижамы', 'Верхняя одежда', 'Обувь', 'Головные уборы', 'Носки и колготки']`
- Database table: `products`
- New column: `subcategory` (TEXT NOT NULL DEFAULT '')

---

### Task 1: Update Types and Shared Constants

**Files:**
- Modify: `src/store/catalog.ts`

- [ ] **Step 1: Add SUBCATEGORIES constant and update CatalogProduct interface**

Add `SUBCATEGORIES` array and update `CatalogProduct` in `src/store/catalog.ts`:

```typescript
export const SUBCATEGORIES = [
  'Комбинезоны и боди',
  'Костюмы',
  'Платья и юбки',
  'Футболки',
  'Кофты и свитшоты',
  'Брюки, джинсы, шорты',
  'Нижнее белье и пижамы',
  'Верхняя одежда',
  'Обувь',
  'Головные уборы',
  'Носки и колготки',
] as const

export type Subcategory = (typeof SUBCATEGORIES)[number]
```
And add `subcategory?: string` to `CatalogProduct`.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/store/catalog.ts
git commit -m "feat: add SUBCATEGORIES constant and subcategory property to CatalogProduct"
```

---

### Task 2: Update Serverless API and Database Schemas

**Files:**
- Modify: `api/index.ts`
- Modify: `api/app-core.ts`

- [ ] **Step 1: Update DB migration and product mapping in API files**

In `api/index.ts` and `api/app-core.ts`:
1. Add `subcategory: string` to `DbProduct` type.
2. In `ensureProductColumns`: add `ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT ''`.
3. In `mapProduct`: add `subcategory: row.subcategory ?? ''`.
4. In `handleCreateProduct` and `handleUpdateProduct`: read `subcategory` from request body and include `subcategory` in INSERT and UPDATE sql statements.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add api/index.ts api/app-core.ts
git commit -m "feat: handle subcategory column in Neon database and Hono API"
```

---

### Task 3: Update Admin Panel Product Drawer and Table

**Files:**
- Modify: `src/admin/AdminPage.tsx`

- [ ] **Step 1: Add Subcategory field to product create/edit drawer and admin table**

1. In state/form reset for creating/editing product, add `subcategory` field (defaulting to `SUBCATEGORIES[0]` or `''`).
2. Add `<select>` element in the form for "Подкатегория":
```tsx
<label className="block text-xs font-semibold text-gray-600 mb-1">
  Подкатегория
</label>
<select
  value={formSubcategory}
  onChange={(e) => setFormSubcategory(e.target.value)}
  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
>
  <option value="">Без подкатегории</option>
  {SUBCATEGORIES.map((sub) => (
    <option key={sub} value={sub}>
      {sub}
    </option>
  ))}
</select>
```
3. Pass `subcategory` in `api.createProduct` and `api.updateProduct` payload calls.
4. Display `subcategory` in the admin products table and add subcategory filter dropdown in admin toolbar.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/admin/AdminPage.tsx
git commit -m "feat: add subcategory support to admin product drawer and table"
```

---

### Task 4: Update Storefront Header Navigation & Catalog Page Filtering

**Files:**
- Modify: `src/components/StorefrontLayout.tsx`
- Modify: `src/CatalogPage.tsx`

- [ ] **Step 1: Update Header Navigation with Subcategory Dropdowns**

In `StorefrontLayout.tsx`, add hover/click flyout menus for "Малыши", "Мальчики", "Девочки" rendering links to `/catalog?category=<Cat>&subcategory=<Subcat>`.

- [ ] **Step 2: Update Catalog Page to filter by Subcategory**

In `CatalogPage.tsx`:
1. Parse `subcategory` from `useSearchParams()`.
2. Render Subcategory filter chips/tabs under Category tabs when a Category or All is selected.
3. Filter products matching both `category` and `subcategory`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/StorefrontLayout.tsx src/CatalogPage.tsx
git commit -m "feat: add subcategory dropdowns to header nav and subcategory filter to catalog page"
```
