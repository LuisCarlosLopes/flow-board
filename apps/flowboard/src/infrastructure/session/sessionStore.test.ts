import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, createSession, hasPersistedSession, loadSessionAsync, saveSessionAsync } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v1'

describe('sessionStore', () => {
  afterEach(() => {
    clearSession()
    localStorage.clear()
  })

  it('round-trips session (encrypted in test mode when key is set)', async () => {
    const s = createSession('ghp_x', 'https://github.com/a/b', {
      owner: 'a',
      repo: 'b',
      webUrl: 'https://github.com/a/b',
    })
    await saveSessionAsync(s)
    const loaded = await loadSessionAsync()
    expect(loaded?.owner).toBe('a')
    expect(loaded?.apiBase).toBe('/api/github')
    expect(loaded?.pat).toBe('ghp_x')
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''
    expect(raw).toContain('patEnc')
    expect(raw).not.toContain('ghp_x')
  })

  it('clear removes session', async () => {
    await saveSessionAsync(
      createSession('t', 'u', {
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
      }),
    )
    clearSession()
    expect(await loadSessionAsync()).toBeNull()
  })

  it('clears storage when JSON is not a valid session object', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(await loadSessionAsync()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when pat or owner/repo missing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pat: '',
        owner: 'a',
        repo: 'b',
        apiBase: '/api/github',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(await loadSessionAsync()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when apiBase was tampered', async () => {
    localStorage.setItem(
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
    expect(await loadSessionAsync()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('migrates legacy session from sessionStorage to localStorage', async () => {
    const payload = JSON.stringify({
      pat: 'ghp_x',
      owner: 'a',
      repo: 'b',
      apiBase: 'https://api.github.com',
      webUrl: 'https://github.com/a/b',
      repoUrl: 'https://github.com/a/b',
    })
    sessionStorage.setItem(STORAGE_KEY, payload)
    const loaded = await loadSessionAsync()
    expect(loaded?.owner).toBe('a')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload)
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('hasPersistedSession is true for plaintext and sealed payloads', async () => {
    expect(hasPersistedSession()).toBe(false)
    const plain = {
      pat: 'ghp_x',
      owner: 'a',
      repo: 'b',
      apiBase: 'https://api.github.com',
      webUrl: 'https://github.com/a/b',
      repoUrl: 'https://github.com/a/b',
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plain))
    expect(hasPersistedSession()).toBe(true)
    clearSession()
    await saveSessionAsync(
      createSession('ghp_y', 'https://github.com/a/b', {
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
      }),
    )
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''
    expect(raw).toContain('patEnc')
    expect(hasPersistedSession()).toBe(true)
  })
})
