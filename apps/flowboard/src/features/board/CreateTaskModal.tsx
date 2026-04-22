import { useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Card, CardAttachment, CardTaskPayload } from '../../domain/types'
import {
  buildAttachmentStoragePath,
  inferMimeFromAttachment,
  MAX_ATTACHMENTS_PER_CARD,
  normalizeExtension,
  sanitizeDisplayName,
  validateAttachmentFile,
} from '../../domain/attachmentRules'
import { isCardArchived } from '../../domain/cardArchive'
import { useClipboard } from '../../hooks/useClipboard'
import './CreateTaskModal.css'

// @MindContext: Modal de criação e edição de tarefas do quadro; o pai persiste o Card após onSubmit (GitHub).
// @MindTest: CreateTaskModal.test.tsx (validação, toggle de layout maximizado)

/* eslint-disable react-hooks/set-state-in-effect */

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: CardTaskPayload) => Promise<void>
  defaultColumnId?: string
  editingCard?: Card | null
  /** Board id for attachment storage paths */
  boardId: string
  /** Fetch blob for previews/downloads of already-persisted attachments */
  getAttachmentBlob?: (storagePath: string, mimeType?: string) => Promise<Blob>
  /** Archive current card (edit mode); parent confirms and persists. */
  onArchiveCard?: (card: Card) => void
  /** Restore archived card (edit mode). */
  onUnarchiveCard?: (card: Card) => void
}

function formatCreatedAtForDisplay(iso?: string): string {
  if (!iso) {
    return new Date().toLocaleDateString('pt-BR')
  }
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR')
}

function todayLocalIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Hardening: only http(s) and same-page fragments in Markdown links. */
function safeMarkdownUrlTransform(uri: string): string {
  const u = uri.trim()
  if (!u || u.startsWith('#')) {
    return u
  }
  if (/^https?:\/\//i.test(u)) {
    return u
  }
  return ''
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function AttachmentDocIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  )
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  defaultColumnId = 'backlog',
  editingCard = null,
  boardId,
  getAttachmentBlob,
  onArchiveCard,
  onUnarchiveCard,
}: Props) {
  const isEditMode = Boolean(editingCard)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [plannedHours, setPlannedHours] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const { copy, isCopied } = useClipboard()

  const [existingAttachments, setExistingAttachments] = useState<CardAttachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<{ attachmentId: string; file: File }[]>([])
  const [removedPaths, setRemovedPaths] = useState<string[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const createdAtDisplay = isEditMode
    ? formatCreatedAtForDisplay(editingCard?.createdAt)
    : new Date().toLocaleDateString('pt-BR')

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewBlobUrl(null)
  }, [])

  /** Hidrata campos do card; não zera anexos pendentes (evita perder ficheiros ao re-render / novo objeto `editingCard`). */
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
      setExistingAttachments(editingCard.attachments ? [...editingCard.attachments] : [])
    } else {
      setTitle('')
      setDescription('')
      setPlannedDate(todayLocalIsoDate())
      setPlannedHours('')
      setExistingAttachments([])
    }
    setErrors({})
    setIsSubmitting(false)
  }, [isOpen, editingCard])

  const attachmentSessionKey = editingCard?.cardId ?? '__create__'

  /** Só ao abrir o diálogo ou ao mudar o card em edição: limpa fila local de anexos e preview. */
  useEffect(() => {
    if (!isOpen) {
      return
    }
    setPendingFiles([])
    setRemovedPaths([])
    setAttachmentError('')
    setPreviewId(null)
    revokePreviewUrl()
  }, [isOpen, attachmentSessionKey, revokePreviewUrl])

  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      revokePreviewUrl()
    }
  }, [revokePreviewUrl])

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

  const onAttachmentInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files?.length ? Array.from(e.target.files) : []
      e.target.value = ''
      if (!picked.length) {
        return
      }
      setAttachmentError('')
      const next: { attachmentId: string; file: File }[] = []
      for (const file of picked) {
        const err = validateAttachmentFile(file)
        if (err) {
          setAttachmentError(err.message)
          return
        }
        if (existingAttachments.length + pendingFiles.length + next.length >= MAX_ATTACHMENTS_PER_CARD) {
          setAttachmentError(`Máximo de ${MAX_ATTACHMENTS_PER_CARD} anexos por tarefa.`)
          return
        }
        next.push({ attachmentId: crypto.randomUUID(), file })
      }
      if (next.length) {
        setPendingFiles((p) => [...p, ...next])
      }
    },
    [existingAttachments.length, pendingFiles.length],
  )

  const removeExisting = useCallback(
    (att: CardAttachment) => {
      setPreviewId((cur) => {
        if (cur === att.attachmentId) {
          revokePreviewUrl()
          return null
        }
        return cur
      })
      setExistingAttachments((xs) => xs.filter((a) => a.attachmentId !== att.attachmentId))
      setRemovedPaths((r) => [...r, att.storagePath])
    },
    [revokePreviewUrl],
  )

  const removePending = useCallback(
    (attachmentId: string) => {
      setPreviewId((cur) => {
        if (cur === attachmentId) {
          revokePreviewUrl()
          return null
        }
        return cur
      })
      setPendingFiles((p) => p.filter((x) => x.attachmentId !== attachmentId))
    },
    [revokePreviewUrl],
  )

  const closePreview = useCallback(() => {
    setPreviewId(null)
    revokePreviewUrl()
  }, [revokePreviewUrl])

  const openPreview = useCallback(
    async (kind: 'existing' | 'pending', id: string, att?: CardAttachment, file?: File) => {
      if (previewId === id) {
        setPreviewId(null)
        revokePreviewUrl()
        return
      }
      revokePreviewUrl()
      setPreviewId(id)
      const ext = att
        ? normalizeExtension(att.displayName)
        : file
          ? normalizeExtension(file.name)
          : ''
      const canImg = ext === 'jpg' || ext === 'jpeg'
      const canMd = ext === 'md'
      if (!canImg && !canMd) {
        return
      }
      setPreviewLoading(true)
      try {
        if (kind === 'pending' && file) {
          const url = URL.createObjectURL(file)
          previewUrlRef.current = url
          setPreviewBlobUrl(url)
        } else if (kind === 'existing' && att && getAttachmentBlob) {
          const blob = await getAttachmentBlob(att.storagePath, inferMimeFromAttachment(att))
          const url = URL.createObjectURL(blob)
          previewUrlRef.current = url
          setPreviewBlobUrl(url)
        }
      } finally {
        setPreviewLoading(false)
      }
    },
    [getAttachmentBlob, revokePreviewUrl, previewId],
  )

  const handleDownloadExisting = useCallback(
    async (att: CardAttachment) => {
      if (!getAttachmentBlob) {
        return
      }
      const blob = await getAttachmentBlob(att.storagePath, inferMimeFromAttachment(att))
      await downloadBlob(blob, att.displayName)
    },
    [getAttachmentBlob],
  )

  const handleDownloadPending = useCallback(async (file: File) => {
    await downloadBlob(file, sanitizeDisplayName(file.name) ?? 'download')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const cardId = editingCard?.cardId ?? crypto.randomUUID()
      const pendingMeta = pendingFiles.map(({ attachmentId, file }) => {
        const displayName = sanitizeDisplayName(file.name)!
        return {
          attachmentId,
          file,
          meta: {
            attachmentId,
            displayName,
            storagePath: buildAttachmentStoragePath(boardId, cardId, attachmentId, displayName),
            mimeType: file.type || undefined,
            sizeBytes: file.size,
            addedAt: new Date().toISOString(),
          } satisfies CardAttachment,
        }
      })

      const nextAttachments: CardAttachment[] = [...existingAttachments, ...pendingMeta.map((p) => p.meta)]

      const payload: CardTaskPayload = {
        title: title.trim(),
        description: description.trim(),
        plannedDate,
        plannedHours: parseFloat(plannedHours),
        columnId: editingCard?.columnId ?? defaultColumnId,
        attachments: nextAttachments,
        attachmentBlobs: pendingMeta.map((p) => ({ storagePath: p.meta.storagePath, file: p.file })),
        ...(removedPaths.length ? { attachmentPathsToDelete: removedPaths } : {}),
        ...(editingCard
          ? {
              cardId: editingCard.cardId,
              createdAt: editingCard.createdAt ?? new Date().toISOString(),
            }
          : {
              cardId,
              createdAt: new Date().toISOString(),
            }),
      }

      await onSubmit(payload)
      onClose()
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Error creating task:', e)
      }
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
    boardId,
    pendingFiles,
    existingAttachments,
    removedPaths,
  ])

  const handleCopy = useCallback(async () => {
    if (description.trim()) {
      await copy(description.trim())
    }
  }, [description, copy])

  if (!isOpen) {
    return null
  }

  const effectiveColumnId = editingCard?.columnId ?? defaultColumnId ?? ''

  return (
    <div
      className={['fb-ctm-overlay', isMaximized && 'fb-ctm-overlay--maximized'].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-ctm-title"
      data-testid="ctm-dialog"
      data-default-column-id={effectiveColumnId}
    >
      <div className={['fb-ctm', isMaximized && 'fb-ctm--maximized'].filter(Boolean).join(' ')}>
        <div className="fb-ctm__header">
          <h2 id="fb-ctm-title">{isEditMode ? 'Editar tarefa' : 'Nova Tarefa'}</h2>
          <div className="fb-ctm__header-actions">
            <button
              type="button"
              className="fb-ctm__max-btn"
              aria-pressed={isMaximized}
              aria-label={isMaximized ? 'Restaurar tamanho do painel' : 'Maximizar painel'}
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
              data-testid="ctm-maximize-toggle"
              disabled={isSubmitting}
              onClick={() => setIsMaximized((v) => !v)}
            >
              <svg
                className="fb-ctm__max-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
                focusable="false"
              >
                {isMaximized ? (
                  <path
                    d="M4 14v6h6M20 10V4h-6M4 20l7-7M20 4l-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="fb-ctm__close-btn"
              aria-label="Fechar"
              title="Fechar"
              data-testid="ctm-close-btn"
              disabled={isSubmitting}
              onClick={onClose}
            >
              <svg
                className="fb-ctm__close-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
                focusable="false"
              >
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <form className="fb-ctm__form" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
          {isEditMode && editingCard && isCardArchived(editingCard) ? (
            <p className="fb-ctm__archived-banner" role="status" data-testid="ctm-archived-banner">
              Esta tarefa está arquivada e não aparece nas colunas do quadro.
            </p>
          ) : null}
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

          <div
            className={['fb-ctm__field', 'fb-ctm__field--with-descr', isMaximized && 'fb-ctm__field--stretch']
              .filter(Boolean)
              .join(' ')}
          >
            <div className="fb-ctm__descr-toolbar">
              <label htmlFor="ctm-description" className="fb-ctm__label">
                Descrição *
              </label>
              <div className="fb-ctm__copy-wrapper" aria-live="polite" aria-atomic="true">
                <button
                  type="button"
                  className="fb-ctm__copy-btn"
                  onClick={handleCopy}
                  disabled={!description.trim() || isSubmitting}
                  data-testid="ctm-copy-btn"
                >
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </button>
                {isCopied ? <div className="fb-ctm__copy-feedback">✓ Copiado!</div> : null}
              </div>
            </div>
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
          </div>

          <div className="fb-ctm__field fb-ctm__field--attachments">
            <div className="fb-ctm__attach-head">
              <span className="fb-ctm__label" id="ctm-attachments-label">
                Anexos
              </span>
              {existingAttachments.length + pendingFiles.length > 0 ? (
                <span className="fb-ctm__attach-badge" aria-live="polite">
                  {existingAttachments.length + pendingFiles.length}
                </span>
              ) : null}
            </div>

            <div className="fb-ctm__attach-zone">
              <div className="fb-ctm__attach-zone__intro">
                <div className="fb-ctm__attach-zone__icon" aria-hidden>
                  <AttachmentDocIcon />
                </div>
                <div className="fb-ctm__attach-zone__text">
                  <p className="fb-ctm__attach-zone__title">Adicionar ficheiros</p>
                  <p className="fb-ctm__attach-zone__hint" id="ctm-attachments-hint">
                    JPG, JPEG, MD, PDF, DOCX ou XLSX — até 10 MB cada (máx. {MAX_ATTACHMENTS_PER_CARD}{' '}
                    por tarefa). Pode escolher vários de uma vez.
                  </p>
                </div>
              </div>
              <div className="fb-ctm__attach-zone__control">
                <input
                  type="file"
                  className="fb-ctm__file-input"
                  multiple
                  accept=".jpg,.jpeg,.md,.pdf,.docx,.xlsx"
                  aria-labelledby="ctm-attachments-label"
                  aria-describedby="ctm-attachments-hint"
                  disabled={isSubmitting}
                  data-testid="ctm-attachment-input"
                  onChange={onAttachmentInput}
                />
              </div>
            </div>

            {attachmentError ? <div className="fb-ctm__error">{attachmentError}</div> : null}

            <ul className="fb-ctm__attachments" data-testid="ctm-attachment-list">
              {existingAttachments.map((att) => (
                <li key={att.attachmentId} className="fb-ctm__attachment-row">
                  <div className="fb-ctm__attachment-icon-wrap" aria-hidden>
                    <AttachmentDocIcon className="fb-ctm__attachment-icon-svg" />
                  </div>
                  <div className="fb-ctm__attachment-info">
                    <span className="fb-ctm__attachment-name">{att.displayName}</span>
                    <span className="fb-ctm__attachment-meta">{formatBytes(att.sizeBytes)}</span>
                  </div>
                  <div className="fb-ctm__attachment-actions">
                    {(() => {
                      const ext = normalizeExtension(att.displayName)
                      const canPreview = ext === 'jpg' || ext === 'jpeg' || ext === 'md'
                      return canPreview ? (
                        <button
                          type="button"
                          className="fb-ctm__ghost fb-ctm__ghost--sm"
                          aria-label={`Pré-visualizar ${att.displayName}`}
                          disabled={isSubmitting || !getAttachmentBlob}
                          onClick={() => void openPreview('existing', att.attachmentId, att)}
                        >
                          {previewId === att.attachmentId ? 'Fechar' : 'Preview'}
                        </button>
                      ) : null
                    })()}
                    <button
                      type="button"
                      className="fb-ctm__ghost fb-ctm__ghost--sm"
                      aria-label={`Baixar ${att.displayName}`}
                      disabled={isSubmitting || !getAttachmentBlob}
                      onClick={() => void handleDownloadExisting(att)}
                    >
                      Baixar
                    </button>
                    <button
                      type="button"
                      className="fb-ctm__ghost fb-ctm__ghost--sm"
                      aria-label={`Remover ${att.displayName}`}
                      disabled={isSubmitting}
                      onClick={() => removeExisting(att)}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
              {pendingFiles.map(({ attachmentId, file }) => (
                <li key={attachmentId} className="fb-ctm__attachment-row fb-ctm__attachment-row--pending">
                  <div className="fb-ctm__attachment-icon-wrap" aria-hidden>
                    <AttachmentDocIcon className="fb-ctm__attachment-icon-svg" />
                  </div>
                  <div className="fb-ctm__attachment-info">
                    <span className="fb-ctm__attachment-name">{sanitizeDisplayName(file.name) ?? file.name}</span>
                    <span className="fb-ctm__attachment-meta">
                      {formatBytes(file.size)}
                      <span className="fb-ctm__attachment-pill">pendente</span>
                    </span>
                  </div>
                  <div className="fb-ctm__attachment-actions">
                    {(() => {
                      const ext = normalizeExtension(file.name)
                      const canPreview = ext === 'jpg' || ext === 'jpeg' || ext === 'md'
                      return canPreview ? (
                        <button
                          type="button"
                          className="fb-ctm__ghost fb-ctm__ghost--sm"
                          aria-label={`Pré-visualizar ${file.name}`}
                          disabled={isSubmitting}
                          onClick={() => void openPreview('pending', attachmentId, undefined, file)}
                        >
                          {previewId === attachmentId ? 'Fechar' : 'Preview'}
                        </button>
                      ) : null
                    })()}
                    <button
                      type="button"
                      className="fb-ctm__ghost fb-ctm__ghost--sm"
                      aria-label={`Baixar ${file.name}`}
                      disabled={isSubmitting}
                      onClick={() => void handleDownloadPending(file)}
                    >
                      Baixar
                    </button>
                    <button
                      type="button"
                      className="fb-ctm__ghost fb-ctm__ghost--sm"
                      aria-label={`Remover ${file.name}`}
                      disabled={isSubmitting}
                      onClick={() => removePending(attachmentId)}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {previewId && previewLoading ? <p className="fb-ctm__hint">Carregando preview…</p> : null}
            {previewId && previewBlobUrl ? (
              <div className="fb-ctm__preview" data-testid="ctm-attachment-preview">
                <button type="button" className="fb-ctm__ghost fb-ctm__ghost--sm" onClick={closePreview}>
                  Fechar preview
                </button>
                {(() => {
                  const pending = pendingFiles.find((p) => p.attachmentId === previewId)
                  const existing = existingAttachments.find((a) => a.attachmentId === previewId)
                  const ext = pending
                    ? normalizeExtension(pending.file.name)
                    : existing
                      ? normalizeExtension(existing.displayName)
                      : ''
                  if (ext === 'jpg' || ext === 'jpeg') {
                    return (
                      <img
                        src={previewBlobUrl}
                        alt={pending?.file.name ?? existing?.displayName ?? 'Preview'}
                        className="fb-ctm__preview-img"
                      />
                    )
                  }
                  if (ext === 'md') {
                    return <MdPreviewFromUrl url={previewBlobUrl} />
                  }
                  return null
                })()}
              </div>
            ) : null}
          </div>

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

          <div className="fb-ctm__field">
            <label htmlFor="ctm-created" className="fb-ctm__label">
              Data de Criação
            </label>
            <div id="ctm-created" className="fb-ctm__readonly" data-testid="ctm-created-at">
              {createdAtDisplay}
            </div>
          </div>

          {errors.submit && (
            <div className="fb-ctm__error" role="alert">
              {errors.submit}
            </div>
          )}

          <div className="fb-ctm__footer">
            <div className="fb-ctm__footer-start">
              {isEditMode && editingCard && !isCardArchived(editingCard) && onArchiveCard ? (
                <button
                  type="button"
                  className="fb-ctm__ghost"
                  data-testid="ctm-archive-btn"
                  disabled={isSubmitting}
                  onClick={() => onArchiveCard(editingCard)}
                >
                  Arquivar
                </button>
              ) : null}
              {isEditMode && editingCard && isCardArchived(editingCard) && onUnarchiveCard ? (
                <button
                  type="button"
                  className="fb-ctm__ghost"
                  data-testid="ctm-unarchive-btn"
                  disabled={isSubmitting}
                  onClick={() => onUnarchiveCard(editingCard)}
                >
                  Restaurar
                </button>
              ) : null}
            </div>
            <div className="fb-ctm__footer-end">
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
          </div>
        </form>
      </div>
    </div>
  )
}

function MdPreviewFromUrl({ url }: { url: string }) {
  const [text, setText] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    void fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error('Falha ao ler Markdown')
        }
        return r.text()
      })
      .then((t) => {
        if (!cancelled) {
          setText(t)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Não foi possível carregar o preview.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (loadError) {
    return <p className="fb-ctm__error">{loadError}</p>
  }
  if (!text) {
    return <p className="fb-ctm__hint">Carregando…</p>
  }
  return (
    <div className="fb-ctm__md-preview">
      <ReactMarkdown urlTransform={safeMarkdownUrlTransform}>{text}</ReactMarkdown>
    </div>
  )
}
