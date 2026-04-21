import { describe, expect, it, vi } from 'vitest'
import { GitHubContentsClient } from '../github/client'
import { createBoardEntry, createBoardRepository } from './boardRepository'
import { boardFilePath } from './boardFactory'

describe('createBoardRepository', () => {
  it('loadCatalog returns empty when 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      headers: { get: () => null },
      json: async () => ({}),
    })
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    const repo = createBoardRepository(client)
    const { catalog, sha } = await repo.loadCatalog()
    expect(catalog.boards).toEqual([])
    expect(sha).toBeNull()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('parses catalog when present', async () => {
    const cat = { schemaVersion: 1, boards: [{ boardId: 'b1', title: 'T', dataPath: boardFilePath('b1') }] }
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(cat))))
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => ({ sha: 'aaa', content: b64, encoding: 'base64' }),
    })
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    const repo = createBoardRepository(client)
    const { catalog, sha } = await repo.loadCatalog()
    expect(sha).toBe('aaa')
    expect(catalog.boards).toHaveLength(1)
    expect(String(fetchMock.mock.calls[0]![0])).toContain('contents')
  })

  it('throws when catalog boards entry is invalid', async () => {
    const cat = { schemaVersion: 1, boards: [{ boardId: '', title: 'T', dataPath: 'flowboard/boards/x.json' }] }
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(cat))))
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => ({ sha: 'aaa', content: b64, encoding: 'base64' }),
    })
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    const repo = createBoardRepository(client)
    await expect(repo.loadCatalog()).rejects.toThrow('catalog.json inválido')
  })

  it('throws when board document is missing required arrays', async () => {
    const doc = {
      schemaVersion: 1,
      boardId: 'b1',
      title: 'T',
      columns: [],
      cards: [],
      timeSegments: [],
      cardTimeState: {},
    }
    delete (doc as { columns?: unknown }).columns
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(doc))))
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => ({ sha: 'bbb', content: b64, encoding: 'base64' }),
    })
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    const repo = createBoardRepository(client)
    await expect(repo.loadBoard('b1')).rejects.toThrow('board.json inválido')
  })
})

describe('createBoardEntry', () => {
  it('writes board then catalog', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        calls.push(String(url))
        return Promise.resolve({ status: 200, ok: true, headers: { get: () => null }, json: async () => ({}) })
      }
      if (String(url).includes('catalog.json')) {
        return Promise.resolve({
          status: 404,
          ok: false,
          headers: { get: () => null },
          json: async () => ({}),
        })
      }
      return Promise.resolve({
        status: 404,
        ok: false,
        headers: { get: () => null },
        json: async () => ({}),
      })
    })
    const client = new GitHubContentsClient({
      token: 't',
      owner: 'o',
      repo: 'r',
      fetchImpl: fetchMock,
    })
    const repo = createBoardRepository(client)
    await createBoardEntry(repo, 'Alpha')
    expect(calls.length).toBe(2)
    expect(calls[0]).toContain('boards')
    expect(calls[1]).toContain('catalog.json')
  })
})
