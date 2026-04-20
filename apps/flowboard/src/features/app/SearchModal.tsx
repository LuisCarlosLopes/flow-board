import { useEffect, useRef, useState, useCallback } from 'react'
import type { BoardDocumentJson } from '../../infrastructure/persistence/types'
import { searchCards, type CardSearchResult } from '../../domain/cardSearch'
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

// In-memory board cache to avoid reloading on modal close/reopen
const boardCache = new Map<string, { doc: BoardDocumentJson; timestamp: number }>()

/**
 * SearchModal - A modal component for searching cards in the active board.
 *
 * Features:
 * - Automatically loads the board from GitHub when modal opens
 * - In-memory caching to avoid reloading on modal close/reopen (1-hour TTL)
 * - Real-time search as user types
 * - Results sorted by relevance score
 * - Keyboard navigation (Escape to close)
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardSearchResult[]>([])
  const [board, setBoard] = useState<BoardDocumentJson | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load board with caching strategy
  useEffect(() => {
    if (!isOpen || !boardId) {
      setBoard(null)
      setError(null)
      return
    }

    const loadBoard = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check cache first (1-hour TTL)
        const cached = boardCache.get(boardId)
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

        const client = createClientFromSession(session)
        const repo = createBoardRepository(client)
        const loadedBoard = await repo.loadBoard(boardId)
        if (loadedBoard) {
          // Cache the board
          boardCache.set(boardId, { doc: loadedBoard.doc, timestamp: now })
          setBoard(loadedBoard.doc)
        }
      } catch (err) {
        // Ignore abort errors (from component unmount)
        if (err instanceof Error && err.name === 'AbortError') {
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

  // Update search results when query or board changes
  useEffect(() => {
    let newResults: CardSearchResult[] = []

    if (board?.cards && query.trim()) {
      newResults = searchCards(query, board.cards, 100)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResults(newResults)
  }, [query, board, boardId])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
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
      // Call the callback (typically used to open/select card in parent)
      onSelectResult?.(cardId)
      // Trigger a custom event so SearchModal can be closed by parent if needed
      // Or let parent handle the closing
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
  const showNoResults =
    !hasResults && query.trim().length > 0 && !isLoading && !error && board
  const showHint = !hasResults && query.trim().length === 0 && !isLoading && !error
  const showLoadingState = isLoading
  const isInputDisabled = isLoading || !!error

  return (
    <div className="fb-sm-backdrop" onClick={handleBackdropClick} role="presentation">
      <div
        className="fb-sm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
      >
        <div className="fb-sm-header">
          <input
            ref={inputRef}
            type="text"
            className="fb-sm-input"
            placeholder="Buscar cards, descrições, datas…"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            aria-label="Buscar no quadro"
            autoComplete="off"
            spellCheck="false"
            disabled={isInputDisabled}
          />
          {showLoadingState && (
            <div className="fb-sm-loading-spinner" aria-label="Carregando" />
          )}
        </div>

        <div className="fb-sm-results-container">
          {showLoadingState && (
            <div className="fb-sm-loading-message">
              <p>Carregando quadro…</p>
              <span className="fb-sm-loading-dot" />
            </div>
          )}

          {error && (
            <div className="fb-sm-no-results">
              <p>Erro ao carregar quadro: {error}</p>
            </div>
          )}

          {showHint && !isLoading && (
            <div className="fb-sm-hint">
              <p>Digite para buscar cards no quadro</p>
            </div>
          )}

          {showNoResults && (
            <div className="fb-sm-no-results">
              <p>Nenhum resultado encontrado para &quot;{query}&quot;</p>
            </div>
          )}

          {hasResults && (
            <ul className="fb-sm-results-list" role="listbox">
              {results.map((result) => (
                <li
                  key={result.cardId}
                  className="fb-sm-result-item"
                  role="option"
                  onClick={() => handleSelectResult(result.cardId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectResult(result.cardId)
                    }
                  }}
                  tabIndex={0}
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
                    {getColumnLabel(result.columnId) && (
                      <span className="fb-sm-meta-column">
                        📌 {getColumnLabel(result.columnId)}
                      </span>
                    )}
                    {result.plannedDate && (
                      <span className="fb-sm-meta-date">
                        📅 {result.plannedDate}
                      </span>
                    )}
                    {result.plannedHours !== undefined && (
                      <span className="fb-sm-meta-hours">
                        ⏱️ {result.plannedHours}h
                      </span>
                    )}
                  </div>
                </li>
              ))}

              {results.length > 100 && (
                <div className="fb-sm-results-overflow">
                  <p className="fb-sm-overflow-text">
                    … e mais {results.length - 100} resultados
                  </p>
                </div>
              )}
            </ul>
          )}
        </div>

        {!board && (
          <div className="fb-sm-empty-state">
            <p>Selecione um quadro para buscar</p>
          </div>
        )}
      </div>
    </div>
  )
}
