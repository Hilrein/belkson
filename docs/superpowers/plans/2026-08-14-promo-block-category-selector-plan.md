# Multi-Category & Subcategory Selection Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable multi-subcategory filtering in `CatalogPage.tsx` and provide interactive category/subcategory selectors in `AdminPage.tsx` for promo block link configuration.

**Architecture:** Update `CatalogPage.tsx` filter evaluation to split comma-delimited `subcategory` query param values. Add interactive category dropdown and subcategory multi-select checkboxes to `AdminPage.tsx` promo block editor.

**Tech Stack:** React 19, TypeScript, React Router `useSearchParams`, Tailwind CSS.

## Global Constraints
- Preserve custom URL text input functionality alongside quick selectors.
- Backwards compatible with existing single subcategory links.

---

### Task 1: Support Comma-Separated Multi-Subcategory Filtering in `CatalogPage.tsx`

**Files:**
- Modify: `src/CatalogPage.tsx`

- [ ] **Step 1: Update `filtered` memo in `src/CatalogPage.tsx` to handle comma-separated `activeSubcategory`**

```ts
if (activeSubcategory !== 'all') {
  const selectedSubcats = activeSubcategory.split(',').map((s) => s.trim()).filter(Boolean)
  list = list.filter((p) =>
    selectedSubcats.some((sub) => categoriesMatch(p.subcategory, sub))
  )
}
```

- [ ] **Step 2: Verify build with `npm run build`**
- [ ] **Step 3: Commit changes with message `feat: support comma-separated multi-subcategory filtering in CatalogPage`**

---

### Task 2: Add Visual Category & Subcategory Selectors in Admin Promo Block Editor

**Files:**
- Modify: `src/admin/AdminPage.tsx`

- [ ] **Step 1: In `AdminPromoBlockView` component in `src/admin/AdminPage.tsx`, add helper function `buildCategoryUrl(category, selectedSubcats)`**
- [ ] **Step 2: Add category dropdown and subcategory checkboxes UI to Main Card section and Secondary Card section**
- [ ] **Step 3: Test interaction and verify build with `npm run build`**
- [ ] **Step 4: Commit changes with message `feat: add category and subcategory selectors to Admin Promo Block editor`**
