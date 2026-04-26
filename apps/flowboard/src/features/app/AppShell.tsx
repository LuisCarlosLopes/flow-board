import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArchivedCardsPage } from '../board/ArchivedCardsPage'
import { BoardView } from '../board/BoardView'
import { BoardListView } from '../boards/BoardListView'
import { HoursView } from '../hours/HoursView'
import { FeatureFlagProvider } from '../../infrastructure/featureFlags/FeatureFlagContext'
import { PreviewFeaturesModal } from './PreviewFeaturesModal'
import { SearchModal } from './SearchModal'
import { useSearchHotkey } from '../../hooks/useSearchHotkey'
import { GitHubHttpError } from '../../infrastructure/github/client'
import { createClientFromSession } from '../../infrastructure/github/fromSession'
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
  const location = useLocation()
  const onArchivedRoute = location.pathname === '/archived'
  const { version } = useCurrentVersion()
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => loadActiveBoardId(session))
  const [mainView, setMainView] = useState<'kanban' | 'hours'>('kanban')
  const [columnEditorMenuTick, setColumnEditorMenuTick] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isPreviewFeaturesOpen, setIsPreviewFeaturesOpen] = useState(false)
  const [cardToEditId, setCardToEditId] = useState<string | null>(null)
  const [boardPersistGeneration, setBoardPersistGeneration] = useState(0)
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme())
  const tabWasHidden = useRef(false)
  const lastRepoProbeAt = useRef(0)

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

  // After the user was away, probe GitHub once so a revoked/expired PAT surfaces as 401 and
  // the global handler sends them to login, instead of leaving uncaught load errors in the board.
  useEffect(() => {
    const MIN_MS_BETWEEN_PROBES = 5 * 60 * 1000
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        tabWasHidden.current = true
        return
      }
      if (document.visibilityState !== 'visible' || !tabWasHidden.current) {
        return
      }
      tabWasHidden.current = false
      const now = Date.now()
      if (now - lastRepoProbeAt.current < MIN_MS_BETWEEN_PROBES) {
        return
      }
      lastRepoProbeAt.current = now
      const client = createClientFromSession(session)
      void client.verifyRepositoryAccess().catch((e) => {
        if (e instanceof GitHubHttpError && e.status === 401) {
          return
        }
        // Transient network / rate limits: ignore; a later action will surface errors.
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [session])

  const requestOpenColumnEditor = useCallback(() => {
    setColumnEditorMenuTick((n) => n + 1)
  }, [])

  const onBoardPersisted = useCallback(() => {
    setBoardPersistGeneration((g) => g + 1)
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
    <FeatureFlagProvider>
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
              className="fb-preview-lab-btn"
              data-testid="fb-preview-features-open"
              onClick={() => setIsPreviewFeaturesOpen(true)}
              aria-label="Pré-visualizações experimentais"
              title="Ativar ou desativar funcionalidades em preview"
            >
              Previews
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
          columnEditorDisabled={!selectedBoardId || mainView !== 'kanban' || onArchivedRoute}
          viewTabs={
            <nav className="fb-board-bar__tabs" role="tablist" aria-label="Área principal">
              <button
                type="button"
                className={!onArchivedRoute && mainView === 'kanban' ? 'fb-tab is-active' : 'fb-tab'}
                role="tab"
                aria-selected={!onArchivedRoute && mainView === 'kanban'}
                onClick={() => {
                  if (onArchivedRoute) {
                    navigate('/')
                  }
                  setMainView('kanban')
                }}
                data-testid="nav-kanban"
              >
                Quadro
              </button>
              <button
                type="button"
                className={!onArchivedRoute && mainView === 'hours' ? 'fb-tab is-active' : 'fb-tab'}
                role="tab"
                aria-selected={!onArchivedRoute && mainView === 'hours'}
                onClick={() => {
                  if (onArchivedRoute) {
                    navigate('/')
                  }
                  setMainView('hours')
                }}
                data-testid="nav-hours"
              >
                Horas no período
              </button>
              {selectedBoardId ? (
                <button
                  type="button"
                  className={onArchivedRoute ? 'fb-tab is-active' : 'fb-tab'}
                  role="tab"
                  aria-selected={onArchivedRoute}
                  data-testid="nav-archived"
                  onClick={() => navigate('/archived')}
                >
                  Arquivados
                </button>
              ) : null}
            </nav>
          }
        />
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className={[
          'fb-main',
          !onArchivedRoute && mainView === 'hours' && 'fb-main--hours',
          !onArchivedRoute && mainView === 'kanban' && 'fb-main--kanban',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {onArchivedRoute ? (
          <ArchivedCardsPage
            session={session}
            boardId={selectedBoardId}
            onBoardPersisted={onBoardPersisted}
          />
        ) : (
          <>
            {mainView === 'kanban' && selectedBoardId ? (
              <BoardView
                session={session}
                boardId={selectedBoardId}
                columnEditorMenuTick={columnEditorMenuTick}
                cardToEditId={cardToEditId}
                onCardEditComplete={() => setCardToEditId(null)}
                onBoardPersisted={onBoardPersisted}
              />
            ) : null}
            {mainView === 'hours' ? (
              <HoursView session={session} selectedBoardId={selectedBoardId} />
            ) : null}
          </>
        )}
      </main>

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          boardId={selectedBoardId || ''}
          session={session}
          boardPersistGeneration={boardPersistGeneration}
          onSelectResult={(cardId) => {
            setIsSearchOpen(false)
            if (onArchivedRoute) {
              navigate('/')
              setMainView('kanban')
            }
            setCardToEditId(cardId)
          }}
        />
        <PreviewFeaturesModal
          isOpen={isPreviewFeaturesOpen}
          onClose={() => setIsPreviewFeaturesOpen(false)}
        />
      </div>
    </FeatureFlagProvider>
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
