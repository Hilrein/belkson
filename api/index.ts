/**
 * Vercel Node.js serverless entry for /api/*
 *
 * Do not statically import hono/neon at top level — that crashes this project's
 * Vercel functions (FUNCTION_INVOCATION_FAILED). Dynamic-import the app core
 * (same folder so NFT packages the module).
 */
type NodeReq = {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

type NodeRes = {
  statusCode: number
  setHeader: (k: string, v: string) => void
  end: (b?: string) => void
}

export const config = {
  maxDuration: 60,
}

export default async function handler(req: NodeReq, res: NodeRes) {
  try {
    // Same-directory module → included in the function bundle
    const { default: app } = await import('./app-core')

    const host = String(
      req.headers['x-forwarded-host'] || req.headers.host || 'localhost',
    )
    const proto = String(req.headers['x-forwarded-proto'] || 'https')
    const path = req.url || '/api'
    const method = (req.method || 'GET').toUpperCase()

    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v)
      } else {
        headers.set(key, value)
      }
    }

    let body: string | undefined
    if (method !== 'GET' && method !== 'HEAD') {
      if (typeof req.body === 'string') {
        body = req.body
      } else if (req.body !== undefined && req.body !== null) {
        if (!headers.has('content-type')) {
          headers.set('content-type', 'application/json')
        }
        body = JSON.stringify(req.body)
      }
    }

    const request = new Request(`${proto}://${host}${path}`, {
      method,
      headers,
      body,
    })

    const response = await app.fetch(request)
    const text = await response.text()

    res.statusCode = response.status
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return
      res.setHeader(key, value)
    })
    res.end(text)
  } catch (e) {
    console.error('API handler error:', e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'Server error',
      }),
    )
  }
}
