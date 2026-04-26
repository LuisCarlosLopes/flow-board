import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'

/**
 * CSP apenas no HTML emitido pelo build de produção (HITL D4).
 * `dev` não injeta meta, para preservar HMR e DX.
 *
 * Após BFF: browser só fala com 'self' — GitHub API é chamada pelo proxy server-side.
 */
function contentSecurityPolicyProduction(): Plugin {
  const content = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
    "img-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'flowboard-csp-production',
    transformIndexHtml: {
      order: 'post',
      handler(_, ctx) {
        if (ctx.server) {
          return
        }
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content,
            },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

/**
 * Em dev, serve as Vercel Functions diretamente no Vite dev server via ssrLoadModule.
 * Elimina a necessidade de um processo separado (vercel dev / express).
 */
function apiDevServer(): Plugin {
  return {
    name: 'flowboard-api-dev',
    apply: 'serve' as const,
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '/'
        if (!url.startsWith('/api/')) {
          next()
          return
        }

        const qIdx = url.indexOf('?')
        const pathname = qIdx >= 0 ? url.slice(0, qIdx) : url
        const apiPath = pathname.slice('/api'.length) // e.g. '/auth/login'

        let modulePath: string | null = null
        let pathSegments: string[] = []

        if (apiPath === '/auth/login') {
          modulePath = '/api/auth/login.ts'
        } else if (apiPath === '/auth/logout') {
          modulePath = '/api/auth/logout.ts'
        } else if (apiPath.startsWith('/github/')) {
          modulePath = '/api/github/[...path].ts'
          pathSegments = apiPath.slice('/github/'.length).split('/').filter(Boolean)
        }

        if (!modulePath) {
          next()
          return
        }

        try {
          const mod = await server.ssrLoadModule(modulePath)
          type ApiHandler = (req: IncomingMessage & { query?: unknown }, res: ServerResponse) => Promise<void> | void
          const handler = mod.default as ApiHandler
          ;(req as IncomingMessage & { query?: unknown }).query = { path: pathSegments }
          await handler(req as IncomingMessage & { query?: unknown }, res)
        } catch (err) {
          console.error('[api-dev]', err)
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Internal error' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentSecurityPolicyProduction(), apiDevServer()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/vitest.setup.ts'],
  },
})
