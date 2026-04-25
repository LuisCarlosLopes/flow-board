const STORAGE_KEY = 'flowboard.session.v1'

const PROXY_API_BASE = '/api/github' as const

export type FlowBoardSession = {
  owner: string
  repo: string
  /** Always '/api/github' — PAT lives server-side in HttpOnly cookie. */
  apiBase: typeof PROXY_API_BASE
  /** Normalized https://github.com/owner/repo */
  webUrl: string
  /** Original URL entered by the user */
  repoUrl: string
}

function isValidApiBase(apiBase: unknown): apiBase is typeof PROXY_API_BASE {
  return apiBase === PROXY_API_BASE
}

export function loadSession(): FlowBoardSession | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const v = JSON.parse(raw) as FlowBoardSession
    if (!v.owner || !v.repo) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!isValidApiBase(v.apiBase)) {
      // Limpa sessões antigas (que tinham pat ou apiBase diferente)
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

export function createSession(
  repoUrl: string,
  resolution: { owner: string; repo: string; webUrl: string },
): FlowBoardSession {
  return {
    repoUrl,
    owner: resolution.owner,
    repo: resolution.repo,
    apiBase: PROXY_API_BASE,
    webUrl: resolution.webUrl,
  }
}
