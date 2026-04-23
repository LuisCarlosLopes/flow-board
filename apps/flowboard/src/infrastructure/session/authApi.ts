export type AuthenticatedGitHubUser = {
  login: string
  name: string | null
  avatar_url: string
}

export type AuthenticatedSessionSnapshot = {
  repoUrl: string
  owner: string
  repo: string
  webUrl: string
  user: AuthenticatedGitHubUser
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

export async function restoreAuthenticatedSession(): Promise<AuthenticatedSessionSnapshot | null> {
  const res = await fetch('/api/auth/session', {
    credentials: 'same-origin',
  })

  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    const message = await readErrorMessage(res, 'Falha ao restaurar a sessão.')
    throw new AuthApiError(message, res.status)
  }

  const body = (await res.json()) as Partial<AuthenticatedSessionSnapshot>
  if (
    typeof body.repoUrl !== 'string' ||
    !body.repoUrl.trim() ||
    typeof body.owner !== 'string' ||
    !body.owner.trim() ||
    typeof body.repo !== 'string' ||
    !body.repo.trim() ||
    typeof body.webUrl !== 'string' ||
    !body.webUrl.trim() ||
    !body.user
  ) {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', res.status)
  }

  return {
    repoUrl: body.repoUrl,
    owner: body.owner,
    repo: body.repo,
    webUrl: body.webUrl,
    user: validateUserPayload(body.user, res.status),
  }
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
  return validateUserPayload(body, res.status)
}

function validateUserPayload(body: Partial<AuthenticatedGitHubUser>, status: number): AuthenticatedGitHubUser {
  if (
    typeof body.login !== 'string' ||
    !body.login.trim() ||
    (body.name !== null && typeof body.name !== 'string') ||
    typeof body.avatar_url !== 'string' ||
    !body.avatar_url.trim()
  ) {
    throw new AuthApiError('Resposta inválida do servidor de autenticação.', status)
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
