import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { parseRepoUrl } from '../src/infrastructure/github/url'
import { proxyGitHubRequest, readJsonBody, validatePatAndFetchUser, verifyRepositoryAccess } from './github'
import {
  clearSessionCookie,
  readSessionFromRequest,
  setSessionCookie,
  type FlowBoardServerSession,
} from './session'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
}

export function flowboardServerApiPlugin(): Plugin {
  return {
    name: 'flowboard-server-api',
    configureServer(server) {
      installApiMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      installApiMiddleware(server.middlewares)
    },
  }
}

function installApiMiddleware(middlewares: Connect.Server): void {
  middlewares.use((req, res, next) => {
    void handleApiRequest(req, res, next)
  })
}

async function handleApiRequest(req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://flowboard.local')

  try {
    if (url.pathname === '/api/auth/login') {
      await handleLogin(req, res)
      return
    }

    if (url.pathname === '/api/auth/logout') {
      handleLogout(req, res)
      return
    }

    if (url.pathname === '/api/auth/user') {
      handleUser(req, res)
      return
    }

    if (url.pathname === '/api/auth/session') {
      handleSession(req, res)
      return
    }

    if (url.pathname.startsWith('/api/github/')) {
      await handleGitHubProxy(req, res, url)
      return
    }

    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada no servidor.'
    sendJson(res, 500, { message })
  }
}

async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, 'POST')
    return
  }

  const existing = readSessionFromRequest(req)
  if (existing.kind === 'invalid') {
    clearSessionCookie(req, res)
  }
  if (existing.kind === 'authenticated') {
    sendJson(res, 409, { message: 'Sessão ativa. Faça logout antes de entrar novamente.' })
    return
  }

  const payload = (await readJsonBody(req)) as Record<string, unknown>
  const repoUrl = typeof payload.repoUrl === 'string' ? payload.repoUrl.trim() : ''
  const pat = typeof payload.pat === 'string' ? payload.pat.trim() : ''

  const parsed = parseRepoUrl(repoUrl)
  if ('error' in parsed) {
    sendJson(res, 400, { message: parsed.error })
    return
  }
  if (!pat) {
    sendJson(res, 400, { message: 'Informe o Personal Access Token.' })
    return
  }

  const user = await validatePatAndFetchUser(pat)
  await verifyRepositoryAccess(pat, parsed.owner, parsed.repo)

  setSessionCookie(req, res, {
    pat,
    repoUrl,
    owner: parsed.owner,
    repo: parsed.repo,
    webUrl: parsed.webUrl,
    user,
  })
  sendJson(res, 200, user)
}

function handleLogout(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, 'POST')
    return
  }

  clearSessionCookie(req, res)
  res.statusCode = 204
  res.end()
}

function handleUser(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, 'GET')
    return
  }

  const session = requireAuthenticatedSession(req, res)
  if (!session) {
    return
  }

  sendJson(res, 200, session.user)
}

function handleSession(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, 'GET')
    return
  }

  const session = requireAuthenticatedSession(req, res)
  if (!session) {
    return
  }

  sendJson(res, 200, {
    repoUrl: session.repoUrl,
    owner: session.owner,
    repo: session.repo,
    webUrl: session.webUrl,
    user: session.user,
  })
}

async function handleGitHubProxy(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const session = requireAuthenticatedSession(req, res)
  if (!session) {
    return
  }

  const suffix = `${url.pathname.slice('/api/github'.length)}${url.search}`
  await proxyGitHubRequest(req, res, session.pat, suffix)
}

function requireAuthenticatedSession(req: IncomingMessage, res: ServerResponse): FlowBoardServerSession | null {
  const result = readSessionFromRequest(req)
  if (result.kind === 'authenticated') {
    return result.session
  }

  if (result.kind === 'invalid') {
    clearSessionCookie(req, res)
  }
  sendJson(res, 401, { message: 'Sessão inválida ou expirada.' })
  return null
}

function sendMethodNotAllowed(res: ServerResponse, allow: string): void {
  res.setHeader('Allow', allow)
  sendJson(res, 405, { message: 'Método não permitido.' })
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  if (!res.headersSent) {
    res.writeHead(statusCode, JSON_HEADERS)
  } else {
    res.statusCode = statusCode
  }
  res.end(JSON.stringify(body))
}
