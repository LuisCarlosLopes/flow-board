import { describe, expect, it } from 'vitest'
import { appendNewSegments, docToTimeBoardState, writeTimeBoardStateToDoc } from './timeBridge'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import type { TimeBoardState } from '../../domain/types'

function baseDoc(): BoardDocumentJson {
  return {
    schemaVersion: 1,
    boardId: 'b1',
    title: 'T',
    columns: [
      { columnId: 'b', label: 'Todo', role: 'backlog' },
      { columnId: 'w', label: 'Work', role: 'in_progress' },
      { columnId: 'd', label: 'Done', role: 'done' },
    ],
    cards: [{ cardId: 'c1', title: 'x', columnId: 'w' }],
    timeSegments: [],
    cardTimeState: {},
  }
}

describe('appendNewSegments', () => {
  it('grava dois timeSegments quando completed cresce em dois numa transição', () => {
    const doc = baseDoc()
    const prev: TimeBoardState = {
      c1: { cardId: 'c1', completed: [], activeStartMs: 100 },
    }
    const next: TimeBoardState = {
      c1: {
        cardId: 'c1',
        completed: [
          { startMs: 100, endMs: 200 },
          { startMs: 300, endMs: 400 },
        ],
        activeStartMs: undefined,
      },
    }
    appendNewSegments(doc, prev, next)
    expect(doc.timeSegments).toHaveLength(2)
    expect(doc.timeSegments[0]!.segmentId).not.toBe(doc.timeSegments[1]!.segmentId)
    expect(doc.timeSegments[0]!.cardId).toBe('c1')
    expect(doc.timeSegments[1]!.cardId).toBe('c1')
  })
})

describe('doc round-trip', () => {
  it('preserva completed via write/read', () => {
    const doc = baseDoc()
    const st: TimeBoardState = {
      c1: { cardId: 'c1', completed: [{ startMs: 1, endMs: 2 }], activeStartMs: undefined },
    }
    writeTimeBoardStateToDoc(doc, st)
    const back = docToTimeBoardState(doc)
    expect(back.c1?.completed).toEqual([{ startMs: 1, endMs: 2 }])
  })
})
