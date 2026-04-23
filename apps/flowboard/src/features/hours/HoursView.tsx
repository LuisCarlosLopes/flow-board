import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyTargetHoursForCardInPeriod } from '../../domain/applyTargetHoursForCardInPeriod'
import {
  aggregateTaskHoursForPeriod,
  type BoardHoursInput,
  type TaskHoursRow,
} from '../../domain/hoursAggregation'
import { isCardArchived } from '../../domain/cardArchive'
import {
  localDayRange,
  localMonthRange,
  localWeekRange,
  type PeriodRange,
} from '../../domain/hoursProjection'
import { GitHubHttpError } from '../../infrastructure/github/client'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import { createBoardRepository } from '../../infrastructure/persistence/boardRepository'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import './HoursView.css'

type PeriodKind = 'day' | 'week' | 'month'
type Scope = 'selected' | 'all'

const DOMAIN_MSG = {
  NO_SEGMENTS:
    'Não há tempo concluído desta tarefa neste período para ajustar. Recarregue a lista.',
  INFEASIBLE_TARGET:
    'Este valor não cabe nos intervalos de trabalho já registrados para este período. Reduza o total ou ajuste o quadro no Kanban.',
  INVALID_TARGET: 'Valor inválido ou acima do máximo permitido para o período selecionado.',
} as const

const MSG_409 = 'O quadro foi alterado em outro lugar. Recarregue e tente salvar novamente.'

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
  const [archivedKeys, setArchivedKeys] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [edit, setEdit] = useState<TaskHoursRow | null>(null)
  const [hoursDraft, setHoursDraft] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [modalError, setModalError] = useState('')
  const [persistConflict, setPersistConflict] = useState(false)

  const hoursInputRef = useRef<HTMLInputElement | null>(null)

  const period = useMemo(() => periodFor(periodKind, anchor), [periodKind, anchor])
  const anchorTime = anchor.getTime()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { catalog } = await repo.loadCatalog()
      let entries = catalog.boards.filter((b) => !b.archived)
      if (scope === 'selected') {
        if (!selectedBoardId) {
          setRows([])
          setArchivedKeys(new Set())
          setLoading(false)
          return
        }
        entries = entries.filter((e) => e.boardId === selectedBoardId)
      }
      const docs: BoardDocumentJson[] = []
      const archived = new Set<string>()
      for (const e of entries) {
        const got = await repo.loadBoard(e.boardId)
        if (got) {
          docs.push(got.doc)
          for (const c of got.doc.cards) {
            if (isCardArchived(c)) {
              archived.add(`${got.doc.boardId}:${c.cardId}`)
            }
          }
        }
      }
      const inputs = docs.map(toBoardHoursInput)
      setRows(aggregateTaskHoursForPeriod(inputs, period))
      setArchivedKeys(archived)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados.')
      setRows([])
      setArchivedKeys(new Set())
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

  /* E2 (IPD): mudança de período, âncora ou escopo fecha o modal e descarta edição. */
  /* eslint-disable react-hooks/set-state-in-effect -- sincronização explícita com filtros da vista (guarda de contexto). */
  useEffect(() => {
    setEdit(null)
    setHoursDraft('')
    setModalError('')
    setSaveBusy(false)
    setPersistConflict(false)
  }, [periodKind, anchorTime, scope])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!edit) {
      return
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setEdit(null)
        setModalError('')
        setHoursDraft('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [edit])

  useEffect(() => {
    if (edit && hoursInputRef.current) {
      const id = window.requestAnimationFrame(() => {
        hoursInputRef.current?.focus()
        hoursInputRef.current?.select()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [edit])

  const totalMs = useMemo(() => rows.reduce((acc, r) => acc + r.durationMs, 0), [rows])

  function openEdit(row: TaskHoursRow) {
    setModalError('')
    setPersistConflict(false)
    setEdit(row)
    setHoursDraft((row.durationMs / 3_600_000).toFixed(2))
  }

  function closeEdit() {
    setEdit(null)
    setHoursDraft('')
    setModalError('')
    setSaveBusy(false)
  }

  async function handleSaveHours() {
    if (!edit) {
      return
    }
    setModalError('')
    const normalized = hoursDraft.trim().replace(',', '.')
    const hours = Number(normalized)
    if (!Number.isFinite(hours) || hours < 0) {
      setModalError('Informe um número de horas válido (≥ 0).')
      return
    }
    const targetMs = Math.round(hours * 3_600_000)
    setSaveBusy(true)
    try {
      const loaded = await repo.loadBoard(edit.boardId)
      if (!loaded) {
        setModalError('Não foi possível carregar o quadro. Tente novamente.')
        return
      }
      const { doc, sha } = loaded
      const card = doc.cards.find((c) => c.cardId === edit.cardId)
      if (!card) {
        setModalError('Tarefa não encontrada no quadro.')
        return
      }
      if (isCardArchived(card)) {
        setModalError('Esta tarefa está arquivada e não pode ser editada aqui.')
        return
      }
      const cardSegments = doc.timeSegments
        .filter((s) => s.cardId === edit.cardId)
        .map((s) => ({
          segmentId: s.segmentId,
          cardId: s.cardId,
          startMs: s.startMs,
          endMs: s.endMs,
        }))
      const cardCompleted = doc.cardTimeState[edit.cardId]?.completed ?? []
      const result = applyTargetHoursForCardInPeriod({
        cardId: edit.cardId,
        period,
        targetMs,
        cardSegments,
        cardCompleted,
        workingHours: doc.workingHours,
      })
      if (!result.ok) {
        setModalError(DOMAIN_MSG[result.code])
        return
      }
      const nextDoc = structuredClone(doc)
      const boardIdDoc = doc.boardId
      const others = nextDoc.timeSegments.filter((s) => s.cardId !== edit.cardId)
      nextDoc.timeSegments = [
        ...others,
        ...result.nextSegments.map((s) => ({
          segmentId: s.segmentId,
          cardId: s.cardId,
          boardId: boardIdDoc,
          startMs: s.startMs,
          endMs: s.endMs,
        })),
      ]
      const prevCts = nextDoc.cardTimeState[edit.cardId]
      const nextCompleted = result.nextCompleted
      const hasActive = prevCts?.activeStartMs !== undefined
      if (nextCompleted.length === 0 && !hasActive) {
        delete nextDoc.cardTimeState[edit.cardId]
      } else {
        nextDoc.cardTimeState[edit.cardId] = {
          ...prevCts,
          completed: nextCompleted,
        }
      }
      await repo.saveBoard(edit.boardId, nextDoc, sha)
      closeEdit()
      await load()
    } catch (e) {
      if (e instanceof GitHubHttpError && e.status === 409) {
        closeEdit()
        setPersistConflict(true)
        await load()
      } else {
        setModalError(e instanceof Error ? e.message : 'Falha ao salvar no GitHub.')
      }
    } finally {
      setSaveBusy(false)
    }
  }

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

        {persistConflict ? (
          <div className="fb-hours__err" role="alert" data-testid="hours-edit-error">
            <p className="fb-hours__conflict-text">{MSG_409}</p>
            <button
              type="button"
              className="fb-hours__retry"
              data-testid="hours-edit-retry"
              onClick={() => {
                setPersistConflict(false)
                void load()
              }}
            >
              Recarregar e tentar de novo
            </button>
          </div>
        ) : null}

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
                  <th scope="col" className="fb-hours__actions">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const archived = archivedKeys.has(`${r.boardId}:${r.cardId}`)
                  return (
                    <tr key={`${r.boardId}:${r.cardId}`}>
                      <td>{r.cardTitle}</td>
                      <td>{r.boardTitle}</td>
                      <td className="fb-hours__num">{formatHours(r.durationMs)}</td>
                      <td className="fb-hours__actions">
                        <button
                          type="button"
                          className="fb-hours__edit-btn"
                          disabled={archived}
                          title={
                            archived
                              ? 'Tarefa arquivada: edição de horas desabilitada.'
                              : 'Editar total de horas no período atual'
                          }
                          aria-label={`Editar tempo no período para ${r.cardTitle}`}
                          data-testid="hours-row-edit"
                          data-board-id={r.boardId}
                          data-card-id={r.cardId}
                          onClick={() => {
                            if (!archived) {
                              openEdit(r)
                            }
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <strong>Total</strong>
                  </td>
                  <td className="fb-hours__num">
                    <strong>{formatHours(totalMs)}</strong>
                  </td>
                  <td className="fb-hours__actions" aria-hidden="true" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {edit ? (
        <div className="fb-hours-modal-root">
          {/* Fundo decorativo (aria-hidden); o diálogo é irmão para permanecer na árvore de acessibilidade. */}
          <div className="fb-hours-modal-backdrop" aria-hidden="true" />
          <div
            className="fb-hours-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hours-edit-title"
            data-testid="hours-edit-modal"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="fb-hours-modal__header">
              <h2 id="hours-edit-title" className="fb-hours-modal__title">
                Editar horas no período
              </h2>
            </div>
            <p className="fb-hours-modal__meta">
              <strong>{edit.cardTitle}</strong>
              <span className="fb-hours-modal__sep">·</span>
              <span>{edit.boardTitle}</span>
            </p>
            <p className="fb-hours-modal__current">
              Tempo atual neste período: <strong>{formatHours(edit.durationMs)}</strong>
            </p>
            <label className="fb-hours-modal__label">
              Novo total (horas decimais)
              <input
                ref={hoursInputRef}
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                className="fb-hours-modal__input"
                data-testid="hours-edit-input"
                value={hoursDraft}
                onChange={(ev) => setHoursDraft(ev.target.value)}
                disabled={saveBusy}
              />
            </label>
            {modalError ? (
              <div className="fb-hours-modal__err" role="alert" data-testid="hours-edit-error">
                {modalError}
              </div>
            ) : null}
            <div className="fb-hours-modal__actions">
              <button
                type="button"
                className="fb-hours-modal__btn fb-hours-modal__btn--ghost"
                data-testid="hours-edit-cancel"
                onClick={() => closeEdit()}
                disabled={saveBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="fb-hours-modal__btn fb-hours-modal__btn--primary"
                data-testid="hours-edit-save"
                onClick={() => void handleSaveHours()}
                disabled={saveBusy}
              >
                {saveBusy ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
