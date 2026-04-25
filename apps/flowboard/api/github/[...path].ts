import type { IncomingMessage, ServerResponse } from 'node:http'
import { readSessionFromRequest, sendJson } from '../_session.js'

const GITHUB_API = 'https://api.github.com'

const PASSTHROUGH_HEADERS = [
  'content-type',
]

const FORWARD_RESPONSE_HEADERS = [
  'content-type',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'retry-after',
  'etag',
  'last-modified',
]

export default async function handler(req: IncomingMessage & { query?: Record<string, string | string[]> }, res: ServerResponse): Promise<void> {
  const session = readSessionFromRequest(req)
  if (!session) {
    sendJson(res, 401, { error: 'Não autenticado.' })
    return
  }

  // Build the upstream path from the Vercel catch-all query param
  const pathParam = req.query?.path
  const pathSegments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : []
  const upstreamPath = '/' + pathSegments.join('/')

  // Preserve query string
  const rawUrl = req.url ?? ''
  const qIdx = rawUrl.indexOf('?')
  const qs = qIdx >= 0 ? rawUrl.slice(qIdx) : ''

  const upstreamUrl = `${GITHUB_API}${upstreamPath}${qs}`

  // Forward only safe headers from the client
  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${session.pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'flowboard/1.0',
  }
  for (const name of PASSTHROUGH_HEADERS) {
    const val = req.headers[name]
    if (val && typeof val === 'string') {
      forwardHeaders[name] = val
    }
  }

  // Read request body for PUT/DELETE/POST
  let body: Buffer | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method ?? 'GET',
      headers: forwardHeaders,
      body: body?.length ? body : undefined,
    })
  } catch {
    sendJson(res, 502, { error: 'Falha ao contactar GitHub API.' })
    return
  }

  // Forward select response headers
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const val = upstream.headers.get(name)
    if (val) res.setHeader(name, val)
  }

  res.statusCode = upstream.status

  const responseBody = await upstream.arrayBuffer()
  res.end(Buffer.from(responseBody))
}
