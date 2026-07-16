/**
 * Vercel serverless entry (Hono + sharp needs Node runtime).
 * Routes: /api/*
 */
import { handle } from 'hono/vercel'
import app from '../server/app'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

export default handle(app)
