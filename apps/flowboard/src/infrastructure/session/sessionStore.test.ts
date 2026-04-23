import { afterEach, describe, expect, it } from 'vitest'
import { buildSessionFromAuthApi, clearSession, evictLegacyPatFromStorage, loadSession } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v1'

const sampleAuth = {
  profile: { login: 'a', name: 'A', avatar_url: 'https://a' },
  repository: {
    owner: 'a',
    repo: 'b',
    repoUrl: 'https://github.com/a/b',
    webUrl: 'https://github.com/a/b',
    apiBase: 'https://api.github.com',
  },
} as const

describe('sessionStore', () => {
  afterEach(() => {
    clearSession()
  })

  it('buildSessionFromAuthApi builds a session without pat', () => {
    const s = buildSessionFromAuthApi(sampleAuth)
    expect(s.owner).toBe('a')
    expect(s.repo).toBe('b')
  })

  it('loadSession always returns null (BFF is source of truth)', () => {
    expect(loadSession()).toBeNull()
  })

  it('evictLegacyPatFromStorage removes localStorage that contained pat', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pat: 'ghp_x',
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    evictLegacyPatFromStorage()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
