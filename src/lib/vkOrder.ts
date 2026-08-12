import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

/**
 * Get VK direct chat URL.
 * Official VK messenger deep link: vk.me/username
 */
export function getVkUsername(): string {
  const rawUsername = (import.meta.env.VITE_VK_USERNAME as string | undefined)?.trim()?.replace(/^@/, '')
  if (rawUsername) return rawUsername

  const rawUrl = (import.meta.env.VITE_VK_URL as string | undefined)?.trim()
  if (rawUrl) {
    const convoMatch = rawUrl.match(/convo\/(\d+)/) || rawUrl.match(/sel=(\d+)/)
    if (convoMatch && convoMatch[1]) {
      return convoMatch[1]
    }
    const match = rawUrl.match(/(?:vk\.com|vk\.ru|vk\.me)\/([^/?#]+)/)
    if (match && match[1] && match[1] !== 'im') {
      return match[1]
    }
  }

  return '94968923'
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

/** Open VK chat with fallback clipboard copy */
export function openVkOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
) {
  const text = buildVkOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes)

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const url = getVkUrl()
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) {
    window.location.href = url
  }
}