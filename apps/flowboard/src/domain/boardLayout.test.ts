import { describe, expect, it } from 'vitest'
import {
  applyDragEnd,
  buildItemsRecord,
  buildKanbanItemsRecord,
  findCardContainer,
  itemsRecordToCards,
  migrateCardsAfterColumnEdit,
} from './boardLayout'
import type { Card, Column } from './types'

const cols: Column[] = [
  { columnId: 'a', label: 'A', role: 'backlog' },
  { columnId: 'w', label: 'W', role: 'in_progress' },
  { columnId: 'd', label: 'D', role: 'done' },
]

describe('boardLayout', () => {
  it('buildItemsRecord preserves per-column order from cards array', () => {
    const cards: Card[] = [
      { cardId: '1', title: 'x', columnId: 'a' },
      { cardId: '2', title: 'y', columnId: 'w' },
      { cardId: '3', title: 'z', columnId: 'a' },
    ]
    const r = buildItemsRecord(cols, cards)
    expect(r.a).toEqual(['1', '3'])
    expect(r.w).toEqual(['2'])
    expect(r.d).toEqual([])
  })

  it('buildKanbanItemsRecord omits archived cards from columns', () => {
    const cards: Card[] = [
      { cardId: '1', title: 'x', columnId: 'a' },
      { cardId: '2', title: 'y', columnId: 'a', archived: true, archivedAt: '2026-04-22T10:00:00.000Z' },
    ]
    const r = buildKanbanItemsRecord(cols, cards)
    expect(r.a).toEqual(['1'])
    expect(r.w).toEqual([])
    expect(r.d).toEqual([])
  })

  it('itemsRecordToCards flattens by column order', () => {
    const cardById = new Map<string, Card>([
      ['1', { cardId: '1', title: 'x', columnId: 'a' }],
      ['2', { cardId: '2', title: 'y', columnId: 'w' }],
    ])
    const items = { a: ['1'], w: ['2'], d: [] as string[] }
    const cards = itemsRecordToCards(cols, items, cardById)
    expect(cards.map((c) => c.cardId)).toEqual(['1', '2'])
    expect(cards[1]!.columnId).toBe('w')
  })

  it('findCardContainer', () => {
    expect(findCardContainer({ a: ['x'], b: ['y'] }, 'y')).toBe('b')
  })
})

describe('applyDragEnd', () => {
  it('reorders within the same column', () => {
    const items = { a: ['1', '2', '3'], w: [], d: [] }
    const next = applyDragEnd(items, '3', '1')
    expect(next?.a).toEqual(['3', '1', '2'])
  })

  it('moves to another column before a target card', () => {
    const items = { a: ['1'], w: ['2'], d: [] }
    const next = applyDragEnd(items, '1', '2')
    expect(next?.a).toEqual([])
    expect(next?.w).toEqual(['1', '2'])
  })

  it('drops into an empty column', () => {
    const items = { a: ['1'], w: [], d: [] }
    const next = applyDragEnd(items, '1', 'w')
    expect(next?.a).toEqual([])
    expect(next?.w).toEqual(['1'])
  })
})

describe('migrateCardsAfterColumnEdit', () => {
  it('moves cards out of removed columns to first backlog', () => {
    const oldC: Column[] = [
      { columnId: 'a', label: 'A', role: 'backlog' },
      { columnId: 'x', label: 'X', role: 'backlog' },
      { columnId: 'w', label: 'W', role: 'in_progress' },
      { columnId: 'd', label: 'D', role: 'done' },
    ]
    const newC: Column[] = [
      { columnId: 'a', label: 'A', role: 'backlog' },
      { columnId: 'w', label: 'W', role: 'in_progress' },
      { columnId: 'd', label: 'D', role: 'done' },
    ]
    const cards: Card[] = [{ cardId: '1', title: 't', columnId: 'x' }]
    const out = migrateCardsAfterColumnEdit(oldC, cards, newC)
    expect(out[0]!.columnId).toBe('a')
  })
})
