import sharp from 'sharp'

const MAX_EDGE = 1000
const WEBP_QUALITY = 78

/**
 * Normalize product images for storage/delivery:
 * - http(s) URLs left as-is (CDN / external hosts)
 * - data:image/* → resized WebP data URL (much smaller than PNG/JPEG base64)
 */
export async function normalizeProductImage(
  image: string | undefined | null,
): Promise<string> {
  const raw = String(image ?? '').trim()
  if (!raw) return raw

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }

  if (!raw.startsWith('data:image/')) {
    return raw
  }

  const match = raw.match(/^data:image\/[\w+.+-]+;base64,(.+)$/i)
  if (!match?.[1]) return raw

  try {
    const input = Buffer.from(match[1], 'base64')
    // Already small WebP — still re-encode lightly for consistency
    const out = await sharp(input)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer()

    return `data:image/webp;base64,${out.toString('base64')}`
  } catch (err) {
    console.error('Image normalize failed, keeping original:', err)
    return raw
  }
}
