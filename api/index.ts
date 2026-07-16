/**
 * Vercel Node serverless for /api/*
 * Step: load Hono app via getRequestListener.
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
  void listener(req, res)
}
