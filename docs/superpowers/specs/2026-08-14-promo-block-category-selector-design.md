# Design Spec: Multi-Category & Subcategory Selector for Promo Block

## Overview
Enhance the Promo Block editor in `AdminPage.tsx` and the catalogue filtering logic in `CatalogPage.tsx` to allow selecting main categories and one or multiple subcategories directly via UI controls instead of manually writing URL parameters.

## Functional Requirements

1. **Catalog Filter Engine (`src/CatalogPage.tsx`)**:
   - Update `activeSubcategory` filtering to support comma-separated subcategories (e.g. `subcategory=Комбинезоны и боди,Костюмы`).
   - Filter matches a product if `p.subcategory` matches ANY of the selected subcategories.

2. **Admin UI (`src/admin/AdminPage.tsx`)**:
   - In `AdminPromoBlockView`, add visual selectors for Main Card and Secondary Card:
     - **Category Selector**: Dropdown options (`Все`, `Малыши`, `Девочки`, `Мальчики`, `Sale %`, `Новинки`, `Любимчики`).
     - **Subcategories Multi-Select**: Checkboxes for available subcategories (`Комбинезоны и боди`, `Костюмы`, `Платья и юбки`, `Футболки`, `Кофты и свитшоты`, `Брюки, джинсы, шорты`, `Нижнее белье и пижамы`, `Верхняя одежда`, `Обувь`, `Головные уборы`, `Носки и колготки`).
   - Automatically build and update the `buttonLink` / `linkUrl` when choices change, while leaving a text field for optional custom URLs.
