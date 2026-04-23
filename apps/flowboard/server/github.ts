import type { IncomingMessage, ServerResponse } from 'node:http'
import { GITHUB_API_BASE } from '../src/infrastructure/github/url'

export type GitHubUserProfile = {
  login: string
  name: string | null
  avatar_url: string
}

export async function validatePatAndFetchUser(pat: string): Promise<GitHubUserProfile> {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: githubHeaders(pat),
  })

  if (res.status !== 200) {
    throw createGitHubValidationError(res.status)
  }

  const body = (await res.json()) as Partial<GitHubUserProfile>
  if (
    typeof body.login !== 'string' ||
    !body.login.trim() ||
    (body.name !== null && typeof body.name !== 'string') ||
    typeof body.avatar_url !== 'string' ||
    !body.avatar_url.trim()
  ) {
    throw new Error('Resposta inválida da API do GitHub ao validar o PAT.')
  }

  return {
    login: body.login,
    name: body.name ?? null,
    avatar_url: body.avatar_url,
  }
}

export async function verifyRepositoryAccess(pat: string, owner: string, repo: string): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const res = await fetch(url, {
    headers: githubHeaders(pat),
  })

  if (res.status === 401) {
    throw new Error('Não autorizado (401). Verifique o PAT.')
  }
  if (res.status === 404) {
    throw new Error('Repositório não encontrado (404).')
  }
  if (res.status === 403) {
    throw new Error('Acesso negado (403). Escopo do PAT ou visibilidade do repo.')
  }
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}`)
  }
}

export async function proxyGitHubRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pat: string,
  requestPathAndQuery: string,
): Promise<void> {
  const target = new URL(
    requestPathAndQuery.startsWith('/') ? requestPathAndQuery : `/${requestPathAndQuery}`,
    GITHUB_API_BASE,
  )
  const body = shouldReadBody(req.method) ? await readRawBody(req) : undefined

  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      ...githubHeaders(pat),
      ...(typeof req.headers['content-type'] === 'string'
        ? {
            'Content-Type': req.headers['content-type'],
          }
        : {}),
    },
    body,
  })

  res.statusCode = upstream.status
  const contentType = upstream.headers.get('content-type')
  if (contentType) {
    res.setHeader('Content-Type', contentType)
  }
  const retryAfter = upstream.headers.get('retry-after')
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter)
  }
  const responseBody = Buffer.from(await upstream.arrayBuffer())
  res.end(responseBody)
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const raw = await readRawBody(req)
  if (raw.length === 0) {
    return {}
  }
  return JSON.parse(raw.toString('utf8')) as unknown
}

function githubHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function createGitHubValidationError(status: number): Error {
  if (status === 401) {
    return new Error('Não autorizado (401). Verifique o PAT.')
  }
  if (status === 403) {
    return new Error('Acesso negado (403). Escopo do PAT insuficiente.')
  }
  return new Error(`Falha ao validar o PAT no GitHub (status ${status}).`)
}

function shouldReadBody(method: string | undefined): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
