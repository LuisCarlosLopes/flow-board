import { GITHUB_API_BASE, isOfficialGithubApiBase, type RepoResolution } from '../github/url'
import { decryptPat, encryptPat, hasPatEncryptionKey, type PatEncPayload } from './sessionPatCrypto'

const STORAGE_KEY = 'flowboard.session.v1'

type PersistedCommon = {
  owner: string
  repo: string
  apiBase: string
  webUrl: string
  repoUrl: string
}

type PersistedPlain = PersistedCommon & { pat: string; v?: 1 }
type PersistedSealed = PersistedCommon & { v: 2; patEnc: PatEncPayload }

function isPersistedSealed(x: unknown): x is PersistedSealed {
  if (x === null || typeof x !== 'object') {
    return false
  }
  const o = x as Record<string, unknown>
  if (o.v !== 2) {
    return false
  }
  const pe = o.patEnc
  if (pe === null || typeof pe !== 'object') {
    return false
  }
  const p = pe as Record<string, unknown>
  return typeof p.iv === 'string' && p.iv.length > 0 && typeof p.ct === 'string' && p.ct.length > 0
}

function validateCommon(
  o: unknown,
):
  | { ok: true; data: PersistedCommon }
  | { ok: false } {
  if (o === null || typeof o !== 'object') {
    return { ok: false }
  }
  const v = o as Record<string, unknown>
  if (typeof v.owner !== 'string' || !v.owner.trim()) {
    return { ok: false }
  }
  if (typeof v.repo !== 'string' || !v.repo.trim()) {
    return { ok: false }
  }
  if (typeof v.apiBase !== 'string' || !isOfficialGithubApiBase(v.apiBase)) {
    return { ok: false }
  }
  if (typeof v.webUrl !== 'string' || !v.webUrl.trim()) {
    return { ok: false }
  }
  if (typeof v.repoUrl !== 'string' || !v.repoUrl.trim()) {
    return { ok: false }
  }
  return {
    ok: true,
    data: {
      owner: v.owner,
      repo: v.repo,
      apiBase: v.apiBase,
      webUrl: v.webUrl,
      repoUrl: v.repoUrl,
    },
  }
}

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

/**
 * Síncrono: indica se existe sessão persistida (plain ou cifrada) sem desencriptar.
 * Usar antes de `clearSession` em notificações que precisam saber se havia login.
 */
export function hasPersistedSession(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  migrateFromSessionStorageIfNeeded()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return false
  }
  try {
    const v = JSON.parse(raw) as unknown
    if (!validateCommon(v).ok) {
      return false
    }
    if (isPersistedSealed(v)) {
      return true
    }
    const p = v as Record<string, unknown>
    return typeof p.pat === 'string' && p.pat.length > 0
  } catch {
    return false
  }
}

export async function loadSessionAsync(): Promise<FlowBoardSession | null> {
  if (typeof localStorage === 'undefined') {
    return false
  }
  migrateFromSessionStorageIfNeeded()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    const common = validateCommon(parsed)
    if (!common.ok) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (isPersistedSealed(parsed)) {
      if (!hasPatEncryptionKey()) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      const pat = await decryptPat(parsed.patEnc)
      if (!pat) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return { ...common.data, pat, repoUrl: common.data.repoUrl }
    }

    const plain = parsed as Partial<PersistedPlain>
    if (typeof plain.pat !== 'string' || !plain.pat) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return { ...common.data, pat: plain.pat, repoUrl: common.data.repoUrl }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export async function saveSessionAsync(session: FlowBoardSession): Promise<void> {
  if (hasPatEncryptionKey()) {
    const patEnc = await encryptPat(session.pat)
    const body: PersistedSealed = {
      v: 2,
      owner: session.owner,
      repo: session.repo,
      apiBase: session.apiBase,
      webUrl: session.webUrl,
      repoUrl: session.repoUrl,
      patEnc,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(body))
    return
  }

  const body: PersistedPlain = {
    v: 1,
    pat: session.pat,
    owner: session.owner,
    repo: session.repo,
    apiBase: session.apiBase,
    webUrl: session.webUrl,
    repoUrl: session.repoUrl,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(body))
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
