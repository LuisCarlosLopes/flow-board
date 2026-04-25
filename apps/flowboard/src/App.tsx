import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './features/app/AppShell'
import { LoginView } from './features/auth/LoginView'
import ReleaseNotesPage from './features/release-notes/ReleaseNotesPage'
import { fetchBffSession } from './infrastructure/session/sessionApi'
import { clearLegacyPatStorage, type FlowBoardSession } from './infrastructure/session/sessionStore'

export default function App() {
  const [session, setSession] = useState<FlowBoardSession | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    clearLegacyPatStorage()
    let cancelled = false
    ;(async () => {
      try {
        const s = await fetchBffSession()
        if (!cancelled) {
          setSession(s)
        }
      } finally {
        if (!cancelled) {
          setBooting(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (booting) {
    return (
      <div className="fb-boot" style={{ padding: '2rem', textAlign: 'center' }}>
        A carregar sessão…
      </div>
    )
  }

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
              {!session ? (
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
