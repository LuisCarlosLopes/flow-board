import { localDayRange, segmentsCompletedInPeriod, type PeriodRange } from './hoursProjection'
import type { BoardWorkingHours, CompletedSegment } from './types'

export type BoardTimeSegment = {
  segmentId: string
  cardId: string
  startMs: number
  endMs: number
}

export type ApplyTargetHoursForPeriodResult =
  | { ok: true; nextSegments: BoardTimeSegment[]; nextCompleted: CompletedSegment[] }
  | {
      ok: false
      code: 'NO_SEGMENTS' | 'INFEASIBLE_TARGET' | 'INVALID_TARGET'
      detail?: string
    }

function maxTargetMsForPeriod(period: PeriodRange): number {
  const span = period.endMs - period.startMs + 1
  const nDays = Math.max(1, Math.ceil(span / 86_400_000))
  return nDays * 24 * 3_600_000
}

/** Last valid instant on the same civil day as `startMs`, respecting working-hours window when enabled. */
function ceilingEndMsForSegmentStart(startMs: number, wh?: BoardWorkingHours | null): number {
  const { startMs: dayStart, endMs: dayEnd } = localDayRange(new Date(startMs))
  if (!wh?.enabled) {
    return dayEnd
  }
  const wEndEx = dayStart + wh.endMinute * 60 * 1000
  return Math.min(dayEnd, wEndEx - 1)
}

function isSegmentCompletedInPeriodR09(seg: BoardTimeSegment, period: PeriodRange): boolean {
  const slice: CompletedSegment = { startMs: seg.startMs, endMs: seg.endMs }
  return segmentsCompletedInPeriod([slice], period).length > 0
}

function sortSelectedStable(segments: BoardTimeSegment[]): BoardTimeSegment[] {
  return [...segments].sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs
    }
    return a.segmentId.localeCompare(b.segmentId)
  })
}

/**
 * Largest remainder: floors then distribute +1 to indices with greatest fractional part (stable tie-break).
 */
function proportionalDurations(
  targetMs: number,
  selected: BoardTimeSegment[],
  dMs: number[],
): number[] {
  const S = dMs.reduce((a, b) => a + b, 0)
  const floors = dMs.map((d) => Math.floor((targetMs * d) / S))
  const diff = targetMs - floors.reduce((a, b) => a + b, 0)
  const order = selected.map((seg, i) => ({
    i,
    frac: (targetMs * dMs[i]!) / S - floors[i]!,
    startMs: seg.startMs,
    segmentId: seg.segmentId,
  }))
  order.sort((a, b) => {
    if (b.frac !== a.frac) {
      return b.frac - a.frac
    }
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs
    }
    return a.segmentId.localeCompare(b.segmentId)
  })
  const out = [...floors]
  for (let k = 0; k < diff; k++) {
    const idx = order[k]?.i
    if (idx === undefined) {
      break
    }
    out[idx]! += 1
  }
  return out
}

function rebuildCompletedForCard(allCardSegments: BoardTimeSegment[]): CompletedSegment[] {
  const sorted = [...allCardSegments].sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs
    }
    return a.segmentId.localeCompare(b.segmentId)
  })
  return sorted.map((s) => ({ startMs: s.startMs, endMs: s.endMs }))
}

export function applyTargetHoursForCardInPeriod(input: {
  cardId: string
  period: PeriodRange
  /** Soma-alvo em ms após política §4.1.1. */
  targetMs: number
  cardSegments: BoardTimeSegment[]
  cardCompleted: CompletedSegment[]
  workingHours?: BoardWorkingHours | null
}): ApplyTargetHoursForPeriodResult {
  void input.cardCompleted
  const { cardId, period, targetMs, cardSegments, workingHours } = input

  if (!Number.isFinite(targetMs) || targetMs < 0 || !Number.isInteger(targetMs)) {
    return { ok: false, code: 'INVALID_TARGET' }
  }

  const cap = maxTargetMsForPeriod(period)
  if (targetMs > cap) {
    return { ok: false, code: 'INVALID_TARGET' }
  }

  const selected = sortSelectedStable(
    cardSegments.filter((s) => s.cardId === cardId && isSegmentCompletedInPeriodR09(s, period)),
  )

  const S = selected.reduce((acc, s) => acc + (s.endMs - s.startMs), 0)
  if (S === 0) {
    return { ok: false, code: 'NO_SEGMENTS' }
  }

  const selectedIds = new Set(selected.map((s) => s.segmentId))

  if (targetMs === 0) {
    const nextSegments = cardSegments.filter((s) => !selectedIds.has(s.segmentId))
    return {
      ok: true,
      nextSegments,
      nextCompleted: rebuildCompletedForCard(nextSegments),
    }
  }

  const dMs = selected.map((s) => s.endMs - s.startMs)
  const dPrime = proportionalDurations(targetMs, selected, dMs)

  for (let i = 0; i < selected.length; i++) {
    if (dPrime[i]! <= 0) {
      return { ok: false, code: 'INFEASIBLE_TARGET' }
    }
  }

  const idToNewEnd = new Map<string, number>()
  for (let i = 0; i < selected.length; i++) {
    const seg = selected[i]!
    const newEnd = seg.startMs + dPrime[i]!
    const ceiling = ceilingEndMsForSegmentStart(seg.startMs, workingHours)
    if (newEnd > ceiling) {
      return { ok: false, code: 'INFEASIBLE_TARGET' }
    }
    if (dPrime[i]! > 0 && newEnd <= seg.startMs) {
      return { ok: false, code: 'INFEASIBLE_TARGET' }
    }
    idToNewEnd.set(seg.segmentId, newEnd)
  }

  const nextSegments: BoardTimeSegment[] = cardSegments.map((s) => {
    const newEnd = idToNewEnd.get(s.segmentId)
    if (newEnd === undefined) {
      return s
    }
    return { ...s, endMs: newEnd }
  })

  return {
    ok: true,
    nextSegments,
    nextCompleted: rebuildCompletedForCard(nextSegments),
  }
}
