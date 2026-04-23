import { isOfficialGithubApiBase, type RepoResolution } from '../github/url'

const STORAGE_KEY = 'flowboard.session.v1'

export type UserProfile = {
  login: string
  name: string | null
  avatar_url: string
}

/** Browser session: repo + profile; PAT only on the BFF (httpOnly cookie). */
export type FlowBoardSession = RepoResolution & {
  repoUrl: string
  profile?: UserProfile
}

export type AuthSessionResponse = {
  profile: UserProfile
  repository: {
    owner: string
    repo: string
    repoUrl: string
    webUrl: string
    apiBase: string
  }
}

/**
 * Remove legacy session JSON that stored the PAT in localStorage.
 * Call on app boot before establishing BFF session.
 */
export function evictLegacyPatFromStorage(): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return
  }
  try {
    const v = JSON.parse(raw) as { pat?: string }
    if (v.pat) {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function buildSessionFromAuthApi(data: AuthSessionResponse): FlowBoardSession {
  const r = data.repository
  if (!isOfficialGithubApiBase(r.apiBase)) {
    throw new Error('Invalid apiBase in session')
  }
  return {
    owner: r.owner,
    repo: r.repo,
    apiBase: r.apiBase,
    webUrl: r.webUrl,
    repoUrl: r.repoUrl,
    profile: data.profile,
  }
}

/** Restore session from BFF (cookie). Returns null if unauthenticated. */
export async function fetchSession(): Promise<FlowBoardSession | null> {
  const res = await fetch('/api/auth/session', { credentials: 'include' })
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    return null
  }
  const data = (await res.json()) as AuthSessionResponse
  return buildSessionFromAuthApi(data)
}

/**
 * @deprecated Não persiste credenciais; mantido para compat e testes que mockam.
 */
export function loadSession(): FlowBoardSession | null {
  evictLegacyPatFromStorage()
  return null
}

export async function logoutSession(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}

export function clearSession(): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}
