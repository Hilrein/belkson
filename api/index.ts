/**
 * Vercel serverless entry (Node runtime — needed for Neon + optional sharp).
 * Routes: /api/*
 */
import { handle } from 'hono/vercel'
import app from '../server/app'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
  memory: 1024,
}

const handler = handle(app)

// Support both default export and method exports (Vercel / Next-style).
export default handler
export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
export const OPTIONS = handler
