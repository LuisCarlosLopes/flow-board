import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import type { FlowBoardSession } from '../src/infrastructure/session/sessionStore'
import { createPublicSession, type ServerConfig } from './security'

type SessionPayload = {
  token: string
  owner: string
  repo: string
  repoUrl: string
  webUrl: string
  expiresAtMs: number
}

export type SessionRecord = {
  cookieValue: string
  token: string
  session: FlowBoardSession
  expiresAtMs: number
}

export function createSessionRecord(
  config: ServerConfig,
  input: Omit<FlowBoardSession, 'authenticated' | 'expiresAt'>,
  token: string,
  now: () => number = Date.now,
): SessionRecord {
  const expiresAtMs = now() + config.sessionTtlSeconds * 1000
  const payload: SessionPayload = {
    token,
    owner: input.owner,
    repo: input.repo,
    repoUrl: input.repoUrl,
    webUrl: input.webUrl,
    expiresAtMs,
  }
  return createRecordFromPayload(config, payload)
}

export function readSessionRecord(
  config: ServerConfig,
  cookieValue: string | null | undefined,
  now: () => number = Date.now,
): SessionRecord | null {
  if (!cookieValue) {
    return null
  }
  const payload = unsealSessionPayload(config, cookieValue)
  if (!payload) {
    return null
  }
  if (payload.expiresAtMs <= now()) {
    return null
  }
  return createRecordFromPayload(config, payload)
}

function createRecordFromPayload(config: ServerConfig, payload: SessionPayload): SessionRecord {
  const session = createPublicSession({
    owner: payload.owner,
    repo: payload.repo,
    repoUrl: payload.repoUrl,
    webUrl: payload.webUrl,
    expiresAt: new Date(payload.expiresAtMs).toISOString(),
  })

  return {
    cookieValue: sealSessionPayload(config, payload),
    token: payload.token,
    session,
    expiresAtMs: payload.expiresAtMs,
  }
}

function sealSessionPayload(config: ServerConfig, payload: SessionPayload): string {
  const key = getSessionKey(config)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

function unsealSessionPayload(config: ServerConfig, value: string): SessionPayload | null {
  const parts = value.split('.')
  if (parts.length !== 4) {
    return null
  }
  const [version, ivRaw, tagRaw, encryptedRaw] = parts
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    return null
  }

  try {
    const key = getSessionKey(config)
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivRaw, 'base64url'),
    )
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    const payload = JSON.parse(decrypted) as SessionPayload
    if (!isValidPayload(payload)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

function getSessionKey(config: ServerConfig): Buffer {
  if (!config.sessionSecret) {
    throw new Error('FLOWBOARD_SESSION_SECRET is required for secure server-side sessions.')
  }
  return scryptSync(config.sessionSecret, 'flowboard-session-v1', 32)
}

function isValidPayload(payload: unknown): payload is SessionPayload {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }
  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.token === 'string' &&
    candidate.token.trim().length > 0 &&
    typeof candidate.owner === 'string' &&
    candidate.owner.trim().length > 0 &&
    typeof candidate.repo === 'string' &&
    candidate.repo.trim().length > 0 &&
    typeof candidate.repoUrl === 'string' &&
    candidate.repoUrl.trim().length > 0 &&
    typeof candidate.webUrl === 'string' &&
    candidate.webUrl.trim().length > 0 &&
    typeof candidate.expiresAtMs === 'number' &&
    Number.isFinite(candidate.expiresAtMs)
  )
}
