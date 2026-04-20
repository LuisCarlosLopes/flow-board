import { useCallback, useState } from 'react'
import { BoardView } from '../board/BoardView'
import { BoardListView } from '../boards/BoardListView'
import { HoursView } from '../hours/HoursView'
import { SearchModal } from './SearchModal'
import { useSearchHotkey } from '../../hooks/useSearchHotkey'
import { formatRepoChipLabel } from '../../infrastructure/github/url'
import { clearSession, type FlowBoardSession } from '../../infrastructure/session/sessionStore'
import './AppShell.css'

type Props = {
  session: FlowBoardSession
  onLogout: () => void
}

export function AppShell({ session, onLogout }: Props) {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [mainView, setMainView] = useState<'kanban' | 'hours'>('kanban')
  const [columnEditorMenuTick, setColumnEditorMenuTick] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [cardToEditId, setCardToEditId] = useState<string | null>(null)

  const requestOpenColumnEditor = useCallback(() => {
    setColumnEditorMenuTick((n) => n + 1)
  }, [])

  // Register search hotkey listener
  useSearchHotkey(() => setIsSearchOpen(true))

  function logout() {
    clearSession()
    onLogout()
  }

  const repoChip = formatRepoChipLabel(session.webUrl)

  return (
    <div className="fb-app fb-app-shell">
      <header className="fb-topbar">
        <div className="fb-topbar__brand">
          <span className="fb-topbar__mark" aria-hidden>
            F
          </span>
          <span className="fb-topbar__name">FlowBoard</span>
        </div>
        <div
          className="fb-topbar__search"
          role="button"
          tabIndex={0}
          onClick={() => setIsSearchOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsSearchOpen(true)}
          aria-label="Busca no quadro"
        >
          <span aria-hidden="true">⌕</span>
          <span>Buscar cards, etiquetas, tempo…</span>
          <kbd className="fb-topbar__kbd">/</kbd>
        </div>
        <div className="fb-topbar__actions">
          <span className="fb-chip fb-chip--accent fb-repo-chip" title={session.webUrl}>
            GitHub · {repoChip}
          </span>
          <button type="button" className="fb-btn-text" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <div className="fb-board-bar">
        <BoardListView
          session={session}
          selectedBoardId={selectedBoardId}
          onSelectBoard={setSelectedBoardId}
          onOpenColumnEditor={requestOpenColumnEditor}
          columnEditorDisabled={!selectedBoardId || mainView !== 'kanban'}
          viewTabs={
            <nav className="fb-board-bar__tabs" role="tablist" aria-label="Área principal">
              <button
                type="button"
                className={mainView === 'kanban' ? 'fb-tab is-active' : 'fb-tab'}
                role="tab"
                aria-selected={mainView === 'kanban'}
                onClick={() => setMainView('kanban')}
                data-testid="nav-kanban"
              >
                Quadro
              </button>
              <button
                type="button"
                className={mainView === 'hours' ? 'fb-tab is-active' : 'fb-tab'}
                role="tab"
                aria-selected={mainView === 'hours'}
                onClick={() => setMainView('hours')}
                data-testid="nav-hours"
              >
                Horas no período
              </button>
            </nav>
          }
        />
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className={['fb-main', mainView === 'hours' && 'fb-main--hours', mainView === 'kanban' && 'fb-main--kanban']
          .filter(Boolean)
          .join(' ')}
      >
        {mainView === 'kanban' && selectedBoardId ? (
          <BoardView
            session={session}
            boardId={selectedBoardId}
            columnEditorMenuTick={columnEditorMenuTick}
            cardToEditId={cardToEditId}
            onCardEditComplete={() => setCardToEditId(null)}
          />
        ) : null}
        {mainView === 'hours' ? (
          <HoursView session={session} selectedBoardId={selectedBoardId} />
        ) : null}
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        boardId={selectedBoardId || ''}
        session={session}
        onSelectResult={(cardId) => {
          setIsSearchOpen(false)
          setCardToEditId(cardId)
        }}
      />
    </div>
  )
}
