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

export function buildTelegramOrderMessage(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
  customerName?: string,
  customerPhone?: string,
): string {
  const lines = items.map((line, i) => {
    const displaySizes = line.selectedSizes && line.selectedSizes.length > 0 ? line.selectedSizes : line.sizes
    const sizesStr = displaySizes && displaySizes.length > 0 ? ` (${displaySizes.join(', ')})` : ''
    const colorStr = line.color && line.color !== '—' ? `, цвет: ${line.color}` : ''
    return `${i + 1}. ${line.name}${sizesStr}${colorStr} × ${line.quantity}`
  })

  const parts = [
    'Здравствуйте! Хочу оформить заказ:',
    '',
    ...lines,
    '',
  ]

  if (customerName?.trim()) {
    parts.push(`ФИО получателя: ${customerName.trim()}`)
  }
  if (customerPhone?.trim()) {
    parts.push(`Телефон: ${customerPhone.trim()}`)
  }
  if (deliveryMethod) {
    parts.push(`Способ доставки: ${deliveryMethod}`)
  }
  if (addressNotes?.trim()) {
    parts.push(`Адрес / ПВЗ: ${addressNotes.trim()}`)
  }
  if (customerName?.trim() || customerPhone?.trim() || deliveryMethod || addressNotes?.trim()) {
    parts.push('')
  }

  if (discountLabel) {
    parts.push(`Скидка: ${discountLabel}`)
    parts.push('')
  }
  parts.push(`Итого к оплате: ${totalLabel}`)

  return parts.join('\n')
}

// Backward compatibility alias for buildTelegramOrderMessage
export const buildOrderMessage = buildTelegramOrderMessage

/** Open Telegram chat with prefilled order text */
export function openTelegramOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
  customUsername?: string,
  customerName?: string,
  customerPhone?: string,
) {
  const username = (customUsername || getTelegramUsername()).replace(/^@/, '')
  const text = buildTelegramOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes, customerName, customerPhone)

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const url = `https://t.me/${username}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function getTelegramProfileUrl(customUsername?: string): string {
  const username = (customUsername || getTelegramUsername()).replace(/^@/, '')
  return `https://t.me/${username}`
}
