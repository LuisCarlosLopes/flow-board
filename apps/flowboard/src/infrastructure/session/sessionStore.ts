import { GITHUB_API_BASE, isOfficialGithubApiBase, type RepoResolution } from '../github/url'

const STORAGE_KEY = 'flowboard.session.v1'

/** Migra sessão antiga (sessionStorage) para localStorage — compatível com Playwright storageState. */
function migrateFromSessionStorageIfNeeded(): void {
  if (typeof sessionStorage === 'undefined' || typeof localStorage === 'undefined') {
    return
  }
  if (localStorage.getItem(STORAGE_KEY)) {
    return
  }
  const legacy = sessionStorage.getItem(STORAGE_KEY)
  if (!legacy) {
    return
  }
  localStorage.setItem(STORAGE_KEY, legacy)
  sessionStorage.removeItem(STORAGE_KEY)
}

export type FlowBoardSession = RepoResolution & {
  pat: string
  /** Original URL entered by the user */
  repoUrl: string
}

export function loadSession(): FlowBoardSession | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  migrateFromSessionStorageIfNeeded()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const v = JSON.parse(raw) as FlowBoardSession
    if (!v.pat || !v.owner || !v.repo) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!isOfficialGithubApiBase(typeof v.apiBase === 'string' ? v.apiBase : '')) {
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

export function createSession(pat: string, repoUrl: string, resolution: RepoResolution): FlowBoardSession {
  return {
    pat,
    repoUrl,
    owner: resolution.owner,
    repo: resolution.repo,
    apiBase: GITHUB_API_BASE,
    webUrl: resolution.webUrl,
  }
}
