import { useState, useCallback, useEffect } from 'react'
import type { Card } from '../../domain/types'
import { useClipboard } from '../../hooks/useClipboard'
import './CreateTaskModal.css'

/* eslint-disable react-hooks/set-state-in-effect */

type Props = {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal closes (without saving) */
  onClose: () => void
  /** Callback after successful task creation or update */
  onSubmit: (task: Partial<Card>) => Promise<void>
  /** Default column ID where task will be placed (create mode only) */
  defaultColumnId?: string
  /** When set, the modal edits this card instead of creating a new one */
  editingCard?: Card | null
}

function formatCreatedAtForDisplay(iso?: string): string {
  if (!iso) {
    return new Date().toLocaleDateString('pt-BR')
  }
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR')
}

/** Local calendar date as YYYY-MM-DD for `<input type="date">` */
function todayLocalIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  defaultColumnId = 'backlog',
  editingCard = null,
}: Props) {
  const isEditMode = Boolean(editingCard)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [plannedHours, setPlannedHours] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { copy, isCopied } = useClipboard()

  const createdAtDisplay = isEditMode
    ? formatCreatedAtForDisplay(editingCard?.createdAt)
    : new Date().toLocaleDateString('pt-BR')

  // Reset or hydrate form when modal opens / mode changes
  useEffect(() => {
    if (!isOpen) {
      return
    }
    if (editingCard) {
      setTitle(editingCard.title)
      setDescription(editingCard.description ?? '')
      setPlannedDate(editingCard.plannedDate ?? todayLocalIsoDate())
      setPlannedHours(
        editingCard.plannedHours !== undefined && editingCard.plannedHours !== null
          ? String(editingCard.plannedHours)
          : '',
      )
    } else {
      setTitle('')
      setDescription('')
      setPlannedDate(todayLocalIsoDate())
      setPlannedHours('')
    }
    setErrors({})
    setIsSubmitting(false)
  }, [isOpen, editingCard])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Título é obrigatório'
    }
    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória'
    }
    if (!plannedDate) {
      newErrors.plannedDate = 'Data planejada é obrigatória'
    }
    if (plannedHours === '') {
      newErrors.plannedHours = 'Horas previstas é obrigatório'
    } else {
      const hours = parseFloat(plannedHours)
      if (isNaN(hours) || hours < 0) {
        newErrors.plannedHours = 'Horas deve ser um número ≥ 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [title, description, plannedDate, plannedHours])

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Partial<Card> = {
        title: title.trim(),
        description: description.trim(),
        plannedDate,
        plannedHours: parseFloat(plannedHours),
        columnId: editingCard?.columnId ?? defaultColumnId,
        ...(editingCard
          ? {
              cardId: editingCard.cardId,
              createdAt: editingCard.createdAt ?? new Date().toISOString(),
            }
          : {
              cardId: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            }),
      }

      await onSubmit(payload)
      onClose()
    } catch (e) {
      console.error('Error creating task:', e)
      setErrors({ submit: e instanceof Error ? e.message : 'Erro ao criar tarefa' })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    validateForm,
    title,
    description,
    plannedDate,
    plannedHours,
    defaultColumnId,
    editingCard,
    onSubmit,
    onClose,
  ])

  const handleCopy = useCallback(async () => {
    if (description.trim()) {
      await copy(description.trim())
    }
  }, [description, copy])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fb-ctm-overlay" role="dialog" aria-modal="true" aria-labelledby="fb-ctm-title">
      <div className="fb-ctm">
        <h2 id="fb-ctm-title">{isEditMode ? 'Editar tarefa' : 'Nova Tarefa'}</h2>

        <form className="fb-ctm__form" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
          {/* Title field */}
          <div className="fb-ctm__field">
            <label htmlFor="ctm-title" className="fb-ctm__label">
              Título *
            </label>
            <input
              id="ctm-title"
              type="text"
              className="fb-ctm__input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, 200))
                if (errors.title) setErrors({ ...errors, title: '' })
              }}
              maxLength={200}
              placeholder="Resumo da tarefa"
              data-testid="ctm-title-input"
              disabled={isSubmitting}
            />
            {errors.title && <div className="fb-ctm__error">{errors.title}</div>}
          </div>

          {/* Description field */}
          <div className="fb-ctm__field">
            <label htmlFor="ctm-description" className="fb-ctm__label">
              Descrição *
            </label>
            <textarea
              id="ctm-description"
              className="fb-ctm__textarea"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) setErrors({ ...errors, description: '' })
              }}
              placeholder="Detalhes da tarefa (Markdown suportado)"
              data-testid="ctm-description-input"
              disabled={isSubmitting}
            />
            {errors.description && <div className="fb-ctm__error">{errors.description}</div>}

            {/* Copy button */}
            <div className="fb-ctm__copy-wrapper">
              <button
                type="button"
                className="fb-ctm__copy-btn"
                onClick={handleCopy}
                disabled={!description.trim() || isSubmitting || isCopied}
                data-testid="ctm-copy-btn"
              >
                {isCopied ? 'Copiado!' : 'Copiar'}
              </button>
              {isCopied && <div className="fb-ctm__copy-feedback">✓ Copiado!</div>}
            </div>
          </div>

          {/* Planned Date field */}
          <div className="fb-ctm__field">
            <label htmlFor="ctm-date" className="fb-ctm__label">
              Data Planejada *
            </label>
            <input
              id="ctm-date"
              type="date"
              className="fb-ctm__input"
              value={plannedDate}
              onChange={(e) => {
                setPlannedDate(e.target.value)
                if (errors.plannedDate) setErrors({ ...errors, plannedDate: '' })
              }}
              data-testid="ctm-date-input"
              disabled={isSubmitting}
            />
            {errors.plannedDate && <div className="fb-ctm__error">{errors.plannedDate}</div>}
          </div>

          {/* Planned Hours field */}
          <div className="fb-ctm__field">
            <label htmlFor="ctm-hours" className="fb-ctm__label">
              Horas Previstas *
            </label>
            <input
              id="ctm-hours"
              type="number"
              className="fb-ctm__input"
              value={plannedHours}
              onChange={(e) => {
                setPlannedHours(e.target.value)
                if (errors.plannedHours) setErrors({ ...errors, plannedHours: '' })
              }}
              min="0"
              step="0.5"
              placeholder="0"
              data-testid="ctm-hours-input"
              disabled={isSubmitting}
            />
            {errors.plannedHours && <div className="fb-ctm__error">{errors.plannedHours}</div>}
          </div>

          {/* Created At (read-only) */}
          <div className="fb-ctm__field">
            <label htmlFor="ctm-created" className="fb-ctm__label">
              Data de Criação
            </label>
            <div id="ctm-created" className="fb-ctm__readonly" data-testid="ctm-created-at">
              {createdAtDisplay}
            </div>
          </div>

          {/* Error message for submission */}
          {errors.submit && (
            <div className="fb-ctm__error" role="alert">
              {errors.submit}
            </div>
          )}

          {/* Footer buttons */}
          <div className="fb-ctm__footer">
            <button
              type="button"
              className="fb-ctm__ghost"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="ctm-cancel-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="fb-ctm__primary"
              disabled={isSubmitting}
              data-testid="ctm-submit-btn"
            >
              {isSubmitting ? (isEditMode ? 'Salvando...' : 'Criando...') : isEditMode ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
