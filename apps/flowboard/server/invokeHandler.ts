import { z } from 'zod'
import { GitHubContentsClient, GitHubHttpError } from '../src/infrastructure/github/client.ts'
import type { FlowboardIronSession } from './flowboardSessionData.ts'
import type { IronSession } from 'iron-session'

const invokeBodySchema = z
  .object({
    op: z.enum([
      'getFileJson',
      'tryGetFileJson',
      'putFileJson',
      'getFileRaw',
      'tryGetFileRaw',
      'putFileBase64',
      'deleteFile',
    ]),
    path: z.string().optional(),
    json: z.unknown().optional(),
    sha: z.string().nullable().optional(),
    contentBase64: z.string().optional(),
    message: z.string().optional(),
  })
  .superRefine((b, ctx) => {
    const needPath = [
      'getFileJson',
      'tryGetFileJson',
      'putFileJson',
      'getFileRaw',
      'tryGetFileRaw',
      'putFileBase64',
      'deleteFile',
    ] as const
    if (needPath.includes(b.op as (typeof needPath)[number]) && (typeof b.path !== 'string' || !b.path.trim())) {
      ctx.addIssue({ code: 'custom', message: 'path is required' })
    }
  })

type InvokeBody = z.infer<typeof invokeBodySchema>

function clientForSession(s: FlowboardIronSession): GitHubContentsClient {
  return new GitHubContentsClient({
    token: s.pat,
    owner: s.owner,
    repo: s.repo,
    apiBase: s.apiBase,
  })
}

/**
 * Resolves a GitHub invoke request from an authenticated server session. Does not modify the session.
 */
export async function runGithubInvoke(
  body: unknown,
  session: IronSession<FlowboardIronSession>,
): Promise<Response> {
  if (!session.pat || !session.owner || !session.repo) {
    return jsonErr('Unauthorized', 401)
  }
  const parsed = invokeBodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonErr(parsed.error.message, 400)
  }
  const c = clientForSession(session as FlowboardIronSession)
  return dispatchInvoke(c, parsed.data)
}

async function dispatchInvoke(client: GitHubContentsClient, b: InvokeBody): Promise<Response> {
  const path = b.path ?? ''
  try {
    switch (b.op) {
      case 'getFileJson': {
        const r = await client.getFileJson(path)
        return jsonOk(r)
      }
      case 'tryGetFileJson': {
        const r = await client.tryGetFileJson(path)
        return jsonOk(r)
      }
      case 'putFileJson': {
        await client.putFileJson(path, b.json, b.sha ?? null)
        return jsonOk({ ok: true as const })
      }
      case 'getFileRaw': {
        const r = await client.getFileRaw(path)
        return jsonOk(r)
      }
      case 'tryGetFileRaw': {
        const r = await client.tryGetFileRaw(path)
        return jsonOk(r)
      }
      case 'putFileBase64': {
        if (typeof b.contentBase64 !== 'string') {
          return jsonErr('contentBase64 is required', 400)
        }
        await client.putFileBase64(path, b.contentBase64, b.sha ?? null, b.message)
        return jsonOk({ ok: true as const })
      }
      case 'deleteFile': {
        if (typeof b.sha !== 'string' || !b.sha) {
          return jsonErr('sha is required for deleteFile', 400)
        }
        await client.deleteFile(path, b.sha)
        return jsonOk({ ok: true as const })
      }
      default: {
        return jsonErr('Unsupported op', 400)
      }
    }
  } catch (e) {
    if (e instanceof GitHubHttpError) {
      return jsonErr(e.message, e.status, e.retryAfterMs)
    }
    if (e instanceof Error) {
      return jsonErr(e.message, 500)
    }
    return jsonErr('Internal error', 500)
  }
}

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function jsonErr(message: string, status: number, retryAfterMs?: number): Response {
  const body: { ok: false; error: { message: string; retryAfterMs?: number } } = {
    ok: false,
    error: { message },
  }
  if (typeof retryAfterMs === 'number') {
    body.error.retryAfterMs = retryAfterMs
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
