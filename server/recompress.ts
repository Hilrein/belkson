/**
 * Re-encode existing product images in Neon to WebP (data URLs only).
 * Usage: npm run db:recompress
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { normalizeProductImage } from './image'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Set DATABASE_URL in .env')
    process.exit(1)
  }

  const sql = neon(url)
  const rows = (await sql`
    SELECT id, image FROM products ORDER BY id
  `) as { id: number; image: string }[]

  console.log(`Found ${rows.length} products`)

  let updated = 0
  for (const row of rows) {
    if (!row.image?.startsWith('data:image/')) {
      console.log(`#${row.id}: external URL — skip`)
      continue
    }
    if (row.image.startsWith('data:image/webp')) {
      // Still re-run to re-size if huge
    }
    const before = row.image.length
    const next = await normalizeProductImage(row.image)
    if (next === row.image) {
      console.log(`#${row.id}: unchanged`)
      continue
    }
    await sql`UPDATE products SET image = ${next}, updated_at = NOW() WHERE id = ${row.id}`
    updated++
    console.log(
      `#${row.id}: ${Math.round(before / 1024)}KB → ${Math.round(next.length / 1024)}KB`,
    )
  }

  console.log(`Done. Updated ${updated} image(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
