import { afterEach, describe, expect, it } from 'vitest'
import { clearLegacyPatStorage, sessionFromApiPayload } from './sessionStore'

const LEGACY_KEY = 'flowboard.session.v1'

describe('sessionStore', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('sessionFromApiPayload returns FlowBoardSession without pat', () => {
    const s = sessionFromApiPayload({
      session: {
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      },
    })
    expect(s.owner).toBe('a')
    expect(s.repo).toBe('b')
  })

  it('clearLegacyPatStorage removes legacy snapshot that had pat', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({
        pat: 'ghp_x',
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    clearLegacyPatStorage()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('clearLegacyPatStorage also clears from sessionStorage', () => {
    sessionStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({
        pat: 'ghp_x',
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    clearLegacyPatStorage()
    expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull()
  })
})
