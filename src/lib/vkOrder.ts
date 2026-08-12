import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

/**
 * Get VK username or id.
 * Set in .env: VITE_VK_USERNAME=your_username or VITE_VK_URL=https://vk.com/your_username
 */
export function getVkUsername(): string {
  const rawUsername = (import.meta.env.VITE_VK_USERNAME as string | undefined)?.trim()?.replace(/^@/, '')
  if (rawUsername) return rawUsername

  const rawUrl = (import.meta.env.VITE_VK_URL as string | undefined)?.trim()
  if (rawUrl) {
    const match = rawUrl.match(/vk\.com\/([^/?#]+)/) || rawUrl.match(/vk\.me\/([^/?#]+)/)
    if (match && match[1]) {
      return match[1]
    }
  }

  return 'belkson'
}

export function getVkUrl(): string {
  const username = getVkUsername()
  return `https://vk.me/${username}`
}

export function buildVkOrderMessage(
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
    'Здравствуйте! Хочу оформить заказ в VK:',
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

/** Open VK chat with prefilled order text and fallback clipboard copy */
export function openVkOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
) {
  const username = getVkUsername()
  const text = buildVkOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes)

  // 1. Copy text to clipboard so user can instantly paste if mobile VK app doesn't auto-fill URL parameter
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  // 2. Open VK web chat with text query param
  const url = `https://vk.com/im?sel=${username}&text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}