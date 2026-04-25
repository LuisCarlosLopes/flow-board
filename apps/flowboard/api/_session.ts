import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const COOKIE_NAME = 'fb-session'
const ALGO = 'aes-256-gcm' as const

export type SessionData = {
  pat: string
  owner: string
  repo: string
  webUrl: string
  repoUrl: string
}

function getKey(): Buffer {
  const b64 = process.env.SESSION_SECRET
  if (!b64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET not set')
    }
    // Dev-only deterministic key — never used in production
    return Buffer.alloc(32, 0xde)
  }
  const key = Buffer.from(b64, 'base64url')
  if (key.length !== 32) throw new Error('SESSION_SECRET must be 32 bytes (base64url)')
  return key
}

export function encryptSession(data: SessionData): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}.${tag.toString('hex')}.${ct.toString('hex')}`
}

export function decryptSession(token: string): SessionData {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid session token format')
  const [ivHex, tagHex, ctHex] = parts as [string, string, string]
  const key = getKey()
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
  return JSON.parse(plain) as SessionData
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie ?? ''
  const result: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    result[key] = decodeURIComponent(val)
  }
  return result
}

export function readSessionFromRequest(req: IncomingMessage): SessionData | null {
  try {
    const cookies = parseCookies(req)
    const token = cookies[COOKIE_NAME]
    if (!token) return null
    return decryptSession(token)
  } catch {
    return null
  }
}

export function setSessionCookie(res: ServerResponse, data: SessionData): void {
  const value = encryptSession(data)
  const isProd = process.env.NODE_ENV === 'production'
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'HttpOnly',
    isProd ? 'Secure' : '',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=28800',
  ].filter(Boolean)
  res.setHeader('Set-Cookie', attrs.join('; '))
}

export function clearSessionCookie(res: ServerResponse): void {
  const isProd = process.env.NODE_ENV === 'production'
  const attrs = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    isProd ? 'Secure' : '',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ].filter(Boolean)
  res.setHeader('Set-Cookie', attrs.join('; '))
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}
