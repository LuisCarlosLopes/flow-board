import { GITHUB_API_BASE, isOfficialGithubApiBase, type RepoResolution } from '../github/url'

const STORAGE_KEY = 'flowboard.session.v1'

export type FlowBoardSession = RepoResolution & {
  pat: string
  /** Original URL entered by the user */
  repoUrl: string
}

export function loadSession(): FlowBoardSession | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const v = JSON.parse(raw) as FlowBoardSession
    if (!v.pat || !v.owner || !v.repo) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!isOfficialGithubApiBase(typeof v.apiBase === 'string' ? v.apiBase : '')) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return v
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveSession(session: FlowBoardSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
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
