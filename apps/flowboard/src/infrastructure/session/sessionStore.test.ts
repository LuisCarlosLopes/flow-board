import { afterEach, describe, expect, it } from 'vitest'
import { clearSession, createSession, loadSession, saveSession } from './sessionStore'

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
})
