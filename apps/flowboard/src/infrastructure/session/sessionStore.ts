import { hasForbiddenSecretShape, hasForbiddenSerializedSecretMarkers } from './secretPayload'

const STORAGE_KEY = 'flowboard.session.v1'

export type FlowBoardSession = {
  owner: string
  repo: string
  repoUrl: string
  webUrl: string
  authenticated: true
  expiresAt?: string
}

export function loadSession(): FlowBoardSession | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  clearForbiddenLegacyStorage()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const v = JSON.parse(raw) as FlowBoardSession
    if (hasForbiddenSecretShape(v)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!isValidPublicSession(v)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return v
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveSession(session: FlowBoardSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

export function createSession(session: Omit<FlowBoardSession, 'authenticated'> & { authenticated?: true }): FlowBoardSession {
  return {
    owner: session.owner,
    repo: session.repo,
    repoUrl: session.repoUrl,
    webUrl: session.webUrl,
    authenticated: true,
    ...(session.expiresAt ? { expiresAt: session.expiresAt } : {}),
  }
}

function clearForbiddenLegacyStorage(): void {
  if (typeof localStorage !== 'undefined' && hasForbiddenStoragePayload(localStorage.getItem(STORAGE_KEY))) {
    localStorage.removeItem(STORAGE_KEY)
  }
  if (typeof sessionStorage !== 'undefined' && hasForbiddenStoragePayload(sessionStorage.getItem(STORAGE_KEY))) {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

function hasForbiddenStoragePayload(raw: string | null): boolean {
  if (!raw) {
    return false
  }
  if (hasForbiddenSerializedSecretMarkers(raw)) {
    return true
  }
  try {
    return hasForbiddenSecretShape(JSON.parse(raw))
  } catch {
    return false
  }
}

function isValidPublicSession(value: unknown): value is FlowBoardSession {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.owner === 'string' &&
    candidate.owner.trim().length > 0 &&
    typeof candidate.repo === 'string' &&
    candidate.repo.trim().length > 0 &&
    typeof candidate.repoUrl === 'string' &&
    candidate.repoUrl.trim().length > 0 &&
    typeof candidate.webUrl === 'string' &&
    candidate.webUrl.trim().length > 0 &&
    candidate.authenticated === true &&
    (candidate.expiresAt === undefined || typeof candidate.expiresAt === 'string')
  )
}
