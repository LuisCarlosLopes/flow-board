import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import {
  createBoardEntry,
  createBoardRepository,
  deleteBoardEntry,
  renameBoardEntry,
  type CatalogJson,
} from '../../infrastructure/persistence/boardRepository'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import './BoardListView.css'

type Props = {
  session: FlowBoardSession
  selectedBoardId: string | null
  onSelectBoard: (id: string | null) => void
  /** Tabs Quadro / Horas — na mesma linha do formulário para alinhar à base. */
  viewTabs?: ReactNode
}

export function BoardListView({ session, selectedBoardId, onSelectBoard, viewTabs }: Props) {
  const [catalog, setCatalog] = useState<CatalogJson | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false)
  const boardSettingsRef = useRef<HTMLDivElement>(null)

  const client = useMemo(() => createClientFromSession(session), [session])
  const repo = useMemo(() => createBoardRepository(client), [client])

  const currentBoard = useMemo(() => {
    if (!catalog || !selectedBoardId) {
      return undefined
    }
    return catalog.boards.find((b) => b.boardId === selectedBoardId)
  }, [catalog, selectedBoardId])

  const refresh = useCallback(async () => {
    setLoadError('')
    try {
      const { catalog: c } = await repo.loadCatalog()
      setCatalog(c)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Falha ao carregar catálogo.')
    }
  }, [repo])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => clearTimeout(t)
  }, [refresh])

  useEffect(() => {
    if (!catalog) {
      return
    }
    if (catalog.boards.length === 0) {
      onSelectBoard(null)
      return
    }
    if (selectedBoardId == null || !catalog.boards.some((b) => b.boardId === selectedBoardId)) {
      onSelectBoard(catalog.boards[0]!.boardId)
    }
  }, [catalog, selectedBoardId, onSelectBoard])

  useEffect(() => {
    if (!boardSettingsOpen) {
      return
    }
    function onDocMouseDown(ev: MouseEvent) {
      if (boardSettingsRef.current && !boardSettingsRef.current.contains(ev.target as Node)) {
        setBoardSettingsOpen(false)
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        setBoardSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [boardSettingsOpen])

  async function submitNewBoard(title: string) {
    const t = title.trim()
    if (!t) {
      return
    }
    setActionError('')
    setBusy(true)
    try {
      const { catalog: next } = await createBoardEntry(repo, t)
      setCatalog(next)
      onSelectBoard(next.boards[next.boards.length - 1]!.boardId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao criar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateFromMenu() {
    const name = window.prompt('Nome do novo quadro', 'Novo quadro')
    if (name == null) {
      return
    }
    await submitNewBoard(name)
  }

  async function handleRenameCurrent() {
    if (!selectedBoardId || !currentBoard) {
      return
    }
    const n = window.prompt('Novo nome do quadro', currentBoard.title)
    if (n == null) {
      return
    }
    setActionError('')
    setBusy(true)
    try {
      const next = await renameBoardEntry(repo, selectedBoardId, n)
      setCatalog(next)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao renomear.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteCurrent() {
    if (!selectedBoardId || !currentBoard || !catalog) {
      return
    }
    if (!window.confirm(`Excluir o quadro "${currentBoard.title}"? Esta ação não pode ser desfeita.`)) {
      return
    }
    setActionError('')
    setBusy(true)
    try {
      const next = await deleteBoardEntry(repo, client, selectedBoardId)
      setCatalog(next)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao excluir.')
    } finally {
      setBusy(false)
    }
  }

  function closeSettingsAnd(fn: () => void | Promise<void>) {
    setBoardSettingsOpen(false)
    void fn()
  }

  if (loadError) {
    return (
      <div className="fb-boards" data-testid="board-list">
        <div className="fb-board-bar__headline">
          <div className="fb-boards__primary fb-boards__primary--placeholder" aria-hidden />
          {viewTabs}
        </div>
        <div className="fb-boards--error" role="alert">
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!catalog) {
    return (
      <div className="fb-boards" data-testid="board-list">
        <div className="fb-board-bar__headline">
          <div className="fb-boards__primary">
            <p className="fb-boards__loading">Carregando quadros…</p>
          </div>
          {viewTabs}
        </div>
      </div>
    )
  }

  return (
    <div className="fb-boards" data-testid="board-list">
      {actionError ? (
        <div className="fb-boards__err" role="alert">
          {actionError}
        </div>
      ) : null}
      <div className="fb-board-bar__headline">
        <div className="fb-boards__primary">
        <div className="fb-board-picker">
          <span className="fb-board-picker__label" id="board-picker-label">
            Quadro ativo
          </span>
          <select
            id="board-active-select"
            className="fb-board-select"
            value={selectedBoardId ?? ''}
            onChange={(e) => onSelectBoard(e.target.value || null)}
            disabled={busy || catalog.boards.length === 0}
            aria-label={
              currentBoard
                ? `Quadro ativo: ${currentBoard.title}`
                : 'Selecionar quadro ativo'
            }
            data-testid="board-active-select"
          >
            {catalog.boards.length === 0 ? (
              <option value="">—</option>
            ) : (
              catalog.boards.map((b) => (
                <option key={b.boardId} value={b.boardId} data-testid={`board-select-${b.boardId}`}>
                  {b.title}
                </option>
              ))
            )}
          </select>
        </div>
        </div>
        <div className="fb-board-bar__headline-trailing">
          {viewTabs}
          <div className="fb-board-menu" ref={boardSettingsRef}>
            <button
              type="button"
              className="fb-board-menu__trigger"
              aria-expanded={boardSettingsOpen}
              aria-haspopup="menu"
              aria-controls="board-settings-menu"
              disabled={busy}
              onClick={() => setBoardSettingsOpen((o) => !o)}
              data-testid="board-settings-trigger"
            >
              <span className="fb-boards__sr-only">Configurações do quadro</span>
              <svg
                className="fb-board-menu__icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            {boardSettingsOpen ? (
              <ul
                id="board-settings-menu"
                className="fb-board-menu__dropdown"
                role="menu"
                aria-label="Ações dos quadros"
              >
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="fb-board-menu__item"
                    disabled={busy}
                    onClick={() => closeSettingsAnd(handleCreateFromMenu)}
                    data-testid="board-create"
                  >
                    Criar quadro
                  </button>
                </li>
                <li className="fb-board-menu__sep" aria-hidden role="presentation" />
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="fb-board-menu__item"
                    disabled={busy || !selectedBoardId}
                    onClick={() => closeSettingsAnd(handleRenameCurrent)}
                    data-testid="board-rename-current"
                  >
                    Renomear quadro
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="fb-board-menu__item fb-board-menu__item--danger"
                    disabled={busy || !selectedBoardId || catalog.boards.length <= 1}
                    onClick={() => closeSettingsAnd(handleDeleteCurrent)}
                    data-testid="board-delete-current"
                  >
                    Excluir quadro
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {catalog.boards.length === 0 ? (
        <p className="fb-boards__empty">
          Nenhum quadro. Use o ícone de configurações ao lado das abas para criar um quadro.
        </p>
      ) : null}
    </div>
  )
}
