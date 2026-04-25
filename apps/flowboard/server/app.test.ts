// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createFlowBoardApiApp } from './app'
import { SESSION_COOKIE_NAME } from './security'
import { createSessionRecord } from './sessions'
import type { IncomingMessage, ServerResponse } from 'node:http'

function mockResponse(status: number, body?: unknown, headers?: Record<string, string>) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => headers?.[name.toLowerCase()] ?? null,
    },
    json: async () => body,
  }) as Promise<Response>
}

describe('FlowBoard API app', () => {
  it('creates secure public session and never returns pat', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => mockResponse(200, { id: 1 }))
      .mockImplementationOnce(() => mockResponse(404))
      .mockImplementationOnce(() => mockResponse(200, {}))
      .mockImplementationOnce(() => mockResponse(200, {}))

    const app = createFlowBoardApiApp({
      fetchImpl: fetchMock,
      now: () => 0,
    })

    const response = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify({
          repoUrl: 'https://github.com/octo/repo',
          pat: 'ghp_secret',
        }),
      }),
    )

    expect(response?.status).toBe(201)
    const body = (await response?.json()) as { session: { owner: string; repo: string; authenticated: boolean } }
    expect(body.session).toMatchObject({
      owner: 'octo',
      repo: 'repo',
      authenticated: true,
    })
    expect(JSON.stringify(body)).not.toContain('ghp_secret')
    expect(response?.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=`)
  })

  it('rejects paths outside flowboard allowlist', async () => {
    const app = createFlowBoardApiApp()
    const record = createSessionRecord(
      app.config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
    )

    const response = await app.handle(
      new Request('http://localhost:5173/api/flowboard/contents?path=README.md&kind=json', {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${record.cookieValue}`,
        },
      }),
    )

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toMatchObject({
      error: { code: 'path_not_allowed' },
    })
  })

  it('logout is idempotent and expires the cookie', async () => {
    const app = createFlowBoardApiApp()
    const response = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        method: 'DELETE',
        headers: {
          Origin: 'http://localhost:5173',
        },
      }),
    )

    expect(response?.status).toBe(204)
    expect(response?.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('restores public session through GET /api/auth/session', async () => {
    const app = createFlowBoardApiApp()
    const record = createSessionRecord(
      app.config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
    )

    const response = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${record.cookieValue}`,
        },
      }),
    )

    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toMatchObject({
      session: { owner: 'octo', repo: 'repo', authenticated: true },
    })
  })

  it('returns 401 and expires cookie when session cookie is invalid', async () => {
    const app = createFlowBoardApiApp()
    const response = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=missing`,
        },
      }),
    )

    expect(response?.status).toBe(401)
    await expect(response?.json()).resolves.toMatchObject({
      error: { code: 'session_invalid' },
    })
  })

  it('reads FlowBoard contents through the server-side GitHub service', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        mockResponse(200, {
          sha: 'abc',
          content: btoa(JSON.stringify({ schemaVersion: 1, boards: [] })),
          encoding: 'base64',
        }),
      )
    const app = createFlowBoardApiApp({ fetchImpl: fetchMock })
    const record = createSessionRecord(
      app.config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
    )

    const response = await app.handle(
      new Request('http://localhost:5173/api/flowboard/contents?path=flowboard/catalog.json&kind=json', {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${record.cookieValue}`,
        },
      }),
    )

    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toMatchObject({
      sha: 'abc',
      json: { schemaVersion: 1, boards: [] },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps GitHub rate limits without leaking secrets', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      mockResponse(429, {}, { 'retry-after': '2' }),
    )
    const app = createFlowBoardApiApp({ fetchImpl: fetchMock })
    const record = createSessionRecord(
      app.config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
    )

    const response = await app.handle(
      new Request('http://localhost:5173/api/flowboard/contents', {
        method: 'PUT',
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${record.cookieValue}`,
          Origin: 'http://localhost:5173',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'flowboard/catalog.json',
          kind: 'json',
          json: { schemaVersion: 1, boards: [] },
          sha: 'abc',
        }),
      }),
    )

    expect(response?.status).toBe(429)
    await expect(response?.json()).resolves.toMatchObject({
      error: { code: 'github_rate_limited' },
    })
  })

  it('returns null for non-api routes', async () => {
    const app = createFlowBoardApiApp()
    await expect(app.handle(new Request('http://localhost:5173/'))).resolves.toBeNull()
  })

  it('rejects auth requests with invalid origin or missing payload', async () => {
    const app = createFlowBoardApiApp()

    const originResponse = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.example',
        },
        body: JSON.stringify({ repoUrl: 'https://github.com/octo/repo', pat: 'ghp_secret' }),
      }),
    )
    const payloadResponse = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify({ repoUrl: '', pat: '' }),
      }),
    )
    const missingOriginResponse = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: 'https://github.com/octo/repo', pat: 'ghp_secret' }),
      }),
    )

    expect(originResponse?.status).toBe(403)
    expect(payloadResponse?.status).toBe(400)
    expect(missingOriginResponse?.status).toBe(403)
  })

  it('returns 503 with explicit config error when FLOWBOARD_SESSION_SECRET is missing in production', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => mockResponse(200, { id: 1 }))
      .mockImplementationOnce(() => mockResponse(404))
      .mockImplementationOnce(() => mockResponse(200, {}))
      .mockImplementationOnce(() => mockResponse(200, {}))

    const app = createFlowBoardApiApp({
      config: {
        sessionTtlSeconds: 60,
        sessionSecret: null,
        cookieSecure: true,
        port: 5173,
      },
      fetchImpl: fetchMock,
    })

    const response = await app.handle(
      new Request('http://localhost:5173/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify({
          repoUrl: 'https://github.com/octo/repo',
          pat: 'ghp_secret',
        }),
      }),
    )

    expect(response?.status).toBe(503)
    await expect(response?.json()).resolves.toMatchObject({
      error: { code: 'server_misconfigured' },
    })
  })

  it('handles blob writes and deletes inside the allowlist', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => mockResponse(200, {}))
      .mockImplementationOnce(() => mockResponse(200, {}))
    const app = createFlowBoardApiApp({ fetchImpl: fetchMock })
    const record = createSessionRecord(
      app.config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
    )

    const putResponse = await app.handle(
      new Request('http://localhost:5173/api/flowboard/contents', {
        method: 'PUT',
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${record.cookieValue}`,
          Origin: 'http://localhost:5173',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'flowboard/attachments/board/card/file.bin',
          kind: 'blob',
          contentBase64: 'QUJD',
          sha: 'abc',
        }),
      }),
    )

    const deleteResponse = await app.handle(
      new Request('http://localhost:5173/api/flowboard/contents', {
        method: 'DELETE',
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${record.cookieValue}`,
          Origin: 'http://localhost:5173',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'flowboard/catalog.json',
          sha: 'abc',
        }),
      }),
    )

    expect(putResponse?.status).toBe(200)
    expect(deleteResponse?.status).toBe(204)
  })

  it('adapts web responses through the node middleware', async () => {
    const app = createFlowBoardApiApp()
    const middleware = (await import('./app')).createNodeMiddleware(app)
    const request = createFakeIncomingMessage('GET', '/api/unknown')
    const response = createFakeServerResponse()
    const next = vi.fn()

    await middleware(request, response, next)

    expect(response.statusCode).toBe(404)
    expect(next).not.toHaveBeenCalled()
  })
})

function createFakeIncomingMessage(method: string, url: string): IncomingMessage {
  return {
    method,
    url,
    headers: { host: 'localhost:5173' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.alloc(0)
    },
  } as unknown as IncomingMessage
}

function createFakeServerResponse(): ServerResponse {
  return {
    statusCode: 200,
    headersSent: false,
    setHeader() {},
    end() {},
  } as unknown as ServerResponse
}
