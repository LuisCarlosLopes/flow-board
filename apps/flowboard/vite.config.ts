import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

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
    "connect-src 'self' https://api.github.com",
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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const patKey =
    env.VITE_SESSION_SECRET ||
    env.SESSION_SECRET ||
    (mode === 'test' ? 'flowboard-vitest-default-pat-encryption-key-min-length' : '')

  return {
    define: {
      'import.meta.env.FLOWBOARD_PAT_KEY': JSON.stringify(patKey),
    },
    plugins: [react(), contentSecurityPolicyProduction()],
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['src/vitest.setup.ts'],
    },
  }
})
