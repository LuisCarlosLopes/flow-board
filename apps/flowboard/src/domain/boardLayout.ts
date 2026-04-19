import type { Card, Column } from './types'

/** Quando colunas são removidas, realoca cards para a primeira coluna Backlog em `newColumns`. */
export function migrateCardsAfterColumnEdit(oldColumns: Column[], cards: Card[], newColumns: Column[]): Card[] {
  const removedIds = new Set(
    oldColumns
      .filter((oc) => !newColumns.some((nc) => nc.columnId === oc.columnId))
      .map((c) => c.columnId),
  )
  if (removedIds.size === 0) {
    return cards
  }
  const firstBacklog = newColumns.find((c) => c.role === 'backlog')?.columnId
  if (!firstBacklog) {
    return cards
  }
  return cards.map((card) => (removedIds.has(card.columnId) ? { ...card, columnId: firstBacklog } : card))
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr]
  const [it] = copy.splice(from, 1)
  copy.splice(to, 0, it!)
  return copy
}

/** Ordem global dos cards: uma entrada por coluna (na ordem de `columns`), cada lista ordenada. */
export function buildItemsRecord(columns: Column[], cards: Card[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const col of columns) {
    out[col.columnId] = cards.filter((c) => c.columnId === col.columnId).map((c) => c.cardId)
  }
  return out
}

export function itemsRecordToCards(
  columns: Column[],
  items: Record<string, string[]>,
  cardById: Map<string, Card>,
): Card[] {
  const result: Card[] = []
  for (const col of columns) {
    const ids = items[col.columnId] ?? []
    for (const id of ids) {
      const base = cardById.get(id)
      if (base) {
        result.push({ ...base, columnId: col.columnId })
      }
    }
  }
  return result
}

export function findCardContainer(items: Record<string, string[]>, cardId: string): string | undefined {
  for (const [colId, ids] of Object.entries(items)) {
    if (ids.includes(cardId)) {
      return colId
    }
  }
  return undefined
}

/**
 * Atualiza mapas de ids por coluna após soltar (cross-column ou reorder).
 * `overId` pode ser id de coluna (chave em `items`) ou id de card.
 */
export function applyDragEnd(
  items: Record<string, string[]>,
  activeId: string,
  overId: string,
): Record<string, string[]> | null {
  const activeContainer = findCardContainer(items, activeId)
  if (!activeContainer) {
    return null
  }

  const overIsColumn = Object.prototype.hasOwnProperty.call(items, overId)
  const overContainer = overIsColumn ? overId : findCardContainer(items, overId)
  if (!overContainer) {
    return null
  }

  const next: Record<string, string[]> = {}
  for (const k of Object.keys(items)) {
    next[k] = [...items[k]!]
  }

  if (activeContainer === overContainer) {
    const list = next[activeContainer]!
    const oldIndex = list.indexOf(activeId)
    if (oldIndex < 0) {
      return null
    }
    if (overIsColumn) {
      return next
    }
    const newIndex = list.indexOf(overId)
    if (newIndex < 0) {
      return null
    }
    next[activeContainer] = arrayMove(list, oldIndex, newIndex)
    return next
  }

  next[activeContainer] = next[activeContainer]!.filter((id) => id !== activeId)
  const toList = [...next[overContainer]!]
  let insertIndex: number
  if (overIsColumn && overId === overContainer) {
    insertIndex = toList.length
  } else if (!overIsColumn) {
    const oi = toList.indexOf(overId)
    insertIndex = oi >= 0 ? oi : toList.length
  } else {
    insertIndex = toList.length
  }
  toList.splice(insertIndex, 0, activeId)
  next[overContainer] = toList
  return next
}
