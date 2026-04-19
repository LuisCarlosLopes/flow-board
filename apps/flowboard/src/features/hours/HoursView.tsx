import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  aggregateTaskHoursForPeriod,
  type BoardHoursInput,
  type TaskHoursRow,
} from '../../domain/hoursAggregation'
import {
  localDayRange,
  localMonthRange,
  localWeekRange,
  type PeriodRange,
} from '../../domain/hoursProjection'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import { createBoardRepository } from '../../infrastructure/persistence/boardRepository'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import './HoursView.css'

type PeriodKind = 'day' | 'week' | 'month'
type Scope = 'selected' | 'all'

function periodFor(kind: PeriodKind, anchor: Date): PeriodRange {
  switch (kind) {
    case 'day':
      return localDayRange(anchor)
    case 'week':
      return localWeekRange(anchor)
    case 'month':
      return localMonthRange(anchor)
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

function toBoardHoursInput(doc: BoardDocumentJson): BoardHoursInput {
  return {
    boardId: doc.boardId,
    title: doc.title,
    cards: doc.cards.map((c) => ({ cardId: c.cardId, title: c.title })),
    segments: doc.timeSegments.map((s) => ({
      cardId: s.cardId,
      startMs: s.startMs,
      endMs: s.endMs,
    })),
  }
}

function dateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateInput(v: string): Date {
  const [y, mo, da] = v.split('-').map(Number)
  return new Date(y!, mo! - 1, da!, 12, 0, 0, 0)
}

function shiftAnchor(anchor: Date, kind: PeriodKind, dir: -1 | 1): Date {
  const d = new Date(anchor)
  if (kind === 'day') {
    d.setDate(d.getDate() + dir)
  } else if (kind === 'week') {
    d.setDate(d.getDate() + 7 * dir)
  } else {
    d.setMonth(d.getMonth() + dir)
  }
  return d
}

function periodDescription(kind: PeriodKind, anchor: Date): string {
  if (kind === 'week') {
    const r = localWeekRange(anchor)
    const a = new Date(r.startMs)
    const b = new Date(r.endMs)
    return `${a.toLocaleDateString('pt-BR')} – ${b.toLocaleDateString('pt-BR')}`
  }
  if (kind === 'month') {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(anchor)
  }
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(anchor)
}

function formatHours(durationMs: number): string {
  return `${(durationMs / 3_600_000).toFixed(2)} h`
}

type Props = {
  session: FlowBoardSession
  selectedBoardId: string | null
}

export function HoursView({ session, selectedBoardId }: Props) {
  const client = useMemo(() => createClientFromSession(session), [session])
  const repo = useMemo(() => createBoardRepository(client), [client])

  const [periodKind, setPeriodKind] = useState<PeriodKind>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [scope, setScope] = useState<Scope>('all')
  const [rows, setRows] = useState<TaskHoursRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const period = useMemo(() => periodFor(periodKind, anchor), [periodKind, anchor])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { catalog } = await repo.loadCatalog()
      let entries = catalog.boards.filter((b) => !b.archived)
      if (scope === 'selected') {
        if (!selectedBoardId) {
          setRows([])
          setLoading(false)
          return
        }
        entries = entries.filter((e) => e.boardId === selectedBoardId)
      }
      const docs: BoardDocumentJson[] = []
      for (const e of entries) {
        const got = await repo.loadBoard(e.boardId)
        if (got) {
          docs.push(got.doc)
        }
      }
      const inputs = docs.map(toBoardHoursInput)
      setRows(aggregateTaskHoursForPeriod(inputs, period))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [repo, scope, selectedBoardId, period])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(t)
  }, [load])

  const totalMs = useMemo(() => rows.reduce((acc, r) => acc + r.durationMs, 0), [rows])

  return (
    <section className="fb-hours" data-testid="hours-view" aria-labelledby="fb-hours-title">
      <div className="fb-hours-layout">
        <header className="fb-hours-header">
          <div>
            <h2 id="fb-hours-title" className="fb-hours__title">
              Horas no período
            </h2>
            <p className="fb-hours__lead">
              Soma dos segmentos concluídos (Em progresso → Concluído), filtrados pelo intervalo.
            </p>
            <p className="fb-hours__period" role="status">
              {periodDescription(periodKind, anchor)}
            </p>
          </div>
          <div className="fb-hours__period-toggle" role="group" aria-label="Período">
            {(['day', 'week', 'month'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={periodKind === k ? 'fb-hours__period-btn is-on' : 'fb-hours__period-btn'}
                aria-pressed={periodKind === k}
                onClick={() => setPeriodKind(k)}
                data-testid={`hours-period-${k}`}
              >
                {k === 'day' ? 'Dia' : k === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </header>

      <div className="fb-hours__filters">
        <div className="fb-hours__nav-date">
          <button
            type="button"
            className="fb-hours__arrow"
            aria-label="Período anterior"
            onClick={() => setAnchor((a) => shiftAnchor(a, periodKind, -1))}
          >
            ‹
          </button>
          <label className="fb-hours__date-label">
            <span className="fb-hours__sr-only">Data de referência</span>
            <input
              type="date"
              value={dateInputValue(anchor)}
              onChange={(ev) => setAnchor(parseDateInput(ev.target.value))}
              data-testid="hours-anchor-date"
            />
          </label>
          <button
            type="button"
            className="fb-hours__arrow"
            aria-label="Próximo período"
            onClick={() => setAnchor((a) => shiftAnchor(a, periodKind, 1))}
          >
            ›
          </button>
        </div>

        <div className="fb-hours__group" role="group" aria-label="Escopo">
          <button
            type="button"
            className={scope === 'all' ? 'fb-hours__chip fb-hours__chip--on' : 'fb-hours__chip'}
            onClick={() => setScope('all')}
            data-testid="hours-scope-all"
          >
            Todos os quadros
          </button>
          <button
            type="button"
            className={scope === 'selected' ? 'fb-hours__chip fb-hours__chip--on' : 'fb-hours__chip'}
            onClick={() => setScope('selected')}
            disabled={!selectedBoardId}
            title={!selectedBoardId ? 'Selecione um quadro na lista acima' : undefined}
            data-testid="hours-scope-selected"
          >
            Quadro atual
          </button>
        </div>
      </div>

      {error ? (
        <div className="fb-hours__err" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="fb-hours__loading">Carregando…</p>
      ) : scope === 'selected' && !selectedBoardId ? (
        <p className="fb-hours__empty">
          Selecione um quadro no seletor da barra acima para usar o escopo &quot;Quadro atual&quot;.
        </p>
      ) : rows.length === 0 ? (
        <p className="fb-hours__empty">Nenhum tempo concluído neste período (conforme data de conclusão dos segmentos).</p>
      ) : (
        <div className="fb-hours__table-wrap">
          <table className="fb-hours__table">
            <thead>
              <tr>
                <th scope="col">Tarefa</th>
                <th scope="col">Quadro</th>
                <th scope="col" className="fb-hours__num">
                  Tempo
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.boardId}:${r.cardId}`}>
                  <td>{r.cardTitle}</td>
                  <td>{r.boardTitle}</td>
                  <td className="fb-hours__num">{formatHours(r.durationMs)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Total</strong>
                </td>
                <td className="fb-hours__num">
                  <strong>{formatHours(totalMs)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      </div>
    </section>
  )
}
