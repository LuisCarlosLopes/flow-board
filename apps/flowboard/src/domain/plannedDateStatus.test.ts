import { describe, expect, it } from 'vitest'
import {
  formatPlannedDateForCard,
  getCalendarDaysOverdue,
  getPlannedDateUiStatus,
  getPlannedDateUiStatusForColumn,
  parseLocalDateOnly,
} from './plannedDateStatus'

describe('parseLocalDateOnly', () => {
  it('parses YYYY-MM-DD as local date', () => {
    const d = parseLocalDateOnly('2026-04-20')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(3)
    expect(d!.getDate()).toBe(20)
  })

  it('returns null for invalid calendar day', () => {
    expect(parseLocalDateOnly('2026-02-30')).toBeNull()
  })

  it('returns null for non ISO date-only', () => {
    expect(parseLocalDateOnly('2026-04-20T12:00:00Z')).toBeNull()
    expect(parseLocalDateOnly('not-a-date')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    const d = parseLocalDateOnly('  2026-04-20  ')
    expect(d).not.toBeNull()
    expect(d!.getDate()).toBe(20)
  })
})

describe('getPlannedDateUiStatus', () => {
  const ref = new Date(2026, 3, 20, 15, 30, 0)

  it('returns none for missing or empty', () => {
    expect(getPlannedDateUiStatus(undefined, ref)).toBe('none')
    expect(getPlannedDateUiStatus('', ref)).toBe('none')
    expect(getPlannedDateUiStatus('   ', ref)).toBe('none')
  })

  it('returns none for invalid string', () => {
    expect(getPlannedDateUiStatus('invalid', ref)).toBe('none')
  })

  it('returns due_today when planned day equals local calendar day of now', () => {
    expect(getPlannedDateUiStatus('2026-04-20', ref)).toBe('due_today')
    expect(getPlannedDateUiStatus('2026-04-20', new Date(2026, 3, 20, 0, 0, 0))).toBe('due_today')
  })

  it('returns scheduled when planned is tomorrow', () => {
    expect(getPlannedDateUiStatus('2026-04-21', ref)).toBe('scheduled')
  })

  it('returns overdue when planned is yesterday', () => {
    expect(getPlannedDateUiStatus('2026-04-19', ref)).toBe('overdue')
  })

  it('accepts ISO date with surrounding whitespace', () => {
    expect(getPlannedDateUiStatus('  2026-04-19  ', ref)).toBe('overdue')
  })
})

describe('getPlannedDateUiStatusForColumn', () => {
  const ref = new Date(2026, 3, 20)

  it('suppresses overdue and due_today when column is done', () => {
    expect(getPlannedDateUiStatusForColumn('2026-04-15', 'done', ref)).toBe('scheduled')
    expect(getPlannedDateUiStatusForColumn('2026-04-20', 'done', ref)).toBe('scheduled')
  })

  it('keeps overdue in in_progress', () => {
    expect(getPlannedDateUiStatusForColumn('2026-04-15', 'in_progress', ref)).toBe('overdue')
  })

  it('keeps due_today in backlog', () => {
    expect(getPlannedDateUiStatusForColumn('2026-04-20', 'backlog', ref)).toBe('due_today')
  })

  it('does not change scheduled in done', () => {
    expect(getPlannedDateUiStatusForColumn('2026-04-25', 'done', ref)).toBe('scheduled')
  })
})

describe('getCalendarDaysOverdue', () => {
  const ref = new Date(2026, 3, 20)

  it('returns null when not overdue', () => {
    expect(getCalendarDaysOverdue('2026-04-20', ref)).toBeNull()
    expect(getCalendarDaysOverdue('2026-04-25', ref)).toBeNull()
  })

  it('returns days between planned and today', () => {
    expect(getCalendarDaysOverdue('2026-04-19', ref)).toBe(1)
    expect(getCalendarDaysOverdue('2026-04-15', ref)).toBe(5)
  })

  it('uses calendar days across month boundaries', () => {
    const endOfMarch = new Date(2026, 2, 31, 12, 0, 0)
    expect(getCalendarDaysOverdue('2026-02-28', endOfMarch)).toBe(31)
  })

  it('returns null for invalid date', () => {
    expect(getCalendarDaysOverdue('bad', ref)).toBeNull()
  })
})

describe('formatPlannedDateForCard', () => {
  it('formats valid ISO date in pt-BR', () => {
    const s = formatPlannedDateForCard('2026-04-20')
    expect(s).toMatch(/20/)
    expect(s).toMatch(/2026/)
    expect(s.toLowerCase()).toMatch(/abr/)
  })

  it('returns trimmed original when invalid', () => {
    expect(formatPlannedDateForCard('  broken  ')).toBe('broken')
  })
})
