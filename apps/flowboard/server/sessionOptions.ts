import type { SessionOptions } from 'iron-session'
import { config } from 'dotenv'

config()

function sessionPassword(): string {
  const s = process.env.FLOWBOARD_SESSION_SECRET
  if (s && s.length >= 32) {
    return s
  }
  if (s && s.length < 32) {
    // Não fazer throw no load do módulo: em Vercel isso dava 500 em todas as rotas /api.
    console.error(
      '[flowboard] FLOWBOARD_SESSION_SECRET has fewer than 32 characters; using dev fallback. Fix the env var.',
    )
  }
  // Dev / bundling / Vercel sem secret válido: fallback (inseguro se usado além de depuração).
  return '0000000000000000000000000000000000000000000000000000000000000000-dev-unsafe-'
}

export const flowboardSessionOptions: SessionOptions = {
  password: sessionPassword(),
  cookieName: 'flowboard.sid',
  ttl: 60 * 60 * 24 * 7,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
}
