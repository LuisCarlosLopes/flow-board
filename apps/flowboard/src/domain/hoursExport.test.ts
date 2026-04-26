import { describe, expect, it } from 'vitest'
import { aggregateTaskHoursForPeriod, type BoardHoursInput } from './hoursAggregation'
import { buildTaskHoursCsv } from './taskHoursCsv'
import {
  loadBoardDocumentsOrThrow,
  validateSelectedBoardsAgainstCatalog,
} from './hoursExport'
import type { BoardDocumentJson } from '../infrastructure/persistence/types'

describe('validateSelectedBoardsAgainstCatalog (CA-E1)', () => {
  const catalog = [
    { boardId: 'a', title: 'A' },
    { boardId: 'b', title: 'B', archived: true },
    { boardId: 'c', title: 'C' },
  ]

  it('accepts when all selected are present and not archived', () => {
    expect(validateSelectedBoardsAgainstCatalog(catalog, new Set(['a', 'c']))).toEqual({ ok: true })
  })

  it('rejects missing board', () => {
    expect(validateSelectedBoardsAgainstCatalog(catalog, new Set(['a', 'x']))).toEqual({
      ok: false,
      code: 'missing',
      boardId: 'x',
    })
  })

  it('rejects archived board', () => {
    expect(validateSelectedBoardsAgainstCatalog(catalog, new Set(['a', 'b']))).toEqual({
      ok: false,
      code: 'archived',
      boardId: 'b',
    })
  })
})

describe('loadBoardDocumentsOrThrow (CA-08)', () => {
  it('throws when any board returns null', async () => {
    const loadBoard = async (id: string) => (id === 'bad' ? null : { doc: { boardId: id } as BoardDocumentJson })
    await expect(loadBoardDocumentsOrThrow(loadBoard, ['ok', 'bad'])).rejects.toThrow(/bad/)
  })

  it('returns all docs in order when all load', async () => {
    const loadBoard = async (id: string) => ({ doc: { boardId: id } as BoardDocumentJson })
    const docs = await loadBoardDocumentsOrThrow(loadBoard, ['z', 'y'])
    expect(docs.map((d) => d.boardId)).toEqual(['z', 'y'])
  })
})

describe('export dataset subset (CA-01)', () => {
  it('CSV rows only reference selected boards', () => {
    const period = { startMs: 0, endMs: 86_400_000 * 400 }
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b-only',
        title: 'Only',
        cards: [{ cardId: 'c1', title: 'Task' }],
        segments: [{ cardId: 'c1', startMs: 10_000, endMs: 10_000 + 3_600_000 }],
      },
      {
        boardId: 'b-other',
        title: 'Other',
        cards: [{ cardId: 'c2', title: 'Other task' }],
        segments: [{ cardId: 'c2', startMs: 20_000, endMs: 20_000 + 3_600_000 }],
      },
    ]
    const selectedIds = new Set(['b-only'])
    const inputs = boards.filter((b) => selectedIds.has(b.boardId))
    const rows = aggregateTaskHoursForPeriod(inputs, period)
    const csv = buildTaskHoursCsv({
      periodKind: 'month',
      period,
      rows,
      archivedCardKeys: new Set(),
    })
    expect(csv.includes('b-only')).toBe(true)
    expect(csv.includes('b-other')).toBe(false)
    expect(rows).toHaveLength(1)
  })
})
