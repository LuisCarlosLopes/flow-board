import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './features/app/AppShell'
import { LoginView } from './features/auth/LoginView'
import ReleaseNotesPage from './features/release-notes/ReleaseNotesPage'
import { AuthGateway } from './infrastructure/auth/authGateway'
import { clearSession, loadSession, saveSession, type FlowBoardSession } from './infrastructure/session/sessionStore'

export default function App() {
  const authGateway = useMemo(() => new AuthGateway(), [])
  const initialSession = useMemo(() => loadSession(), [])
  const [session, setSession] = useState<FlowBoardSession | null>(initialSession)
  const [booting, setBooting] = useState<boolean>(initialSession !== null)

  useEffect(() => {
    if (!initialSession) {
      return
    }

    let cancelled = false
    void authGateway
      .getSession()
      .then((remoteSession) => {
        if (cancelled) {
          return
        }
        saveSession(remoteSession)
        setSession(remoteSession)
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        clearSession()
        setSession(null)
      })
      .finally(() => {
        if (!cancelled) {
          setBooting(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authGateway, initialSession])

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
              {booting ? (
                <main className="fb-login" id="main-content" tabIndex={-1}>
                  <div className="fb-login__card">
                    <p className="fb-login__lead">Restaurando sessão segura…</p>
                  </div>
                </main>
              ) : !session ? (
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
