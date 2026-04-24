import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, createSession, loadSession, saveSession } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v1'

describe('sessionStore', () => {
  afterEach(() => {
    clearSession()
  })

  it('round-trips session', () => {
    const s = createSession({
      owner: 'a',
      repo: 'b',
      repoUrl: 'https://github.com/a/b',
      webUrl: 'https://github.com/a/b',
    })
    saveSession(s)
    const loaded = loadSession()
    expect(loaded?.owner).toBe('a')
    expect(loaded?.authenticated).toBe(true)
  })

  it('clear removes session', () => {
    saveSession(createSession({ owner: 'a', repo: 'b', repoUrl: 'u', webUrl: 'https://github.com/a/b' }))
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('clears storage when JSON is not a valid session object', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when public session is invalid', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
        authenticated: false,
      }),
    )
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears localStorage when legacy session still contains pat', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pat: 'ghp_x',
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
        authenticated: true,
      }),
    )
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears legacy session from sessionStorage instead of migrating it', () => {
    const payload = JSON.stringify({
      pat: 'ghp_x',
      owner: 'a',
      repo: 'b',
      webUrl: 'https://github.com/a/b',
      repoUrl: 'https://github.com/a/b',
      authenticated: true,
    })
    sessionStorage.setItem(STORAGE_KEY, payload)
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('keeps public session untouched when sessionStorage is clean', () => {
    const payload = JSON.stringify(
      createSession({
        owner: 'a',
        repo: 'b',
        repoUrl: 'https://github.com/a/b',
        webUrl: 'https://github.com/a/b',
      }),
    )
    localStorage.setItem(STORAGE_KEY, payload)
    expect(loadSession()).toEqual(JSON.parse(payload))
  })
})
