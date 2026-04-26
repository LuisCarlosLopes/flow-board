import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { aggregateTaskHoursForPeriod, type BoardHoursInput } from './hoursAggregation'
import type { PeriodRange } from './hoursProjection'
import {
  TASK_HOURS_CSV_HEADER,
  buildTaskHoursCsv,
  escapeCsvField,
  formatHoursPtBr,
  formatLocalDatePtBrFromMs,
  formatLocalDateYmdFromMs,
  formatSegmentEndRangePtBr,
  periodToCsvFields,
} from './taskHoursCsv'

const prevTz = process.env.TZ

beforeAll(() => {
  process.env.TZ = 'UTC'
})

afterAll(() => {
  process.env.TZ = prevTz
})

describe('formatHoursPtBr', () => {
  it('formats zero as 0,00', () => {
    expect(formatHoursPtBr(0)).toBe('0,00')
  })

  it('uses comma decimal and two places', () => {
    expect(formatHoursPtBr(3_600_000)).toBe('1,00')
    expect(formatHoursPtBr(5_400_000)).toBe('1,50')
    expect(formatHoursPtBr(44_100_000)).toBe('12,25')
  })
})

describe('escapeCsvField', () => {
  it('quotes semicolon, quote, CR, LF', () => {
    expect(escapeCsvField('a;b')).toBe('"a;b"')
    expect(escapeCsvField('a"b')).toBe('"a""b"')
    expect(escapeCsvField('a\nb')).toBe('"a\nb"')
    expect(escapeCsvField('a\rb')).toBe('"a\rb"')
    expect(escapeCsvField('a\r\nb')).toBe('"a\r\nb"')
  })

  it('leaves plain text unquoted', () => {
    expect(escapeCsvField('plain')).toBe('plain')
  })
})

describe('periodToCsvFields', () => {
  it('maps PeriodRange to local civil YYYY-MM-DD (UTC)', () => {
    const period: PeriodRange = {
      startMs: Date.UTC(2026, 3, 20, 0, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 26, 23, 59, 59, 999),
    }
    expect(periodToCsvFields('week', period)).toEqual({
      periodo_tipo: 'week',
      periodo_inicio: '2026-04-20',
      periodo_fim: '2026-04-26',
    })
  })
})

describe('formatLocalDateYmdFromMs', () => {
  it('matches UTC calendar day for known instant', () => {
    expect(formatLocalDateYmdFromMs(Date.UTC(2026, 0, 5, 15, 30, 0))).toBe('2026-01-05')
  })
})

describe('formatSegmentEndRangePtBr', () => {
  it('shows one label when min equals max', () => {
    const t = Date.UTC(2026, 3, 22, 12, 0, 0)
    expect(formatSegmentEndRangePtBr(t, t)).toBe(formatLocalDatePtBrFromMs(t))
  })

  it('joins two pt-BR labels with en dash when min differs from max', () => {
    const a = Date.UTC(2026, 3, 20, 12, 0, 0)
    const b = Date.UTC(2026, 3, 26, 12, 0, 0)
    expect(formatSegmentEndRangePtBr(a, b)).toBe(
      `${formatLocalDatePtBrFromMs(a)} – ${formatLocalDatePtBrFromMs(b)}`,
    )
  })
})

describe('buildTaskHoursCsv (CA-09, CA-06)', () => {
  it('starts with BOM and uses CRLF; header exact §7.1 order', () => {
    const period: PeriodRange = {
      startMs: Date.UTC(2026, 3, 20, 0, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 26, 23, 59, 59, 999),
    }
    const csv = buildTaskHoursCsv({
      periodKind: 'week',
      period,
      rows: [],
      archivedCardKeys: new Set(),
    })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const firstLine = csv.slice(1).split('\r\n')[0]
    expect(firstLine).toBe(TASK_HOURS_CSV_HEADER)
    expect(csv.includes('\n\r')).toBe(false)
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('serializes row with escaping like TSD example', () => {
    const period: PeriodRange = {
      startMs: Date.UTC(2026, 3, 20, 0, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 26, 23, 59, 59, 999),
    }
    const csv = buildTaskHoursCsv({
      periodKind: 'week',
      period,
      rows: [
        {
          boardId: 'b-2',
          boardTitle: 'Operação; suporte',
          cardId: 'c-44',
          cardTitle: 'Ajustar "SLA"',
          durationMs: 4_500_000,
          segmentEndMsMin: Date.UTC(2026, 3, 22, 18, 0, 0),
          segmentEndMsMax: Date.UTC(2026, 3, 22, 18, 0, 0),
        },
      ],
      archivedCardKeys: new Set(['b-2:c-44']),
    })
    const body = csv.slice(1).split('\r\n')
    expect(body[0]).toBe(TASK_HOURS_CSV_HEADER)
    const row = body[1]!
    expect(row).toContain('"Operação; suporte"')
    expect(row).toContain('"Ajustar ""SLA"""')
    expect(row).toContain(';true;')
    expect(row.endsWith('1,25')).toBe(true)
  })

  it('preserves aggregate row order (RNB-06)', () => {
    const period: PeriodRange = {
      startMs: 0,
      endMs: 86_400_000,
    }
    const boards: BoardHoursInput[] = [
      {
        boardId: 'b1',
        title: 'B1',
        cards: [{ cardId: 'c1', title: 'T1' }],
        segments: [{ cardId: 'c1', startMs: 1000, endMs: 1000 + 3_600_000 }],
      },
      {
        boardId: 'b2',
        title: 'B2',
        cards: [{ cardId: 'c2', title: 'T2' }],
        segments: [{ cardId: 'c2', startMs: 2000, endMs: 2000 + 7_200_000 }],
      },
    ]
    const rows = aggregateTaskHoursForPeriod(boards, period)
    const csv = buildTaskHoursCsv({
      periodKind: 'day',
      period,
      rows,
      archivedCardKeys: new Set(),
    })
    const lines = csv.slice(1).trimEnd().split('\r\n')
    expect(lines[1]!.includes('b2')).toBe(true)
    expect(lines[2]!.includes('b1')).toBe(true)
  })
})
