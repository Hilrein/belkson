import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

/**
 * Get native VK order link with prefilled text support.
 *
 * Official VK native prefill link:
 * - For VK Group / Community: https://vk.com/write-GROUP_ID?text=URLEncodedText
 * - For VK User: https://vk.com/im?sel=USER_ID
 */
export function getVkOrderUrl(text: string): string {
  const groupId = (import.meta.env.VITE_VK_GROUP_ID as string | undefined)?.trim()
  const rawUrl = (import.meta.env.VITE_VK_URL as string | undefined)?.trim()
  const username = (import.meta.env.VITE_VK_USERNAME as string | undefined)?.trim()?.replace(/^@/, '')

  const encodedText = encodeURIComponent(text)

  // 1. Explicit Group ID in .env
  if (groupId) {
    const cleanGroupId = groupId.replace(/^[^\d]+/, '')
    return `https://vk.com/write-${cleanGroupId}?text=${encodedText}`
  }

  // 2. Parsed Group URL
  if (rawUrl) {
    const groupMatch =
      rawUrl.match(/write-(-?\d+)/) ||
      rawUrl.match(/(?:club|public|group)(\d+)/)

    if (groupMatch && groupMatch[1]) {
      const cleanId = groupMatch[1].replace(/^-/, '')
      return `https://vk.com/write-${cleanId}?text=${encodedText}`
    }

    const convoMatch = rawUrl.match(/convo\/(\d+)/) || rawUrl.match(/sel=(\d+)/)
    if (convoMatch && convoMatch[1]) {
      return `https://vk.com/im?sel=${convoMatch[1]}`
    }

    if (rawUrl.includes('vk.com/') && !rawUrl.includes('/im') && !rawUrl.includes('vk.me')) {
      const match = rawUrl.match(/vk\.com\/([^/?#]+)/)
      if (match && match[1]) {
        return `https://vk.com/write-${match[1]}?text=${encodedText}`
      }
    }

    return rawUrl
  }

  // 3. Username or ID
  if (username) {
    if (/^\d+$/.test(username) || /^(?:club|public|group)\d+$/.test(username)) {
      const cleanId = username.replace(/^[^\d]+/, '')
      return `https://vk.com/write-${cleanId}?text=${encodedText}`
    }
    return `https://vk.com/write-${username}?text=${encodedText}`
  }

  // Default fallback user ID
  return `https://vk.com/im?sel=94968923`
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

/** Open VK chat with native prefilled order text and fallback clipboard copy */
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

  const url = getVkOrderUrl(text)
  window.open(url, '_blank', 'noopener,noreferrer')
}