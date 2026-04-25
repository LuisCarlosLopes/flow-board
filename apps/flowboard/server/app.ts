// @vitest-environment node
import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseRepoUrl } from '../src/infrastructure/github/url'
import { GitHubHttpError, GitHubContentsClient } from '../src/infrastructure/github/client'
import { bootstrapFlowBoardData } from '../src/infrastructure/persistence/boardRepository'
import { sendWebResponse, toWebRequest } from './httpAdapter'
import { createSessionRecord, readSessionRecord } from './sessions'
import {
  SESSION_COOKIE_NAME,
  buildExpiredSessionCookie,
  buildSessionCookie,
  errorResponse,
  isTrustedOrigin,
  jsonResponse,
  loadServerConfig,
  parseCookies,
  readJsonBody,
  sanitizeFlowBoardPath,
  type ServerConfig,
} from './security'
import { GitHubContentsService } from './githubContentsService'

type CreateFlowBoardApiAppOptions = {
  config?: ServerConfig
  fetchImpl?: typeof fetch
  now?: () => number
}

type AuthRequestBody = {
  repoUrl?: unknown
  pat?: unknown
}

type ContentRequestBody = {
  path?: unknown
  kind?: unknown
  json?: unknown
  sha?: unknown
  contentBase64?: unknown
  message?: unknown
}

export function createFlowBoardApiApp(options: CreateFlowBoardApiAppOptions = {}) {
  const config = options.config ?? loadServerConfig()
  const now = options.now ?? Date.now

  async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      return null
    }

    if (url.pathname === '/api/auth/session') {
      return handleAuthSession(request)
    }
    if (url.pathname === '/api/flowboard/contents') {
      return handleFlowBoardContents(request, url)
    }
    return errorResponse(404, 'not_found', 'Rota não encontrada.')
  }

  async function handleAuthSession(request: Request): Promise<Response> {
    if (!isTrustedOrigin(request)) {
      return errorResponse(403, 'invalid_origin', 'Origem não permitida.')
    }

    if (request.method === 'GET') {
      const record = getSessionRecord(request)
      if (!record) {
        return errorResponse(401, 'session_invalid', 'Sessão expirada. Conecte novamente.', {
          headers: { 'Set-Cookie': buildExpiredSessionCookie(config) },
        })
      }
      return jsonResponse(200, { session: record.session })
    }

    if (request.method === 'DELETE') {
      if (!isTrustedOrigin(request)) {
        return errorResponse(403, 'invalid_origin', 'Origem não permitida.')
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Set-Cookie': buildExpiredSessionCookie(config),
        },
      })
    }

    if (request.method !== 'POST') {
      return errorResponse(405, 'method_not_allowed', 'Método não suportado.')
    }

    const body = await readJsonBody<AuthRequestBody>(request)
    if (!body || typeof body.repoUrl !== 'string' || typeof body.pat !== 'string') {
      return errorResponse(400, 'invalid_request', 'Informe URL do repositório e PAT.')
    }

    const repoUrl = body.repoUrl.trim()
    const pat = body.pat.trim()
    if (!repoUrl || !pat) {
      return errorResponse(400, 'invalid_request', 'Informe URL do repositório e PAT.')
    }

    const parsed = parseRepoUrl(repoUrl)
    if ('error' in parsed) {
      return errorResponse(400, 'invalid_request', parsed.error)
    }
    if (!config.sessionSecret) {
      return errorResponse(
        503,
        'server_misconfigured',
        'FLOWBOARD_SESSION_SECRET não configurado no runtime do servidor.',
      )
    }

    try {
      const bootstrapClient = new GitHubContentsClient({
        token: pat,
        owner: parsed.owner,
        repo: parsed.repo,
        fetchImpl: options.fetchImpl,
      })
      await bootstrapClient.verifyRepositoryAccess()
      await bootstrapFlowBoardData(bootstrapClient)

      const record = createSessionRecord(
        config,
        { owner: parsed.owner, repo: parsed.repo, repoUrl, webUrl: parsed.webUrl },
        pat,
        now,
      )

      return jsonResponse(
        201,
        { session: record.session },
        {
          'Set-Cookie': buildSessionCookie(record.cookieValue, config),
        },
      )
    } catch (error) {
      return mapAuthGitHubError(error)
    }
  }

  async function handleFlowBoardContents(request: Request, url: URL): Promise<Response> {
    const record = getSessionRecord(request)
    if (!record) {
      return errorResponse(401, 'session_invalid', 'Sessão expirada. Conecte novamente.', {
        headers: { 'Set-Cookie': buildExpiredSessionCookie(config) },
      })
    }

    const service = new GitHubContentsService(record, options.fetchImpl)
    const queryPath = url.searchParams.get('path') ?? ''
    const queryKind = url.searchParams.get('kind') === 'blob' ? 'blob' : 'json'

    if (request.method === 'GET') {
      const path = sanitizeFlowBoardPath(queryPath)
      if (!path) {
        return errorResponse(403, 'path_not_allowed', 'Path fora da allowlist do FlowBoard.')
      }
      try {
        if (queryKind === 'blob') {
          const payload = await service.getFileRaw(path)
          return jsonResponse(200, payload)
        }
        const payload = await service.getFileJson(path)
        return jsonResponse(200, payload)
      } catch (error) {
        return mapGitHubError(error)
      }
    }

    if (!isTrustedOrigin(request)) {
      return errorResponse(403, 'invalid_origin', 'Origem não permitida.')
    }

    const body = await readJsonBody<ContentRequestBody>(request)
    if (!body || typeof body.path !== 'string') {
      return errorResponse(400, 'invalid_request', 'Payload inválido para conteúdo FlowBoard.')
    }
    const path = sanitizeFlowBoardPath(body.path)
    if (!path) {
      return errorResponse(403, 'path_not_allowed', 'Path fora da allowlist do FlowBoard.')
    }

    try {
      if (request.method === 'PUT') {
        if (body.kind === 'blob') {
          if (typeof body.contentBase64 !== 'string') {
            return errorResponse(400, 'invalid_request', 'Blob base64 é obrigatório.')
          }
          await service.putFileBase64(
            path,
            body.contentBase64,
            typeof body.sha === 'string' ? body.sha : null,
            typeof body.message === 'string' ? body.message : undefined,
          )
        } else {
          await service.putFileJson(path, body.json, typeof body.sha === 'string' ? body.sha : null)
        }
        return jsonResponse(200, { ok: true })
      }

      if (request.method === 'DELETE') {
        if (typeof body.sha !== 'string' || !body.sha.trim()) {
          return errorResponse(400, 'invalid_request', 'SHA é obrigatório para exclusão.')
        }
        await service.deleteFile(path, body.sha)
        return new Response(null, { status: 204 })
      }

      return errorResponse(405, 'method_not_allowed', 'Método não suportado.')
    } catch (error) {
      return mapGitHubError(error)
    }
  }

  function getSessionRecord(request: Request) {
    const cookieValue = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE_NAME]
    return readSessionRecord(config, cookieValue, now)
  }

  return { handle, config }
}

export function createNodeMiddleware(app: ReturnType<typeof createFlowBoardApiApp>) {
  return async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
    try {
      const request = await toWebRequest(req)
      const response = await app.handle(request)
      if (!response) {
        next()
        return
      }
      await sendWebResponse(res, response)
    } catch (error) {
      next(error)
    }
  }
}

function mapGitHubError(error: unknown): Response {
  if (error instanceof SyntaxError || isRemoteContentInvalid(error)) {
    return errorResponse(422, 'remote_content_invalid', 'Conteúdo remoto inválido.')
  }
  if (!(error instanceof GitHubHttpError)) {
    const message = error instanceof Error ? error.message : 'Falha externa ao acessar GitHub.'
    return errorResponse(503, 'github_unavailable', message)
  }

  if (error.status === 401) {
    return errorResponse(401, 'github_unauthorized', error.message)
  }
  if (error.status === 403) {
    return errorResponse(403, 'github_forbidden', error.message)
  }
  if (error.status === 404) {
    return errorResponse(404, 'github_not_found', error.message)
  }
  if (error.status === 409) {
    return errorResponse(409, 'github_conflict', error.message)
  }
  if (error.status === 429) {
    return errorResponse(429, 'github_rate_limited', error.message, { retryAfterMs: error.retryAfterMs })
  }
  return errorResponse(503, 'github_unavailable', error.message, { retryAfterMs: error.retryAfterMs })
}

function mapAuthGitHubError(error: unknown): Response {
  if (!(error instanceof GitHubHttpError)) {
    const message = error instanceof Error ? error.message : 'Falha externa ao acessar GitHub.'
    return errorResponse(503, 'github_unavailable', message)
  }
  if (error.status === 401) {
    return errorResponse(401, 'github_unauthorized', 'Não autorizado (401). Verifique o PAT.')
  }
  if (error.status === 403) {
    return errorResponse(403, 'github_forbidden', error.message)
  }
  if (error.status === 404) {
    return errorResponse(404, 'github_not_found', error.message)
  }
  if (error.status === 429) {
    return errorResponse(429, 'github_rate_limited', error.message, { retryAfterMs: error.retryAfterMs })
  }
  return errorResponse(503, 'github_unavailable', error.message, { retryAfterMs: error.retryAfterMs })
}

function isRemoteContentInvalid(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('inválido') || error.message.includes('não existe no repositório'))
  )
}
