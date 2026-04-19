import type { CardTimeState, Column, ColumnRole, TimeBoardState } from './types'

export function roleOf(columns: Column[], columnId: string): ColumnRole | undefined {
  return columns.find((c) => c.columnId === columnId)?.role
}

function ensureCard(state: TimeBoardState, cardId: string): CardTimeState {
  const existing = state[cardId]
  if (existing) return { ...existing, completed: [...existing.completed] }
  return { cardId, completed: [] }
}

/**
 * Applies a column change for one card and updates time segments (R01–R06).
 * Same-column moves are passed with from===to for reorder only → R06 no-op on time.
 */
export function applyCardMove(
  state: TimeBoardState,
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  columns: Column[],
  nowMs: number,
): TimeBoardState {
  if (fromColumnId === toColumnId) {
    const r = roleOf(columns, fromColumnId)
    if (r === 'in_progress') {
      return { ...state }
    }
    return { ...state }
  }

  const fromRole = roleOf(columns, fromColumnId)
  const toRole = roleOf(columns, toColumnId)
  if (!fromRole || !toRole) {
    return { ...state }
  }

  const card = ensureCard(state, cardId)

  // R03: leave in_progress for anything except done → discard open segment
  if (fromRole === 'in_progress' && toRole !== 'done') {
    card.activeStartMs = undefined
  }

  // R01: in_progress → done closes segment
  if (fromRole === 'in_progress' && toRole === 'done') {
    const start = card.activeStartMs
    if (start !== undefined) {
      card.completed = [...card.completed, { startMs: start, endMs: nowMs }]
    }
    card.activeStartMs = undefined
  }

  // Enter in_progress from a different column → new segment (R02/R05)
  if (toRole === 'in_progress' && fromRole !== 'in_progress') {
    card.activeStartMs = nowMs
  }

  // R04: backlog → done does not create a segment (no in_progress leg)
  if (fromRole === 'backlog' && toRole === 'done') {
    card.activeStartMs = undefined
  }

  return {
    ...state,
    [cardId]: card,
  }
}

/** R06: explicit no-op for reorder within in_progress column. */
export function reorderWithinColumn(
  state: TimeBoardState,
  columnRole: ColumnRole,
): TimeBoardState {
  if (columnRole === 'in_progress') {
    return { ...state }
  }
  return { ...state }
}

export function totalCompletedMs(card: CardTimeState): number {
  return card.completed.reduce((acc, s) => acc + (s.endMs - s.startMs), 0)
}
