import app from '../api/app-core'

type Env = {
  DATABASE_URL: string
  CRON_SECRET?: string
  ASSETS: {
    fetch: (request: Request) => Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url)

    // Inject Cloudflare Worker secrets into process.env for database and auth helpers
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL
    }
    if (env.CRON_SECRET) {
      process.env.CRON_SECRET = env.CRON_SECRET
    }

    // Route /api/* and /health to Hono backend
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      return app.fetch(request, env, ctx)
    }

    // All frontend routes and static files (HTML, JS, CSS, images) served by Assets
    return env.ASSETS.fetch(request)
  },
}
