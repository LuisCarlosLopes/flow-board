import { type FormEvent, useState } from 'react'
import { GitHubContentsClient, GitHubHttpError } from '../../infrastructure/github/client'
import { parseRepoUrl } from '../../infrastructure/github/url'
import { bootstrapFlowBoardData } from '../../infrastructure/persistence/boardRepository'
import { createSession, saveSession, type FlowBoardSession } from '../../infrastructure/session/sessionStore'
import { OnboardingPage } from './OnboardingPage'
import './LoginView.css'

type Props = {
  onConnected: (session: FlowBoardSession) => void
}

export function LoginView({ onConnected }: Props) {
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const parsed = parseRepoUrl(repoUrl.trim())
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    if (!pat.trim()) {
      setError('Informe o Personal Access Token.')
      return
    }

    const client = new GitHubContentsClient({
      token: pat.trim(),
      owner: parsed.owner,
      repo: parsed.repo,
    })

    setBusy(true)
    try {
      await client.verifyRepositoryAccess()
      await bootstrapFlowBoardData(client)
      const session = createSession(pat.trim(), repoUrl.trim(), parsed)
      saveSession(session)
      onConnected(session)
    } catch (err) {
      if (err instanceof GitHubHttpError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Falha ao conectar. Tente novamente.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="fb-login" id="main-content" tabIndex={-1}>
      <div className="fb-login__card">
        <div className="fb-login__brand">
          <span className="fb-login__mark" aria-hidden>
            F
          </span>
          <span className="fb-login__name">FlowBoard</span>
        </div>
        <h1 className="fb-login__title">Entrar</h1>
        <button
          type="button"
          className="fb-login__onboarding-btn"
          onClick={() => setIsOnboardingOpen(true)}
          aria-label="Como gerar Personal Access Token"
        >
          Como gerar PAT?
        </button>
        <p className="fb-login__lead">
          Conecte um <strong>repositório GitHub privado</strong> onde os dados serão salvos como JSON.
          Use um PAT com escopo adequado (tipicamente <code>repo</code> para repos privados).
        </p>
        {error ? (
          <div className="fb-login__err" role="alert">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} noValidate>
          <label className="fb-field">
            <span>URL do repositório</span>
            <input
              name="repo-url"
              type="url"
              autoComplete="off"
              value={repoUrl}
              onChange={(ev) => setRepoUrl(ev.target.value)}
              placeholder="https://github.com/voce/flowboard-data"
              required
            />
          </label>
          <label className="fb-field">
            <span>Personal Access Token</span>
            <input
              name="repo-pat"
              type="password"
              autoComplete="off"
              value={pat}
              onChange={(ev) => setPat(ev.target.value)}
              placeholder="ghp_••••••••"
              required
            />
          </label>
          <p className="fb-login__hint">
            O token é um segredo: não compartilhe, não commite em arquivos do repositório de dados e
            revogue tokens antigos periodicamente.
          </p>
          <button className="fb-login__btn" type="submit" disabled={busy}>
            {busy ? 'Conectando…' : 'Conectar'}
          </button>
        </form>
        <OnboardingPage isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
      </div>
    </main>
  )
}
