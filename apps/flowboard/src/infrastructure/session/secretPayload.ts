const FORBIDDEN_SECRET_KEYS = ['pat', 'token', 'accessToken', 'refreshToken', 'authorization', 'apiBase'] as const
const FORBIDDEN_SECRET_MARKERS = ['ghp_', 'github_pat_', ...FORBIDDEN_SECRET_KEYS.map((key) => `"${key}"`)] as const

export function hasForbiddenSecretShape(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return FORBIDDEN_SECRET_KEYS.some((key) => key in candidate)
}

export function hasForbiddenSerializedSecretMarkers(serialized: string): boolean {
  return FORBIDDEN_SECRET_MARKERS.some((marker) => serialized.includes(marker))
}
