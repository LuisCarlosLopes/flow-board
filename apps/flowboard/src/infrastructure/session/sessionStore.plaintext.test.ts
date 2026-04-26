import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sessionPatCrypto', () => ({
  hasPatEncryptionKey: vi.fn(() => false),
  encryptPat: async () => {
    throw new Error('encryptPat should not run without key')
  },
  decryptPat: async () => {
    throw new Error('decryptPat should not run without key')
  },
}))

import { clearSession, createSession, loadSessionAsync, saveSessionAsync } from './sessionStore'

const STORAGE_KEY = 'flowboard.session.v1'

describe('sessionStore plaintext (no FLOWBOARD_PAT_KEY)', () => {
  afterEach(() => {
    clearSession()
  })

  it('clears v2 sealed session when key is absent', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 2,
        patEnc: { iv: 'AAAAAAAAAAAA', ct: 'BBBBBBBB' },
        owner: 'a',
        repo: 'b',
        apiBase: 'https://api.github.com',
        webUrl: 'https://github.com/a/b',
        repoUrl: 'https://github.com/a/b',
      }),
    )
    expect(await loadSessionAsync()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('persists v1 with literal pat string when key is absent', async () => {
    const s = createSession('ghp_plain', 'https://github.com/a/b', {
      owner: 'a',
      repo: 'b',
      apiBase: 'https://api.github.com',
      webUrl: 'https://github.com/a/b',
    })
    await saveSessionAsync(s)
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''
    const o = JSON.parse(raw) as { v?: number; pat: string; patEnc?: unknown }
    expect(o.pat).toBe('ghp_plain')
    expect(o.v).toBe(1)
    expect(o.patEnc).toBeUndefined()
    const loaded = await loadSessionAsync()
    expect(loaded?.pat).toBe('ghp_plain')
  })
})
