import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const SESSION_COOKIE_NAME = 'flowboard.session.v2'
const SESSION_COOKIE_VERSION = 'v1'
// Segurança + UX: mantém a sessão ativa por uma jornada de trabalho sem virar "lembrar para sempre".
const SESSION_TTL_HOURS = 8
const SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 60 * 60

export type SessionGitHubUser = {
  login: string
  name: string | null
  avatar_url: string
}

export type FlowBoardServerSession = {
  pat: string
  repoUrl: string
  owner: string
  repo: string
  webUrl: string
  user: SessionGitHubUser
  issuedAtMs: number
  expiresAtMs: number
}

type CookieOptions = {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
}

type SessionReadResult =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'authenticated'; session: FlowBoardServerSession }

let fallbackSecretKey: Buffer | null = null
let warnedAboutEphemeralSecret = false

export function readSessionFromRequest(req: IncomingMessage): SessionReadResult {
  const cookies = parseCookies(req.headers.cookie)
  const raw = cookies[SESSION_COOKIE_NAME]
  if (!raw) {
    return { kind: 'missing' }
  }

  try {
    const payload = decryptSession(raw)
    if (!payload || payload.expiresAtMs <= Date.now()) {
      return { kind: 'invalid' }
    }
    return { kind: 'authenticated', session: payload }
  } catch {
    return { kind: 'invalid' }
  }
}

export function setSessionCookie(
  req: IncomingMessage,
  res: ServerResponse,
  payload: Omit<FlowBoardServerSession, 'issuedAtMs' | 'expiresAtMs'>,
): void {
  const issuedAtMs = Date.now()
  const expiresAtMs = issuedAtMs + SESSION_TTL_SECONDS * 1000
  const encrypted = encryptSession({
    ...payload,
    issuedAtMs,
    expiresAtMs,
  })

  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE_NAME, encrypted, {
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
      sameSite: 'Lax',
      secure: isSecureRequest(req),
    }),
  )
}

export function clearSessionCookie(req: IncomingMessage, res: ServerResponse): void {
  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'Lax',
      secure: isSecureRequest(req),
    }),
  )
}

function encryptSession(payload: FlowBoardServerSession): string {
  const iv = randomBytes(12)
  const key = sessionKey()
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [SESSION_COOKIE_VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

function decryptSession(raw: string): FlowBoardServerSession | null {
  const [version, ivB64, tagB64, encryptedB64] = raw.split('.')
  if (version !== SESSION_COOKIE_VERSION || !ivB64 || !tagB64 || !encryptedB64) {
    return null
  }

  const decipher = createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')

  let parsed: Partial<FlowBoardServerSession>
  try {
    parsed = JSON.parse(decrypted) as Partial<FlowBoardServerSession>
  } catch {
    return null
  }
  if (
    typeof parsed.pat !== 'string' ||
    !parsed.pat.trim() ||
    typeof parsed.repoUrl !== 'string' ||
    !parsed.repoUrl.trim() ||
    typeof parsed.owner !== 'string' ||
    !parsed.owner.trim() ||
    typeof parsed.repo !== 'string' ||
    !parsed.repo.trim() ||
    typeof parsed.webUrl !== 'string' ||
    !parsed.webUrl.trim() ||
    !parsed.user ||
    typeof parsed.user.login !== 'string' ||
    !parsed.user.login.trim() ||
    (parsed.user.name !== null && typeof parsed.user.name !== 'string') ||
    typeof parsed.user.avatar_url !== 'string' ||
    !parsed.user.avatar_url.trim() ||
    typeof parsed.issuedAtMs !== 'number' ||
    typeof parsed.expiresAtMs !== 'number'
  ) {
    return null
  }

  return {
    pat: parsed.pat,
    repoUrl: parsed.repoUrl,
    owner: parsed.owner,
    repo: parsed.repo,
    webUrl: parsed.webUrl,
    user: parsed.user,
    issuedAtMs: parsed.issuedAtMs,
    expiresAtMs: parsed.expiresAtMs,
  }
}

function sessionKey(): Buffer {
  const configured = process.env.FLOWBOARD_SESSION_SECRET?.trim()
  if (configured) {
    return createHash('sha256').update(configured, 'utf8').digest()
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FLOWBOARD_SESSION_SECRET é obrigatório em produção.')
  }

  if (!fallbackSecretKey) {
    fallbackSecretKey = randomBytes(32)
  }

  if (!warnedAboutEphemeralSecret) {
    warnedAboutEphemeralSecret = true
    console.warn(
      '[flowboard] FLOWBOARD_SESSION_SECRET não definido; usando segredo efêmero. Sessões expiram ao reiniciar o servidor.',
    )
  }

  return fallbackSecretKey
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {}
  }

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (!rawName) {
      return acc
    }
    acc[rawName] = decodeURIComponent(rawValue.join('='))
    return acc
  }, {})
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path ?? '/'}`)
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${options.maxAge}`)
  }
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }
  if (options.secure) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

function appendSetCookie(res: ServerResponse, value: string): void {
  const current = res.getHeader('Set-Cookie')
  if (!current) {
    res.setHeader('Set-Cookie', value)
    return
  }
  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, value])
    return
  }
  res.setHeader('Set-Cookie', [String(current), value])
}

function isSecureRequest(req: IncomingMessage): boolean {
  const forwardedProto = req.headers['x-forwarded-proto']
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0]?.trim() === 'https'
  }
  return false
}
