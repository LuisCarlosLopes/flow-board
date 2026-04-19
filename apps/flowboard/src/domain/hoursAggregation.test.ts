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
  })
})
