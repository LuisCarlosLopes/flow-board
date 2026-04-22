import { isCardArchived } from './cardArchive'
import type { Card } from './types'

/**
 * Result of a card search operation.
 */
export type CardSearchResult = {
  cardId: string
  title: string
  description?: string
  columnId: string
  score: number
  plannedDate?: string
  plannedHours?: number
  createdAt?: string
  /** True when source card has archived === true (R-SEARCH01). */
  archived?: boolean
}

/**
 * Calculate a relevance score (0-100) for a card against a search query.
 *
 * Scoring formula:
 * - Title match: +100
 * - Description match: +50
 * - Planned date match: +10
 * - Planned hours match: +5
 * - Maximum score is capped at 100
 *
 * All matches are case-insensitive substring matches.
 *
 * @param card - The card to score
 * @param query - The search query (will be lowercased)
 * @returns A score between 0-100
 */
export function scoreCard(card: Card, query: string): number {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return 0
  }

  let score = 0

  // Title match: +100
  if (card.title.toLowerCase().includes(normalizedQuery)) {
    score += 100
  }

  // Description match: +50
  if (card.description && card.description.toLowerCase().includes(normalizedQuery)) {
    score += 50
  }

  // Planned date match: +10
  if (card.plannedDate && card.plannedDate.toLowerCase().includes(normalizedQuery)) {
    score += 10
  }

  // Planned hours match: +5
  if (card.plannedHours !== undefined && card.plannedHours.toString().includes(normalizedQuery)) {
    score += 5
  }

  // Cap score at 100
  return Math.min(score, 100)
}

/**
 * Search cards by query and return sorted results.
 *
 * Results are sorted by:
 * 1. Score (descending)
 * 2. createdAt (descending, newer first)
 * 3. cardId (ascending, deterministic tie-breaker)
 *
 * Empty query returns an empty array. Results are limited to maxResults (default 100).
 *
 * @param query - The search query
 * @param cards - The array of cards to search
 * @param maxResults - Maximum number of results to return (default: 100)
 * @returns Array of CardSearchResult sorted by relevance
 */
export function searchCards(query: string, cards: Card[], maxResults: number = 100): CardSearchResult[] {
  return searchCardsWithTotal(query, cards, maxResults).results
}

/**
 * Like {@link searchCards}, but also returns how many cards matched before applying `maxResults`.
 */
export function searchCardsWithTotal(
  query: string,
  cards: Card[],
  maxResults: number = 100,
): { results: CardSearchResult[]; totalMatched: number } {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return { results: [], totalMatched: 0 }
  }

  if (!cards || cards.length === 0) {
    return { results: [], totalMatched: 0 }
  }

  const matches: CardSearchResult[] = []

  for (const card of cards) {
    const score = scoreCard(card, query)

    if (score > 0) {
      matches.push({
        cardId: card.cardId,
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        score,
        plannedDate: card.plannedDate,
        plannedHours: card.plannedHours,
        createdAt: card.createdAt,
        ...(isCardArchived(card) ? { archived: true } : {}),
      })
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }

    if (a.createdAt !== b.createdAt) {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    }

    return a.cardId.localeCompare(b.cardId)
  })

  const totalMatched = matches.length
  return { results: matches.slice(0, maxResults), totalMatched }
}
