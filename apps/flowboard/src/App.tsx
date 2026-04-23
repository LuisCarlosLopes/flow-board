import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './features/app/AppShell'
import { LoginView } from './features/auth/LoginView'
import ReleaseNotesPage from './features/release-notes/ReleaseNotesPage'
import { fetchAuthenticatedUser, logoutSession } from './infrastructure/session/authApi'
import { clearSession, loadSession, saveSession, type FlowBoardSession } from './infrastructure/session/sessionStore'

export default function App() {
  const [session, setSession] = useState<FlowBoardSession | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const stored = loadSession()
        if (!stored) {
          const authenticatedUser = await fetchAuthenticatedUser()
          if (authenticatedUser) {
            await logoutSession()
          }
          if (!cancelled) {
            clearSession()
            setSession(null)
            setBootstrapping(false)
          }
          return
        }

        const authenticatedUser = await fetchAuthenticatedUser()
        if (!authenticatedUser) {
          if (!cancelled) {
            clearSession()
            setSession(null)
            setBootstrapping(false)
          }
          return
        }

        const nextSession = {
          ...stored,
          user: authenticatedUser,
        }
        saveSession(nextSession)
        if (!cancelled) {
          setSession(nextSession)
          setBootstrapping(false)
        }
      } catch {
        if (!cancelled) {
          clearSession()
          setSession(null)
          setBootstrapping(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

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
              {bootstrapping ? (
                <main id="main-content" tabIndex={-1} />
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
