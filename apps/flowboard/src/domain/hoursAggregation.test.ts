import { describe, expect, it } from 'vitest'
import { aggregateTaskHoursForPeriod, type BoardHoursInput } from './hoursAggregation'

describe('aggregateTaskHoursForPeriod (T10 / R09)', () => {
  it('matches fixture: segment whose end falls in period counts full duration', () => {
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'Quadro A',
        cards: [{ cardId: 'c1', title: 'Implementar X' }],
        segments: [{ cardId: 'c1', startMs: 500, endMs: 1500 }],
      },
    ]
    const period = { startMs: 1000, endMs: 2000 }
    const rows = aggregateTaskHoursForPeriod(boards, period)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.durationMs).toBe(1000)
    expect(rows[0]!.cardTitle).toBe('Implementar X')
    expect(rows[0]!.boardTitle).toBe('Quadro A')
    expect(rows[0]!.segmentEndMsMin).toBe(1500)
    expect(rows[0]!.segmentEndMsMax).toBe(1500)
  })

  it('excludes segment when completion end is outside period', () => {
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'Q',
        cards: [{ cardId: 'c1', title: 'T' }],
        segments: [{ cardId: 'c1', startMs: 100, endMs: 400 }],
      },
    ]
    const period = { startMs: 500, endMs: 900 }
    expect(aggregateTaskHoursForPeriod(boards, period)).toHaveLength(0)
  })

  it('sums multiple segments for same card', () => {
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'Q',
        cards: [{ cardId: 'c1', title: 'T' }],
        segments: [
          { cardId: 'c1', startMs: 100, endMs: 200 },
          { cardId: 'c1', startMs: 300, endMs: 500 },
        ],
      },
    ]
    const period = { startMs: 0, endMs: 600 }
    const rows = aggregateTaskHoursForPeriod(boards, period)
    expect(rows[0]!.durationMs).toBe(300)
    expect(rows[0]!.segmentEndMsMin).toBe(200)
    expect(rows[0]!.segmentEndMsMax).toBe(500)
  })

  it('one calendar day: multiple segments with same endMs keep min === max (epoch ms)', () => {
    const endMs = 1500
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'Q',
        cards: [{ cardId: 'c1', title: 'T' }],
        segments: [
          { cardId: 'c1', startMs: 100, endMs },
          { cardId: 'c1', startMs: 200, endMs },
        ],
      },
    ]
    const period = { startMs: 1000, endMs: 2000 }
    const rows = aggregateTaskHoursForPeriod(boards, period)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.segmentEndMsMin).toBe(endMs)
    expect(rows[0]!.segmentEndMsMax).toBe(endMs)
    const d1 = endMs - 100
    const d2 = endMs - 200
    expect(rows[0]!.durationMs).toBe(d1 + d2)
  })

  it('multiple distinct endMs: min/max over completions and duration sum regression', () => {
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'Q',
        cards: [{ cardId: 'c1', title: 'T' }],
        segments: [
          { cardId: 'c1', startMs: 0, endMs: 1000 },
          { cardId: 'c1', startMs: 500, endMs: 5000 },
        ],
      },
    ]
    const period = { startMs: 0, endMs: 6000 }
    const rows = aggregateTaskHoursForPeriod(boards, period)
    expect(rows[0]!.durationMs).toBe(1000 + 4500)
    expect(rows[0]!.segmentEndMsMin).toBe(1000)
    expect(rows[0]!.segmentEndMsMax).toBe(5000)
  })

  it('mix in/out: segment with end outside period does not affect min/max or duration', () => {
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'Q',
        cards: [{ cardId: 'c1', title: 'T' }],
        segments: [
          { cardId: 'c1', startMs: 100, endMs: 400 },
          { cardId: 'c1', startMs: 200, endMs: 600 },
          { cardId: 'c1', startMs: 300, endMs: 800 },
        ],
      },
    ]
    const period = { startMs: 500, endMs: 900 }
    const rows = aggregateTaskHoursForPeriod(boards, period)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.segmentEndMsMin).toBe(600)
    expect(rows[0]!.segmentEndMsMax).toBe(800)
    expect(rows[0]!.durationMs).toBe(600 - 200 + (800 - 300))
  })
})
