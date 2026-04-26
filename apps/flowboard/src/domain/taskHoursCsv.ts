import type { PeriodRange } from './hoursProjection'
import type { TaskHoursRow } from './hoursAggregation'

export const TASK_HOURS_CSV_HEADER =
  'periodo_tipo;periodo_inicio;periodo_fim;board_id;board_titulo;card_id;card_titulo;card_arquivado;horas_totais' as const

export type CsvPeriodKind = 'day' | 'week' | 'month'

/** Local civil calendar YYYY-MM-DD for instant `ms` in the runtime timezone. */
export function formatLocalDateYmdFromMs(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local civil date label in pt-BR (same instant semantics as `formatLocalDateYmdFromMs`). */
export function formatLocalDatePtBrFromMs(ms: number): string {
  return new Date(ms).toLocaleDateString('pt-BR')
}

/**
 * Human-readable end-date range for aggregated segments: one day or `a – b` (en dash, like `HoursView` week range).
 */
export function formatSegmentEndRangePtBr(minMs: number, maxMs: number): string {
  if (minMs === maxMs) {
    return formatLocalDatePtBrFromMs(minMs)
  }
  return `${formatLocalDatePtBrFromMs(minMs)} – ${formatLocalDatePtBrFromMs(maxMs)}`
}

export function periodToCsvFields(
  periodKind: CsvPeriodKind,
  period: PeriodRange,
): { periodo_tipo: CsvPeriodKind; periodo_inicio: string; periodo_fim: string } {
  return {
    periodo_tipo: periodKind,
    periodo_inicio: formatLocalDateYmdFromMs(period.startMs),
    periodo_fim: formatLocalDateYmdFromMs(period.endMs),
  }
}

/** Hours from duration in ms; two decimals; comma decimal; 0 → 0,00 */
export function formatHoursPtBr(durationMs: number): string {
  const hours = durationMs / 3_600_000
  return hours.toFixed(2).replace('.', ',')
}

/**
 * @MindSpec: CSV field per TSD §7.3 — quote when `;` `"` CR or LF; escape `"` as `""`.
 */
export function escapeCsvField(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export type BuildTaskHoursCsvParams = {
  periodKind: CsvPeriodKind
  period: PeriodRange
  rows: TaskHoursRow[]
  archivedCardKeys: ReadonlySet<string>
}

/**
 * @MindContext: Public CSV contract for task-hour exports (BOM, CRLF, `;`, pt-BR hours).
 * @MindFlow: period columns → header → one row per TaskHoursRow (same order as input).
 */
export function buildTaskHoursCsv({
  periodKind,
  period,
  rows,
  archivedCardKeys,
}: BuildTaskHoursCsvParams): string {
  const { periodo_tipo, periodo_inicio, periodo_fim } = periodToCsvFields(periodKind, period)
  const lines: string[] = [TASK_HOURS_CSV_HEADER]
  for (const row of rows) {
    const key = `${row.boardId}:${row.cardId}`
    const archived = archivedCardKeys.has(key)
    const cells = [
      String(periodo_tipo),
      periodo_inicio,
      periodo_fim,
      escapeCsvField(row.boardId),
      escapeCsvField(row.boardTitle),
      escapeCsvField(row.cardId),
      escapeCsvField(row.cardTitle),
      archived ? 'true' : 'false',
      formatHoursPtBr(row.durationMs),
    ]
    lines.push(cells.join(';'))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
