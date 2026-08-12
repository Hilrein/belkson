# Design Spec: Two-Step Cart Checkout Drawer

**Date:** 2026-08-12  
**Status:** Approved  

## Overview
Transform the storefront right-side cart drawer into a smooth 2-step checkout workflow without leaving the page.

## Step 1: Cart Items View
- Displays cart item list (image, title, sizes, quantity controls, price).
- Discount ladder progress bar (-5%, -10%).
- Subtotal, Discount, Total calculation.
- Clicking "Оформить заказ" transitions the drawer state to Step 2 ("checkout").

## Step 2: Checkout Details View (Inside Side Drawer)
- Header: "← Назад" button (returns to Step 1) + "Оформить заказ" title.
- Compact order summary (item count + total price).
- Delivery Service Selection (radio/cards):
  1. **Ozon** (Пункт выдачи Ozon)
  2. **Яндекс Маркет** (ПВЗ / Доставка)
  3. **5post** (Пятёрочка / Перекрёсток)
- Delivery Address / City / Notes text field (optional).
- Final Messenger Submit Buttons:
  1. **Telegram**: Formats full text and opens Telegram via `buildOrderMessage` (using `VITE_TELEGRAM_USERNAME` / default 'belkson').
  2. **Max (мессенджер)**: Formats full text and opens Max messenger via `VITE_MAX_URL` (env variable or fallback link).

## Message Format
```text
Здравствуйте! Хочу оформить заказ:

1. Набор песочников (74-80) × 1 — 2 690 ₽
2. Комплект для новорожденных (68-74) × 1 — 1 690 ₽

Способ доставки: Ozon (ПВЗ)
Адрес / ПВЗ: г. Москва, ул. Ленина, 10

Скидка: 5% (-219 ₽)
Итого к оплате: 4 161 ₽
```
