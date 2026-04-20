import { describe, it, expect } from 'vitest'
import { scoreCard, searchCards, searchCardsWithTotal } from './cardSearch'
import type { Card } from './types'

describe('scoreCard', () => {
  describe('title matching', () => {
    it('should score title match as 100', () => {
      const card: Card = { cardId: '1', title: 'Auth Module', columnId: 'col1' }
      expect(scoreCard(card, 'auth')).toBe(100)
    })

    it('should match full title', () => {
      const card: Card = { cardId: '1', title: 'Database Schema', columnId: 'col1' }
      expect(scoreCard(card, 'database schema')).toBe(100)
    })

    it('should match partial title', () => {
      const card: Card = { cardId: '1', title: 'Implement Authentication', columnId: 'col1' }
      expect(scoreCard(card, 'auth')).toBe(100)
    })

    it('should be case-insensitive for title', () => {
      const card: Card = { cardId: '1', title: 'TODO', columnId: 'col1' }
      expect(scoreCard(card, 'todo')).toBe(100)
      expect(scoreCard(card, 'TODO')).toBe(100)
      expect(scoreCard(card, 'Todo')).toBe(100)
    })

    it('should not match if query not in title', () => {
      const card: Card = { cardId: '1', title: 'Auth Module', columnId: 'col1' }
      expect(scoreCard(card, 'database')).toBe(0)
    })
  })

  describe('description matching', () => {
    it('should score description match as 50', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        description: 'Setup authentication system',
        columnId: 'col1',
      }
      expect(scoreCard(card, 'authentication')).toBe(50)
    })

    it('should score when description matches but not title', () => {
      const card: Card = {
        cardId: '1',
        title: 'Feature',
        description: 'auth integration needed',
        columnId: 'col1',
      }
      expect(scoreCard(card, 'auth')).toBe(50)
    })

    it('should return 0 if card has no description', () => {
      const card: Card = { cardId: '1', title: 'Task', columnId: 'col1' }
      expect(scoreCard(card, 'description')).toBe(0)
    })

    it('should be case-insensitive for description', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        description: 'Setup Database',
        columnId: 'col1',
      }
      expect(scoreCard(card, 'database')).toBe(50)
      expect(scoreCard(card, 'DATABASE')).toBe(50)
      expect(scoreCard(card, 'DaTaBaSe')).toBe(50)
    })
  })

  describe('planned date matching', () => {
    it('should score date match as 10', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        columnId: 'col1',
        plannedDate: '2026-04-25',
      }
      expect(scoreCard(card, '2026')).toBe(10)
    })

    it('should match partial date', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        columnId: 'col1',
        plannedDate: '2026-04-25',
      }
      expect(scoreCard(card, '04-25')).toBe(10)
    })

    it('should be case-insensitive for date', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        columnId: 'col1',
        plannedDate: '2026-04-25',
      }
      expect(scoreCard(card, '2026')).toBe(10)
    })

    it('should return 0 if no plannedDate', () => {
      const card: Card = { cardId: '1', title: 'Task', columnId: 'col1' }
      expect(scoreCard(card, '2026')).toBe(0)
    })
  })

  describe('planned hours matching', () => {
    it('should score hours match as 5', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        columnId: 'col1',
        plannedHours: 8,
      }
      expect(scoreCard(card, '8')).toBe(5)
    })

    it('should match 0 hours', () => {
      const card: Card = {
        cardId: '1',
        title: 'Task',
        columnId: 'col1',
        plannedHours: 0,
      }
      expect(scoreCard(card, '0')).toBe(5)
    })

    it('should return 0 if no plannedHours', () => {
      const card: Card = { cardId: '1', title: 'Task', columnId: 'col1' }
      expect(scoreCard(card, '5')).toBe(0)
    })
  })

  describe('score capping', () => {
    it('should cap score at 100 when multiple fields match', () => {
      const card: Card = {
        cardId: '1',
        title: 'auth',
        description: 'auth integration',
        columnId: 'col1',
        plannedDate: '2026-04-25',
        plannedHours: 8,
      }
      // All match 'auth' would be 100 + 50 = 150 if not capped
      expect(scoreCard(card, 'auth')).toBe(100)
    })

    it('should cap at 100 for title + description + date match', () => {
      const card: Card = {
        cardId: '1',
        title: 'task 2026',
        description: 'task 2026 planning',
        columnId: 'col1',
        plannedDate: '2026-04-25',
      }
      // title (100) + description (50) + date (10) = 160 if not capped
      expect(scoreCard(card, '2026')).toBe(100)
    })
  })

  describe('edge cases', () => {
    it('should return 0 for empty query', () => {
      const card: Card = { cardId: '1', title: 'Auth', columnId: 'col1' }
      expect(scoreCard(card, '')).toBe(0)
    })

    it('should return 0 for whitespace-only query', () => {
      const card: Card = { cardId: '1', title: 'Auth', columnId: 'col1' }
      expect(scoreCard(card, '   ')).toBe(0)
    })

    it('should handle special characters in title', () => {
      const card: Card = {
        cardId: '1',
        title: 'Fix: [BUG] Auth@123',
        columnId: 'col1',
      }
      expect(scoreCard(card, '@')).toBe(100)
      expect(scoreCard(card, '[BUG]')).toBe(100)
    })

    it('should handle unicode characters', () => {
      const card: Card = {
        cardId: '1',
        title: 'Implementar autenticação',
        columnId: 'col1',
      }
      expect(scoreCard(card, 'autenticação')).toBe(100)
    })

    it('should return 0 if no match anywhere', () => {
      const card: Card = {
        cardId: '1',
        title: 'Frontend Task',
        description: 'Build UI components',
        columnId: 'col1',
        plannedDate: '2026-04-25',
        plannedHours: 5,
      }
      expect(scoreCard(card, 'nonexistent')).toBe(0)
    })
  })
})

describe('searchCards', () => {
  const mockCards: Card[] = [
    {
      cardId: 'c1',
      title: 'Setup Auth Module',
      description: 'Implement JWT authentication',
      columnId: 'col1',
      plannedDate: '2026-04-20',
      plannedHours: 8,
      createdAt: '2026-04-15T10:00:00Z',
    },
    {
      cardId: 'c2',
      title: 'Database Schema',
      description: 'Design user table',
      columnId: 'col1',
      plannedDate: '2026-04-21',
      plannedHours: 5,
      createdAt: '2026-04-15T09:00:00Z',
    },
    {
      cardId: 'c3',
      title: 'API Endpoints',
      description: 'Create REST endpoints for auth',
      columnId: 'col2',
      plannedDate: '2026-04-22',
      plannedHours: 12,
      createdAt: '2026-04-15T08:00:00Z',
    },
    {
      cardId: 'c4',
      title: 'Frontend Components',
      description: 'Build login and signup forms',
      columnId: 'col2',
      createdAt: '2026-04-15T07:00:00Z',
    },
  ]

  describe('basic filtering', () => {
    it('should filter by title match', () => {
      const result = searchCards('auth', mockCards)
      expect(result).toHaveLength(2) // c1 (title), c3 (desc)
      expect(result[0].cardId).toBe('c1') // highest score (title match)
    })

    it('should filter by description match', () => {
      const result = searchCards('design', mockCards)
      expect(result).toHaveLength(1)
      expect(result[0].cardId).toBe('c2')
    })

    it('should filter by date match', () => {
      const result = searchCards('2026-04-22', mockCards)
      expect(result).toHaveLength(1)
      expect(result[0].cardId).toBe('c3')
    })

    it('should filter by hours match', () => {
      const result = searchCards('12', mockCards)
      expect(result).toHaveLength(1)
      expect(result[0].cardId).toBe('c3')
    })

    it('should return empty array for no matches', () => {
      const result = searchCards('nonexistent', mockCards)
      expect(result).toEqual([])
    })
  })

  describe('sorting and ordering', () => {
    it('should sort by score descending', () => {
      const result = searchCards('auth', mockCards)
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score)
      if (result.length > 2) {
        expect(result[1].score).toBeGreaterThanOrEqual(result[2].score)
      }
    })

    it('should sort by createdAt descending when scores equal', () => {
      // Create cards with same score
      const cards: Card[] = [
        {
          cardId: 'newer',
          title: 'Task A',
          columnId: 'col1',
          createdAt: '2026-04-15T10:00:00Z',
        },
        {
          cardId: 'older',
          title: 'Task B',
          columnId: 'col1',
          createdAt: '2026-04-15T09:00:00Z',
        },
      ]
      const result = searchCards('task', cards)
      expect(result[0].cardId).toBe('newer') // newer first
      expect(result[1].cardId).toBe('older')
    })

    it('should sort by cardId ascending when score and date equal', () => {
      const cards: Card[] = [
        {
          cardId: 'c-z',
          title: 'Task',
          columnId: 'col1',
          createdAt: '2026-04-15T10:00:00Z',
        },
        {
          cardId: 'c-a',
          title: 'Task',
          columnId: 'col1',
          createdAt: '2026-04-15T10:00:00Z',
        },
      ]
      const result = searchCards('task', cards)
      expect(result[0].cardId).toBe('c-a') // ascending by ID
      expect(result[1].cardId).toBe('c-z')
    })

    it('should maintain deterministic order across multiple runs', () => {
      const result1 = searchCards('auth', mockCards)
      const result2 = searchCards('auth', mockCards)
      expect(result1.map((r) => r.cardId)).toEqual(result2.map((r) => r.cardId))
    })
  })

  describe('limits', () => {
    it('should respect maxResults parameter (default 100)', () => {
      const manyCards = Array.from({ length: 150 }, (_, i) => ({
        cardId: `c${i}`,
        title: 'test',
        columnId: 'col1',
      }))
      const result = searchCards('test', manyCards)
      expect(result).toHaveLength(100)
    })

    it('should respect custom maxResults', () => {
      const result = searchCards('auth', mockCards, 2)
      expect(result).toHaveLength(2)
    })

    it('should return all results if under limit', () => {
      const result = searchCards('auth', mockCards, 100)
      expect(result.length).toBeLessThanOrEqual(100)
    })

    it('should expose totalMatched beyond maxResults via searchCardsWithTotal', () => {
      const manyCards = Array.from({ length: 150 }, (_, i) => ({
        cardId: `c${i}`,
        title: 'test',
        columnId: 'col1',
      }))
      const { results, totalMatched } = searchCardsWithTotal('test', manyCards, 100)
      expect(results).toHaveLength(100)
      expect(totalMatched).toBe(150)
    })
  })

  describe('case insensitivity', () => {
    it('should be case-insensitive for title search', () => {
      const resultLower = searchCards('auth', mockCards)
      const resultUpper = searchCards('AUTH', mockCards)
      const resultMixed = searchCards('AuTh', mockCards)
      expect(resultLower.length).toBe(resultUpper.length)
      expect(resultLower.length).toBe(resultMixed.length)
    })

    it('should be case-insensitive for description search', () => {
      const resultLower = searchCards('implement', mockCards)
      const resultUpper = searchCards('IMPLEMENT', mockCards)
      expect(resultLower.length).toBe(resultUpper.length)
    })
  })

  describe('edge cases', () => {
    it('should return empty array for empty query', () => {
      const result = searchCards('', mockCards)
      expect(result).toEqual([])
    })

    it('should return empty array for whitespace-only query', () => {
      const result = searchCards('   ', mockCards)
      expect(result).toEqual([])
    })

    it('should handle empty cards array', () => {
      const result = searchCards('auth', [])
      expect(result).toEqual([])
    })

    it('should handle cards without optional fields', () => {
      const cards: Card[] = [
        { cardId: 'c1', title: 'Task', columnId: 'col1' },
        { cardId: 'c2', title: 'Another Task', columnId: 'col2' },
      ]
      const result = searchCards('task', cards)
      expect(result).toHaveLength(2)
    })

    it('should handle query with special characters', () => {
      const cards: Card[] = [
        {
          cardId: 'c1',
          title: 'Fix: [BUG] #123',
          columnId: 'col1',
        },
      ]
      const result = searchCards('[BUG]', cards)
      expect(result).toHaveLength(1)
    })

    it('should handle unicode in query', () => {
      const cards: Card[] = [
        {
          cardId: 'c1',
          title: 'Implementar autenticação',
          columnId: 'col1',
        },
      ]
      const result = searchCards('autenticação', cards)
      expect(result).toHaveLength(1)
    })

    it('should handle cards with very long descriptions', () => {
      const longDesc = 'a'.repeat(10000)
      const cards: Card[] = [
        {
          cardId: 'c1',
          title: 'Task',
          description: `test ${longDesc} content`,
          columnId: 'col1',
        },
      ]
      const result = searchCards('test', cards)
      expect(result).toHaveLength(1)
    })

    it('should not fail with cards missing createdAt', () => {
      const cards: Card[] = [
        { cardId: 'c1', title: 'Task A', columnId: 'col1' },
        { cardId: 'c2', title: 'Task B', columnId: 'col1', createdAt: '2026-04-15T10:00:00Z' },
      ]
      const result = searchCards('task', cards)
      expect(result).toHaveLength(2)
    })
  })

  describe('result structure', () => {
    it('should return CardSearchResult with all expected fields', () => {
      const result = searchCards('auth', mockCards)
      expect(result[0]).toHaveProperty('cardId')
      expect(result[0]).toHaveProperty('title')
      expect(result[0]).toHaveProperty('description')
      expect(result[0]).toHaveProperty('columnId')
      expect(result[0]).toHaveProperty('score')
    })

    it('should include optional fields when present', () => {
      const result = searchCards('auth', mockCards)
      const cardWithDate = result.find((r) => r.plannedDate)
      expect(cardWithDate?.plannedDate).toBeDefined()
    })

    it('should omit optional fields when absent', () => {
      const cards: Card[] = [
        { cardId: 'c1', title: 'test', columnId: 'col1' },
      ]
      const result = searchCards('test', cards)
      expect(result[0].plannedDate).toBeUndefined()
      expect(result[0].plannedHours).toBeUndefined()
    })
  })

  describe('integration tests', () => {
    it('should handle real-world search scenario', () => {
      const result = searchCards('auth', mockCards)
      expect(result.length).toBeGreaterThan(0)
      // First result should have highest score
      const firstScore = result[0].score
      const allScoresAtLeast = result.every((r) => r.score <= firstScore)
      expect(allScoresAtLeast).toBe(true)
    })

    it('should return deterministic results for same query', () => {
      const result1 = searchCards('auth', mockCards)
      const result2 = searchCards('auth', mockCards)
      expect(JSON.stringify(result1)).toEqual(JSON.stringify(result2))
    })
  })
})
