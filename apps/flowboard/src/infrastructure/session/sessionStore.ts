import { isOfficialGithubApiBase, type RepoResolution } from '../github/url'

const LEGACY_STORAGE_KEY = 'flowboard.session.v1'

export type FlowBoardSession = RepoResolution & {
  /** Original URL entered by the user */
  repoUrl: string
}

/**
 * Best-effort removal of the legacy local/session storage snapshot that used to include the PAT.
 * Safe to call on startup before session restore via BFF.
 */
export function clearLegacyPatStorage(): void {
  if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }
  const fromLocal = localStorage.getItem(LEGACY_STORAGE_KEY)
  const fromSession = sessionStorage.getItem(LEGACY_STORAGE_KEY)
  if (fromLocal) {
    try {
      const v = JSON.parse(fromLocal) as { pat?: unknown }
      if (v && 'pat' in v && v.pat) {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    } catch {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  }
  if (fromSession) {
    try {
      const v = JSON.parse(fromSession) as { pat?: unknown }
      if (v && 'pat' in v && v.pat) {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    } catch {
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  }
}

export function createSessionView(resolution: RepoResolution, repoUrl: string): FlowBoardSession {
  return {
    ...resolution,
    repoUrl,
  }
}

export type BffSessionBody = {
  session: {
    owner: string
    repo: string
    apiBase: string
    webUrl: string
    repoUrl: string
  }
}

export function sessionFromApiPayload(body: BffSessionBody): FlowBoardSession {
  const s = body.session
  if (!isOfficialGithubApiBase(s.apiBase)) {
    throw new Error('Sessão inválida (api base)')
  }
  return {
    owner: s.owner,
    repo: s.repo,
    apiBase: s.apiBase,
    webUrl: s.webUrl,
    repoUrl: s.repoUrl,
  }
}
