import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, createSession, loadSession, saveSession } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v2'
const LEGACY_STORAGE_KEY = 'flowboard.session.v1'

const user = {
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
}

describe('sessionStore', () => {
  afterEach(() => {
    clearSession()
  })

  it('round-trips session', () => {
    const s = createSession(
      'https://github.com/a/b',
      {
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
      },
      user,
    )
    saveSession(s)
    const loaded = loadSession()
    expect(loaded?.owner).toBe('a')
    expect(loaded?.user.login).toBe('octocat')
  })

  it('clear removes session and legacy PAT storage', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ pat: 'ghp_legacy' }))
    saveSession(
      createSession(
        'u',
        {
          owner: 'a',
          repo: 'b',
          webUrl: 'https://github.com/a/b',
        },
        user,
      ),
    )
    clearSession()
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
  })

  it('clears storage when JSON is not a valid session object', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears storage when required fields are missing', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
        repoUrl: '',
        user: {
          login: '',
          name: null,
          avatar_url: '',
        },
      }),
    )
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('removes insecure legacy storage on load', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ pat: 'ghp_x' }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        owner: 'a',
        repo: 'b',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
        user,
      }),
    )
    const loaded = loadSession()
    expect(loaded?.owner).toBe('a')
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
  })
})
