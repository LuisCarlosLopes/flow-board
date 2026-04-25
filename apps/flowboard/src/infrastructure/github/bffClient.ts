import { GitHubHttpError } from './client.js'
import type { GitHubDataClient } from './client.js'

const INVOKE = '/api/flowboard/github/invoke'

type InvokeResultOk<T> = { ok: true; data: T }
type InvokeResultErr = { ok: false; error: { message: string; retryAfterMs?: number } }

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * GitHub data access from the browser: same contract as {@link import('./client.js').GitHubContentsClient}
 * but requests go to the BFF; credentials live in the HttpOnly session cookie.
 */
export class BffContentsClient implements GitHubDataClient {
  private async invoke<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const res = await fetch(INVOKE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      signal,
    })
    const json: unknown = await res.json().catch(() => null)
    if (isRecord(json) && json.ok === false && isRecord(json.error) && typeof json.error.message === 'string') {
      const err = json as InvokeResultErr
      const ra =
        typeof err.error.retryAfterMs === 'number' ? err.error.retryAfterMs : undefined
      throw new GitHubHttpError(err.error.message, res.status, ra)
    }
    if (!res.ok) {
      if (isRecord(json) && typeof json.error === 'string') {
        throw new GitHubHttpError(json.error, res.status)
      }
      throw new GitHubHttpError(res.statusText || 'BFF request failed', res.status)
    }
    if (isRecord(json) && json.ok === true && 'data' in json) {
      return (json as InvokeResultOk<T>).data
    }
    throw new Error('Resposta BFF inesperada')
  }

  getFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown }> {
    return this.invoke({ op: 'getFileJson', path }, signal)
  }

  tryGetFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown } | null> {
    return this.invoke({ op: 'tryGetFileJson', path }, signal)
  }

  putFileJson(path: string, json: unknown, sha: string | null): Promise<void> {
    return this.invoke({ op: 'putFileJson', path, json, sha: sha ?? null })
  }

  getFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string }> {
    return this.invoke({ op: 'getFileRaw', path }, signal)
  }

  tryGetFileRaw(path: string, signal?: AbortSignal): Promise<{ sha: string; contentBase64: string } | null> {
    return this.invoke({ op: 'tryGetFileRaw', path }, signal)
  }

  putFileBase64(
    path: string,
    contentBase64: string,
    sha: string | null,
    message?: string,
  ): Promise<void> {
    return this.invoke({
      op: 'putFileBase64',
      path,
      contentBase64,
      sha: sha ?? null,
      message,
    })
  }

  async deleteFile(path: string, sha: string): Promise<void> {
    await this.invoke({ op: 'deleteFile', path, sha })
  }
}
