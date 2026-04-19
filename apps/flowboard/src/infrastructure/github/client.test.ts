import { describe, expect, it, vi } from 'vitest'
import { GitHubContentsClient, GitHubHttpError, putJsonWithRetry } from './client'

function mockResponse(status: number, body?: unknown, headers?: Record<string, string>) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (n: string) => headers?.[n.toLowerCase()] ?? null,
    },
    json: async () => body,
  }) as ReturnType<typeof fetch>
}

describe('GitHubContentsClient', () => {
  it('deleteFile sends DELETE with sha', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      expect(init?.method).toBe('DELETE')
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      expect(body.sha).toBe('blob-sha')
      return mockResponse(200, { commit: {} })
    })
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    await client.deleteFile('flowboard/boards/x.json', 'blob-sha')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws on 401', async () => {
    const fetchMock = vi.fn().mockImplementation(() => mockResponse(401))
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    await expect(client.getFileJson('flowboard/catalog.json')).rejects.toMatchObject({
      status: 401,
    })
  })

  it('429 includes retry hint when header present', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      mockResponse(429, {}, { 'retry-after': '2' }),
    )
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    try {
      await client.putFileJson('p', {}, 'sha')
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(GitHubHttpError)
      const err = e as GitHubHttpError
      expect(err.status).toBe(429)
      expect(err.retryAfterMs).toBe(2000)
    }
  })
})

describe('putJsonWithRetry', () => {
  it('retries once on 409 then succeeds', async () => {
    const states = [
      { sha: 'aaa', json: { v: 1 } },
      { sha: 'bbb', json: { v: 1 } },
    ]
    let getCalls = 0
    const readCurrent = async () => states[getCalls++] ?? states[states.length - 1]!

    let putCalls = 0
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        putCalls += 1
        if (putCalls === 1) {
          return mockResponse(409, { message: 'conflict' })
        }
        return mockResponse(200, {})
      }
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify({ hello: 1 }))))
      return mockResponse(200, {
        sha: 'bbb',
        content: b64,
        encoding: 'base64',
      })
    })

    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })

    await putJsonWithRetry(client, 'flowboard/x.json', { ok: true }, readCurrent)

    expect(putCalls).toBe(2)
  })
})
