import { GITHUB_API_BASE } from './url'

export type ContentsGetResponse = {
  sha: string
  content: string
  encoding: 'base64'
}

export class GitHubHttpError extends Error {
  readonly status: number
  readonly retryAfterMs?: number

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message)
    this.name = 'GitHubHttpError'
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

export type GitHubClientOptions = {
  token?: string
  owner: string
  repo: string
  apiBase?: string
  fetchImpl?: typeof fetch
}

/**
 * Minimal GitHub Contents API client (JSON bodies as UTF-8 strings).
 */
export class GitHubContentsClient {
  private readonly token: string
  private readonly owner: string
  private readonly repo: string
  private readonly apiBase: string
  private readonly fetchImpl: typeof fetch

  constructor(opts: GitHubClientOptions) {
    this.token = opts.token ?? ''
    this.owner = opts.owner
    this.repo = opts.repo
    this.apiBase = opts.apiBase ?? GITHUB_API_BASE
    // Evita "Illegal invocation" no browser quando `fetch` é chamado sem receiver (`this`).
    this.fetchImpl = opts.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  private headers(): HeadersInit {
    return {
      ...(this.token
        ? {
            Authorization: `Bearer ${this.token}`,
          }
        : {}),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }

  private repositoryUrl(): string {
    return `${this.apiBase}/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`
  }

  private url(path: string): string {
    const encoded = path
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/')
    return `${this.repositoryUrl()}/contents/${encoded}`
  }

  async getFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown }> {
    const res = await this.fetchImpl(this.url(path), {
      headers: this.headers(),
      signal,
    })
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    const body = (await res.json()) as ContentsGetResponse
    const decoded = decodeContent(body)
    const json = JSON.parse(decoded) as unknown
    return { sha: body.sha, json }
  }

  /** GET file JSON; `null` if path missing (404). Other errors throw. */
  async tryGetFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown } | null> {
    const res = await this.fetchImpl(this.url(path), {
      headers: this.headers(),
      signal,
    })
    if (res.status === 404) {
      return null
    }
    if (res.status === 401 || res.status === 403) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    const body = (await res.json()) as ContentsGetResponse
    const decoded = decodeContent(body)
    const json = JSON.parse(decoded) as unknown
    return { sha: body.sha, json }
  }

  /** Validates PAT can read the configured repository (GET /repos/{owner}/{repo}). */
  async verifyRepositoryAccess(): Promise<void> {
    const res = await this.fetchImpl(this.repositoryUrl(), {
      headers: this.headers(),
    })
    if (res.status === 401) {
      throw new GitHubHttpError('Não autorizado (401). Verifique o PAT.', 401)
    }
    if (res.status === 404) {
      throw new GitHubHttpError('Repositório não encontrado (404).', 404)
    }
    if (res.status === 403) {
      throw new GitHubHttpError('Acesso negado (403). Escopo do PAT ou visibilidade do repo.', 403)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
  }

  /**
   * PUT JSON with optimistic SHA; on 409, caller should re-fetch and merge.
   */
  async putFileJson(path: string, json: unknown, sha: string | null): Promise<void> {
    const content = utf8ToBase64(JSON.stringify(json, null, 2))
    const body: Record<string, unknown> = {
      message: `flowboard: update ${path}`,
      content,
    }
    if (sha) {
      body.sha = sha
    }
    const res = await this.fetchImpl(this.url(path), {
      method: 'PUT',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (res.status === 409) {
      throw new GitHubHttpError('Conflict (409)', 409)
    }
    if (res.status === 429) {
      const ra = res.headers.get('Retry-After')
      const retryAfterMs = ra ? Number(ra) * 1000 : undefined
      throw new GitHubHttpError('Rate limited (429)', 429, retryAfterMs)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
  }

  /**
   * GET raw file (base64 as returned by API). Use for binary blobs and non-JSON text.
   */
  async getFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string }> {
    const res = await this.fetchImpl(this.url(path), {
      headers: this.headers(),
      signal,
    })
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    const body = (await res.json()) as ContentsGetResponse
    if (body.encoding !== 'base64') {
      throw new Error('Unsupported encoding')
    }
    return { sha: body.sha, contentBase64: body.content.replace(/\n/g, '') }
  }

  /** `tryGetFileRaw`: null if 404. */
  async tryGetFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string } | null> {
    const res = await this.fetchImpl(this.url(path), {
      headers: this.headers(),
      signal,
    })
    if (res.status === 404) {
      return null
    }
    if (res.status === 401 || res.status === 403) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    const body = (await res.json()) as ContentsGetResponse
    if (body.encoding !== 'base64') {
      throw new Error('Unsupported encoding')
    }
    return { sha: body.sha, contentBase64: body.content.replace(/\n/g, '') }
  }

  /**
   * PUT arbitrary base64 content (binary or text). Same conflict/rate-limit behavior as JSON PUT.
   */
  async putFileBase64(path: string, contentBase64: string, sha: string | null, message?: string): Promise<void> {
    const body: Record<string, unknown> = {
      message: message ?? `flowboard: update ${path}`,
      content: contentBase64,
    }
    if (sha) {
      body.sha = sha
    }
    const res = await this.fetchImpl(this.url(path), {
      method: 'PUT',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (res.status === 409) {
      throw new GitHubHttpError('Conflict (409)', 409)
    }
    if (res.status === 429) {
      const ra = res.headers.get('Retry-After')
      const retryAfterMs = ra ? Number(ra) * 1000 : undefined
      throw new GitHubHttpError('Rate limited (429)', 429, retryAfterMs)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
  }

  /** DELETE file at path (requires current blob SHA). */
  async deleteFile(path: string, sha: string): Promise<void> {
    const res = await this.fetchImpl(this.url(path), {
      method: 'DELETE',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `flowboard: delete ${path}`,
        sha,
      }),
    })
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
    if (!res.ok) {
      throw new GitHubHttpError(`GitHub ${res.status}`, res.status)
    }
  }
}

function decodeContent(body: ContentsGetResponse): string {
  if (body.encoding !== 'base64') {
    throw new Error('Unsupported encoding')
  }
  const bin = atob(body.content.replace(/\n/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) {
    bin += String.fromCharCode(b)
  }
  return btoa(bin)
}

/**
 * Retries PUT once after 409 by re-reading SHA via getter (ADR-005).
 */
export async function putJsonWithRetry(
  client: GitHubContentsClient,
  path: string,
  json: unknown,
  readCurrent: () => Promise<{ sha: string; json: unknown }>,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const current = await readCurrent()
      await client.putFileJson(path, json, current.sha)
      return
    } catch (e) {
      if (e instanceof GitHubHttpError && e.status === 409 && attempt < 1) {
        continue
      }
      throw e
    }
  }
}

/**
 * Same as {@link putJsonWithRetry} for binary/text blobs: re-read SHA after 409 (concorrência GitHub).
 */
export async function putFileBase64WithRetry(
  client: GitHubContentsClient,
  path: string,
  contentBase64: string,
  readCurrentSha: () => Promise<string | null>,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const sha = await readCurrentSha()
      await client.putFileBase64(path, contentBase64, sha, undefined)
      return
    } catch (e) {
      if (e instanceof GitHubHttpError && e.status === 409 && attempt < 1) {
        continue
      }
      throw e
    }
  }
}
