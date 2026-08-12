import type { CartLine } from '../store/CartContext'

export type DeliveryMethod = 'Ozon' | 'Яндекс Маркет' | '5post'

/**
 * Telegram username for orders (without @).
 * Set in .env: VITE_TELEGRAM_USERNAME=your_shop_account
 */
export function getTelegramUsername(): string {
  return (import.meta.env.VITE_TELEGRAM_USERNAME as string | undefined)?.replace(
    /^@/,
    '',
  ) || 'belkson'
}

/**
 * Max messenger URL for orders.
 * Set in .env: VITE_MAX_URL=https://max.ru/...
 */
export function getMaxUrl(): string {
  return (
    (import.meta.env.VITE_MAX_URL as string | undefined)?.trim() ||
    'https://max.ru/u/f9LHodD0cOKVbrxghT0d8KoNtlR6WdagEWPgauFxCl5D2WpF9Euc-C2vFWo'
  )
}

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
  parts.push(`Итого к оплате: ${totalLabel}`)

  return parts.join('\n')
}

/** Open Telegram chat with prefilled order text */
export function openTelegramOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
) {
  const username = getTelegramUsername()
  const text = buildOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes)
  const url = `https://t.me/${username}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Open Max messenger chat with prefilled order text and fallback clipboard copy */
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

export function getTelegramProfileUrl(): string {
  return `https://t.me/${getTelegramUsername()}`
}
