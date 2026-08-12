import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

/**
 * Get direct VK chat URL for orders.
 * Automatically converts profile links (vk.com/username) to direct chat links (vk.me/username).
 * Set in .env: VITE_VK_URL=https://vk.com/... or VITE_VK_USERNAME=your_username
 */
export function getVkUrl(): string {
  const rawUrl = (import.meta.env.VITE_VK_URL as string | undefined)?.trim()
  const username = (import.meta.env.VITE_VK_USERNAME as string | undefined)?.trim()?.replace(/^@/, '')

  if (rawUrl) {
    if (rawUrl.includes('vk.com/') && !rawUrl.includes('/im') && !rawUrl.includes('vk.me')) {
      const match = rawUrl.match(/vk\.com\/([^/?#]+)/)
      if (match && match[1]) {
        return `https://vk.me/${match[1]}`
      }
    }
    return rawUrl
  }

  if (username) {
    return `https://vk.me/${username}`
  }

  return 'https://vk.me/belkson'
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

/** Open VK direct chat with prefilled order text and clipboard backup */
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