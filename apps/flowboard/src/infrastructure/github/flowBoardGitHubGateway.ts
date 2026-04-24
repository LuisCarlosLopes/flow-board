import { GitHubHttpError, type FlowBoardContentsGateway } from './client'

type ApiErrorPayload = {
  error?: {
    code?: string
    message?: string
    retryAfterMs?: number
  }
}

export class FlowBoardGitHubGateway implements FlowBoardContentsGateway {
  private readonly fetchImpl: typeof fetch

  constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  async getFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown }> {
    const response = await this.requestJson('GET', path, 'json', undefined, signal)
    return { sha: asString(response.sha), json: response.json }
  }

  async tryGetFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown } | null> {
    const response = await this.requestMaybe('GET', path, 'json', undefined, signal)
    if (!response) {
      return null
    }
    return { sha: asString(response.sha), json: response.json }
  }

  async putFileJson(path: string, json: unknown, sha: string | null): Promise<void> {
    await this.requestMaybe('PUT', path, 'json', { json, sha })
  }

  async getFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string }> {
    const response = await this.requestJson('GET', path, 'blob', undefined, signal)
    return { sha: asString(response.sha), contentBase64: asString(response.contentBase64) }
  }

  async tryGetFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string } | null> {
    const response = await this.requestMaybe('GET', path, 'blob', undefined, signal)
    if (!response) {
      return null
    }
    return { sha: asString(response.sha), contentBase64: asString(response.contentBase64) }
  }

  async putFileBase64(path: string, contentBase64: string, sha: string | null, message?: string): Promise<void> {
    await this.requestMaybe('PUT', path, 'blob', { contentBase64, sha, message })
  }

  async deleteFile(path: string, sha: string): Promise<void> {
    await this.requestMaybe('DELETE', path, 'json', { sha })
  }

  private async requestJson(
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    kind: 'json' | 'blob',
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const response = await this.fetchOrThrow(method, path, kind, body, signal)
    return (await response.json()) as Record<string, unknown>
  }

  private async requestMaybe(
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    kind: 'json' | 'blob',
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown> | null> {
    const response = await this.send(method, path, kind, body, signal)
    if (response.status === 404 && method === 'GET') {
      return null
    }
    if (response.status === 204) {
      return null
    }
    if (!response.ok) {
      const payload = await safeParseError(response)
      const message = payload?.error?.message?.trim() || `FlowBoard API ${response.status}`
      throw new GitHubHttpError(message, response.status, payload?.error?.retryAfterMs)
    }
    if (response.headers.get('content-type')?.includes('application/json')) {
      return (await response.json()) as Record<string, unknown>
    }
    return null
  }

  private async fetchOrThrow(
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    kind: 'json' | 'blob',
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const response = await this.send(method, path, kind, body, signal)
    if (response.ok) {
      return response
    }
    const payload = await safeParseError(response)
    const message = payload?.error?.message?.trim() || `FlowBoard API ${response.status}`
    throw new GitHubHttpError(message, response.status, payload?.error?.retryAfterMs)
  }

  private async send(
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    kind: 'json' | 'blob',
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = new URL('/api/flowboard/contents', window.location.origin)
    url.searchParams.set('path', path)
    url.searchParams.set('kind', kind)

    const response = await this.fetchImpl(url, {
      method,
      credentials: 'include',
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify({ path, kind, ...body }) : undefined,
    })

    return response
  }
}

async function safeParseError(response: Response): Promise<ApiErrorPayload | null> {
  try {
    return (await response.json()) as ApiErrorPayload
  } catch {
    return null
  }
}

function asString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Resposta inválida do FlowBoard API.')
  }
  return value
}
