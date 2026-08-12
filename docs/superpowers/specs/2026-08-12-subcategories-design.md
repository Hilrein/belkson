# Design Spec: Product Subcategories for Belkson

**Date:** 2026-08-12  
**Status:** Approved  

## Overview
Add 11 subcategories under the main category sections ("Малыши", "Мальчики", "Девочки") across the entire Belkson platform (Database, Serverless API, Admin Panel, Header Navigation, and Catalog Filters).

## List of Subcategories
1. Комбинезоны и боди
2. Костюмы
3. Платья и юбки
4. Футболки
5. Кофты и свитшоты
6. Брюки, джинсы, шорты
7. Нижнее белье и пижамы
8. Верхняя одежда
9. Обувь
10. Головные уборы
11. Носки и колготки

## Data Model & Migration
- **Neon PostgreSQL Migration**:
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT ''`
- **TypeScript Model (`src/store/catalog.ts`)**:
  - `SUBCATEGORIES` array constant export.
  - `CatalogProduct` updated with `subcategory?: string`.

## Backend API Changes (`api/index.ts` & `api/app-core.ts`)
- Update `mapProduct()` to extract and trim `subcategory`.
- Update `ensureProductColumns()` to execute migration for `subcategory`.
- Update `handleCreateProduct` and `handleUpdateProduct` to process and save `subcategory`.

## Admin Interface (`src/admin/AdminPage.tsx`)
- Form drawer: Add "Подкатегория" dropdown selector.
- Table view: Show subcategory badge/text column.
- Filter toolbar: Allow filtering products by subcategory.

## Navigation & Storefront Catalog (`src/components/StorefrontLayout.tsx`, `src/CatalogPage.tsx`)
- Header navigation: Dropdown menus for "Малыши", "Мальчики", "Девочки" containing subcategory links (`/catalog?category=...&subcategory=...`).
- Catalog filters: Add subcategory pills/tabs on `/catalog` page and filter products by `category` and `subcategory`.
