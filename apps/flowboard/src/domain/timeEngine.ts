import type { BoardWorkingHours, Card, CardTimeState, Column, ColumnRole, TimeBoardState } from './types'
import { materializeCountableIntervals, partitionActiveWork, snapStartForEnteringInProgress } from './workingHours'

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
  wh?: BoardWorkingHours | null,
): TimeBoardState {
  if (fromColumnId === toColumnId) {
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

  // R01: in_progress → done closes segment(s) via pipeline dia → janela
  if (fromRole === 'in_progress' && toRole === 'done') {
    const start = card.activeStartMs
    if (start !== undefined) {
      const segs = materializeCountableIntervals(start, nowMs, wh)
      card.completed = [...card.completed, ...segs]
    }
    card.activeStartMs = undefined
  }

  // Enter in_progress from a different column → new segment (R02/R05)
  if (toRole === 'in_progress' && fromRole !== 'in_progress') {
    card.activeStartMs = snapStartForEnteringInProgress(nowMs, wh)
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

/** D2: card fora de in_progress não mantém activeStartMs. */
export function reconcileTimeStateWithCardPositions(
  cards: Card[],
  columns: Column[],
  state: TimeBoardState,
): TimeBoardState {
  const next = { ...state }
  for (const card of cards) {
    const role = roleOf(columns, card.columnId)
    if (role !== 'in_progress') {
      const c = ensureCard(next, card.cardId)
      if (c.activeStartMs !== undefined) {
        c.activeStartMs = undefined
        next[card.cardId] = c
      }
    }
  }
  return next
}

/** D4/D6: fecha pedaços por meia-noite e fim de janela; Opção A para próximo activeStartMs. */
export function reconcileActiveTimers(
  state: TimeBoardState,
  cards: Card[],
  columns: Column[],
  nowMs: number,
  wh?: BoardWorkingHours | null,
): TimeBoardState {
  const next = { ...state }
  for (const card of cards) {
    const role = roleOf(columns, card.columnId)
    if (role !== 'in_progress') continue
    const c = ensureCard(next, card.cardId)
    if (c.activeStartMs === undefined) continue
    const { completedSegments, nextActiveStartMs } = partitionActiveWork(c.activeStartMs, nowMs, wh)
    if (completedSegments.length === 0 && nextActiveStartMs === c.activeStartMs) continue
    c.completed = [...c.completed, ...completedSegments]
    c.activeStartMs = nextActiveStartMs
    next[card.cardId] = c
  }
  return next
}

export function reconcileBoardTimeState(
  state: TimeBoardState,
  cards: Card[],
  columns: Column[],
  nowMs: number,
  wh?: BoardWorkingHours | null,
): TimeBoardState {
  let next = reconcileTimeStateWithCardPositions(cards, columns, state)
  next = reconcileActiveTimers(next, cards, columns, nowMs, wh)
  return next
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
