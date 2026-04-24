// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildExpiredSessionCookie,
  buildSessionCookie,
  isTrustedOrigin,
  loadServerConfig,
  parseCookies,
  readJsonBody,
  sanitizeFlowBoardPath,
} from './security'

describe('server/security', () => {
  it('loads server-only config with defaults', () => {
    expect(loadServerConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      sessionTtlSeconds: 43200,
      cookieSecure: false,
      port: 5173,
    })
  })

  it('respects explicit secure cookie and ttl configuration', () => {
    expect(
      loadServerConfig({
        FLOWBOARD_SESSION_TTL_SECONDS: '60',
        FLOWBOARD_COOKIE_SECURE: 'true',
        PORT: '4321',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({
      sessionTtlSeconds: 60,
      cookieSecure: true,
      port: 4321,
    })
  })

  it('builds and expires session cookies', () => {
    const config = loadServerConfig({
      FLOWBOARD_COOKIE_SECURE: 'true',
    } as NodeJS.ProcessEnv)
    expect(buildSessionCookie('abc', config)).toContain('HttpOnly')
    expect(buildSessionCookie('abc', config)).toContain('Secure')
    expect(buildExpiredSessionCookie(config)).toContain('Max-Age=0')
  })

  it('parses cookies and validates allowed paths', () => {
    expect(parseCookies('a=1; fb_session=xyz')).toMatchObject({ a: '1', fb_session: 'xyz' })
    expect(sanitizeFlowBoardPath('flowboard/catalog.json')).toBe('flowboard/catalog.json')
    expect(sanitizeFlowBoardPath('flowboard/boards/board-1.json')).toBe('flowboard/boards/board-1.json')
    expect(sanitizeFlowBoardPath('flowboard/attachments/b/c/file.bin')).toBe(
      'flowboard/attachments/b/c/file.bin',
    )
    expect(sanitizeFlowBoardPath('../secrets.txt')).toBeNull()
    expect(sanitizeFlowBoardPath('README.md')).toBeNull()
  })

  it('trusts same-origin unsafe requests and reads json payloads', async () => {
    const request = new Request('http://localhost:5173/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({ ok: true }),
    })
    expect(isTrustedOrigin(request)).toBe(true)
    await expect(readJsonBody<{ ok: boolean }>(request)).resolves.toEqual({ ok: true })
  })

  it('rejects cross-origin unsafe requests', () => {
    const request = new Request('http://localhost:5173/api/auth/session', {
      method: 'DELETE',
      headers: {
        Origin: 'https://evil.example',
      },
    })
    expect(isTrustedOrigin(request)).toBe(false)
  })

  it('rejects unsafe requests when Origin header is missing', () => {
    const request = new Request('http://localhost:5173/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true }),
    })
    expect(isTrustedOrigin(request)).toBe(false)
  })
})
