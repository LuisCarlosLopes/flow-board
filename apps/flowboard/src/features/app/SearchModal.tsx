import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import { searchCardsWithTotal, type CardSearchResult } from '../../domain/cardSearch'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
import { createBoardRepository } from '../../infrastructure/persistence/boardRepository'
import type { FlowBoardSession } from '../../infrastructure/session/sessionStore'
import './SearchModal.css'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  session: FlowBoardSession
  onSelectResult?: (cardId: string) => void
}

// In-memory board cache to avoid reloading on modal close/reopen (scoped per GitHub repo + board)
const boardCache = new Map<string, { doc: BoardDocumentJson; timestamp: number }>()

function boardCacheKey(session: FlowBoardSession, boardId: string): string {
  return `${session.owner}/${session.repo}/${boardId}`
}

/** Clears the modal board cache (for tests and rare session resets). */
// eslint-disable-next-line react-refresh/only-export-components -- test helper; keep cache private to this module otherwise
export function clearSearchModalBoardCache(): void {
  boardCache.clear()
}

const SEARCH_RESULTS_LIMIT = 100

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true
  }
  return err instanceof Error && err.name === 'AbortError'
}

/**
 * SearchModal - A modal component for searching cards in the active board.
 *
 * Features:
 * - Automatically loads the board from GitHub when modal opens
 * - In-memory caching to avoid reloading on modal close/reopen (1-hour TTL)
 * - Real-time search as user types
 * - Results sorted by relevance score
 * - Keyboard: Tab focus trap, Escape closes from anywhere inside the dialog
 * - Click overlay or Escape to dismiss
 * - Click result to open card
 * - Accessible (ARIA labels, semantic HTML)
 * - Responsive design (mobile to desktop)
 */
export function SearchModal({
  isOpen,
  onClose,
  boardId,
  session,
  onSelectResult,
}: SearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [board, setBoard] = useState<BoardDocumentJson | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load board with caching strategy
  useEffect(() => {
    if (!isOpen || !boardId) {
      /* Clear stale board when the modal closes or no board is selected (not async I/O). */
      /* eslint-disable react-hooks/set-state-in-effect */
      setBoard(null)
      setError(null)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    const loadBoard = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check cache first (1-hour TTL)
        const cacheKey = boardCacheKey(session, boardId)
        const cached = boardCache.get(cacheKey)
        const now = Date.now()
        const CACHE_TTL = 60 * 60 * 1000 // 1 hour

        if (cached && now - cached.timestamp < CACHE_TTL) {
          setBoard(cached.doc)
          setIsLoading(false)
          return
        }

        // Cancel previous request if exists
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setBoard(null)

        const client = createClientFromSession(session)
        const repo = createBoardRepository(client)
        const signal = abortControllerRef.current.signal
        const loadedBoard = await repo.loadBoard(boardId, { signal })
        if (loadedBoard) {
          // Cache the board
          boardCache.set(cacheKey, { doc: loadedBoard.doc, timestamp: now })
          setBoard(loadedBoard.doc)
        } else {
          setBoard(null)
        }
      } catch (err) {
        if (isAbortError(err)) {
          return
        }
        const errorMsg = err instanceof Error ? err.message : 'Failed to load board'
        console.error('SearchModal: Failed to load board:', err)
        setError(errorMsg)
        setBoard(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadBoard()

    // Cleanup: abort ongoing requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isOpen, boardId, session])

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use setTimeout to ensure focus happens after render
      const timeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  const { results, totalMatched: searchTotalMatched } = useMemo(() => {
    if (!board?.cards || !query.trim()) {
      return { results: [] as CardSearchResult[], totalMatched: 0 }
    }
    return searchCardsWithTotal(query, board.cards, SEARCH_RESULTS_LIMIT)
  }, [query, board])

  // Keep keyboard focus inside the dialog while it is open (Tab / Shift+Tab wrap).
  useEffect(() => {
    if (!isOpen) return
    const modal = modalRef.current
    if (!modal) return

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const listFocusable = (): HTMLElement[] => {
      const nodes = modal.querySelectorAll<HTMLElement>(focusableSelector)
      return [...nodes].filter(
        (el) => el.getAttribute('aria-hidden') !== 'true' && modal.contains(el),
      )
    }

    const onDocumentKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = listFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || !modal.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
        return
      }
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [isOpen, results.length, isLoading, error])

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value)
  }, [])

  const handleDialogKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose],
  )

  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSelectResult = useCallback(
    (cardId: string) => {
      onSelectResult?.(cardId)
    },
    [onSelectResult],
  )

  // Get column label by columnId
  const getColumnLabel = (columnId: string): string | undefined => {
    if (!board?.columns) return undefined
    const column = board.columns.find((col) => col.columnId === columnId)
    return column?.label
  }

  // Truncate text with ellipsis
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength)}…`
  }

  if (!isOpen) {
    return null
  }

  const hasResults = results.length > 0
  const overflowExtraCount =
    searchTotalMatched > SEARCH_RESULTS_LIMIT ? searchTotalMatched - SEARCH_RESULTS_LIMIT : 0
  const showNoResults =
    !hasResults && query.trim().length > 0 && !isLoading && !error && board
  const showHint = !hasResults && query.trim().length === 0 && !isLoading && !error
  const showLoadingState = isLoading
  const isInputDisabled = !!error

  return (
    <div className="fb-sm-backdrop" onClick={handleBackdropClick} role="presentation">
      <div
        ref={modalRef}
        className="fb-sm-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-busy={isLoading}
        aria-labelledby="search-modal-title"
      >
        <h2 id="search-modal-title" className="fb-sm-sr-only">
          Buscar no quadro
        </h2>
        <div className="fb-sm-header">
          <input
            ref={inputRef}
            type="text"
            className="fb-sm-input"
            placeholder="Buscar cards, descrições, datas…"
            value={query}
            onChange={handleInputChange}
            aria-label="Buscar no quadro"
            autoComplete="off"
            spellCheck="false"
            disabled={isInputDisabled}
          />
          {showLoadingState && <div className="fb-sm-loading-spinner" aria-hidden="true" />}
        </div>

        <div className="fb-sm-results-container">
          {showLoadingState && (
            <div className="fb-sm-loading-message" role="status" aria-live="polite">
              <p>Carregando quadro…</p>
              <span className="fb-sm-loading-dot" aria-hidden="true" />
            </div>
          )}

          {error && (
            <div className="fb-sm-no-results" role="alert" aria-live="assertive">
              <p>Erro ao carregar quadro: {error}</p>
            </div>
          )}

          {showHint && !isLoading && (
            <div className="fb-sm-hint">
              <p>Digite para buscar cards no quadro</p>
            </div>
          )}

          {showNoResults && (
            <div className="fb-sm-no-results" role="status" aria-live="polite">
              <p>Nenhum resultado encontrado para &quot;{query}&quot;</p>
            </div>
          )}

          {hasResults && (
            <ul className="fb-sm-results-list">
              {results.map((result) => {
                const columnLabel = getColumnLabel(result.columnId)
                return (
                <li key={result.cardId} className="fb-sm-result-row">
                  <button
                    type="button"
                    className="fb-sm-result-item"
                    onClick={() => handleSelectResult(result.cardId)}
                    data-testid={`search-result-${result.cardId}`}
                  >
                    <div className="fb-sm-result-header">
                      <h3 className="fb-sm-result-title">{result.title}</h3>
                      <div className="fb-sm-result-score">
                        <span className="fb-sm-score-badge">{result.score}</span>
                      </div>
                    </div>

                    {result.description && (
                      <p className="fb-sm-result-snippet">
                        {truncateText(result.description, 100)}
                      </p>
                    )}

                    <div className="fb-sm-result-meta">
                      {columnLabel && (
                        <span className="fb-sm-meta-column">
                          <span aria-hidden="true">📌</span> {columnLabel}
                        </span>
                      )}
                      {result.plannedDate && (
                        <span className="fb-sm-meta-date">
                          <span aria-hidden="true">📅</span> {result.plannedDate}
                        </span>
                      )}
                      {result.plannedHours !== undefined && (
                        <span className="fb-sm-meta-hours">
                          <span aria-hidden="true">⏱️</span> {result.plannedHours}h
                        </span>
                      )}
                    </div>
                  </button>
                </li>
                )
              })}

              {overflowExtraCount > 0 && (
                <li className="fb-sm-results-overflow" role="presentation">
                  <p className="fb-sm-overflow-text">… e mais {overflowExtraCount} resultados</p>
                </li>
              )}
            </ul>
          )}
        </div>

        {(!boardId || (!isLoading && !error && !board)) && (
          <div className="fb-sm-empty-state">
            <p>
              {!boardId
                ? 'Selecione um quadro para buscar'
                : 'Não foi possível carregar este quadro.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
