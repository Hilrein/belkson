import type { CartLine } from '../store/CartContext'

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

export function buildOrderMessage(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
): string {
  const lines = items.map((line, i) => {
    return `${i + 1}. ${line.name}${line.color ? ` (${line.color})` : ''} × ${line.quantity}`
  })

  const parts = [
    'Здравствуйте! Хочу оформить заказ:',
    '',
    ...lines,
    '',
  ]
  if (discountLabel) {
    parts.push(`Скидка: ${discountLabel}`)
    parts.push('')
  }
  parts.push(`Итого: ${totalLabel}`)

  return parts.join('\n')
}

/** Open Telegram chat with prefilled order text */
export function openTelegramOrder(
  items: CartLine[],
  totalLabel: string,
  discountLabel?: string,
) {
  const username = getTelegramUsername()
  const text = buildOrderMessage(items, totalLabel, discountLabel)
  const url = `https://t.me/${username}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function getTelegramProfileUrl(): string {
  return `https://t.me/${getTelegramUsername()}`
}
