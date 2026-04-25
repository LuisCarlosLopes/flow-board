import { getIronSession, type SessionOptions, type IronSession } from 'iron-session'
import type { Context } from 'hono'
import type { FlowboardIronSession } from './flowboardSessionData.ts'

type IronSaveResult = { response: Response; session: IronSession<FlowboardIronSession> }

/**
 * Binds iron-session to the Fetch `Response` the library mutates; merge its headers on the Hono result.
 */
export async function withIronSession<T extends FlowboardIronSession>(
  c: Context,
  sessionOptions: SessionOptions,
  work: (session: IronSession<T>) => Promise<Response>,
): Promise<Response> {
  const sessionRes = new Response()
  const session = (await getIronSession(c.req.raw, sessionRes, sessionOptions)) as IronSession<T>
  const out = await work(session)
  return mergeSessionHeaders(out, sessionRes)
}

function mergeSessionHeaders(result: Response, sessionRes: Response): Response {
  const headers = new Headers(result.headers)
  const h = sessionRes.headers
  const getSet = typeof (h as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
    ? (h as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : null
  if (getSet && getSet.length > 0) {
    for (const cookie of getSet) {
      headers.append('set-cookie', cookie)
    }
  } else {
    const one = h.get('set-cookie')
    if (one) {
      headers.append('set-cookie', one)
    }
  }
  return new Response(result.body, { status: result.status, statusText: result.statusText, headers })
}

/**
 * Get session and merge Set-Cookie when saving without replacing the main response.
 */
export async function readIronSession<T extends FlowboardIronSession>(
  c: Context,
  sessionOptions: SessionOptions,
): Promise<IronSaveResult> {
  const response = new Response()
  const session = (await getIronSession(
    c.req.raw,
    response,
    sessionOptions,
  )) as IronSession<T>
  return { response, session }
}

export function withSessionSaveHeaders(result: Response, sessionRes: Response): Response {
  return mergeSessionHeaders(result, sessionRes)
}
