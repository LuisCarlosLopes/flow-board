import type { FlowBoardSession } from '../src/infrastructure/session/sessionStore'

export const SESSION_COOKIE_NAME = 'fb_session'

export type ServerConfig = {
  sessionTtlSeconds: number
  sessionSecret: string | null
  cookieSecure: boolean
  port: number
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const sessionTtlSeconds = positiveInt(env.FLOWBOARD_SESSION_TTL_SECONDS) ?? 12 * 60 * 60
  const port = positiveInt(env.PORT) ?? 5173
  const cookieSecure = parseBoolean(env.FLOWBOARD_COOKIE_SECURE) ?? env.NODE_ENV === 'production'
  const sessionSecret =
    env.FLOWBOARD_SESSION_SECRET?.trim() ||
    (env.NODE_ENV === 'production' ? null : 'flowboard-dev-session-secret')

  return {
    sessionTtlSeconds,
    sessionSecret,
    cookieSecure,
    port,
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) {
    return {}
  }
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split('=')
        return [name, decodeURIComponent(rest.join('='))]
      }),
  )
}

export function buildSessionCookie(sessionValue: string, config: ServerConfig): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionValue)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${config.sessionTtlSeconds}`,
  ]
  if (config.cookieSecure) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

export function buildExpiredSessionCookie(config: ServerConfig): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ]
  if (config.cookieSecure) {
    parts.push('Secure')
  }
  return parts.join('; ')
}

export function isTrustedOrigin(request: Request): boolean {
  const method = request.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true
  }
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  try {
    return new URL(request.url).origin === origin
  } catch {
    return false
  }
}

export function getPublicSessionExpiryIso(nowMs: number, config: ServerConfig): string {
  return new Date(nowMs + config.sessionTtlSeconds * 1000).toISOString()
}

export function sanitizeFlowBoardPath(path: string): string | null {
  const candidate = path.trim()
  if (!candidate || candidate.startsWith('/') || candidate.includes('\\')) {
    return null
  }
  const segments = candidate.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null
  }
  if (candidate === 'flowboard/catalog.json') {
    return candidate
  }
  if (/^flowboard\/boards\/[^/]+\.json$/u.test(candidate)) {
    return candidate
  }
  if (/^flowboard\/attachments\/[^/]+\/[^/]+\/[^/]+$/u.test(candidate)) {
    return candidate
  }
  return null
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return null
  }
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export function jsonResponse(status: number, body: unknown, headers?: Headers | Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...(headers ?? {}),
    },
  })
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  options?: { retryAfterMs?: number; headers?: Headers | Record<string, string> },
): Response {
  const headers = new Headers(options?.headers)
  if (options?.retryAfterMs) {
    headers.set('Retry-After', String(Math.ceil(options.retryAfterMs / 1000)))
  }
  return jsonResponse(
    status,
    {
      error: {
        code,
        message,
        ...(options?.retryAfterMs ? { retryAfterMs: options.retryAfterMs } : {}),
      },
    },
    headers,
  )
}

export function createPublicSession(session: Omit<FlowBoardSession, 'authenticated'>): FlowBoardSession {
  return {
    owner: session.owner,
    repo: session.repo,
    repoUrl: session.repoUrl,
    webUrl: session.webUrl,
    authenticated: true,
    ...(session.expiresAt ? { expiresAt: session.expiresAt } : {}),
  }
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value === undefined) {
    return null
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return null
}

function positiveInt(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}
