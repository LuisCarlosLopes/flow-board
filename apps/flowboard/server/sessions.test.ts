// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSessionRecord, readSessionRecord } from './sessions'
import { loadServerConfig } from './security'

describe('server/sessions', () => {
  it('seals and restores a session record from the cookie value', () => {
    const config = loadServerConfig({
      FLOWBOARD_SESSION_SECRET: 'test-secret',
    } as NodeJS.ProcessEnv)

    const record = createSessionRecord(
      config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
      () => 0,
    )

    const restored = readSessionRecord(config, record.cookieValue, () => 1_000)
    expect(restored).toMatchObject({
      token: 'ghp_secret',
      session: {
        owner: 'octo',
        repo: 'repo',
        authenticated: true,
      },
    })
  })

  it('returns null for tampered or expired cookies', () => {
    const config = loadServerConfig({
      FLOWBOARD_SESSION_SECRET: 'test-secret',
      FLOWBOARD_SESSION_TTL_SECONDS: '1',
    } as NodeJS.ProcessEnv)
    const record = createSessionRecord(
      config,
      {
        owner: 'octo',
        repo: 'repo',
        repoUrl: 'https://github.com/octo/repo',
        webUrl: 'https://github.com/octo/repo',
      },
      'ghp_secret',
      () => 0,
    )

    expect(readSessionRecord(config, `${record.cookieValue}.tampered`, () => 0)).toBeNull()
    expect(readSessionRecord(config, record.cookieValue, () => 2_000)).toBeNull()
  })
})
