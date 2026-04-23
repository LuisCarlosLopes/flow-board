import { describe, expect, it } from 'vitest'
import { applyTargetHoursForCardInPeriod, type BoardTimeSegment } from './applyTargetHoursForCardInPeriod'
import { localDayRange } from './hoursProjection'
import type { BoardWorkingHours } from './types'

const CARD = 'card-1'

function dayPeriod(y: number, m0: number, d: number) {
  return localDayRange(new Date(y, m0, d, 12, 0, 0, 0))
}

function sumInPeriodDuration(segs: BoardTimeSegment[], period: { startMs: number; endMs: number }) {
  return segs
    .filter((s) => s.endMs >= period.startMs && s.endMs <= period.endMs)
    .reduce((a, s) => a + (s.endMs - s.startMs), 0)
}

describe('applyTargetHoursForCardInPeriod', () => {
  it('happy path: two segments in period, target between 0 and S, sums match and completed rebuilds', () => {
    const period = dayPeriod(2026, 3, 22)
    const ds = period.startMs
    const s1: BoardTimeSegment = {
      segmentId: 's1',
      cardId: CARD,
      startMs: ds + 10 * 3_600_000,
      endMs: ds + 11 * 3_600_000,
    }
    const s2: BoardTimeSegment = {
      segmentId: 's2',
      cardId: CARD,
      startMs: ds + 14 * 3_600_000,
      endMs: ds + 16 * 3_600_000,
    }
    const targetMs = 2 * 3_600_000
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs,
      cardSegments: [s1, s2],
      cardCompleted: [],
      workingHours: null,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(sumInPeriodDuration(r.nextSegments, period)).toBe(targetMs)
    const d1 = r.nextSegments.find((x) => x.segmentId === 's1')!.endMs - s1.startMs
    const d2 = r.nextSegments.find((x) => x.segmentId === 's2')!.endMs - s2.startMs
    expect(d1 + d2).toBe(targetMs)
    const expectedCompleted = [...r.nextSegments]
      .sort((a, b) => (a.startMs !== b.startMs ? a.startMs - b.startMs : a.segmentId.localeCompare(b.segmentId)))
      .map((x) => ({ startMs: x.startMs, endMs: x.endMs }))
    expect(r.nextCompleted).toEqual(expectedCompleted)
  })

  it('rounding: remainder forces exact sum to targetMs', () => {
    const period = dayPeriod(2026, 3, 10)
    const ds = period.startMs
    const a: BoardTimeSegment = {
      segmentId: 'a',
      cardId: CARD,
      startMs: ds + 1 * 3_600_000,
      endMs: ds + 2 * 3_600_000,
    }
    const b: BoardTimeSegment = {
      segmentId: 'b',
      cardId: CARD,
      startMs: ds + 3 * 3_600_000,
      endMs: ds + 5 * 3_600_000,
    }
    const targetMs = 7
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs,
      cardSegments: [a, b],
      cardCompleted: [],
      workingHours: null,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    const d1 = r.nextSegments.find((x) => x.segmentId === 'a')!.endMs - a.startMs
    const d2 = r.nextSegments.find((x) => x.segmentId === 'b')!.endMs - b.startMs
    expect(d1 + d2).toBe(7)
  })

  it('targetMs = 0 removes only R09-selected segments; out-of-period segment stays', () => {
    const period = dayPeriod(2026, 2, 5)
    const ds = period.startMs
    const in1: BoardTimeSegment = {
      segmentId: 'in1',
      cardId: CARD,
      startMs: ds + 8 * 3_600_000,
      endMs: ds + 9 * 3_600_000,
    }
    const in2: BoardTimeSegment = {
      segmentId: 'in2',
      cardId: CARD,
      startMs: ds + 10 * 3_600_000,
      endMs: ds + 10 * 3_600_000 + 30 * 60_000,
    }
    const out: BoardTimeSegment = {
      segmentId: 'out',
      cardId: CARD,
      startMs: ds - 5 * 3_600_000,
      endMs: ds - 1,
    }
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs: 0,
      cardSegments: [out, in1, in2],
      cardCompleted: [
        { startMs: out.startMs, endMs: out.endMs },
        { startMs: in1.startMs, endMs: in1.endMs },
      ],
      workingHours: null,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.nextSegments.map((s) => s.segmentId).sort()).toEqual(['out'])
    expect(r.nextCompleted).toEqual([{ startMs: out.startMs, endMs: out.endMs }])
  })

  it('NO_SEGMENTS when no segment end falls in period', () => {
    const period = dayPeriod(2026, 4, 1)
    const ds = period.startMs
    const seg: BoardTimeSegment = {
      segmentId: 'x',
      cardId: CARD,
      startMs: ds - 4 * 3_600_000,
      endMs: ds - 1,
    }
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs: 3_600_000,
      cardSegments: [seg],
      cardCompleted: [],
      workingHours: null,
    })
    expect(r).toEqual({ ok: false, code: 'NO_SEGMENTS' })
  })

  it('INFEASIBLE_TARGET when proportional end exceeds working-hours ceiling', () => {
    const period = dayPeriod(2026, 5, 12)
    const ds = period.startMs
    const wh: BoardWorkingHours = { enabled: true, startMinute: 9 * 60, endMinute: 17 * 60 }
    const wStart = ds + 9 * 3_600_000
    const seg: BoardTimeSegment = {
      segmentId: 'solo',
      cardId: CARD,
      startMs: wStart,
      endMs: wStart + 3_600_000,
    }
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs: 9 * 3_600_000,
      cardSegments: [seg],
      cardCompleted: [],
      workingHours: wh,
    })
    expect(r).toEqual({ ok: false, code: 'INFEASIBLE_TARGET' })
  })

  it('INVALID_TARGET when targetMs exceeds maxTargetMs for period span', () => {
    const period = dayPeriod(2026, 6, 1)
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs: 25 * 3_600_000,
      cardSegments: [
        {
          segmentId: 'z',
          cardId: CARD,
          startMs: period.startMs + 3_600_000,
          endMs: period.startMs + 4 * 3_600_000,
        },
      ],
      cardCompleted: [],
      workingHours: null,
    })
    expect(r.ok).toBe(false)
    if (r.ok) {
      return
    }
    expect(r.code).toBe('INVALID_TARGET')
  })

  it('INVALID_TARGET for non-integer targetMs', () => {
    const period = dayPeriod(2026, 1, 1)
    const r = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs: 1.2,
      cardSegments: [
        {
          segmentId: 'z',
          cardId: CARD,
          startMs: period.startMs + 3_600_000,
          endMs: period.startMs + 4 * 3_600_000,
        },
      ],
      cardCompleted: [],
      workingHours: null,
    })
    expect(r).toEqual({ ok: false, code: 'INVALID_TARGET' })
  })

  it('working hours off allows longer stretch than strict WH on same segment start', () => {
    const period = dayPeriod(2026, 7, 8)
    const ds = period.startMs
    const wh: BoardWorkingHours = { enabled: true, startMinute: 9 * 60, endMinute: 17 * 60 }
    const wStart = ds + 9 * 3_600_000
    const seg: BoardTimeSegment = {
      segmentId: 'solo',
      cardId: CARD,
      startMs: wStart,
      endMs: wStart + 3_600_000,
    }
    const targetMs = 10 * 3_600_000
    const rWh = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs,
      cardSegments: [seg],
      cardCompleted: [],
      workingHours: wh,
    })
    expect(rWh.ok).toBe(false)
    if (rWh.ok) {
      return
    }
    expect(rWh.code).toBe('INFEASIBLE_TARGET')

    const rNo = applyTargetHoursForCardInPeriod({
      cardId: CARD,
      period,
      targetMs,
      cardSegments: [seg],
      cardCompleted: [],
      workingHours: { enabled: false, startMinute: 0, endMinute: 0 },
    })
    expect(rNo.ok).toBe(true)
  })
})
