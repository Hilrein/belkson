/**
 * Instagram username (without @).
 * Set in .env: VITE_INSTAGRAM_USERNAME=your_shop_account
 */
export function getInstagramUsername(): string {
  return (
    (import.meta.env.VITE_INSTAGRAM_USERNAME as string | undefined)?.replace(
      /^@/,
      '',
    ) || 'belkson'
  )
}

export function getInstagramProfileUrl(): string {
  return `https://instagram.com/${getInstagramUsername()}`
}
