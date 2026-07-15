/**
 * Ensure site_settings exists. Products are managed only via admin + Neon.
 * Usage: npm run db:seed
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Set DATABASE_URL in .env')
    process.exit(1)
  }

  const sql = neon(url)

  await sql`
    INSERT INTO site_settings (key, value)
    VALUES ('currency', 'RUB')
    ON CONFLICT (key) DO NOTHING
  `

  const existing = await sql`SELECT COUNT(*)::int AS count FROM products`
  const count = Number((existing[0] as { count: number }).count)
  console.log(
    `OK. Products in Neon: ${count}. Add/edit them in /admin — no demo products in code.`,
  )
}

main().catch((err) => {
  console.error(err)
  console.error(
    '\nIf tables are missing, run db/schema.sql in the Neon SQL Editor first.',
  )
  process.exit(1)
})
