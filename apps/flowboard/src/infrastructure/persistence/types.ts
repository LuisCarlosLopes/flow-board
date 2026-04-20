import type { BoardWorkingHours, Card, CardTimeState, ColumnRole } from '../../domain/types'

/** JSON persisted per board (ADR-002). */
export type BoardDocumentJson = {
  schemaVersion: 1
  boardId: string
  title: string
  /** Opcional: ausente = 24h contábil (legado). */
  workingHours?: BoardWorkingHours
  columns: { columnId: string; label: string; role: ColumnRole }[]
  cards: Card[]
  /** Completed segments + open segment reconstructed from card time state when saving */
  timeSegments: {
    segmentId: string
    cardId: string
    boardId: string
    startMs: number
    endMs: number
  }[]
  cardTimeState: Record<string, Pick<CardTimeState, 'activeStartMs' | 'completed'>>
}

export type CatalogEntryJson = {
  boardId: string
  title: string
  dataPath: string
  archived?: boolean
}

export type CatalogJson = {
  schemaVersion: 1
  boards: CatalogEntryJson[]
}
