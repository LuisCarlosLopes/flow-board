export type AuthenticatedGitHubUser = {
  login: string
  name: string | null
  avatar_url: string
}

type LoginInput = {
  repoUrl: string
  pat: string
}

export class AuthApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

export async function loginWithPat(input: LoginInput): Promise<AuthenticatedGitHubUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return handleAuthResponse(res)
}

export async function fetchAuthenticatedUser(): Promise<AuthenticatedGitHubUser | null> {
  const res = await fetch('/api/auth/user', {
    credentials: 'same-origin',
  })

  if (res.status === 401) {
    return null
  }

  return handleAuthResponse(res)
}

export async function logoutSession(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  })

  if (res.status === 204) {
    return
  }

  const message = await readErrorMessage(res, 'Falha ao encerrar a sessão.')
  throw new AuthApiError(message, res.status)
}

async function handleAuthResponse(res: Response): Promise<AuthenticatedGitHubUser> {
  if (!res.ok) {
    const message = await readErrorMessage(res, 'Falha na autenticação.')
    throw new AuthApiError(message, res.status)
  }

  const body = (await res.json()) as Partial<AuthenticatedGitHubUser>
  if (
    typeof body.login !== 'string' ||
    !body.login.trim() ||
    (body.name !== null && typeof body.name !== 'string' && typeof body.name !== 'undefined') ||
    typeof body.avatar_url !== 'string' ||
    !body.avatar_url.trim()
  ) {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', res.status)
  }

  return {
    login: body.login,
    name: body.name ?? null,
    avatar_url: body.avatar_url,
  }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: unknown }
    return typeof body.message === 'string' && body.message.trim() ? body.message : fallback
  } catch {
    return fallback
  }
}
