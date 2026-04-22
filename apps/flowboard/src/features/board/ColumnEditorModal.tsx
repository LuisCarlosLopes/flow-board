import { useState } from 'react'
import { isCardArchived } from '../../domain/cardArchive'
import type { BoardWorkingHours, Card, Column, ColumnRole } from '../../domain/types'
import { validateColumnLayout } from '../../domain/boardRules'
import './ColumnEditorModal.css'

function minuteToTimeString(m: number): string {
  const h = Math.floor(m / 60)
  const mi = m % 60
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function parseTimeToMinute(s: string): number {
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

type Props = {
  columns: Column[]
  cards: Card[]
  workingHours?: BoardWorkingHours | null
  onClose: () => void
  /** Retorna novas colunas e expediente opcional (desligado = omitir campo no JSON). */
  onApply: (columns: Column[], workingHours?: BoardWorkingHours | null) => void
}

const ROLES: { value: ColumnRole; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'done', label: 'Concluído' },
]

export function ColumnEditorModal({ columns, cards, workingHours, onClose, onApply }: Props) {
  const [draft, setDraft] = useState(() => columns.map((c) => ({ ...c })))
  const [whEnabled, setWhEnabled] = useState(() => !!workingHours?.enabled)
  const [startMinute, setStartMinute] = useState(() => workingHours?.startMinute ?? 9 * 60)
  const [endMinute, setEndMinute] = useState(() => workingHours?.endMinute ?? 18 * 60)
  const [error, setError] = useState('')

  function updateRow(i: number, patch: Partial<Column>) {
    setDraft((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  function moveRow(from: number, to: number) {
    setDraft((rows) => {
      const copy = [...rows]
      const [it] = copy.splice(from, 1)
      copy.splice(to, 0, it!)
      return copy
    })
  }

  function addColumn() {
    setDraft((rows) => [
      ...rows,
      {
        columnId: crypto.randomUUID(),
        label: 'Nova coluna',
        role: 'backlog',
      },
    ])
  }

  function removeRow(index: number) {
    const col = draft[index]
    if (!col) {
      return
    }
    const count = cards.filter((c) => c.columnId === col.columnId && !isCardArchived(c)).length
    if (count > 0) {
      const ok = window.confirm(
        `Esta coluna tem ${count} card(s). Os cards serão movidos para a primeira coluna Backlog restante. Continuar?`,
      )
      if (!ok) {
        return
      }
    }
    setDraft((rows) => rows.filter((_, j) => j !== index))
  }

  function handleSubmit() {
    const v = validateColumnLayout(draft)
    if (!v.ok) {
      setError(v.message)
      return
    }
    if (whEnabled) {
      if (startMinute >= endMinute) {
        setError('Horário de trabalho: o início deve ser antes do fim (mesmo dia).')
        return
      }
    }
    setError('')
    const wh: BoardWorkingHours | undefined = whEnabled
      ? { enabled: true, startMinute, endMinute }
      : undefined
    onApply(draft, wh)
    onClose()
  }

  return (
    <div
      className="fb-colmod-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-colmod-title"
      data-testid="column-editor-dialog"
    >
      <div className="fb-colmod">
        <h2 id="fb-colmod-title">Colunas do quadro</h2>
        <p className="fb-colmod__hint">
          Deve haver ≥3 colunas, ≥1 Backlog, exatamente 1 Em progresso e 1 Concluído.
        </p>
        <div className="fb-colmod__wh">
          <h3 className="fb-colmod__wh-title">Horário de trabalho</h3>
          <p className="fb-colmod__wh-desc">
            Quando ativo, só conta tempo nessa faixa (fuso local do navegador). Desligado = 24h como antes.
          </p>
          <label className="fb-colmod__wh-toggle">
            <input
              type="checkbox"
              checked={whEnabled}
              onChange={(e) => setWhEnabled(e.target.checked)}
              data-testid="working-hours-enabled"
            />
            <span className="fb-colmod__wh-toggle-text">Limitar apontamentos ao expediente</span>
          </label>
          {whEnabled ? (
            <div className="fb-colmod__wh-times" aria-label="Início e fim do expediente">
              <label className="fb-colmod__field fb-colmod__field--time">
                <span>Início</span>
                <input
                  type="time"
                  step={60}
                  value={minuteToTimeString(startMinute)}
                  onChange={(e) => setStartMinute(parseTimeToMinute(e.target.value))}
                  data-testid="working-hours-start"
                />
              </label>
              <label className="fb-colmod__field fb-colmod__field--time">
                <span>Fim</span>
                <input
                  type="time"
                  step={60}
                  value={minuteToTimeString(endMinute)}
                  onChange={(e) => setEndMinute(parseTimeToMinute(e.target.value))}
                  data-testid="working-hours-end"
                />
              </label>
            </div>
          ) : null}
        </div>
        {error ? (
          <div className="fb-colmod__err" role="alert">
            {error}
          </div>
        ) : null}
        <ul className="fb-colmod__list">
          {draft.map((col, i) => (
            <li key={col.columnId} className="fb-colmod__row">
              <label className="fb-colmod__field">
                <span>Nome</span>
                <input
                  type="text"
                  value={col.label}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  maxLength={200}
                />
              </label>
              <label className="fb-colmod__field">
                <span>Papel</span>
                <select
                  value={col.role}
                  onChange={(e) => updateRow(i, { role: e.target.value as ColumnRole })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="fb-colmod__row-actions">
                <button type="button" disabled={i === 0} onClick={() => moveRow(i, i - 1)} aria-label="Mover para cima">
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i >= draft.length - 1}
                  onClick={() => moveRow(i, i + 1)}
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
                <button type="button" className="fb-colmod__remove" onClick={() => removeRow(i)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="fb-colmod__footer">
          <button type="button" onClick={addColumn}>
            Adicionar coluna
          </button>
          <div className="fb-colmod__footer-right">
            <button type="button" className="fb-colmod__ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="fb-colmod__primary" onClick={handleSubmit}>
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
