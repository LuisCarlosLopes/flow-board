import type { IncomingMessage, ServerResponse } from 'node:http'

export async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const body = await readBody(req)
  const host = req.headers.host ?? 'localhost'
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
  const url = new URL(req.url ?? '/', `${protocol}://${host}`)
  const init: RequestInit = {
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
  }
  return new Request(url, init)
}

export async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
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
