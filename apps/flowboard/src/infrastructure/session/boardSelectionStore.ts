import type { FlowBoardSession } from './sessionStore'

const STORAGE_PREFIX = 'flowboard.activeBoard.v1'

function keyForSession(session: FlowBoardSession): string {
  return `${STORAGE_PREFIX}:${session.owner}/${session.repo}`
}

export function loadActiveBoardId(session: FlowBoardSession): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(keyForSession(session))
    if (!raw) {
      return null
    }
    const v = JSON.parse(raw) as unknown
    return typeof v === 'string' && v.trim() ? v : null
  } catch {
    return null
  }
}

export function saveActiveBoardId(session: FlowBoardSession, boardId: string | null): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  const k = keyForSession(session)
  try {
    if (boardId == null || !boardId.trim()) {
      localStorage.removeItem(k)
      return
    }
    localStorage.setItem(k, JSON.stringify(boardId))
  } catch {
    // Ignore storage failures (ex.: private mode / quota)
  }
}

export function clearActiveBoardId(session: FlowBoardSession): void {
  saveActiveBoardId(session, null)
}

