import type { CompletedSegment } from './types'

/** Inclusive range in ms (UTC timestamps). */
export type PeriodRange = { startMs: number; endMs: number }

/**
 * R09: segments count in period by **completion instant** (endMs).
 */
export function segmentsCompletedInPeriod(
  segments: CompletedSegment[],
  period: PeriodRange,
): CompletedSegment[] {
  return segments.filter((s) => s.endMs >= period.startMs && s.endMs <= period.endMs)
}

export function sumDurationMs(segments: CompletedSegment[]): number {
  return segments.reduce((acc, s) => acc + (s.endMs - s.startMs), 0)
}

/** Start/end of local calendar day for `anchor` Date. */
export function localDayRange(anchor: Date): PeriodRange {
  const start = new Date(anchor)
  start.setHours(0, 0, 0, 0)
  const end = new Date(anchor)
  end.setHours(23, 59, 59, 999)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

/** Semana local com início na segunda-feira 00:00 e fim no domingo 23:59:59 (mesma semana de `anchor`). */
export function localWeekRange(anchor: Date): PeriodRange {
  const d = new Date(anchor)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

/** Mês civil local que contém `anchor`. */
export function localMonthRange(anchor: Date): PeriodRange {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
  return { startMs: start.getTime(), endMs: end.getTime() }
}
