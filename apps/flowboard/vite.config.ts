import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { createBff } from './server/bffApp'

/**
 * CSP apenas no HTML emitido pelo build de produção (HITL D4).
 * `dev` não injeta meta, para preservar HMR e DX.
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    contentSecurityPolicyProduction(),
    {
      name: 'flowboard-bff',
      configureServer(server) {
        const bff = createBff()
        server.middlewares.use(bff)
      },
    },
  ],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/vitest.setup.ts'],
  },
})
