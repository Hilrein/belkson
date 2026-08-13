import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

/**
 * Get native VK order link with prefilled text support or DM link.
 */
export function getVkOrderUrl(text: string, customVkValue?: string): string {
  const target =
    (customVkValue && customVkValue.trim()) ||
    (import.meta.env.VITE_VK_GROUP_ID as string | undefined)?.trim() ||
    (import.meta.env.VITE_VK_USERNAME as string | undefined)?.trim() ||
    '94968923'

  const encodedText = encodeURIComponent(text)

  if (target.includes('vk.com/') || target.includes('vk.ru/') || target.includes('vk.me/')) {
    const groupMatch = target.match(/write-(-?\d+)/) || target.match(/(?:club|public|group)(\d+)/)
    if (groupMatch && groupMatch[1]) {
      const cleanId = groupMatch[1].replace(/^-/, '')
      return `https://vk.com/write-${cleanId}?text=${encodedText}`
    }

    const convoMatch = target.match(/convo\/(\d+)/) || target.match(/sel=(\d+)/)
    if (convoMatch && convoMatch[1]) {
      return `https://vk.com/im?sel=${convoMatch[1]}`
    }

    const match = target.match(/(?:vk\.com|vk\.ru|vk\.me)\/([^/?#]+)/)
    if (match && match[1] && match[1] !== 'im') {
      return `https://vk.com/write-${match[1]}?text=${encodedText}`
    }
    return target
  }

  const cleanId = target.replace(/^@/, '')
  if (/^\d+$/.test(cleanId)) {
    return `https://vk.com/im?sel=${cleanId}`
  }

  return `https://vk.com/write-${cleanId}?text=${encodedText}`
}

export function buildVkOrderMessage(
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
    'Здравствуйте! Хочу оформить заказ в VK:',
    '',
    ...lines,
    '',
  ]

  if (customerName?.trim()) {
    parts.push(`ФИО получателя: ${customerName.trim()}`)
  }
  if (customerPhone?.trim()) {
    parts.push(`Номер телефона: ${customerPhone.trim()}`)
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

/** Open VK chat with dynamic DB value support */
export function openVkOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
  customVkValue?: string,
  customerName?: string,
  customerPhone?: string,
) {
  const text = buildVkOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes, customerName, customerPhone)

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const url = getVkOrderUrl(text, customVkValue)
  window.open(url, '_blank', 'noopener,noreferrer')
}