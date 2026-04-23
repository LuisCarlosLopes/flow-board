import express, { type Request, type Response } from 'express'
import { getIronSession } from 'iron-session'
import { GITHUB_API_BASE, parseRepoUrl } from '../src/infrastructure/github/url.js'
import { GitHubContentsClient, GitHubHttpError } from '../src/infrastructure/github/client.js'
import { bootstrapFlowBoardData } from '../src/infrastructure/persistence/boardRepository.js'
import { flowboardSessionOptions } from './sessionOptions.js'

type SessionPayload = {
  pat?: string
  owner?: string
  repo?: string
  repoUrl?: string
  webUrl?: string
  userLogin?: string
  userName?: string | null
  userAvatarUrl?: string
}

type IronSessionT = Awaited<ReturnType<typeof getIronSession<SessionPayload>>>

/**
 * Nunca deixa exceção do iron-session (cookie adulterado / segredo trocado) virar 500.
 */
async function readSession(
  req: Request,
  res: Response,
): Promise<{ session: IronSessionT | null; error: 'invalid_session' | null }> {
  try {
    const session = await getIronSession<SessionPayload>(req, res, flowboardSessionOptions)
    return { session, error: null }
  } catch (err) {
    console.error('[flowboard] getIronSession', err)
    return { session: null, error: 'invalid_session' }
  }
}

/**
 * BFF: auth routes + reverse proxy to api.github.com (PAT only server-side).
 */
export function createBff() {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(express.json({ limit: '50mb' }))

  app.post('/api/auth/logout', async (req, res) => {
    const { session, error } = await readSession(req, res)
    if (session) {
      try {
        session.destroy()
      } catch (e) {
        console.error('[flowboard] session.destroy', e)
      }
    } else if (error) {
      // nada: cookie já inválido
    }
    res.status(204).end()
  })

  app.get('/api/auth/me', async (req, res) => {
    const { session, error: sessionErr } = await readSession(req, res)
    if (sessionErr || !session) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
      return
    }
    if (!session.pat) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
      return
    }
    res.json({
      login: session.userLogin,
      name: session.userName,
      avatar_url: session.userAvatarUrl,
    })
  })

  app.get('/api/auth/session', async (req, res) => {
    const { session, error: sessionErr } = await readSession(req, res)
    if (sessionErr || !session) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
      return
    }
    if (!session.pat) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
      return
    }
    res.json({
      profile: {
        login: session.userLogin,
        name: session.userName,
        avatar_url: session.userAvatarUrl,
      },
      repository: {
        owner: session.owner,
        repo: session.repo,
        repoUrl: session.repoUrl,
        webUrl: session.webUrl,
        apiBase: GITHUB_API_BASE,
      },
    })
  })

  app.post('/api/auth/login', async (req, res) => {
    const { session, error: sessionErr } = await readSession(req, res)
    if (sessionErr) {
      res.clearCookie(flowboardSessionOptions.cookieName, {
        path: flowboardSessionOptions.cookieOptions?.path ?? '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      res.status(400).json({ error: { code: 'STALE_SESSION' } })
      return
    }
    if (!session) {
      res.status(500).json({ error: { code: 'SERVER_ERROR' } })
      return
    }
    if (session.pat) {
      res.status(409).json({ error: { code: 'SESSION_ACTIVE' } })
      return
    }
    const pat = typeof req.body?.pat === 'string' ? req.body.pat.trim() : ''
    const repoUrl = typeof req.body?.repoUrl === 'string' ? req.body.repoUrl.trim() : ''
    if (!pat || !repoUrl) {
      res.status(400).json({ error: { code: 'INVALID_BODY' } })
      return
    }

    const userRes = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'FlowBoard/1.0',
      },
    })
    if (userRes.status !== 200) {
      res.status(401).json({ error: { code: 'INVALID_TOKEN' } })
      return
    }
    const user = (await userRes.json()) as {
      login: string
      name: string | null
      avatar_url: string
    }

    const parsed = parseRepoUrl(repoUrl)
    if ('error' in parsed) {
      res.status(400).json({ error: { code: 'INVALID_REPO', message: parsed.error } })
      return
    }

    const client = new GitHubContentsClient({
      token: pat,
      owner: parsed.owner,
      repo: parsed.repo,
      apiBase: GITHUB_API_BASE,
    })
    try {
      await client.verifyRepositoryAccess()
      await bootstrapFlowBoardData(client)
    } catch (err) {
      if (err instanceof GitHubHttpError) {
        if (err.status === 404 || err.status === 403) {
          res.status(401).json({ error: { code: 'REPO_INACCESSIBLE' } })
          return
        }
      }
      res.status(401).json({ error: { code: 'REPO_INACCESSIBLE' } })
      return
    }

    session.pat = pat
    session.owner = parsed.owner
    session.repo = parsed.repo
    session.repoUrl = repoUrl
    session.webUrl = parsed.webUrl
    session.userLogin = user.login
    session.userName = user.name
    session.userAvatarUrl = user.avatar_url
    await session.save()

    res.status(201).end()
  })

  const githubProxy = express.Router()
  githubProxy.all(/.*/, async (req, res) => {
    const { session, error: sessionErr } = await readSession(req, res)
    if (sessionErr || !session) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
      return
    }
    if (!session.pat) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
      return
    }
    const rel = req.url || '/'
    if (rel.startsWith('//') || !rel.startsWith('/')) {
      res.status(400).end()
      return
    }
    const target = new URL(rel, GITHUB_API_BASE)
    if (target.origin !== 'https://api.github.com') {
      res.status(400).end()
      return
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.pat}`,
      Accept: (req.headers.accept as string) || 'application/vnd.github+json',
      'X-GitHub-Api-Version': (req.headers['x-github-api-version'] as string) || '2022-11-28',
      'User-Agent': (req.headers['user-agent'] as string) || 'FlowBoard/1.0',
    }
    const sendBody = !['GET', 'HEAD'].includes(req.method) && req.body !== undefined
    if (sendBody) {
      headers['content-type'] = (req.headers['content-type'] as string) || 'application/json'
    }
    try {
      const r = await fetch(target, {
        method: req.method,
        headers,
        body: sendBody ? JSON.stringify(req.body) : undefined,
      })
      const text = await r.text()
      res.status(r.status)
      const ct = r.headers.get('content-type')
      if (ct) {
        res.setHeader('content-type', ct)
      }
      const rlr = r.headers.get('x-ratelimit-remaining')
      if (rlr) {
        res.setHeader('X-RateLimit-Remaining', rlr)
      }
      const ra = r.headers.get('retry-after')
      if (ra) {
        res.setHeader('Retry-After', ra)
      }
      res.send(text)
    } catch {
      res.status(502).json({ error: { code: 'UPSTREAM' } })
    }
  })

  app.use('/api/github', githubProxy)
  return app
}
