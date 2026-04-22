import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BoardView } from '../board/BoardView'
import { BoardListView } from '../boards/BoardListView'
import { HoursView } from '../hours/HoursView'
import { SearchModal } from './SearchModal'
import { useSearchHotkey } from '../../hooks/useSearchHotkey'
import { formatRepoChipLabel } from '../../infrastructure/github/url'
import { clearActiveBoardId, loadActiveBoardId, saveActiveBoardId } from '../../infrastructure/session/boardSelectionStore'
import { clearSession, type FlowBoardSession } from '../../infrastructure/session/sessionStore'
import { THEME_STORAGE_KEY, type ThemeMode } from '../../infrastructure/theme/themeConstants'
import { applyThemeToDocument, readTheme, writeTheme } from '../../infrastructure/theme/themeStore'
import { useCurrentVersion } from '../release-notes/hooks/useCurrentVersion'
import './AppShell.css'

type Props = {
  session: FlowBoardSession
  onLogout: () => void
}

export function AppShell({ session, onLogout }: Props) {
  const navigate = useNavigate()
  const { version } = useCurrentVersion()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => loadActiveBoardId(session))
  const [mainView, setMainView] = useState<'kanban' | 'hours'>('kanban')
  const [columnEditorMenuTick, setColumnEditorMenuTick] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [cardToEditId, setCardToEditId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme())

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_STORAGE_KEY || e.storageArea !== localStorage) {
        return
      }
      const next = readTheme()
      applyThemeToDocument(next)
      setTheme(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Persist selection per repository (does not contain secrets).
  useEffect(() => {
    saveActiveBoardId(session, selectedBoardId)
  }, [session, selectedBoardId])

  const requestOpenColumnEditor = useCallback(() => {
    setColumnEditorMenuTick((n) => n + 1)
  }, [])

  // Register search hotkey listener
  useSearchHotkey(() => setIsSearchOpen(true))

  function logout() {
    clearActiveBoardId(session)
    clearSession()
    onLogout()
  }

  const repoChip = formatRepoChipLabel(session.webUrl)

  function toggleTheme() {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    writeTheme(next)
    applyThemeToDocument(next)
    setTheme(next)
  }

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
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault()
              setIsSearchOpen(true)
            } else if (e.key === 'Enter') {
              setIsSearchOpen(true)
            }
          }}
          aria-label="Busca no quadro"
        >
          <span aria-hidden="true">⌕</span>
          <span>Buscar cards, etiquetas, tempo…</span>
          <kbd className="fb-topbar__kbd">/</kbd>
        </div>
        <div className="fb-topbar__actions">
          <button
            type="button"
            className="fb-theme-toggle"
            data-testid="fb-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            className="fb-version-badge"
            data-testid="fb-version-badge"
            title="Ver notas de versão"
            onClick={() => navigate('/releases')}
          >
            v{version}
          </button>
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

function IconSun() {
  return (
    <svg className="fb-theme-toggle__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
      />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg className="fb-theme-toggle__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  )
}
