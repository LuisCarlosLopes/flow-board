import type { PeriodRange } from './hoursProjection'
import { segmentsCompletedInPeriod } from './hoursProjection'
import type { CompletedSegment } from './types'

export type TaskHoursRow = {
  boardId: string
  boardTitle: string
  cardId: string
  cardTitle: string
  durationMs: number
  /** Min `endMs` among R09-included segments for this task in the period. */
  segmentEndMsMin: number
  /** Max `endMs` among R09-included segments for this task in the period. */
  segmentEndMsMax: number
}

/** Entrada mínima para agregar (evita acoplar ao JSON de persistência). */
export type BoardHoursInput = {
  boardId: string
  title: string
  cards: { cardId: string; title: string }[]
  segments: { cardId: string; startMs: number; endMs: number }[]
}

/**
 * Soma durações por tarefa no período (R09: filtro pelo instante endMs do segmento).
 */
export function aggregateTaskHoursForPeriod(boards: BoardHoursInput[], period: PeriodRange): TaskHoursRow[] {
  const map = new Map<string, TaskHoursRow>()

  for (const b of boards) {
    const titleByCard = new Map(b.cards.map((c) => [c.cardId, c.title]))
    for (const seg of b.segments) {
      const slice: CompletedSegment = { startMs: seg.startMs, endMs: seg.endMs }
      const inPeriod = segmentsCompletedInPeriod([slice], period)
      if (inPeriod.length === 0) {
        continue
      }
      const duration = seg.endMs - seg.startMs
      const key = `${b.boardId}:${seg.cardId}`
      const cardTitle = titleByCard.get(seg.cardId) ?? 'Tarefa'
      const endMs = seg.endMs
      const prev = map.get(key)
      if (prev) {
        map.set(key, {
          ...prev,
          durationMs: prev.durationMs + duration,
          segmentEndMsMin: Math.min(prev.segmentEndMsMin, endMs),
          segmentEndMsMax: Math.max(prev.segmentEndMsMax, endMs),
        })
      } else {
        map.set(key, {
          boardId: b.boardId,
          boardTitle: b.title,
          cardId: seg.cardId,
          cardTitle,
          durationMs: duration,
          segmentEndMsMin: endMs,
          segmentEndMsMax: endMs,
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.durationMs - a.durationMs)
}
