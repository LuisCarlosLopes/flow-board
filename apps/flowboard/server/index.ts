import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFlowBoardApiApp } from './app'
import { loadServerConfig } from './security'

const config = loadServerConfig()
const app = createFlowBoardApiApp({ config })
const serverRoot = path.dirname(fileURLToPath(import.meta.url))
const clientDistRoot = path.resolve(serverRoot, '../../dist')

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const server = createServer(async (req, res) => {
  try {
    const request = await toWebRequest(req)
    const apiResponse = await app.handle(request)
    if (apiResponse) {
      await sendWebResponse(res, apiResponse)
      return
    }

    if (!req.url || !req.method || !['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
    const filePath = await resolveStaticPath(url.pathname)
    const body = await readFile(filePath)
    const extension = path.extname(filePath)
    const isHtml = extension === '.html'

    res.statusCode = 200
    res.setHeader('Content-Type', MIME_TYPES[extension] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', isHtml ? 'no-store' : 'public, max-age=31536000, immutable')
    if (req.method.toUpperCase() === 'HEAD') {
      res.end()
      return
    }
    res.end(body)
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(error instanceof Error ? error.message : 'Internal Server Error')
  }
})

server.listen(config.port, () => {
  console.log(`FlowBoard server listening on http://127.0.0.1:${config.port}`)
})

async function resolveStaticPath(pathname: string): Promise<string> {
  const normalized = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')
  const candidate = normalized === '/' ? '/index.html' : normalized
  const absoluteCandidate = path.resolve(clientDistRoot, `.${candidate}`)
  if (!absoluteCandidate.startsWith(clientDistRoot)) {
    return path.join(clientDistRoot, 'index.html')
  }
  try {
    const info = await stat(absoluteCandidate)
    if (info.isFile()) {
      return absoluteCandidate
    }
  } catch {
    // SPA fallback below.
  }
  return path.join(clientDistRoot, 'index.html')
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const body = await readBody(req)
  const host = req.headers.host ?? 'localhost'
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
  const url = new URL(req.url ?? '/', `${protocol}://${host}`)
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method ?? 'GET',
    headers: new Headers(
      Object.entries(req.headers)
        .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
        .map(
          ([key, value]): [string, string] => [key, Array.isArray(value) ? value.join(', ') : value],
        ),
    ),
  }
  if (body.length > 0 && req.method && !['GET', 'HEAD'].includes(req.method.toUpperCase())) {
    init.body = new Uint8Array(body)
    init.duplex = 'half'
  }
  return new Request(url, init)
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  if (!response.body) {
    res.end()
    return
  }
  const body = await response.arrayBuffer()
  res.end(Buffer.from(body))
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
