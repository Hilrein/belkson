import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | null = null

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()
  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env (local) or Vercel Project → Settings → Environment Variables.',
    )
  }
  // Allow .env that splits "?sslmode=require" onto its own line as sslmode=require
  const sslmode = process.env.sslmode?.trim()
  if (sslmode && !/[?&]sslmode=/.test(raw)) {
    return `${raw}${raw.includes('?') ? '&' : '?'}sslmode=${sslmode}`
  }
  if (!/[?&]sslmode=/.test(raw)) {
    return `${raw}${raw.includes('?') ? '&' : '?'}sslmode=require`
  }
  return raw
}

export function getSql() {
  if (!sql) {
    sql = neon(resolveDatabaseUrl())
  }
  return sql
}

export type DbProduct = {
  id: number
  name: string
  sku: string
  price_rub: number
  category: string
  color: string
  brand: string
  sizes: unknown
  images: unknown
  status: string
  image: string
  is_new: boolean
  is_favorite: boolean
  badge: string | null
}

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? '')).filter((v) => v.trim().length > 0)
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v ?? '')).filter((v) => v.trim().length > 0)
      }
    } catch {
      /* not JSON — ignore */
    }
  }
  return []
}

export function mapProduct(row: DbProduct) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    priceRub: Number(row.price_rub),
    category: row.category,
    color: row.color,
    brand: row.brand ?? '',
    sizes: parseStringArray(row.sizes),
    images: parseStringArray(row.images),
    status: row.status as 'В наличии' | 'Мало' | 'Нет в наличии',
    image: row.image,
    isNew: Boolean(row.is_new),
    isFavorite: Boolean(row.is_favorite),
    badge: row.badge ?? undefined,
  }
}
