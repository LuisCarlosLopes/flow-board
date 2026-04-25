import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { createFlowBoardApiApp, createNodeMiddleware } from './server/app'

/**
 * CSP apenas no HTML emitido pelo build de produção (HITL D4).
 * `dev` não injeta meta, para preservar HMR e DX.
 */
function contentSecurityPolicyProduction(): Plugin {
  const content = [
    "default-src 'self'",
    "script-src 'self'",
    "script-src-elem 'self' https://vercel.live",
    "frame-src 'self' https://vercel.live",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://vercel.live",
    "img-src 'self' data: blob:",
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

function flowBoardApiBridge(): Plugin {
  const app = createFlowBoardApiApp()
  const middleware = createNodeMiddleware(app)

  return {
    name: 'flowboard-api-bridge',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [flowBoardApiBridge(), react(), contentSecurityPolicyProduction()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
    setupFiles: ['src/vitest.setup.ts'],
  },
})
