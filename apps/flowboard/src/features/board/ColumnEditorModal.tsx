import { useState } from 'react'
import type { Card, Column, ColumnRole } from '../../domain/types'
import { validateColumnLayout } from '../../domain/boardRules'
import './ColumnEditorModal.css'

type Props = {
  columns: Column[]
  cards: Card[]
  onClose: () => void
  /** Retorna novas colunas já validadas no pai (persistência). */
  onApply: (columns: Column[]) => void
}

const ROLES: { value: ColumnRole; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'done', label: 'Concluído' },
]

export function ColumnEditorModal({ columns, cards, onClose, onApply }: Props) {
  const [draft, setDraft] = useState(() => columns.map((c) => ({ ...c })))
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
    const count = cards.filter((c) => c.columnId === col.columnId).length
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
    setError('')
    onApply(draft)
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
