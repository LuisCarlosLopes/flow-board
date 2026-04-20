import { describe, expect, it } from 'vitest'
import {
  applyCardMove,
  reconcileBoardTimeState,
  reconcileTimeStateWithCardPositions,
  reorderWithinColumn,
  totalCompletedMs,
} from './timeEngine'
import type { BoardWorkingHours, Card, Column, TimeBoardState } from './types'

const cols: Column[] = [
  { columnId: 'b', label: 'Todo', role: 'backlog' },
  { columnId: 'w', label: 'Working', role: 'in_progress' },
  { columnId: 'd', label: 'Done', role: 'done' },
]

describe('applyCardMove', () => {
  it('R03: in_progress → backlog discards open segment', () => {
    let s: TimeBoardState = {}
    s = applyCardMove(s, 'c1', 'b', 'w', cols, 1000)
    expect(s.c1?.activeStartMs).toBe(1000)
    s = applyCardMove(s, 'c1', 'w', 'b', cols, 2000)
    expect(s.c1?.activeStartMs).toBeUndefined()
    expect(s.c1?.completed.length).toBe(0)
  })

  it('R04: backlog → done does not record a segment', () => {
    const s = applyCardMove({}, 'c1', 'b', 'd', cols, 5000)
    expect(s.c1?.completed.length).toBe(0)
    expect(totalCompletedMs(s.c1!)).toBe(0)
  })

  it('R06: same column move in in_progress does not reset timer', () => {
    let s: TimeBoardState = {}
    s = applyCardMove(s, 'c1', 'b', 'w', cols, 100)
    const t0 = s.c1?.activeStartMs
    s = applyCardMove(s, 'c1', 'w', 'w', cols, 9999)
    expect(s.c1?.activeStartMs).toBe(t0)
  })

  it('R01: in_progress → done records one segment', () => {
    let s: TimeBoardState = {}
    s = applyCardMove(s, 'c1', 'b', 'w', cols, 1000)
    s = applyCardMove(s, 'c1', 'w', 'd', cols, 4000)
    expect(s.c1?.completed).toEqual([{ startMs: 1000, endMs: 4000 }])
    expect(totalCompletedMs(s.c1!)).toBe(3000)
  })

  it('in_progress → done com meia-noite gera dois segmentos (sem expediente)', () => {
    const start = new Date(2026, 3, 20, 22, 0, 0, 0).getTime()
    const end = new Date(2026, 3, 21, 2, 0, 0, 0).getTime()
    let s: TimeBoardState = { c1: { cardId: 'c1', completed: [], activeStartMs: start } }
    s = applyCardMove(s, 'c1', 'w', 'd', cols, end, undefined)
    expect(s.c1?.completed.length).toBe(2)
    expect(s.c1?.activeStartMs).toBeUndefined()
  })

  it('in_progress → done com expediente 9–18 só grava dentro da janela', () => {
    const wh: BoardWorkingHours = { enabled: true, startMinute: 9 * 60, endMinute: 18 * 60 }
    const dayStart = new Date(2026, 3, 20, 0, 0, 0, 0)
    dayStart.setHours(0, 0, 0, 0)
    const startMs = dayStart.getTime() + 8 * 3600 * 1000
    const endMs = dayStart.getTime() + 20 * 3600 * 1000
    let s: TimeBoardState = { c1: { cardId: 'c1', completed: [], activeStartMs: startMs } }
    s = applyCardMove(s, 'c1', 'w', 'd', cols, endMs, wh)
    expect(s.c1?.completed).toHaveLength(1)
    const w0 = dayStart.getTime() + 9 * 3600 * 1000
    const w1 = dayStart.getTime() + 18 * 3600 * 1000 - 1
    expect(s.c1?.completed[0]!.startMs).toBe(w0)
    expect(s.c1?.completed[0]!.endMs).toBe(w1)
  })

  it('R05: done → in_progress starts new segment', () => {
    let s: TimeBoardState = {}
    s = applyCardMove(s, 'c1', 'b', 'w', cols, 100)
    s = applyCardMove(s, 'c1', 'w', 'd', cols, 200)
    s = applyCardMove(s, 'c1', 'd', 'w', cols, 300)
    expect(s.c1?.activeStartMs).toBe(300)
    expect(s.c1?.completed.length).toBe(1)
  })
})

describe('reconcileTimeStateWithCardPositions', () => {
  it('remove activeStartMs quando card não está em in_progress', () => {
    const cards: Card[] = [{ cardId: 'c1', title: 't', columnId: 'b' }]
    const s: TimeBoardState = { c1: { cardId: 'c1', completed: [], activeStartMs: 99 } }
    const next = reconcileTimeStateWithCardPositions(cards, cols, s)
    expect(next.c1?.activeStartMs).toBeUndefined()
  })
})

describe('reconcileBoardTimeState', () => {
  it('fecha segmento ao virar o dia com timer ativo (sem wh)', () => {
    const start = new Date(2026, 3, 20, 22, 0, 0, 0).getTime()
    const now = new Date(2026, 3, 21, 2, 0, 0, 0).getTime()
    const cards: Card[] = [{ cardId: 'c1', title: 't', columnId: 'w' }]
    const s: TimeBoardState = { c1: { cardId: 'c1', completed: [], activeStartMs: start } }
    const next = reconcileBoardTimeState(s, cards, cols, now, undefined)
    expect(next.c1?.completed.length).toBeGreaterThanOrEqual(1)
    expect(next.c1?.activeStartMs).toBeDefined()
  })
})

describe('reorderWithinColumn', () => {
  it('is no-op for in_progress', () => {
    const s: TimeBoardState = { x: { cardId: 'x', activeStartMs: 5, completed: [] } }
    const next = reorderWithinColumn(s, 'in_progress')
    expect(next.x?.activeStartMs).toBe(5)
  })
})
