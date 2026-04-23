// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createBff } from './bffApp.js'

// Set the secret before any session operations (sessionPassword() reads it at call time).
process.env.FLOWBOARD_SESSION_SECRET = 'test-session-secret-value-at-least-32-chars-long!!'
// Ensure we are not in production so missing env does not throw during test setup.
process.env.NODE_ENV = 'test'

// Capture real fetch before any stubs so test requests to the local server always work.
const realFetch = globalThis.fetch

let server: Server
let baseUrl: string

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = createServer(createBff())
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number }
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    }),
)

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((e) => (e ? reject(e) : resolve()))
    }),
)

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockResponse = {
  status: number
  ok?: boolean
  json?: () => Promise<unknown>
  text?: () => Promise<string>
  headers?: { get: (name: string) => string | null }
}

/**
 * Stubs `globalThis.fetch` so that calls to `https://api.github.com` return
 * the provided mock responses in order. All other URLs (e.g. the local test
 * server) are forwarded to the real fetch captured before any stubs.
 */
function mockGithubFetch(responses: MockResponse[]): void {
  let idx = 0
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const u = String(url instanceof Request ? (url as Request).url : url)
      if (!u.startsWith('https://api.github.com')) {
        return realFetch(u, init)
      }
      const resp = responses[idx++] ?? { status: 500, ok: false }
      return Promise.resolve(resp)
    }),
  )
}

/** GitHub API mock responses for a complete, happy-path login. */
function githubSuccessResponses(): MockResponse[] {
  return [
    // 1. POST /api/auth/login → GET https://api.github.com/user
    {
      status: 200,
      ok: true,
      json: async () => ({
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
      }),
    },
    // 2. GitHubContentsClient.verifyRepositoryAccess → GET /repos/testowner/testrepo
    { status: 200, ok: true },
    // 3. bootstrapFlowBoardData → tryGetFileJson(catalog.json) → 404 (empty repo)
    { status: 404, ok: false },
    // 4. bootstrapFlowBoardData → putFileJson(board file)
    { status: 200, ok: true },
    // 5. bootstrapFlowBoardData → putFileJson(catalog.json)
    { status: 200, ok: true },
  ]
}

const VALID_LOGIN_BODY = {
  pat: 'ghp_test_token_12345',
  repoUrl: 'https://github.com/testowner/testrepo',
}

/** Does a full successful login and returns the raw Set-Cookie header value. */
async function loginAndGetCookie(): Promise<string> {
  mockGithubFetch(githubSuccessResponses())
  const r = await realFetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(VALID_LOGIN_BODY),
  })
  expect(r.status).toBe(201)
  vi.unstubAllGlobals()
  const cookie = r.headers.get('set-cookie') ?? ''
  expect(cookie).toBeTruthy()
  return cookie
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  it('returns 400 INVALID_BODY when body is empty', async () => {
    const r = await realFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(r.status).toBe(400)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when pat is missing', async () => {
    const r = await realFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: 'https://github.com/owner/repo' }),
    })
    expect(r.status).toBe(400)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when repoUrl is missing', async () => {
    const r = await realFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pat: 'ghp_test' }),
    })
    expect(r.status).toBe(400)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_BODY')
  })

  it('returns 401 INVALID_TOKEN when GitHub rejects the PAT', async () => {
    mockGithubFetch([{ status: 401, ok: false }])
    const r = await realFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_LOGIN_BODY),
    })
    expect(r.status).toBe(401)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('returns 201 and sets a session cookie on successful login', async () => {
    mockGithubFetch(githubSuccessResponses())
    const r = await realFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_LOGIN_BODY),
    })
    expect(r.status).toBe(201)
    expect(r.headers.get('set-cookie')).toBeTruthy()
  })

  it('returns 409 SESSION_ACTIVE when session already has a PAT', async () => {
    const cookie = await loginAndGetCookie()

    // Second login with the existing session cookie — no GitHub call needed.
    const r = await realFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(VALID_LOGIN_BODY),
    })
    expect(r.status).toBe(409)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('SESSION_ACTIVE')
  })
})

// ---------------------------------------------------------------------------
// GET /api/auth/session
// ---------------------------------------------------------------------------

describe('GET /api/auth/session', () => {
  it('returns 401 UNAUTHORIZED when no session cookie is present', async () => {
    const r = await realFetch(`${baseUrl}/api/auth/session`)
    expect(r.status).toBe(401)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 200 with profile and repository data when authenticated', async () => {
    const cookie = await loginAndGetCookie()

    const r = await realFetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: cookie },
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      profile: { login: string }
      repository: { owner: string; repo: string }
    }
    expect(body.profile.login).toBe('testuser')
    expect(body.repository.owner).toBe('testowner')
    expect(body.repository.repo).toBe('testrepo')
  })
})

// ---------------------------------------------------------------------------
// GET /api/github/*
// ---------------------------------------------------------------------------

describe('GET /api/github/*', () => {
  it('returns 401 UNAUTHORIZED when no session cookie is present', async () => {
    const r = await realFetch(`${baseUrl}/api/github/repos/owner/repo/contents/file.json`)
    expect(r.status).toBe(401)
    const body = (await r.json()) as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('proxies the request to GitHub API when authenticated', async () => {
    const cookie = await loginAndGetCookie()

    // Mock GitHub API response for the proxied call.
    const fileContent = JSON.stringify({ hello: 'world' })
    mockGithubFetch([
      {
        status: 200,
        ok: true,
        text: async () => fileContent,
        headers: { get: () => null },
      },
    ])

    const r = await realFetch(`${baseUrl}/api/github/repos/testowner/testrepo/contents/file.json`, {
      headers: { Cookie: cookie },
    })
    expect(r.status).toBe(200)
  })
})
