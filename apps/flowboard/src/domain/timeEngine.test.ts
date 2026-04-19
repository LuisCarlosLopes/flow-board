import { describe, expect, it } from 'vitest'
import { applyCardMove, reorderWithinColumn, totalCompletedMs } from './timeEngine'
import type { Column, TimeBoardState } from './types'

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

  it('R05: done → in_progress starts new segment', () => {
    let s: TimeBoardState = {}
    s = applyCardMove(s, 'c1', 'b', 'w', cols, 100)
    s = applyCardMove(s, 'c1', 'w', 'd', cols, 200)
    s = applyCardMove(s, 'c1', 'd', 'w', cols, 300)
    expect(s.c1?.activeStartMs).toBe(300)
    expect(s.c1?.completed.length).toBe(1)
  })
})

describe('reorderWithinColumn', () => {
  it('is no-op for in_progress', () => {
    const s: TimeBoardState = { x: { cardId: 'x', activeStartMs: 5, completed: [] } }
    const next = reorderWithinColumn(s, 'in_progress')
    expect(next.x?.activeStartMs).toBe(5)
  })
})
