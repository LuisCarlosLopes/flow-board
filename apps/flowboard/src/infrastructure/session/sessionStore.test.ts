import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, createSession, hasPersistedSession, loadSession, loadSessionAsync, saveSession, saveSessionAsync } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v1'

describe('sessionStore', () => {
  afterEach(() => {
    clearSession()
    localStorage.clear()
  })

  it('round-trips session (sem pat)', () => {
    const s = createSession('https://github.com/a/b', {
      owner: 'a',
      repo: 'b',
      webUrl: 'https://github.com/a/b',
    })
    saveSession(s)
    const loaded = loadSession()
    expect(loaded?.owner).toBe('a')
    expect(loaded?.apiBase).toBe('/api/github')
    // PAT nunca deve estar na sessão armazenada
    expect(loaded).not.toHaveProperty('pat')
  })

  it('async wrappers round-trip session', async () => {
    const s = createSession('https://github.com/a/b', {
      owner: 'a',
      repo: 'b',
      webUrl: 'https://github.com/a/b',
    })
    await saveSessionAsync(s)
    const loaded = await loadSessionAsync()
    expect(loaded?.owner).toBe('a')
    expect(loaded?.apiBase).toBe('/api/github')
    expect(loaded).not.toHaveProperty('pat')
  })

  it('clear removes session', () => {
    saveSession(
      createSession('https://github.com/a/b', {
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
      }),
    )
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('clears storage when JSON is not a valid session object', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when owner or repo is missing', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        owner: '',
        repo: 'b',
        apiBase: '/api/github',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears legacy sessions with direct GitHub apiBase (forces re-login for security)', () => {
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
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when apiBase is not the BFF proxy path', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        owner: 'a',
        repo: 'b',
        apiBase: 'https://evil.example',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('hasPersistedSession returns false when no session', () => {
    expect(hasPersistedSession()).toBe(false)
  })

  it('hasPersistedSession returns true after saving valid session', () => {
    saveSession(
      createSession('https://github.com/a/b', {
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
      }),
    )
    expect(hasPersistedSession()).toBe(true)
  })

  it('hasPersistedSession returns false for tampered apiBase', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        owner: 'a',
        repo: 'b',
        apiBase: 'https://evil.example',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(hasPersistedSession()).toBe(false)
  })
})
