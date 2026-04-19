import type { TimeBoardState } from '../../domain/types'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'

export function docToTimeBoardState(doc: BoardDocumentJson): TimeBoardState {
  const out: TimeBoardState = {}
  for (const card of doc.cards) {
    const st = doc.cardTimeState[card.cardId]
    out[card.cardId] = {
      cardId: card.cardId,
      activeStartMs: st?.activeStartMs,
      completed: st?.completed ? st.completed.map((s) => ({ ...s })) : [],
    }
  }
  for (const id of Object.keys(doc.cardTimeState)) {
    if (!out[id]) {
      const st = doc.cardTimeState[id]!
      out[id] = {
        cardId: id,
        activeStartMs: st.activeStartMs,
        completed: st.completed ? st.completed.map((s) => ({ ...s })) : [],
      }
    }
  }
  return out
}

export function writeTimeBoardStateToDoc(doc: BoardDocumentJson, state: TimeBoardState): void {
  doc.cardTimeState = {}
  const cardIds = new Set(doc.cards.map((c) => c.cardId))
  for (const [id, s] of Object.entries(state)) {
    if (!cardIds.has(id)) {
      continue
    }
    doc.cardTimeState[id] = {
      activeStartMs: s.activeStartMs,
      completed: s.completed.map((c) => ({ ...c })),
    }
  }
}

export function appendNewSegments(
  doc: BoardDocumentJson,
  prev: TimeBoardState,
  next: TimeBoardState,
): void {
  for (const id of Object.keys(next)) {
    const p = prev[id]?.completed.length ?? 0
    const n = next[id]?.completed.length ?? 0
    if (n > p) {
      const newOnes = next[id]!.completed.slice(p)
      for (const seg of newOnes) {
        doc.timeSegments.push({
          segmentId: crypto.randomUUID(),
          cardId: id,
          boardId: doc.boardId,
          startMs: seg.startMs,
          endMs: seg.endMs,
        })
      }
    }
  }
}
