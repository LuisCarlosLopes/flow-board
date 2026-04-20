import { useState } from 'react'
import { AppShell } from './features/app/AppShell'
import { LoginView } from './features/auth/LoginView'
import { loadSession, type FlowBoardSession } from './infrastructure/session/sessionStore'

export default function App() {
  const [session, setSession] = useState<FlowBoardSession | null>(() => loadSession())

  return (
    <>
      <a className="fb-skip-link" href="#main-content">
        Ir para o conteúdo principal
      </a>
      {!session ? (
        <LoginView onConnected={setSession} />
      ) : (
        <AppShell key={`${session.owner}/${session.repo}`} session={session} onLogout={() => setSession(null)} />
      )}
    </>
  )
}
