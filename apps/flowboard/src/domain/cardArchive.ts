import type { Card } from './types'

/** Legacy JSON or explicit false: card participates in Kanban layout. */
export function isCardArchived(card: Card): boolean {
  return card.archived === true
}

export function activeCardsForLayout(cards: Card[]): Card[] {
  return cards.filter((c) => !isCardArchived(c))
}

function archivedAtSortKey(iso?: string): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

function createdAtSortKey(iso?: string): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** Default §10 Q1: archivedAt desc, then createdAt desc, then cardId asc. */
export function sortArchivedByDefault(archived: Card[]): Card[] {
  return [...archived].sort((a, b) => {
    const ad = archivedAtSortKey(a.archivedAt)
    const bd = archivedAtSortKey(b.archivedAt)
    if (bd !== ad) return bd - ad
    const ac = createdAtSortKey(a.createdAt)
    const bc = createdAtSortKey(b.createdAt)
    if (bc !== ac) return bc - ac
    return a.cardId.localeCompare(b.cardId)
  })
}

/**
 * After `itemsRecordToCards`, re-append archived cards so they are never dropped from `doc.cards`.
 * `layoutCards` must contain only active (non-archived) cards in column order.
 */
export function mergeLayoutCardsWithArchived(prevFullCards: Card[], layoutCards: Card[]): Card[] {
  const archived = prevFullCards.filter(isCardArchived)
  return [...layoutCards, ...sortArchivedByDefault(archived)]
}
