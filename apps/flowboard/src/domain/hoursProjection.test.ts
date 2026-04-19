import { describe, expect, it } from 'vitest'
import {
  localDayRange,
  localMonthRange,
  localWeekRange,
  segmentsCompletedInPeriod,
  sumDurationMs,
} from './hoursProjection'
import type { CompletedSegment } from './types'

describe('segmentsCompletedInPeriod (R09)', () => {
  const segs: CompletedSegment[] = [
    { startMs: 100, endMs: 500 },
    { startMs: 600, endMs: 2000 },
  ]

  it('includes segment whose end is inside range', () => {
    const p = { startMs: 400, endMs: 2500 }
    const r = segmentsCompletedInPeriod(segs, p)
    expect(r.map((s) => s.endMs)).toEqual([500, 2000])
  })

  it('excludes segment completed before period', () => {
    const p = { startMs: 600, endMs: 2000 }
    const r = segmentsCompletedInPeriod(segs, p)
    expect(r).toHaveLength(1)
    expect(r[0]!.endMs).toBe(2000)
  })
})

describe('sumDurationMs', () => {
  it('sums intervals', () => {
    expect(
      sumDurationMs([
        { startMs: 0, endMs: 1000 },
        { startMs: 0, endMs: 500 },
      ]),
    ).toBe(1500)
  })
})

describe('localDayRange', () => {
  it('returns start and end of same calendar day', () => {
    const d = new Date('2026-04-19T15:30:00')
    const r = localDayRange(d)
    const start = new Date(r.startMs)
    const end = new Date(r.endMs)
    expect(start.getDate()).toBe(end.getDate())
    expect(end.getTime() - start.getTime()).toBeGreaterThan(0)
  })
})

describe('localWeekRange', () => {
  it('anchors Monday–Sunday week containing the date', () => {
    const sun = new Date(2026, 3, 19)
    const r = localWeekRange(sun)
    const start = new Date(r.startMs)
    const end = new Date(r.endMs)
    expect(start.getDay()).toBe(1)
    expect(end.getDay()).toBe(0)
    expect(end.getTime() - start.getTime()).toBeGreaterThan(0)
  })
})

describe('localMonthRange', () => {
  it('spans full calendar month', () => {
    const r = localMonthRange(new Date(2026, 3, 15))
    const start = new Date(r.startMs)
    const end = new Date(r.endMs)
    expect(start.getDate()).toBe(1)
    expect(start.getMonth()).toBe(3)
    expect(end.getMonth()).toBe(3)
    expect(end.getDate()).toBeGreaterThanOrEqual(28)
  })
})
