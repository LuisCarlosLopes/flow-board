import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { createBff } from './server/bffApp.js'

/**
 * CSP apenas no HTML emitido pelo build de produção (HITL D4).
 * `dev` não injeta meta, para preservar HMR e DX.
 */
function contentSecurityPolicyProduction(): Plugin {
  // Theme boot = /theme-init.js (public/) — sem inline, hashes não mudam entre builds/CI.
  // Vercel Preview: Live feedback + iframes; liga connect/frame ao domínio da Vercel.
  const content = [
    "default-src 'self'",
    "script-src 'self' https://vercel.live",
    "frame-src 'self' https://vercel.live",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://vercel.live wss://*.vercel.live https://vercel.com",
    "img-src 'self' data: https://avatars.githubusercontent.com",
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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
    setupFiles: ['src/vitest.setup.ts'],
    environmentMatchGlobs: [['server/**/*.test.ts', 'node']],
  },
})
