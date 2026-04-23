import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './features/app/AppShell'
import { LoginView } from './features/auth/LoginView'
import ReleaseNotesPage from './features/release-notes/ReleaseNotesPage'
import { evictLegacyPatFromStorage, fetchSession, type FlowBoardSession } from './infrastructure/session/sessionStore'

export default function App() {
  const [session, setSession] = useState<FlowBoardSession | null | 'loading'>(() => {
    evictLegacyPatFromStorage()
    return 'loading'
  })

  useEffect(() => {
    void fetchSession().then((s) => setSession(s))
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
              {session === 'loading' ? null : !session ? (
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
