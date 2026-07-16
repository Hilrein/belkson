/** Client-side image helpers for product photos. */

const MAX_EDGE = 1000
const QUALITY = 0.8
const MAX_FILE_MB = 8

export function isLikelyImageUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  if (u.startsWith('data:image/')) return true
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function supportsWebpExport(canvas: HTMLCanvasElement): boolean {
  try {
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

/**
 * Read a local image file, resize, export as WebP (fallback JPEG).
 * Backend re-encodes with sharp for final WebP storage.
 */
export function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Выберите файл изображения (JPG, PNG, WebP…)'))
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      reject(new Error(`Файл больше ${MAX_FILE_MB} МБ. Выберите фото поменьше.`))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const src = String(reader.result ?? '')
      const img = new Image()
      img.onload = () => {
        try {
          const { width, height } = img
          const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
          const w = Math.max(1, Math.round(width * scale))
          const h = Math.max(1, Math.round(height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas недоступен'))
            return
          }
          ctx.drawImage(img, 0, 0, w, h)
          if (supportsWebpExport(canvas)) {
            resolve(canvas.toDataURL('image/webp', QUALITY))
          } else {
            resolve(canvas.toDataURL('image/jpeg', QUALITY))
          }
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Ошибка обработки фото'))
        }
      }
      img.onerror = () => reject(new Error('Не удалось открыть изображение'))
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
