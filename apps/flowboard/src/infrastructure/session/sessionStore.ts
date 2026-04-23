import type { RepoResolution } from '../github/url'
import type { AuthenticatedGitHubUser } from './authApi'

const STORAGE_KEY = 'flowboard.session.v2'
const LEGACY_STORAGE_KEY = 'flowboard.session.v1'

function clearLegacyPatStorage(): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(LEGACY_STORAGE_KEY)
  }
}

export type FlowBoardSession = Pick<RepoResolution, 'owner' | 'repo' | 'webUrl'> & {
  /** Original URL entered by the user */
  repoUrl: string
  user: AuthenticatedGitHubUser
}

export function loadSession(): FlowBoardSession | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  clearLegacyPatStorage()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const v = JSON.parse(raw) as FlowBoardSession
    if (
      !v.owner ||
      !v.repo ||
      !v.repoUrl ||
      !v.webUrl ||
      !v.user ||
      typeof v.user.login !== 'string' ||
      !v.user.login.trim() ||
      (v.user.name !== null && typeof v.user.name !== 'string') ||
      typeof v.user.avatar_url !== 'string' ||
      !v.user.avatar_url.trim()
    ) {
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
  clearLegacyPatStorage()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  clearLegacyPatStorage()
  localStorage.removeItem(STORAGE_KEY)
}

export function createSession(
  repoUrl: string,
  resolution: Pick<RepoResolution, 'owner' | 'repo' | 'webUrl'>,
  user: AuthenticatedGitHubUser,
): FlowBoardSession {
  return {
    repoUrl,
    owner: resolution.owner,
    repo: resolution.repo,
    webUrl: resolution.webUrl,
    user,
  }
}
