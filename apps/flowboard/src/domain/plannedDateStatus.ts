import type { ColumnRole } from './types'

/** UI classification for `Card.plannedDate` (local calendar day). */
export type PlannedDateUiStatus = 'none' | 'scheduled' | 'due_today' | 'overdue'

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Proleptic Gregorian ordinal for the card's local calendar day (Y-M-D only).
 * Comparing ordinals gives a true **calendar** day difference, avoiding DST
 * quirks from subtracting local midnights in milliseconds.
 */
function localCalendarOrdinal(d: Date): number {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const a = Math.floor((14 - m) / 12)
  const yAdj = y + 4800 - a
  const mAdj = m + 12 * a - 3
  return (
    day +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045
  )
}

/** Parses `YYYY-MM-DD` as a local midnight calendar date. Invalid patterns return null. */
export function parseLocalDateOnly(iso: string): Date | null {
  const m = ISO_DATE_ONLY.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const dt = new Date(y, month, day)
  if (dt.getFullYear() !== y || dt.getMonth() !== month || dt.getDate() !== day) return null
  return dt
}

export function getPlannedDateUiStatus(
  plannedDate: string | undefined,
  now: Date = new Date(),
): PlannedDateUiStatus {
  if (plannedDate == null || plannedDate.trim() === '') return 'none'
  const planned = parseLocalDateOnly(plannedDate)
  if (!planned) return 'none'
  const tNow = startOfLocalDay(now)
  const tPlanned = startOfLocalDay(planned)
  if (tPlanned > tNow) return 'scheduled'
  if (tPlanned === tNow) return 'due_today'
  return 'overdue'
}

/**
 * Same as {@link getPlannedDateUiStatus}, but cards in a **done** column never show
 * `due_today` or `overdue` (work finished — no urgency styling).
 */
export function getPlannedDateUiStatusForColumn(
  plannedDate: string | undefined,
  columnRole: ColumnRole,
  now: Date = new Date(),
): PlannedDateUiStatus {
  const base = getPlannedDateUiStatus(plannedDate, now)
  if (columnRole === 'done' && (base === 'due_today' || base === 'overdue')) {
    return 'scheduled'
  }
  return base
}

/** Calendar days late (strictly after planned local day). Null if not overdue or invalid. */
export function getCalendarDaysOverdue(plannedDate: string, now: Date = new Date()): number | null {
  const planned = parseLocalDateOnly(plannedDate)
  if (!planned) return null
  const ordPlanned = localCalendarOrdinal(planned)
  const ordNow = localCalendarOrdinal(now)
  if (ordPlanned >= ordNow) return null
  return ordNow - ordPlanned
}

export function formatPlannedDateForCard(iso: string): string {
  const d = parseLocalDateOnly(iso)
  if (!d) return iso.trim()
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}
