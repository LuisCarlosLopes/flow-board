import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearActiveBoardId, loadActiveBoardId, saveActiveBoardId } from './boardSelectionStore'
import type { FlowBoardSession } from './sessionStore'

function makeSession(owner: string, repo: string): FlowBoardSession {
  return {
    pat: 'ghp_test',
    repoUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    apiBase: '/api/github',
    webUrl: `https://github.com/${owner}/${repo}`,
  }
}

describe('boardSelectionStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists and loads boardId for the same repo', () => {
    const s = makeSession('acme', 'flow')
    expect(loadActiveBoardId(s)).toBeNull()
    saveActiveBoardId(s, 'board-123')
    expect(loadActiveBoardId(s)).toBe('board-123')
  })

  it('namespaces selection by owner/repo', () => {
    const a = makeSession('acme', 'flow')
    const b = makeSession('acme', 'other')
    saveActiveBoardId(a, 'board-a')
    saveActiveBoardId(b, 'board-b')
    expect(loadActiveBoardId(a)).toBe('board-a')
    expect(loadActiveBoardId(b)).toBe('board-b')
  })

  it('clears selection for a repo', () => {
    const s = makeSession('acme', 'flow')
    saveActiveBoardId(s, 'board-123')
    clearActiveBoardId(s)
    expect(loadActiveBoardId(s)).toBeNull()
  })

  it('treats empty/blank boardId as cleared', () => {
    const s = makeSession('acme', 'flow')
    saveActiveBoardId(s, '   ')
    expect(loadActiveBoardId(s)).toBeNull()
  })

  it('is a no-op when localStorage is unavailable', () => {
    const s = makeSession('acme', 'flow')
    const original = globalThis.localStorage
    vi.stubGlobal('localStorage', undefined as unknown as Storage)
    try {
      expect(loadActiveBoardId(s)).toBeNull()
      expect(() => saveActiveBoardId(s, 'board-123')).not.toThrow()
      expect(() => clearActiveBoardId(s)).not.toThrow()
    } finally {
      vi.stubGlobal('localStorage', original)
    }
  })
})

