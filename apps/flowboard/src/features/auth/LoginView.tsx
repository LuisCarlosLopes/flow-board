import { type FormEvent, useState } from 'react'
import { GitHubContentsClient } from '../../infrastructure/github/client'
import { FLOWBOARD_GITHUB_PROXY_BASE, parseRepoUrl } from '../../infrastructure/github/url'
import { bootstrapFlowBoardData } from '../../infrastructure/persistence/boardRepository'
import {
  consumeLoginScreenBanner,
  LOGIN_BANNER_PAT_LOST,
} from '../../infrastructure/session/sessionInvalidation'
import { createSession, saveSessionAsync, type FlowBoardSession } from '../../infrastructure/session/sessionStore'
import { OnboardingPage } from './OnboardingPage'
import './LoginView.css'

type Props = {
  onConnected: (session: FlowBoardSession) => void
}

async function postLogin(pat: string, repoUrl: string): Promise<{ owner: string; repo: string; webUrl: string; repoUrl: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pat, repoUrl }),
    credentials: 'same-origin',
  })
  let data: { error?: string; owner?: string; repo?: string; webUrl?: string; repoUrl?: string } = {}
  try {
    data = (await res.json()) as typeof data
  } catch {
    // response body empty or non-JSON (e.g. gateway error)
  }
  if (!res.ok) {
    throw new Error(data.error ?? `Erro ${res.status}`)
  }
  return data as { owner: string; repo: string; webUrl: string; repoUrl: string }
}

export function LoginView({ onConnected }: Props) {
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [error, setError] = useState('')
  const [sessionLostBanner, setSessionLostBanner] = useState<string | null>(() => {
    const key = consumeLoginScreenBanner()
    if (key === LOGIN_BANNER_PAT_LOST) {
      return 'Sua sessão com o GitHub expirou ou o token foi revogado. Cole um PAT válido para continuar.'
    }
    return null
  })
  const [busy, setBusy] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSessionLostBanner(null)
    const parsed = parseRepoUrl(repoUrl.trim())
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    if (!pat.trim()) {
      setError('Informe o Personal Access Token.')
      return
    }

    setBusy(true)
    try {
      const resolution = await postLogin(pat.trim(), repoUrl.trim())
      const client = new GitHubContentsClient({
        owner: resolution.owner,
        repo: resolution.repo,
        apiBase: FLOWBOARD_GITHUB_PROXY_BASE,
      })
      await client.verifyRepositoryAccess()
      await bootstrapFlowBoardData(client)
      const session = createSession(pat.trim(), repoUrl.trim(), {
        owner: resolution.owner,
        repo: resolution.repo,
        webUrl: resolution.webUrl,
      })
      await saveSessionAsync(session)
      onConnected(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao conectar. Tente novamente.')
    } finally {
      setBusy(false)
      // Clear PAT from component state as soon as possible
      setPat('')
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
        {sessionLostBanner ? (
          <div className="fb-login__err" role="status">
            {sessionLostBanner}
          </div>
        ) : null}
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
