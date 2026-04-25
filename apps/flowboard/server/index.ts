import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFlowBoardApiApp } from './app'
import { sendWebResponse, toWebRequest } from './httpAdapter'
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
