import { describe, expect, it } from 'vitest'
import {
  activeCardsForLayout,
  isCardArchived,
  mergeLayoutCardsWithArchived,
  sortArchivedByDefault,
} from './cardArchive'
import type { Card } from './types'

describe('cardArchive', () => {
  it('treats legacy without archived as not archived', () => {
    const c: Card = { cardId: '1', title: 't', columnId: 'a' }
    expect(isCardArchived(c)).toBe(false)
  })

  it('isCardArchived is true only for archived === true', () => {
    expect(isCardArchived({ cardId: '1', title: 't', columnId: 'a', archived: false })).toBe(false)
    expect(isCardArchived({ cardId: '1', title: 't', columnId: 'a', archived: true })).toBe(true)
  })

  it('activeCardsForLayout excludes archived', () => {
    const cards: Card[] = [
      { cardId: '1', title: 'a', columnId: 'x' },
      { cardId: '2', title: 'b', columnId: 'x', archived: true },
    ]
    expect(activeCardsForLayout(cards).map((c) => c.cardId)).toEqual(['1'])
  })

  it('mergeLayoutCardsWithArchived preserves all archived after reorder of actives', () => {
    const prev: Card[] = [
      { cardId: 'a', title: 'A', columnId: 'c1' },
      { cardId: 'b', title: 'B', columnId: 'c1', archived: true, archivedAt: '2026-04-20T10:00:00.000Z' },
      { cardId: 'c', title: 'C', columnId: 'c1' },
    ]
    const layout: Card[] = [
      { cardId: 'c', title: 'C', columnId: 'c1' },
      { cardId: 'a', title: 'A', columnId: 'c1' },
    ]
    const merged = mergeLayoutCardsWithArchived(prev, layout)
    expect(merged.map((x) => x.cardId)).toEqual(['c', 'a', 'b'])
    expect(merged.find((x) => x.cardId === 'b')?.archived).toBe(true)
  })

  it('sortArchivedByDefault orders by archivedAt desc', () => {
    const a: Card = {
      cardId: '1',
      title: 'o',
      columnId: 'x',
      archived: true,
      archivedAt: '2026-04-19T10:00:00.000Z',
    }
    const b: Card = {
      cardId: '2',
      title: 'n',
      columnId: 'x',
      archived: true,
      archivedAt: '2026-04-22T10:00:00.000Z',
    }
    expect(sortArchivedByDefault([a, b]).map((c) => c.cardId)).toEqual(['2', '1'])
  })
})
