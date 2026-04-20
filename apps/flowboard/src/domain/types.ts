/** Semantic column roles (TSD / PRD). */
export type ColumnRole = 'backlog' | 'in_progress' | 'done'

export type Column = {
  columnId: string
  label: string
  role: ColumnRole
}

export type Card = {
  cardId: string
  title: string
  columnId: string
  /** Description with optional Markdown (future preview) */
  description?: string
  /** ISO date string (e.g. "2026-04-25") for task planning */
  plannedDate?: string
  /** Estimated hours for the task; must be ≥ 0 */
  plannedHours?: number
  /** ISO timestamp when card was created; auto-set to new Date().toISOString() */
  createdAt?: string
}

export type CompletedSegment = {
  startMs: number
  endMs: number
}

export type CardTimeState = {
  cardId: string
  /** Open segment while card sits in in_progress */
  activeStartMs?: number
  completed: CompletedSegment[]
}

/** cardId -> time state */
export type TimeBoardState = Record<string, CardTimeState>

/** Expediente local no mesmo fuso do browser; `endMinute` é exclusivo (primeiro minuto fora da janela). */
export type BoardWorkingHours = {
  enabled: boolean
  startMinute: number
  endMinute: number
}
