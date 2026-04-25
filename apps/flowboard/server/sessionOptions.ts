import type { SessionOptions } from 'iron-session'

const COOKIE_NAME = 'flowboard.sid'

function isLocalDevNode(): boolean {
  const n = process.env.NODE_ENV
  // Só com NODE_ENV explícito (p.ex. `npm run dev:server` usa cross-env); nunca tratar
  // "indefinido" como dev — alinha com code review (hospedagem pública com segredo padrão).
  return n === 'development' || n === 'test'
}

function sessionPassword(): string {
  const p = process.env.SESSION_SECRET
  if (p && p.length >= 32) {
    return p
  }
  if (isLocalDevNode()) {
    // Apenas em dev/test local ou NODE_ENV ausente; produção e CI têm de definir SESSION_SECRET (ver README)
    return 'dev-local-flowboard-iron-session-32+'
  }
  throw new Error('SESSION_SECRET is required and must be at least 32 characters')
}

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: COOKIE_NAME,
    password: sessionPassword(),
    cookieOptions: {
      httpOnly: true,
      // Vercel (Preview/Production) é sempre HTTPS; dev local em http usa secure: false
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
      sameSite: 'lax',
      path: '/',
    },
  }
}
