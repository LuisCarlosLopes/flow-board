import { describe, expect, it, vi } from 'vitest'
import { AuthGateway } from './authGateway'

function mockResponse(status: number, body?: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as Promise<Response>
}

describe('AuthGateway', () => {
  it('returns public session on login', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      mockResponse(201, {
        session: {
          owner: 'octo',
          repo: 'repo',
          repoUrl: 'https://github.com/octo/repo',
          webUrl: 'https://github.com/octo/repo',
          authenticated: true,
        },
      }),
    )

    const gateway = new AuthGateway(fetchMock)
    const session = await gateway.createSession('https://github.com/octo/repo', 'ghp_secret')

    expect(session).toEqual({
      owner: 'octo',
      repo: 'repo',
      repoUrl: 'https://github.com/octo/repo',
      webUrl: 'https://github.com/octo/repo',
      authenticated: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })

  it('throws sanitized API errors', async () => {
    const gateway = new AuthGateway(
      vi.fn().mockImplementation(() =>
        mockResponse(401, {
          error: { message: 'Sessão inválida.' },
        }),
      ),
    )

    await expect(gateway.getSession()).rejects.toMatchObject({
      status: 401,
      message: 'Sessão inválida.',
    })
  })

  it('supports idempotent logout', async () => {
    const gateway = new AuthGateway(vi.fn().mockImplementation(() => mockResponse(204)))
    await expect(gateway.deleteSession()).resolves.toBeUndefined()
  })

  it('falls back to default API message when error payload is not json', async () => {
    const gateway = new AuthGateway(
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: async () => {
          throw new Error('invalid json')
        },
      }),
    )

    await expect(gateway.deleteSession()).rejects.toMatchObject({
      status: 500,
      message: 'FlowBoard API 500',
    })
  })
})
