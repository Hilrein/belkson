# Two-Step Cart Checkout Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 2-step checkout workflow inside the cart side drawer with delivery selection (Ozon, Яндекс Маркет, 5post) and messenger routing (Telegram, Max).

**Architecture:** Add messenger helper for Max URL in `telegramOrder.ts`, update `buildOrderMessage` to accept delivery option and notes, add `cartStep` state (`items` | `checkout`), delivery method selection state, address/notes state, and messenger submit buttons inside `StorefrontLayout.tsx`.

**Tech Stack:** React 19, TypeScript 6, Vite, Tailwind CSS 4.

## Global Constraints
- Delivery options: `Ozon`, `Яндекс Маркет`, `5post`
- Messengers: `Telegram`, `Max` (environment variable `VITE_MAX_URL` with fallback `https://max.ru`)
- Single drawer state: Step 1 (items) ↔ Step 2 (checkout details)

---

### Task 1: Update Order Helper Functions

**Files:**
- Modify: `src/lib/telegramOrder.ts`

- [ ] **Step 1: Add getMaxUrl helper and update buildOrderMessage signature**

In `src/lib/telegramOrder.ts`:
1. Add `getMaxUrl()`:
```typescript
export function getMaxUrl(): string {
  return (import.meta.env.VITE_MAX_URL as string | undefined)?.trim() || 'https://max.ru'
}
```
2. Update `buildOrderMessage` to include delivery service and optional address/notes:
```typescript
export type DeliveryMethod = 'Ozon' | 'Яндекс Маркет' | '5post'

export function buildOrderMessage(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
): string {
  const lines = items.map((line, i) => {
    const sizesStr = line.sizes && line.sizes.length > 0 ? ` (${line.sizes.join(', ')})` : ''
    return `${i + 1}. ${line.name}${sizesStr} × ${line.quantity}`
  })

  const parts = [
    'Здравствуйте! Хочу оформить заказ:',
    '',
    ...lines,
    '',
  ]

  if (deliveryMethod) {
    parts.push(`Способ доставки: ${deliveryMethod}`)
  }
  if (addressNotes?.trim()) {
    parts.push(`Адрес / ПВЗ: ${addressNotes.trim()}`)
  }
  if (deliveryMethod || addressNotes?.trim()) {
    parts.push('')
  }

  if (discountLabel) {
    parts.push(`Скидка: ${discountLabel}`)
    parts.push('')
  }
  parts.push(`Итого: ${totalLabel}`)

  return parts.join('\n')
}

export function openMaxOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
) {
  const maxUrl = getMaxUrl()
  const text = buildOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes)
  const url = `${maxUrl}${maxUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegramOrder.ts
git commit -m "feat: add delivery method and Max messenger support to order helpers"
```

---

### Task 2: Implement 2-Step Drawer in StorefrontLayout

**Files:**
- Modify: `src/components/StorefrontLayout.tsx`

- [ ] **Step 1: Add drawer state and Step 2 UI in StorefrontLayout**

1. Add state in `StorefrontLayout.tsx`:
   - `cartStep`: `'items' | 'checkout'`
   - `deliveryMethod`: `'Ozon' | 'Яндекс Маркет' | '5post'` (default `'Ozon'`)
   - `addressNotes`: `string` (default `''`)
2. Reset `cartStep` to `'items'` whenever cart is closed or emptied.
3. In Step 1: "Оформить заказ" button sets `cartStep` to `'checkout'`.
4. In Step 2:
   - Top bar with `← Назад к товарам` button (sets `cartStep` to `'items'`).
   - Delivery method selection cards (`Ozon`, `Яндекс Маркет`, `5post`).
   - Address / City / Notes text input.
   - Order total breakdown.
   - Messenger submit buttons:
     - `Telegram` -> calls `openTelegramOrder(cartItems, format(totalRub), discountLabel, deliveryMethod, addressNotes)`
     - `Max` -> calls `openMaxOrder(cartItems, format(totalRub), discountLabel, deliveryMethod, addressNotes)`

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/StorefrontLayout.tsx
git commit -m "feat: implement 2-step checkout drawer with delivery and messenger selection"
```
