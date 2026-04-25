import './bootstrapEnv.js'
import { Hono } from 'hono'
import { z } from 'zod'
import { getIronSession } from 'iron-session'
import { GitHubHttpError, GitHubContentsClient } from '../src/infrastructure/github/client.js'
import { parseRepoUrl } from '../src/infrastructure/github/url.js'
import { bootstrapFlowBoardData } from '../src/infrastructure/persistence/boardRepository.js'
import type { PublicFlowboardSession } from './flowboardSessionData.js'
import { getSessionOptions, SessionConfigurationError } from './sessionOptions.js'
import { withIronSession } from './ironHono.js'
import { runGithubInvoke } from './invokeHandler.js'
import type { FlowboardIronSession } from './flowboardSessionData.js'

const isProduction = process.env.NODE_ENV === 'production'

const loginBodySchema = z.object({
  pat: z.string().min(1),
  repoUrl: z.string().min(1),
})

function toPublic(s: FlowboardIronSession): PublicFlowboardSession {
  return {
    owner: s.owner,
    repo: s.repo,
    repoUrl: s.repoUrl,
    webUrl: s.webUrl,
    apiBase: s.apiBase,
  }
}

export const app = new Hono().basePath('/api')

app.get('/flowboard/health', (c) => c.json({ ok: true, service: 'flowboard-bff' }))

app.get('/flowboard/session', async (c) => {
  const opts = getSessionOptions()
  const session = await getIronSession<FlowboardIronSession>(c.req.raw, new Response(), opts)
  if (!session.pat) {
    return c.json({ error: 'Não autenticado' }, 401)
  }
  return c.json({ session: toPublic(session) })
})

app.post('/flowboard/session', async (c) => {
  const opts = getSessionOptions()
  return withIronSession<FlowboardIronSession>(c, opts, async (session) => {
    const raw: unknown = await c.req.json().catch(() => null)
    const parsed = loginBodySchema.safeParse(raw)
    if (!parsed.success) {
      const payload: { error: string; details?: ReturnType<typeof z.ZodError.prototype.format> } = {
        error: 'Corpo inválido',
      }
      if (!isProduction) {
        payload.details = parsed.error.format()
      }
      return new Response(JSON.stringify(payload), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }
    const { pat, repoUrl } = parsed.data
    const res = parseRepoUrl(repoUrl)
    if ('error' in res) {
      return new Response(JSON.stringify({ error: res.error }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const client = new GitHubContentsClient({
      token: pat,
      owner: res.owner,
      repo: res.repo,
      apiBase: res.apiBase,
    })

    try {
      await client.verifyRepositoryAccess()
      await bootstrapFlowBoardData(client)
    } catch (e) {
      if (e instanceof GitHubHttpError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: e.status,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (e instanceof Error) {
        const msg = isProduction ? 'Falha interna ao conectar' : e.message
        return new Response(JSON.stringify({ error: msg }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'Falha ao conectar' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }

    const next: FlowboardIronSession = {
      pat: pat.trim(),
      owner: res.owner,
      repo: res.repo,
      repoUrl: repoUrl.trim(),
      webUrl: res.webUrl,
      apiBase: res.apiBase,
    }
    Object.assign(session, next)
    await session.save()
    return new Response(JSON.stringify({ session: toPublic(next) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
})

app.post('/flowboard/session/logout', async (c) => {
  const opts = getSessionOptions()
  return withIronSession<FlowboardIronSession>(c, opts, async (session) => {
    session.destroy()
    await session.save()
    return new Response(JSON.stringify({ ok: true as const }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
})

app.post('/flowboard/github/invoke', async (c) => {
  const opts = getSessionOptions()
  const session = await getIronSession<FlowboardIronSession>(c.req.raw, new Response(), opts)
  const body: unknown = await c.req.json().catch(() => null)
  return runGithubInvoke(body, session)
})

app.onError((err, c) => {
  if (err instanceof SessionConfigurationError) {
    return c.json(
      {
        error:
          'Configuração em falta: defina SESSION_SECRET (≥32 caracteres) nas variáveis do servidor (ex.: Vercel → Environment Variables).',
        code: 'E_SESSION_CONFIG',
      },
      503,
    )
  }
  console.error(err)
  return c.json(
    { error: isProduction ? 'Erro interno do servidor' : err instanceof Error ? err.message : 'Erro' },
    500,
  )
})
