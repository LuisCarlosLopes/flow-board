import { describe, expect, it, vi } from 'vitest'
import { FlowBoardGitHubGateway } from './flowBoardGitHubGateway'

function mockResponse(status: number, body?: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
  }) as Promise<Response>
}

describe('FlowBoardGitHubGateway', () => {
  it('uses same-origin API with credentials include', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      mockResponse(200, { sha: 'abc', json: { ok: true } }),
    )
    const gateway = new FlowBoardGitHubGateway(fetchMock)

    const result = await gateway.tryGetFileJson('flowboard/catalog.json')

    expect(result).toEqual({ sha: 'abc', json: { ok: true } })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/flowboard/contents')
  })

  it('returns null on 404 for try-get', async () => {
    const gateway = new FlowBoardGitHubGateway(vi.fn().mockImplementation(() => mockResponse(404)))
    expect(await gateway.tryGetFileJson('flowboard/catalog.json')).toBeNull()
  })

  it('sends writes through same-origin API', async () => {
    const fetchMock = vi.fn().mockImplementation(() => mockResponse(200, { ok: true }))
    const gateway = new FlowBoardGitHubGateway(fetchMock)

    await gateway.putFileJson('flowboard/catalog.json', { schemaVersion: 1 }, 'abc')
    await gateway.deleteFile('flowboard/catalog.json', 'abc')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.any(URL),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.any(URL),
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      }),
    )
  })

  it('maps sanitized API errors to GitHubHttpError', async () => {
    const gateway = new FlowBoardGitHubGateway(
      vi.fn().mockImplementation(() =>
        mockResponse(429, {
          error: { message: 'Rate limited', retryAfterMs: 2000 },
        }),
      ),
    )

    await expect(gateway.putFileJson('flowboard/catalog.json', {}, 'abc')).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 2000,
    })
  })

  it('loads raw blobs and validates malformed payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => mockResponse(200, { sha: 'blob-1', contentBase64: 'QUJD' }))
      .mockImplementationOnce(() => mockResponse(200, { sha: 1, contentBase64: 'QUJD' }))
    const gateway = new FlowBoardGitHubGateway(fetchMock)

    await expect(gateway.getFileRaw('flowboard/attachments/a/b/file.bin')).resolves.toEqual({
      sha: 'blob-1',
      contentBase64: 'QUJD',
    })
    await expect(gateway.getFileRaw('flowboard/attachments/a/b/file.bin')).rejects.toThrow(
      'Resposta inválida do FlowBoard API.',
    )
  })

  it('handles delete no-content responses and non-json success payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 204,
          ok: true,
          headers: { get: () => null },
          json: async () => {
            throw new Error('no body')
          },
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          headers: { get: () => 'text/plain' },
          json: async () => {
            throw new Error('no json')
          },
        }),
      )
    const gateway = new FlowBoardGitHubGateway(fetchMock as typeof fetch)

    await expect(gateway.deleteFile('flowboard/catalog.json', 'abc')).resolves.toBeUndefined()
    await expect(gateway.putFileJson('flowboard/catalog.json', {}, 'abc')).resolves.toBeUndefined()
  })
})
