import type { IncomingMessage, ServerResponse } from 'node:http'
import { clearSessionCookie, sendJson } from '../_session.js'

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }
  clearSessionCookie(res)
  sendJson(res, 200, { ok: true })
}
