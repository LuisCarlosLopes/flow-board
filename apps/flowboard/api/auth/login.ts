import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseRepoUrl } from '../../src/infrastructure/github/url.js'
import { readJsonBody, readSessionFromRequest, sendJson, setSessionCookie } from '../_session.js'

const GITHUB_API = 'https://api.github.com'

async function validatePatAndRepo(
  pat: string,
  owner: string,
  repo: string,
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'flowboard/1.0',
      },
    },
  )
  if (res.status === 401) throw Object.assign(new Error('PAT inválido ou sem permissão (401).'), { status: 401 })
  if (res.status === 403) throw Object.assign(new Error('Acesso negado (403). Verifique os escopos do PAT.'), { status: 403 })
  if (res.status === 404) throw Object.assign(new Error('Repositório não encontrado (404).'), { status: 404 })
  if (!res.ok) throw Object.assign(new Error(`GitHub retornou ${res.status}.`), { status: 502 })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON' })
    return
  }

  if (!body || typeof body !== 'object') {
    sendJson(res, 400, { error: 'Missing body' })
    return
  }

  const { pat, repoUrl } = body as Record<string, unknown>

  if (typeof pat !== 'string' || pat.trim().length < 10) {
    sendJson(res, 400, { error: 'PAT inválido.' })
    return
  }
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    sendJson(res, 400, { error: 'URL do repositório inválida.' })
    return
  }

  const parsed = parseRepoUrl(repoUrl.trim())
  if ('error' in parsed) {
    sendJson(res, 400, { error: parsed.error })
    return
  }

  const { owner, repo, webUrl } = parsed
  const trimmedPat = pat.trim()

  try {
    await validatePatAndRepo(trimmedPat, owner, repo)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 502
    const message = err instanceof Error ? err.message : 'Falha ao validar PAT.'
    sendJson(res, status === 401 || status === 403 || status === 404 ? status : 502, { error: message })
    return
  }

  setSessionCookie(res, {
    pat: trimmedPat,
    owner,
    repo,
    webUrl,
    repoUrl: repoUrl.trim(),
  })

  sendJson(res, 200, {
    owner,
    repo,
    webUrl,
    repoUrl: repoUrl.trim(),
    apiBase: '/api/github',
  })
}
