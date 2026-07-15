import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | null = null

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env (local) or Vercel env vars.',
    )
  }
  if (!sql) {
    sql = neon(url)
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
  status: string
  image: string
  is_new: boolean
  is_favorite: boolean
  badge: string | null
}

export function mapProduct(row: DbProduct) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    priceRub: Number(row.price_rub),
    category: row.category,
    color: row.color,
    status: row.status as 'В наличии' | 'Мало' | 'Нет в наличии',
    image: row.image,
    isNew: Boolean(row.is_new),
    isFavorite: Boolean(row.is_favorite),
    badge: row.badge ?? undefined,
  }
}
