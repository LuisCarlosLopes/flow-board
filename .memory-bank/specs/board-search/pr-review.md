# PR review — board-search (thread Copilot / GitHub)

**Status da revisão (código em `apps/flowboard`, 2026-04-20):** Os comentários abaixo foram tratados na implementação atual: padding/hover no CSS; tipos de evento React; `AbortSignal` até `fetch`; `searchCardsWithTotal` e indicador de overflow; overflow só como `<li>`; `preventDefault` no Espaço da busca na topbar; empty-state sem conflitar com loading/erro; testes com mock de `loadBoard` + limpeza de cache; melhorias de a11y (focus trap, Escape no diálogo, botões nos resultados, `aria-live`/`role="alert"`); cache do modal chaveado por `owner/repo/boardId`; `role="status"` para “nenhum resultado”.

O fio abaixo é o registro histórico dos comentários originais.

---

apps/flowboard/src/features/app/SearchModal.css
Comment on lines +209 to +214
.fb-sm-result-item:hover {
  background: var(--hover-surface-strong);
  padding-left: calc(var(--space-4) + 4px);
  border-left: 4px solid var(--accent-border);
  padding-left: calc(var(--space-4) - 4px);
}
Copilot AI
9 hours ago
In .fb-sm-result-item:hover there are two padding-left declarations; the second one overrides the first, so the intended left-shift behavior is unclear and likely incorrect. Remove the duplicate and keep a single padding calculation that accounts for the border-left you add on hover.

---

apps/flowboard/src/domain/cardSearch.ts
Comment on lines +81 to +99
export function searchCards(query: string, cards: Card[], maxResults: number = 100): CardSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim()

  // Empty query returns empty results
  if (!normalizedQuery) {
    return []
  }

  // Empty cards array returns empty results
  if (!cards || cards.length === 0) {
    return []
  }

  const results: CardSearchResult[] = []

  for (const card of cards) {
    const score = scoreCard(card, query)

    // Only include cards with a score > 0
    
----

apps/flowboard/src/features/app/SearchModal.tsx
Comment on lines +134 to +141
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onClose()
Copilot AI
9 hours ago
 handleInputChange / handleKeyDown use React.ChangeEvent and React.KeyboardEvent, but this file doesn't import the React namespace (and tsconfig uses jsx: react-jsx). This will fail typechecking with “Cannot find name 'React'”. Import the relevant event types from react (or import type React), or switch the annotations to ChangeEvent / KeyboardEvent from the React import.

---
apps/flowboard/src/features/app/SearchModal.tsx
Comment on lines +73 to +90
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
Copilot AI
9 hours ago
 AbortController is created/aborted, but its signal is never passed into the GitHub fetch path (repo.loadBoard → GitHubContentsClient.fetchImpl). As written, aborting won't cancel the in-flight request and the AbortError branch will never trigger. Either plumb a signal through loadBoard/tryGetFileJson into fetch, or remove the abort-controller logic to avoid a false sense of cancellation.

 ---

 apps/flowboard/src/features/app/SearchModal.tsx
Comment on lines +126 to +295
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
Copilot AI
9 hours ago
 searchCards(query, board.cards, 100) already slices results to 100, so results.length > 100 can never be true and the overflow indicator is dead code. If you want to show “... e mais X resultados”, you need access to the unbounded total (e.g., call searchCards without a limit and then slice for rendering, or change searchCards to return { results, total }).

 ---

 apps/flowboard/src/features/app/SearchModal.tsx
Comment on lines +289 to +296
              {results.length > 100 && (
                <div className="fb-sm-results-overflow">
                  <p className="fb-sm-overflow-text">
                    … e mais {results.length - 100} resultados
                  </p>
                </div>
              )}
            </ul>
Copilot AI
9 hours ago
Inside the <ul> you render a <div className="fb-sm-results-overflow">…</div> when overflowing. A <ul> should only contain <li> children; this breaks list semantics/accessibility. Render the overflow indicator as an <li> (or move it outside the <ul>).

---

apps/flowboard/src/features/app/AppShell.tsx
          role="button"
          tabIndex={0}
          onClick={() => setIsSearchOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsSearchOpen(true)}
Copilot AI
9 hours ago
 onKeyDown opens the modal on Space but doesn't call preventDefault(). For non-button elements, Space typically scrolls the page; this can cause unexpected scrolling when activating the control via keyboard. Call e.preventDefault() when handling Space (or switch this element to a real <button type="button"> to get correct keyboard behavior by default).

Suggested change
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault()
              setIsSearchOpen(true)
            } else if (e.key === 'Enter') {
              setIsSearchOpen(true)
            }
          }}
---

apps/flowboard/src/features/app/SearchModal.tsx
Comment on lines +300 to +304
        {!board && (
          <div className="fb-sm-empty-state">
            <p>Selecione um quadro para buscar</p>
          </div>
        )}
Copilot AI
9 hours ago
The !board empty-state block renders even while the board is still loading (or when an error occurs), so users can see “Selecione um quadro para buscar” at the same time as “Carregando quadro…” / an error message. Consider showing this empty-state only when there is no boardId selected, or when !isLoading && !error && !board to avoid contradictory UI states.

---

apps/flowboard/src/features/app/SearchModal.test.tsx
Comment on lines +24 to +46
  // Test 1: Modal not rendered when closed
  it('should not render modal if isOpen=false', () => {
    const { container } = render(
      <SearchModal
        isOpen={false}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
    expect(container.querySelector('.fb-sm-backdrop')).not.toBeInTheDocument()
  })

  // Test 2: Modal renders when open with backdrop
  it('should render modal structure when isOpen=true', () => {
    const { container } = render(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        boardId="board-1"
        session={mockSession}
      />,
    )
Copilot AI
9 hours ago
These tests render SearchModal with isOpen=true, which triggers the effect that calls repo.loadBoard() and ultimately globalThis.fetch (real network) because nothing is mocked. This makes the test suite flaky and can accidentally hit GitHub. Mock/stub the GitHub client/repository (or inject a loader) so tests run deterministically without network I/O.