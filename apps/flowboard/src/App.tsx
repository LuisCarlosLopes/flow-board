import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './features/app/AppShell'
import { LoginView } from './features/auth/LoginView'
import ReleaseNotesPage from './features/release-notes/ReleaseNotesPage'
import { GitHubHttpError } from './infrastructure/github/client'
import {
  LOGIN_BANNER_PAT_LOST,
  registerSessionInvalidateHandler,
  setLoginScreenBanner,
} from './infrastructure/session/sessionInvalidation'
import {
  clearSession,
  hasPersistedSession,
  loadSessionAsync,
  type FlowBoardSession,
} from './infrastructure/session/sessionStore'

// @MindContext: Raiz da SPA — sessão GitHub em `localStorage` e rota de recuperação pós-401.
// @MindWhy: O cliente HTTP invalida a sessão antes de lançar; `void reload()` / awaits sem `catch` ainda rejeitam — `unhandledrejection` + `preventDefault` evita ruído na consola nesse caso.
// @MindRisk: Só chamar `preventDefault` para `GitHubHttpError` 401; outro 401 noutro fluxo exige revisão.
export default function App() {
  const [session, setSession] = useState<FlowBoardSession | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    void loadSessionAsync().then((s) => {
      setSession(s)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof GitHubHttpError && e.reason.status === 401) {
        e.preventDefault()
      }
    }
    window.addEventListener('unhandledrejection', onUnhandled)
    return () => window.removeEventListener('unhandledrejection', onUnhandled)
  }, [])

  // Register on each render so the callback runs before any child useEffect; first GitHub
  // load must see a valid handler to recover from 401 (expired/revoked PAT).
  registerSessionInvalidateHandler(() => {
    if (hasPersistedSession()) {
      setLoginScreenBanner(LOGIN_BANNER_PAT_LOST)
    }
    clearSession()
    setSession(null)
  })

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/releases" element={<ReleaseNotesPage />} />
        <Route
          path="*"
          element={
            <>
              <a className="fb-skip-link" href="#main-content">
                Ir para o conteúdo principal
              </a>
              {!authReady ? null : !session ? (
                <LoginView onConnected={setSession} />
              ) : (
                <AppShell
                  key={`${session.owner}/${session.repo}`}
                  session={session}
                  onLogout={() => setSession(null)}
                />
              )}
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
