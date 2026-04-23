import type { SessionOptions } from 'iron-session'
import { randomBytes } from 'crypto'
import { config } from 'dotenv'

config()

let devFallbackSessionSecret: string | undefined

function sessionPassword(): string {
  const s = process.env.FLOWBOARD_SESSION_SECRET
  if (s && s.length >= 32) {
    return s
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[flowboard] FLOWBOARD_SESSION_SECRET must be set and contain at least 32 characters in production.',
    )
  }

  if (s && s.length < 32) {
    console.error(
      '[flowboard] FLOWBOARD_SESSION_SECRET has fewer than 32 characters; using a generated dev-only secret. Fix the env var.',
    )
  }

  if (!devFallbackSessionSecret) {
    devFallbackSessionSecret = randomBytes(48).toString('hex')
  }

  return devFallbackSessionSecret
}

export const flowboardSessionOptions: SessionOptions = {
  get password() {
    return sessionPassword()
  },
  cookieName: 'flowboard.sid',
  ttl: 60 * 60 * 24 * 7,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
}
