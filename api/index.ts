/**
 * Minimal Vercel probe — isolate FUNCTION_INVOCATION_FAILED.
 */
export default function handler(
  req: { method?: string; url?: string },
  res: {
    statusCode: number
    setHeader: (k: string, v: string) => void
    end: (b?: string) => void
  },
) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      ok: true,
      method: req.method ?? null,
      url: req.url ?? null,
      hasDbUrl: Boolean(process.env.DATABASE_URL),
    }),
  )
}
