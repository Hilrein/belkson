import type { CartLine } from '../store/CartContext'
import type { DeliveryMethod } from './telegramOrder'

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

export function buildMaxOrderMessage(
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
    'Здравствуйте! Хочу оформить заказ в MAX:',
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

/** Open Max messenger chat with prefilled order text */
export function openMaxOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
  deliveryMethod?: DeliveryMethod,
  addressNotes?: string,
  customMaxUrl?: string,
  customerName?: string,
  customerPhone?: string,
) {
  const maxUrl = customMaxUrl || getMaxUrl()
  const text = buildMaxOrderMessage(items, totalLabel, discountLabel, deliveryMethod, addressNotes, customerName, customerPhone)

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const url = `${maxUrl}${maxUrl.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
