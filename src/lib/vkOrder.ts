import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

/**
 * VK user or group link for orders.
 * Set in .env: VITE_VK_URL=https://vk.com/your_account or VITE_VK_USERNAME=your_username
 */
export function getVkUrl(): string {
  const rawUrl = (import.meta.env.VITE_VK_URL as string | undefined)?.trim()
  if (rawUrl) return rawUrl

  const username = (import.meta.env.VITE_VK_USERNAME as string | undefined)?.trim()?.replace(/^@/, '')
  if (username) return `https://vk.com/${username}`

  return 'https://vk.com/belkson'
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
  const vkUrl = getVkUrl()
  const text = buildVkOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes)

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const url = `${vkUrl}${vkUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}