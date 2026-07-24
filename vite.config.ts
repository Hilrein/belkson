import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { getRequestListener } from '@hono/node-server'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Mount Hono API on the same Vite dev server → only `npm run dev` needed.
 */
function belksonApiPlugin(): Plugin {
  return {
    name: 'belkson-api',
    async configureServer(server) {
      // Load .env into process.env for Neon
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }

      const { default: app } = await server.ssrLoadModule('/server/app.ts')
      const listener = getRequestListener(app.fetch)

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.startsWith('/api')) {
          next()
          return
        }
        listener(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), belksonApiPlugin()],
  server: {
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
