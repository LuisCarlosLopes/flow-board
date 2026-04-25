import { isOfficialGithubApiBase, type RepoResolution } from '../github/url'

const LEGACY_STORAGE_KEY = 'flowboard.session.v1'

export type FlowBoardSession = RepoResolution & {
  /** Original URL entered by the user */
  repoUrl: string
}

/**
 * Removes the pre-BFF local/session storage key that used to hold the PAT in the browser.
 * Always delete the key if present — the BFF cookie is the only credential store now.
 * Call on startup (and after login) so old bundles or race conditions cannot leave secrets in storage.
 */
export function clearLegacyPatStorage(): void {
  if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
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
