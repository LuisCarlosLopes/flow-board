import { describe, expect, it } from 'vitest'
import { localDayRange } from './hoursProjection'
import {
  clipIntervalToWorkingHours,
  firstWorkingWindowStartMs,
  materializeCountableIntervals,
  partitionActiveWork,
  snapStartForEnteringInProgress,
} from './workingHours'
import type { BoardWorkingHours } from './types'

const wh918: BoardWorkingHours = { enabled: true, startMinute: 9 * 60, endMinute: 18 * 60 }

describe('clipIntervalToWorkingHours', () => {
  it('sem expediente devolve o intervalo', () => {
    const seg = { startMs: 100, endMs: 500 }
    expect(clipIntervalToWorkingHours(seg, undefined)).toEqual([seg])
  })

  it('9–18: 08–20 no mesmo dia vira só 9–18', () => {
    const d = new Date(2026, 3, 20, 8, 0, 0, 0)
    const dayStart = new Date(d)
    dayStart.setHours(0, 0, 0, 0)
    const startMs = dayStart.getTime() + 8 * 3600 * 1000
    const endMs = dayStart.getTime() + 20 * 3600 * 1000
    const out = clipIntervalToWorkingHours({ startMs, endMs }, wh918)
    expect(out).toHaveLength(1)
    const wStart = dayStart.getTime() + 9 * 3600 * 1000
    const wEndLast = dayStart.getTime() + 18 * 3600 * 1000 - 1
    expect(out[0]!.startMs).toBe(wStart)
    expect(out[0]!.endMs).toBe(wEndLast)
  })
})

describe('materializeCountableIntervals', () => {
  it('sem wh cruza meia-noite em dois dias civis', () => {
    const a = new Date(2026, 3, 20, 22, 0, 0, 0).getTime()
    const b = new Date(2026, 3, 21, 2, 0, 0, 0).getTime()
    const segs = materializeCountableIntervals(a, b, undefined)
    expect(segs.length).toBe(2)
    const d0 = new Date(segs[0]!.startMs)
    const d1 = new Date(segs[1]!.startMs)
    expect(d0.getDate()).not.toBe(d1.getDate())
    for (const s of segs) {
      const r0 = localDayRange(new Date(s.startMs))
      expect(s.startMs).toBeGreaterThanOrEqual(r0.startMs)
      expect(s.endMs).toBeLessThanOrEqual(r0.endMs)
    }
  })

  it('com wh 9–18 em dois dias gera dois segmentos dentro da janela', () => {
    const a = new Date(2026, 3, 20, 10, 0, 0, 0).getTime()
    const b = new Date(2026, 3, 21, 10, 0, 0, 0).getTime()
    const segs = materializeCountableIntervals(a, b, wh918)
    expect(segs.length).toBe(2)
  })
})

describe('partitionActiveWork', () => {
  it('activeStart no futuro mantém valor', () => {
    const now = 1000
    const r = partitionActiveWork(2000, now, undefined)
    expect(r.nextActiveStartMs).toBe(2000)
    expect(r.completedSegments).toHaveLength(0)
  })
})

describe('firstWorkingWindowStartMs', () => {
  it('após expediente usa meia-noite do dia civil seguinte (não soma 24h fixos)', () => {
    const from = new Date(2026, 3, 20, 19, 0, 0, 0).getTime()
    const nextMidnight = new Date(from)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)
    const expected = nextMidnight.getTime() + wh918.startMinute * 60 * 1000
    expect(firstWorkingWindowStartMs(from, wh918)).toBe(expected)
  })
})

describe('snapStartForEnteringInProgress', () => {
  it('sem wh usa agora', () => {
    const t = 5000
    expect(snapStartForEnteringInProgress(t, undefined)).toBe(t)
  })

  it('antes da janela usa início do expediente', () => {
    const d = new Date(2026, 3, 20, 7, 30, 0, 0)
    const dayStart = new Date(d)
    dayStart.setHours(0, 0, 0, 0)
    const expected = dayStart.getTime() + 9 * 3600 * 1000
    expect(snapStartForEnteringInProgress(d.getTime(), wh918)).toBe(expected)
  })
})
