/**
 * Vercel Node.js serverless entry for /api/*
 *
 * Use @hono/node-server request listener (Node req/res), not hono/vercel
 * Web Fetch handler — the latter often crashes as FUNCTION_INVOCATION_FAILED
 * on non-Edge Vite projects.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRequestListener } from '@hono/node-server'
import app from '../server/app'

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
}

const listener = getRequestListener(app.fetch)

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  // Vercel may pass a path without /api prefix depending on rewrite;
  // Hono app uses basePath('/api'), so ensure URL starts with /api.
  const url = req.url ?? '/'
  if (!url.startsWith('/api')) {
    req.url = url === '/' ? '/api' : `/api${url.startsWith('/') ? '' : '/'}${url}`
  }
  void listener(req, res)
}
