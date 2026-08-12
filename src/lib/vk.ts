/**
 * VK username (without @).
 * Set in .env: VITE_VK_USERNAME=your_shop_account
 */
export function getVkUsername(): string {
  return (
    (import.meta.env.VITE_VK_USERNAME as string | undefined)?.replace(
      /^@/,
      '',
    ) || 'belkson'
  )
}

export function getVkProfileUrl(): string {
  return `https://vk.com/${getVkUsername()}`
}

/** Open VK messenger chat with this user. */
export function getVkChatUrl(): string {
  return `https://vk.me/${getVkUsername()}`
}