import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  formatPlannedDateForCard,
  getCalendarDaysOverdue,
  getPlannedDateUiStatusForColumn,
  type PlannedDateUiStatus,
} from '../../domain/plannedDateStatus'
import { validateColumnLayout } from '../../domain/boardRules'
import {
  applyDragEnd,
  buildKanbanItemsRecord,
  findCardContainer,
  itemsRecordToCards,
  migrateCardsAfterColumnEdit,
} from '../../domain/boardLayout'
import { isCardArchived, mergeLayoutCardsWithArchived } from '../../domain/cardArchive'
import {
  applyArchiveToTimeState,
  applyCardMove,
  reconcileBoardTimeState,
  totalCompletedMs,
} from '../../domain/timeEngine'
import type { BoardWorkingHours, Card, CardTaskPayload, Column, ColumnRole, TimeBoardState } from '../../domain/types'
import { GitHubHttpError } from '../../infrastructure/github/client'
import { base64ToBlob } from '../../infrastructure/github/fileBlob'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import { createBoardRepository } from '../../infrastructure/persistence/boardRepository'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import { appendNewSegments, docToTimeBoardState, writeTimeBoardStateToDoc } from './timeBridge'
import { deleteRepoPathIfExists, uploadAttachmentBlobs } from './attachmentSync'
import { clearSearchModalBoardCache } from '../app/SearchModal'
import { ColumnEditorModal } from './ColumnEditorModal'
import { CreateTaskModal } from './CreateTaskModal'
import './BoardView.css'

type Props = {
  session: FlowBoardSession
  boardId: string
  /** Incremented from the shell (e.g. board settings menu) to open the column editor. */
  columnEditorMenuTick?: number
  /** Card ID to open for editing (from search modal) */
  cardToEditId?: string | null
  /** Callback when card editing is complete */
  onCardEditComplete?: () => void
  /** Notifies shell after board JSON was saved and reloaded (invalidates search modal cache generation). */
  onBoardPersisted?: () => void
}

export function BoardView({
  session,
  boardId,
  columnEditorMenuTick = 0,
  cardToEditId,
  onCardEditComplete,
  onBoardPersisted,
}: Props) {
  const client = useMemo(() => createClientFromSession(session), [session])
  const repo = useMemo(() => createBoardRepository(client), [client])

  const [doc, setDoc] = useState<BoardDocumentJson | null>(null)
  const [sha, setSha] = useState<string | null>(null)
  /** GitHub ETag base para PUT; actualizado síncrono após cada load/save (evita 409 em saves em cadeia). */
  const shaRef = useRef<string | null>(null)
  const saveChainRef = useRef(Promise.resolve())
  const [timeState, setTimeState] = useState<TimeBoardState>({})
  const docRef = useRef(doc)
  const timeStateRef = useRef(timeState)
  const [loadError, setLoadError] = useState('')
  const [persistError, setPersistError] = useState('')
  const [saving, setSaving] = useState(false)
  const [colModal, setColModal] = useState(false)
  type TaskModalState = 'closed' | { mode: 'create'; columnId: string } | { mode: 'edit'; card: Card }
  const [taskModal, setTaskModal] = useState<TaskModalState>('closed')
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Initialize to current tick so remount (ex. trocar aba) não reabre o modal só porque o tick global já era > 0. */
  const lastColumnEditorMenuTick = useRef(columnEditorMenuTick)
  const prevBoardIdForColumnMenu = useRef(boardId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const reload = useCallback(async () => {
    setLoadError('')
    const got = await repo.loadBoard(boardId)
    if (!got) {
      setLoadError('Quadro não encontrado no repositório.')
      setDoc(null)
      setSha(null)
      shaRef.current = null
      return
    }
    setDoc(got.doc)
    setSha(got.sha)
    shaRef.current = got.sha
    docRef.current = got.doc
    const loaded = docToTimeBoardState(got.doc)
    const reconciled = reconcileBoardTimeState(loaded, got.doc.cards, got.doc.columns, Date.now(), got.doc.workingHours)
    if (JSON.stringify(loaded) !== JSON.stringify(reconciled)) {
      const nextDoc = structuredClone(got.doc)
      writeTimeBoardStateToDoc(nextDoc, reconciled)
      appendNewSegments(nextDoc, loaded, reconciled)
      docRef.current = nextDoc
      timeStateRef.current = reconciled
      setDoc(nextDoc)
      setTimeState(reconciled)
      setSaving(true)
      setPersistError('')
      try {
        await repo.saveBoard(nextDoc.boardId, nextDoc, got.sha)
        const got2 = await repo.loadBoard(boardId)
        if (got2) {
          setDoc(got2.doc)
          setSha(got2.sha)
          shaRef.current = got2.sha
          docRef.current = got2.doc
          const ts = docToTimeBoardState(got2.doc)
          timeStateRef.current = ts
          setTimeState(ts)
        }
      } catch (e) {
        if (e instanceof GitHubHttpError && e.status === 409) {
          setPersistError('Conflito ao salvar após reconciliação. Recarregando dados.')
        } else {
          setPersistError(e instanceof Error ? e.message : 'Erro ao salvar.')
        }
        try {
          const got3 = await repo.loadBoard(boardId)
          if (got3) {
            setDoc(got3.doc)
            setSha(got3.sha)
            shaRef.current = got3.sha
            docRef.current = got3.doc
            const ts3 = docToTimeBoardState(got3.doc)
            timeStateRef.current = ts3
            setTimeState(ts3)
          }
        } catch {
          /* ignore */
        }
      } finally {
        setSaving(false)
      }
    } else {
      timeStateRef.current = loaded
      setTimeState(loaded)
    }
  }, [boardId, repo])

  useEffect(() => {
    saveChainRef.current = Promise.resolve()
  }, [boardId])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => clearTimeout(t)
  }, [reload])

  useEffect(() => {
    if (boardId !== prevBoardIdForColumnMenu.current) {
      prevBoardIdForColumnMenu.current = boardId
      lastColumnEditorMenuTick.current = columnEditorMenuTick
      return
    }
    if (columnEditorMenuTick > lastColumnEditorMenuTick.current) {
      lastColumnEditorMenuTick.current = columnEditorMenuTick
      setColModal(true)
    }
  }, [boardId, columnEditorMenuTick])

  // Handle card opening from search modal
  useEffect(() => {
    if (cardToEditId && doc?.cards) {
      const cardToEdit = doc.cards.find((c) => c.cardId === cardToEditId)
      if (cardToEdit) {
        // Sincroniza prop externa (search) → modal; não há API de assinatura melhor aqui.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled open from shell
        setTaskModal({ mode: 'edit', card: cardToEdit })
      }
    }
  }, [cardToEditId, doc?.cards])

  const cardById = useMemo(() => new Map(doc?.cards.map((c) => [c.cardId, c]) ?? []), [doc])

  const itemsMap = useMemo(() => {
    if (!doc) {
      return {}
    }
    return buildKanbanItemsRecord(doc.columns, doc.cards)
  }, [doc])

  const getAttachmentBlob = useCallback(
    async (storagePath: string, mimeType?: string) => {
      const raw = await client.getFileRaw(storagePath)
      return base64ToBlob(raw.contentBase64, mimeType ?? 'application/octet-stream')
    },
    [client],
  )

  const saveDocument = useCallback(
    async (nextDoc: BoardDocumentJson) => {
      const run = async () => {
        setSaving(true)
        setPersistError('')
        try {
          await repo.saveBoard(nextDoc.boardId, nextDoc, shaRef.current)
          const got = await repo.loadBoard(boardId)
          if (got) {
            docRef.current = got.doc
            shaRef.current = got.sha
            const ts = docToTimeBoardState(got.doc)
            timeStateRef.current = ts
            setDoc(got.doc)
            setSha(got.sha)
            setTimeState(ts)
            clearSearchModalBoardCache()
            onBoardPersisted?.()
          }
        } catch (e) {
          if (e instanceof GitHubHttpError && e.status === 409) {
            setPersistError('Conflito ao salvar. Recarregando dados.')
          } else {
            setPersistError(e instanceof Error ? e.message : 'Erro ao salvar.')
          }
          try {
            const got = await repo.loadBoard(boardId)
            if (got) {
              docRef.current = got.doc
              shaRef.current = got.sha
              const ts = docToTimeBoardState(got.doc)
              timeStateRef.current = ts
              setDoc(got.doc)
              setSha(got.sha)
              setTimeState(ts)
              clearSearchModalBoardCache()
              onBoardPersisted?.()
            }
          } catch {
            /* ignore */
          }
        } finally {
          setSaving(false)
        }
      }
      const queued = saveChainRef.current.then(run)
      saveChainRef.current = queued.catch(() => {
        /* fila continua mesmo após falha */
      })
      return queued
    },
    [boardId, onBoardPersisted, repo],
  )

  useEffect(() => {
    docRef.current = doc
  }, [doc])

  useEffect(() => {
    timeStateRef.current = timeState
  }, [timeState])

  useEffect(() => {
    shaRef.current = sha
  }, [sha])

  useEffect(() => {
    const tick = () => {
      const cur = docRef.current
      if (!cur) {
        return
      }
      const prev = docToTimeBoardState(cur)
      const next = reconcileBoardTimeState(prev, cur.cards, cur.columns, Date.now(), cur.workingHours)
      if (JSON.stringify(prev) === JSON.stringify(next)) {
        return
      }
      const nextDoc = structuredClone(cur)
      writeTimeBoardStateToDoc(nextDoc, next)
      appendNewSegments(nextDoc, prev, next)
      timeStateRef.current = next
      docRef.current = nextDoc
      setTimeState(next)
      setDoc(nextDoc)
      void saveDocument(nextDoc)
    }
    const id = window.setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [doc?.boardId, saveDocument])

  function commitAfterDrag(nextItems: Record<string, string[]>, movedCardId: string) {
    if (!doc) {
      return
    }
    const fromCol = findCardContainer(itemsMap, movedCardId)
    const toCol = findCardContainer(nextItems, movedCardId)
    const nextDoc = structuredClone(doc)
    const newCards = itemsRecordToCards(nextDoc.columns, nextItems, cardById)
    nextDoc.cards = mergeLayoutCardsWithArchived(doc.cards, newCards)

    let nextTime = timeState
    if (fromCol && toCol && fromCol !== toCol) {
      nextTime = applyCardMove(
        timeState,
        movedCardId,
        fromCol,
        toCol,
        nextDoc.columns,
        Date.now(),
        nextDoc.workingHours,
      )
    }
    appendNewSegments(nextDoc, timeState, nextTime)
    writeTimeBoardStateToDoc(nextDoc, nextTime)
    timeStateRef.current = nextTime
    docRef.current = nextDoc
    setTimeState(nextTime)
    setDoc(nextDoc)
    void saveDocument(nextDoc)
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || !doc) {
      return
    }
    const overId = String(over.id)
    const activeIdStr = String(active.id)
    const nextItems = applyDragEnd(itemsMap, activeIdStr, overId)
    if (!nextItems) {
      return
    }
    commitAfterDrag(nextItems, activeIdStr)
  }

  function handleAddCardToColumn(columnId: string) {
    setTaskModal({ mode: 'create', columnId })
  }

  function handleEditCard(card: Card) {
    setTaskModal({ mode: 'edit', card })
  }

  async function handleCreateTask(task: CardTaskPayload) {
    if (!doc) {
      return
    }
    const firstBacklog = doc.columns.find((c) => c.role === 'backlog')?.columnId
    if (!firstBacklog) {
      return
    }

    const { attachmentBlobs, attachmentPathsToDelete, attachments, ...rest } = task
    try {
      for (const p of attachmentPathsToDelete ?? []) {
        await deleteRepoPathIfExists(client, p)
      }
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : 'Erro ao remover anexos antigos no GitHub.')
      return
    }
    try {
      await uploadAttachmentBlobs(client, attachmentBlobs ?? [])
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : 'Erro ao enviar anexos.')
      return
    }

    const newCard: Card = {
      cardId: rest.cardId || crypto.randomUUID(),
      title: rest.title || 'Nova tarefa',
      columnId: rest.columnId || firstBacklog,
      description: rest.description,
      plannedDate: rest.plannedDate,
      plannedHours: rest.plannedHours,
      createdAt: rest.createdAt,
      attachments: attachments ?? [],
    }

    const nextDoc = structuredClone(doc)
    nextDoc.cards = [...nextDoc.cards, newCard]
    docRef.current = nextDoc
    await saveDocument(nextDoc)
  }

  async function handleUpdateTask(task: CardTaskPayload) {
    if (!doc || !task.cardId) {
      return
    }
    const { attachmentBlobs, attachmentPathsToDelete, attachments, cardId, ...rest } = task
    try {
      for (const p of attachmentPathsToDelete ?? []) {
        await deleteRepoPathIfExists(client, p)
      }
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : 'Erro ao remover anexos antigos no GitHub.')
      return
    }
    try {
      await uploadAttachmentBlobs(client, attachmentBlobs ?? [])
    } catch (e) {
      setPersistError(e instanceof Error ? e.message : 'Erro ao enviar anexos.')
      return
    }

    const nextDoc = structuredClone(doc)
    nextDoc.cards = nextDoc.cards.map((c) =>
      c.cardId === cardId
        ? {
            ...c,
            title: rest.title?.trim() ? rest.title.trim() : c.title,
            description: rest.description,
            plannedDate: rest.plannedDate,
            plannedHours: rest.plannedHours,
            createdAt: rest.createdAt ?? c.createdAt,
            attachments: attachments !== undefined ? attachments : c.attachments,
          }
        : c,
    )
    docRef.current = nextDoc
    setDoc(nextDoc)
    await saveDocument(nextDoc)
  }

  function handleDeleteCard(card: Card) {
    if (!window.confirm(`Excluir a tarefa "${card.title}"?`)) {
      return
    }
    const cardIdSnapshot = card.cardId
    const attachmentsSnapshot = card.attachments ?? []
    void (async () => {
      try {
        for (const a of attachmentsSnapshot) {
          await deleteRepoPathIfExists(client, a.storagePath)
        }
      } catch (e) {
        setPersistError(e instanceof Error ? e.message : 'Erro ao remover anexos.')
        return
      }
      const docSnap = docRef.current
      const timeSnap = timeStateRef.current
      if (!docSnap || !docSnap.cards.some((c) => c.cardId === cardIdSnapshot)) {
        setPersistError('O quadro mudou antes de concluir a exclusão. Recarregue se necessário.')
        return
      }
      const nextDoc = structuredClone(docSnap)
      nextDoc.cards = nextDoc.cards.filter((c) => c.cardId !== cardIdSnapshot)
      const nextTime = { ...timeSnap }
      delete nextTime[cardIdSnapshot]
      delete nextDoc.cardTimeState[cardIdSnapshot]
      writeTimeBoardStateToDoc(nextDoc, nextTime)
      timeStateRef.current = nextTime
      docRef.current = nextDoc
      setTimeState(nextTime)
      setDoc(nextDoc)
      await saveDocument(nextDoc)
    })()
  }

  function handleArchiveCard(card: Card) {
    if (
      !window.confirm(
        `Arquivar a tarefa "${card.title}"? Ela sai das colunas do quadro e passa a aparecer na página Arquivados.`,
      )
    ) {
      return
    }
    const cardIdSnapshot = card.cardId
    const docSnap = docRef.current
    const timeSnap = timeStateRef.current
    if (!docSnap) {
      return
    }
    const found = docSnap.cards.find((c) => c.cardId === cardIdSnapshot)
    if (!found || isCardArchived(found)) {
      return
    }
    void (async () => {
      const nextDoc = structuredClone(docSnap)
      const idx = nextDoc.cards.findIndex((c) => c.cardId === cardIdSnapshot)
      if (idx < 0) {
        return
      }
      const snapshot = nextDoc.cards[idx]!
      const nextTime = applyArchiveToTimeState(
        timeSnap,
        snapshot.cardId,
        nextDoc.columns,
        snapshot.columnId,
        Date.now(),
        nextDoc.workingHours,
      )
      appendNewSegments(nextDoc, timeSnap, nextTime)
      writeTimeBoardStateToDoc(nextDoc, nextTime)
      nextDoc.cards[idx] = {
        ...snapshot,
        archived: true,
        archivedAt: new Date().toISOString(),
      }
      timeStateRef.current = nextTime
      docRef.current = nextDoc
      setTimeState(nextTime)
      setDoc(nextDoc)
      setTaskModal('closed')
      onCardEditComplete?.()
      await saveDocument(nextDoc)
    })()
  }

  function handleUnarchiveCard(card: Card) {
    const docSnap = docRef.current
    const timeSnap = timeStateRef.current
    if (!docSnap || !isCardArchived(card)) {
      return
    }
    const nextDoc = structuredClone(docSnap)
    const idx = nextDoc.cards.findIndex((c) => c.cardId === card.cardId)
    if (idx < 0) {
      return
    }
    const snapshot = nextDoc.cards[idx]!
    nextDoc.cards[idx] = {
      ...snapshot,
      archived: undefined,
      archivedAt: undefined,
    }
    const prevTime = timeSnap
    void (async () => {
      const nowMs = Date.now()
      const nextTime = reconcileBoardTimeState(prevTime, nextDoc.cards, nextDoc.columns, nowMs, nextDoc.workingHours)
      appendNewSegments(nextDoc, prevTime, nextTime)
      writeTimeBoardStateToDoc(nextDoc, nextTime)
      timeStateRef.current = nextTime
      docRef.current = nextDoc
      setTimeState(nextTime)
      setDoc(nextDoc)
      setTaskModal('closed')
      onCardEditComplete?.()
      await saveDocument(nextDoc)
    })()
  }

  function handleColumnApply(cols: Column[], workingHours?: BoardWorkingHours | null) {
    if (!doc) {
      return
    }
    const v = validateColumnLayout(cols)
    if (!v.ok) {
      window.alert(v.message)
      return
    }
    const migrated = migrateCardsAfterColumnEdit(doc.columns, doc.cards, cols)
    const nextDoc = structuredClone(doc)
    nextDoc.columns = cols
    nextDoc.cards = migrated
    nextDoc.workingHours = workingHours?.enabled ? workingHours : undefined
    let nextTime = timeState
    nextTime = reconcileBoardTimeState(nextTime, nextDoc.cards, nextDoc.columns, Date.now(), nextDoc.workingHours)
    writeTimeBoardStateToDoc(nextDoc, nextTime)
    timeStateRef.current = nextTime
    docRef.current = nextDoc
    setTimeState(nextTime)
    setDoc(nextDoc)
    void saveDocument(nextDoc)
  }

  if (loadError) {
    return (
      <div className="fb-board fb-board--error" role="alert">
        {loadError}
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="fb-board">
        <p className="fb-board__loading">Carregando quadro…</p>
      </div>
    )
  }

  const activeCard = activeId ? cardById.get(activeId) : undefined

  return (
    <div className="fb-board" data-testid="board-canvas">
      {persistError ? (
        <div className="fb-board__warn" role="status">
          {persistError}
        </div>
      ) : null}
      {saving ? (
        <p className="fb-board__saving" data-testid="board-page-saving">
          Salvando…
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="fb-board__canvas">
          <div className="fb-board__cols-wrap">
            <div className="fb-board__cols" aria-label="Colunas do Kanban">
              {doc.columns.map((col) => (
                <BoardColumn
                  key={col.columnId}
                  column={col}
                  cardIds={itemsMap[col.columnId] ?? []}
                  cardById={cardById}
                  timeState={timeState}
                  saving={saving}
                  onEdit={handleEditCard}
                  onDelete={handleDeleteCard}
                  onArchive={handleArchiveCard}
                  onAddCard={handleAddCardToColumn}
                />
              ))}
            </div>
          </div>
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="fb-card fb-card--overlay">
              <span className="fb-card__title">{activeCard.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {colModal ? (
        <ColumnEditorModal
          key={`${boardId}-${doc.columns.map((c) => c.columnId).join('|')}`}
          columns={doc.columns}
          cards={doc.cards}
          workingHours={doc.workingHours}
          onClose={() => setColModal(false)}
          onApply={handleColumnApply}
        />
      ) : null}

      {taskModal !== 'closed' ? (
        <CreateTaskModal
          key={
            taskModal.mode === 'create'
              ? `${boardId}-create-${taskModal.columnId}`
              : `${boardId}-edit-${taskModal.card.cardId}`
          }
          boardId={boardId}
          getAttachmentBlob={getAttachmentBlob}
          isOpen
          onClose={() => {
            setTaskModal('closed')
            onCardEditComplete?.()
          }}
          onSubmit={taskModal.mode === 'create' ? handleCreateTask : handleUpdateTask}
          editingCard={taskModal.mode === 'create' ? null : taskModal.card}
          defaultColumnId={taskModal.mode === 'create' ? taskModal.columnId : undefined}
          onArchiveCard={handleArchiveCard}
          onUnarchiveCard={handleUnarchiveCard}
        />
      ) : null}
    </div>
  )
}

function BoardColumn({
  column,
  cardIds,
  cardById,
  timeState,
  saving,
  onEdit,
  onDelete,
  onArchive,
  onAddCard,
}: {
  column: Column
  cardIds: string[]
  cardById: Map<string, Card>
  timeState: TimeBoardState
  saving: boolean
  onEdit: (c: Card) => void
  onDelete: (c: Card) => void
  onArchive: (c: Card) => void
  onAddCard: (columnId: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.columnId })

  const roleClass =
    column.role === 'in_progress'
      ? 'fb-role-badge fb-role-badge--progress'
      : column.role === 'done'
        ? 'fb-role-badge fb-role-badge--done'
        : 'fb-role-badge'

  const roleLabel =
    column.role === 'backlog'
      ? 'Backlog'
      : column.role === 'in_progress'
        ? 'Em progresso'
        : column.role === 'done'
          ? 'Concluído'
          : column.role

  return (
    <div ref={setNodeRef} className="fb-board__col" data-testid={`column-${column.columnId}`}>
      <div className="fb-board__col-head">
        <h3 className="fb-board__col-title">{column.label}</h3>
        <span className="fb-board__col-meta">{cardIds.length}</span>
        <span className={roleClass}>{roleLabel}</span>
      </div>
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        {column.role === 'done' ? (
          <VirtualizedDoneColumnBody
            cardIds={cardIds}
            cardById={cardById}
            columnRole={column.role}
            timeState={timeState}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
          />
        ) : (
          <div className="fb-board__col-body">
            {cardIds.map((id) => {
              const card = cardById.get(id)
              return card ? (
                <SortableCard
                  key={id}
                  card={card}
                  columnRole={column.role}
                  timeState={timeState}
                  onEdit={() => onEdit(card)}
                  onDelete={() => onDelete(card)}
                  onArchive={() => onArchive(card)}
                />
              ) : null
            })}
          </div>
        )}
      </SortableContext>
      <button
        type="button"
        className="fb-col-add-card"
        data-testid={`column-add-card-${column.columnId}`}
        disabled={saving}
        aria-label={`Adicionar card na coluna ${column.label}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onAddCard(column.columnId)}
      >
        + Adicionar card
      </button>
    </div>
  )
}

function cardClassForPlannedStatus(status: PlannedDateUiStatus): string {
  switch (status) {
    case 'scheduled':
      return 'fb-card fb-card--accent-planned'
    case 'due_today':
      return 'fb-card fb-card--due-soon'
    case 'overdue':
      return 'fb-card fb-card--overdue'
    default:
      return 'fb-card'
  }
}

function CalendarGlyph({ stroke }: { stroke: string }) {
  return (
    <svg
      className="fb-card__planned-icon"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" stroke={stroke} strokeWidth={2} />
      <path d="M16 2v4M8 2v4M3 10h18" stroke={stroke} strokeWidth={2} />
    </svg>
  )
}

function overdueMessage(plannedDate: string, now: Date): string {
  const daysLate = getCalendarDaysOverdue(plannedDate, now)
  if (daysLate === 1) return 'Atrasado há 1 dia — atualize a data ou mova o card.'
  if (daysLate != null && daysLate > 1)
    return `Atrasado há ${daysLate} dias — atualize a data ou mova o card.`
  return 'Atrasado — atualize a data ou mova o card.'
}

function SortableCard({
  card,
  columnRole,
  timeState,
  onEdit,
  onDelete,
  onArchive,
}: {
  card: Card
  columnRole: ColumnRole
  timeState: TimeBoardState
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.cardId,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const st = timeState[card.cardId] ?? { cardId: card.cardId, completed: [] }
  const ms = totalCompletedMs(st)
  const hours = ms > 0 ? (ms / 3_600_000).toFixed(2) : '0'

  const now = new Date()
  const plannedStatus = getPlannedDateUiStatusForColumn(card.plannedDate, columnRole, now)
  const showPlanned = plannedStatus !== 'none' && card.plannedDate
  const displayDate = card.plannedDate ? formatPlannedDateForCard(card.plannedDate) : ''
  const plannedStroke =
    plannedStatus === 'due_today'
      ? 'var(--warning)'
      : plannedStatus === 'overdue'
        ? 'var(--danger-text-strong)'
        : 'var(--text-secondary)'
  const plannedValueLabel = plannedStatus === 'due_today' ? `Hoje · ${displayDate}` : displayDate
  const plannedAria =
    plannedStatus === 'overdue'
      ? `Data planejada era ${displayDate}`
      : `Data planejada: ${displayDate}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClassForPlannedStatus(plannedStatus)}
      data-testid={`card-${card.cardId}`}
      {...attributes}
      {...listeners}
    >
      <div className="fb-card__main">
        <span className="fb-card__title">{card.title}</span>
        <span className="fb-card__hours" title="Horas registradas (segmentos concluídos)">
          {hours}h
        </span>
      </div>
      {showPlanned ? (
        <div className="fb-card__meta">
          {plannedStatus === 'due_today' ? (
            <span className="fb-card__alert fb-card__alert--warn" role="status">
              <svg
                className="fb-card__alert-icon"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              Vence hoje — priorize encerrar ou reagendar
            </span>
          ) : null}
          {plannedStatus === 'overdue' ? (
            <div className="fb-card__alert fb-card__alert--danger" role="alert">
              <svg
                className="fb-card__alert-icon"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="fb-card__alert-body">
                <span className="fb-card__alert-kicker">Fora do prazo</span>
                <span className="fb-card__alert-msg">
                  {card.plannedDate ? overdueMessage(card.plannedDate, now) : ''}
                </span>
              </div>
            </div>
          ) : null}
          <div className="fb-card__planned" aria-label={plannedAria}>
            <CalendarGlyph stroke={plannedStroke} />
            <div>
              <span className="fb-card__planned-label">Planejado</span>
              <span className="fb-card__planned-value">{plannedValueLabel}</span>
            </div>
          </div>
        </div>
      ) : null}
      <div className="fb-card__actions">
        <button
          type="button"
          className="fb-card__btn"
          data-testid={`card-edit-${card.cardId}`}
          aria-label="Editar card"
          title="Editar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <svg
            className="fb-card__btn-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
        <button
          type="button"
          className="fb-card__btn"
          data-testid={`card-archive-${card.cardId}`}
          aria-label="Arquivar card"
          title="Arquivar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
        >
          <svg
            className="fb-card__btn-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 8v13H3V8" />
            <path d="M1 3h22v5H1z" />
            <path d="M10 12h4" />
          </svg>
        </button>
        <button
          type="button"
          className="fb-card__btn fb-card__btn--danger"
          data-testid={`card-delete-${card.cardId}`}
          aria-label="Excluir card"
          title="Excluir"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <svg
            className="fb-card__btn-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function VirtualizedDoneColumnBody({
  cardIds,
  cardById,
  columnRole,
  timeState,
  onEdit,
  onDelete,
  onArchive,
}: {
  cardIds: string[]
  cardById: Map<string, Card>
  columnRole: ColumnRole
  timeState: TimeBoardState
  onEdit: (c: Card) => void
  onDelete: (c: Card) => void
  onArchive: (c: Card) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  /* TanStack Virtual: retorno não memoizável pelo React Compiler — uso local apenas. */
  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer intentionally not memoized by compiler
  const virtualizer = useVirtualizer({
    count: cardIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 112,
    overscan: 6,
    getItemKey: (index) => cardIds[index]!,
  })

  if (cardIds.length === 0) {
    return <div className="fb-board__col-body fb-board__col-body--virtual" data-testid="done-column-empty" />
  }

  return (
    <div
      ref={parentRef}
      className="fb-board__col-body fb-board__col-body--virtual"
      data-testid="done-column-virtual"
    >
      <div
        className="fb-board__col-virtual-scroll"
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const id = cardIds[vi.index]!
          const card = cardById.get(id)
          if (!card) {
            return null
          }
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="fb-board__col-virtual-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <SortableCard
                card={card}
                columnRole={columnRole}
                timeState={timeState}
                onEdit={() => onEdit(card)}
                onDelete={() => onDelete(card)}
                onArchive={() => onArchive(card)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
