import { GitHubHttpError } from '../github/client'
import { createSession, type FlowBoardSession } from '../session/sessionStore'

type SessionResponse = {
  session: FlowBoardSession
}

type ApiErrorPayload = {
  error?: {
    message?: string
    retryAfterMs?: number
  }
}

export class AuthGateway {
  private readonly fetchImpl: typeof fetch

  constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  async createSession(repoUrl: string, pat: string): Promise<FlowBoardSession> {
    const response = await this.fetchImpl('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoUrl, pat }),
    })
    return parseSessionResponse(response)
  }

  async getSession(): Promise<FlowBoardSession> {
    const response = await this.fetchImpl('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    })
    return parseSessionResponse(response)
  }

  async deleteSession(): Promise<void> {
    const response = await this.fetchImpl('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    })
    if (response.ok || response.status === 204) {
      return
    }
    const payload = await safeParseError(response)
    throw new GitHubHttpError(payload?.error?.message ?? `FlowBoard API ${response.status}`, response.status)
  }
}

async function parseSessionResponse(response: Response): Promise<FlowBoardSession> {
  if (!response.ok) {
    const payload = await safeParseError(response)
    throw new GitHubHttpError(
      payload?.error?.message ?? `FlowBoard API ${response.status}`,
      response.status,
      payload?.error?.retryAfterMs,
    )
  }
  const payload = (await response.json()) as SessionResponse
  return createSession(payload.session)
}

async function safeParseError(response: Response): Promise<ApiErrorPayload | null> {
  try {
    return (await response.json()) as ApiErrorPayload
  } catch {
    return null
  }
}
