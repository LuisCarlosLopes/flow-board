import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import { validateColumnLayout } from '../../domain/boardRules'
import {
  applyDragEnd,
  buildItemsRecord,
  findCardContainer,
  itemsRecordToCards,
  migrateCardsAfterColumnEdit,
} from '../../domain/boardLayout'
import { applyCardMove, totalCompletedMs } from '../../domain/timeEngine'
import type { Card, Column, TimeBoardState } from '../../domain/types'
import { GitHubHttpError } from '../../infrastructure/github/client'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import { createBoardRepository } from '../../infrastructure/persistence/boardRepository'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import { appendNewSegments, docToTimeBoardState, writeTimeBoardStateToDoc } from './timeBridge'
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
}

export function BoardView({ session, boardId, columnEditorMenuTick = 0, cardToEditId, onCardEditComplete }: Props) {
  const client = useMemo(() => createClientFromSession(session), [session])
  const repo = useMemo(() => createBoardRepository(client), [client])

  const [doc, setDoc] = useState<BoardDocumentJson | null>(null)
  const [sha, setSha] = useState<string | null>(null)
  const [timeState, setTimeState] = useState<TimeBoardState>({})
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
      return
    }
    setDoc(got.doc)
    setSha(got.sha)
    setTimeState(docToTimeBoardState(got.doc))
  }, [boardId, repo])

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
        setTaskModal({ mode: 'edit', card: cardToEdit })
      }
    }
  }, [cardToEditId, doc?.cards])

  const cardById = useMemo(() => new Map(doc?.cards.map((c) => [c.cardId, c]) ?? []), [doc])

  const itemsMap = useMemo(() => {
    if (!doc) {
      return {}
    }
    return buildItemsRecord(doc.columns, doc.cards)
  }, [doc])

  const saveDocument = useCallback(
    async (nextDoc: BoardDocumentJson) => {
      setSaving(true)
      setPersistError('')
      try {
        await repo.saveBoard(nextDoc.boardId, nextDoc, sha)
        const got = await repo.loadBoard(boardId)
        if (got) {
          setDoc(got.doc)
          setSha(got.sha)
          setTimeState(docToTimeBoardState(got.doc))
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
            setDoc(got.doc)
            setSha(got.sha)
            setTimeState(docToTimeBoardState(got.doc))
          }
        } catch {
          /* ignore */
        }
      } finally {
        setSaving(false)
      }
    },
    [boardId, repo, sha],
  )

  function commitAfterDrag(nextItems: Record<string, string[]>, movedCardId: string) {
    if (!doc) {
      return
    }
    const fromCol = findCardContainer(itemsMap, movedCardId)
    const toCol = findCardContainer(nextItems, movedCardId)
    const nextDoc = structuredClone(doc)
    const newCards = itemsRecordToCards(nextDoc.columns, nextItems, cardById)
    nextDoc.cards = newCards

    let nextTime = timeState
    if (fromCol && toCol && fromCol !== toCol) {
      nextTime = applyCardMove(timeState, movedCardId, fromCol, toCol, nextDoc.columns, Date.now())
    }
    appendNewSegments(nextDoc, timeState, nextTime)
    writeTimeBoardStateToDoc(nextDoc, nextTime)
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

  async function handleCreateTask(task: Partial<Card>) {
    if (!doc) {
      return
    }
    const firstBacklog = doc.columns.find((c) => c.role === 'backlog')?.columnId
    if (!firstBacklog) {
      return
    }

    const newCard: Card = {
      cardId: task.cardId || crypto.randomUUID(),
      title: task.title || 'Nova tarefa',
      columnId: task.columnId || firstBacklog,
      description: task.description,
      plannedDate: task.plannedDate,
      plannedHours: task.plannedHours,
      createdAt: task.createdAt,
    }

    const nextDoc = structuredClone(doc)
    nextDoc.cards = [...nextDoc.cards, newCard]
    await saveDocument(nextDoc)
  }

  async function handleUpdateTask(task: Partial<Card>) {
    if (!doc || !task.cardId) {
      return
    }
    const nextDoc = structuredClone(doc)
    nextDoc.cards = nextDoc.cards.map((c) =>
      c.cardId === task.cardId
        ? {
            ...c,
            title: task.title?.trim() ? task.title.trim() : c.title,
            description: task.description,
            plannedDate: task.plannedDate,
            plannedHours: task.plannedHours,
            createdAt: task.createdAt ?? c.createdAt,
          }
        : c,
    )
    setDoc(nextDoc)
    await saveDocument(nextDoc)
  }

  function handleDeleteCard(card: Card) {
    if (!window.confirm(`Excluir a tarefa "${card.title}"?`)) {
      return
    }
    if (!doc) {
      return
    }
    const nextDoc = structuredClone(doc)
    nextDoc.cards = nextDoc.cards.filter((c) => c.cardId !== card.cardId)
    const nextTime = { ...timeState }
    delete nextTime[card.cardId]
    delete nextDoc.cardTimeState[card.cardId]
    writeTimeBoardStateToDoc(nextDoc, nextTime)
    setTimeState(nextTime)
    setDoc(nextDoc)
    void saveDocument(nextDoc)
  }

  function handleColumnApply(cols: Column[]) {
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
    writeTimeBoardStateToDoc(nextDoc, timeState)
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
      {saving ? <p className="fb-board__saving">Salvando…</p> : null}

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
          isOpen
          onClose={() => {
            setTaskModal('closed')
            onCardEditComplete?.()
          }}
          onSubmit={taskModal.mode === 'create' ? handleCreateTask : handleUpdateTask}
          editingCard={taskModal.mode === 'create' ? null : taskModal.card}
          defaultColumnId={taskModal.mode === 'create' ? taskModal.columnId : undefined}
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
  onAddCard,
}: {
  column: Column
  cardIds: string[]
  cardById: Map<string, Card>
  timeState: TimeBoardState
  saving: boolean
  onEdit: (c: Card) => void
  onDelete: (c: Card) => void
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
        <div className="fb-board__col-body">
          {cardIds.map((id) => {
            const card = cardById.get(id)
            return card ? (
              <SortableCard
                key={id}
                card={card}
                timeState={timeState}
                onEdit={() => onEdit(card)}
                onDelete={() => onDelete(card)}
              />
            ) : null
          })}
        </div>
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

function SortableCard({
  card,
  timeState,
  onEdit,
  onDelete,
}: {
  card: Card
  timeState: TimeBoardState
  onEdit: () => void
  onDelete: () => void
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="fb-card"
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
      <div className="fb-card__actions">
        <button
          type="button"
          className="fb-card__btn"
          data-testid={`card-edit-${card.cardId}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          Editar
        </button>
        <button
          type="button"
          className="fb-card__btn fb-card__btn--danger"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  )
}
