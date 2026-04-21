import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, createSession, loadSession, saveSession } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v1'

describe('sessionStore', () => {
  afterEach(() => {
    clearSession()
  })

  it('round-trips session', () => {
    const s = createSession('ghp_x', 'https://github.com/a/b', {
      owner: 'a',
      repo: 'b',
      apiBase: 'https://api.github.com',
      webUrl: 'https://github.com/a/b',
    })
    saveSession(s)
    const loaded = loadSession()
    expect(loaded?.owner).toBe('a')
    expect(loaded?.pat).toBe('ghp_x')
  })

  it('clear removes session', () => {
    saveSession(
      createSession('t', 'u', {
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
      }),
    )
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('clears storage when JSON is not a valid session object', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadSession()).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when pat or owner/repo missing', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pat: '',
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(loadSession()).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when apiBase was tampered', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pat: 'ghp_x',
        owner: 'a',
        repo: 'b',
        apiBase: 'https://evil.example',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(loadSession()).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
