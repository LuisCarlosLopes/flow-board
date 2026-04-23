import type { SessionOptions } from 'iron-session'
import { config } from 'dotenv'

config()

function sessionPassword(): string {
  const s = process.env.FLOWBOARD_SESSION_SECRET
  if (s && s.length >= 32) {
    return s
  }
  if (s && s.length < 32) {
    throw new Error('FLOWBOARD_SESSION_SECRET must be at least 32 characters when set')
  }
  // Dev / bundling: `vite build` imports this module with no secret; `server/start` validates before listen in production.
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
