# Design Specification: Editable Promo Block

## Overview
This specification details the architecture and implementation for making the home page Promo Block (Collections & Eco Care section, matching screenshot `1.png`) fully editable from the Admin Panel (`AdminPage.tsx`) with persistence in PostgreSQL via Neon database (`site_settings`).

## Data Models & Schema

### `PromoBlockData` Types (`src/types/promoBlock.ts` or `src/store/PromoBlockContext.tsx`)

```ts
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
```

### Default Content (`DEFAULT_PROMO_BLOCK`)
```ts
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
```

## Backend API Endpoints (`api/app-core.ts`)

- **GET `/api/promo-block`**:
  - Reads key `'promo_block'` from `site_settings` table.
  - If missing or invalid, returns `DEFAULT_PROMO_BLOCK`.

- **PUT `/api/promo-block`**:
  - Accepts JSON payload of `PromoBlockData`.
  - Upserts into `site_settings (key, value)` with key `'promo_block'` and JSON stringified payload.

## State Management (`src/store/PromoBlockContext.tsx`)

- Provides `usePromoBlock()` hook containing:
  - `data: PromoBlockData`
  - `loading: boolean`
  - `updateData: (newData: PromoBlockData) => Promise<void>`
  - `refresh: () => Promise<void>`

- Wraps app in `App.tsx` with `PromoBlockProvider`.

## Admin Page UI (`src/admin/AdminPage.tsx`)

- Adds new nav tab: **"Промо-блок"** (Icon: Layout/Sparkles).
- Contains form inputs for:
  - Section visibility toggle (`isActive`).
  - **Main Card**: Image URL, Badge, Title, Description, Button Text, Button Link.
  - **Features Card**: Title, list of string items (add, edit, delete individual items).
  - **Secondary Card**: Image URL, Title, Link Text, Link URL.
- Save button with toast notification / success state.

## Frontend Page Integration (`src/HomePage.tsx`)

- Replaces hardcoded promo grid section (`<section id="prochee">...`) with dynamic values from `usePromoBlock()`.
- Respects `isActive` flag (renders `null` when disabled).
