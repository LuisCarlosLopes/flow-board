import { sessionFromApiPayload, type BffSessionBody, type FlowBoardSession } from './sessionStore.ts'

const BOOTSTRAP_SESSION_TIMEOUT_MS = 8000

export async function fetchBffSession(): Promise<FlowBoardSession | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BOOTSTRAP_SESSION_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch('/api/flowboard/session', { credentials: 'include', signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    return null
  }
  const body: unknown = await res.json()
  if (
    body &&
    typeof body === 'object' &&
    'session' in body &&
    typeof (body as { session: unknown }).session === 'object' &&
    (body as { session: { owner: string } }).session !== null
  ) {
    return sessionFromApiPayload(body as BffSessionBody)
  }
  return null
}

function errorMessageFromLoginFailure(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error: unknown }).error
    if (typeof e === 'string' && e.trim()) {
      return e
    }
    if (e && typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
      return (e as { message: string }).message
    }
  }
  return `Falha no login (HTTP ${status})`
}

export async function postBffLogin(pat: string, repoUrl: string): Promise<FlowBoardSession> {
  const res = await fetch('/api/flowboard/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ pat, repoUrl }),
  })
  const raw = await res.text()
  let body: unknown = null
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown
    } catch {
      body = { error: raw.slice(0, 200) }
    }
  }
  if (!res.ok) {
    throw new Error(errorMessageFromLoginFailure(res.status, body))
  }
  if (
    body &&
    typeof body === 'object' &&
    'session' in body &&
    typeof (body as { session: unknown }).session === 'object' &&
    (body as { session: { owner: string } }).session !== null
  ) {
    return sessionFromApiPayload(body as BffSessionBody)
  }
  throw new Error('Resposta de login inesperada')
}

export async function postBffLogout(): Promise<void> {
  await fetch('/api/flowboard/session/logout', { method: 'POST', credentials: 'include' })
}
