// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { GitHubContentsService } from './githubContentsService'

function mockResponse(status: number, body?: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  }) as unknown as Promise<Response>
}

describe('GitHubContentsService', () => {
  it('uses session scope to verify repository access', async () => {
    const fetchMock = vi.fn().mockImplementation(() => mockResponse(200, { id: 1 }))
    const service = new GitHubContentsService(
      {
        cookieValue: 'sealed',
        token: 'ghp_secret',
        expiresAtMs: Date.now() + 1000,
        session: {
          owner: 'octo',
          repo: 'repo',
          repoUrl: 'https://github.com/octo/repo',
          webUrl: 'https://github.com/octo/repo',
          authenticated: true,
        },
      },
      fetchMock,
    )

    await service.verifyRepositoryAccess()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/octo/repo',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ghp_secret',
        }),
      }),
    )
  })

  it('forwards json, blob, put and delete operations through the GitHub client', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        mockResponse(200, {
          sha: 'j1',
          content: btoa(JSON.stringify({ schemaVersion: 1, boards: [] })),
          encoding: 'base64',
        }),
      )
      .mockImplementationOnce(() =>
        mockResponse(200, { sha: 'b1', content: btoa('hello'), encoding: 'base64' }),
      )
      .mockImplementationOnce(() => mockResponse(200, {}))
      .mockImplementationOnce(() => mockResponse(200, {}))
      .mockImplementationOnce(() => mockResponse(200, {}))
    const service = new GitHubContentsService(
      {
        cookieValue: 'sealed',
        token: 'ghp_secret',
        expiresAtMs: Date.now() + 1000,
        session: {
          owner: 'octo',
          repo: 'repo',
          repoUrl: 'https://github.com/octo/repo',
          webUrl: 'https://github.com/octo/repo',
          authenticated: true,
        },
      },
      fetchMock,
    )

    await expect(service.getFileJson('flowboard/catalog.json')).resolves.toMatchObject({ sha: 'j1' })
    await expect(service.getFileRaw('flowboard/attachments/a/b/file.bin')).resolves.toMatchObject({ sha: 'b1' })
    await expect(
      service.putFileJson('flowboard/catalog.json', { schemaVersion: 1, boards: [] }, 'sha-1'),
    ).resolves.toBeUndefined()
    await expect(service.putFileBase64('flowboard/attachments/a/b/file.bin', 'QUJD', 'sha-2')).resolves.toBeUndefined()
    await expect(service.deleteFile('flowboard/catalog.json', 'sha-3')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})
