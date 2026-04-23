import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAuthenticatedUser, loginWithPat, logoutSession, restoreAuthenticatedSession } from './authApi'

function mockJsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('authApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs in and returns authenticated user payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(200, {
        login: 'octocat',
        name: 'The Octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
      }),
    )

    const user = await loginWithPat({
      repoUrl: 'https://github.com/octo/flowboard-data',
      pat: 'ghp_secret',
    })

    expect(user.login).toBe('octocat')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      }),
    )
  })

  it('returns null when authenticated user route responds 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse(401, { message: 'unauthorized' }))

    await expect(fetchAuthenticatedUser()).resolves.toBeNull()
  })

  it('restores authenticated session snapshot', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(200, {
        repoUrl: 'https://github.com/octo/flowboard-data',
        owner: 'octo',
        repo: 'flowboard-data',
        webUrl: 'https://github.com/octo/flowboard-data',
        user: {
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/1',
        },
      }),
    )

    await expect(restoreAuthenticatedSession()).resolves.toEqual({
      repoUrl: 'https://github.com/octo/flowboard-data',
      owner: 'octo',
      repo: 'flowboard-data',
      webUrl: 'https://github.com/octo/flowboard-data',
      user: {
        login: 'octocat',
        name: 'The Octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
      },
    })
  })

  it('throws AuthApiError when logout fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(500, {
        message: 'boom',
      }),
    )

    await expect(logoutSession()).rejects.toEqual(
      expect.objectContaining({
        name: 'AuthApiError',
        status: 500,
      }),
    )
  })
})
