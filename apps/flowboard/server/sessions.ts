import { randomUUID } from 'node:crypto'
import type { FlowBoardSession } from '../src/infrastructure/session/sessionStore'
import { createPublicSession, getPublicSessionExpiryIso, type ServerConfig } from './security'

export type SessionRecord = {
  sessionId: string
  token: string
  session: FlowBoardSession
  expiresAtMs: number
}

export class SessionVault {
  private readonly entries = new Map<string, SessionRecord>()
  private readonly config: ServerConfig
  private readonly now: () => number

  constructor(config: ServerConfig, now: () => number = Date.now) {
    this.config = config
    this.now = now
  }

  create(input: Omit<FlowBoardSession, 'authenticated' | 'expiresAt'>, token: string): SessionRecord {
    const sessionId = randomUUID()
    const expiresAtMs = this.now() + this.config.sessionTtlSeconds * 1000
    const session = createPublicSession({
      ...input,
      expiresAt: getPublicSessionExpiryIso(this.now(), this.config),
    })
    const record = { sessionId, token, session, expiresAtMs }
    this.entries.set(sessionId, record)
    return record
  }

  get(sessionId: string | null | undefined): SessionRecord | null {
    if (!sessionId) {
      return null
    }
    const record = this.entries.get(sessionId)
    if (!record) {
      return null
    }
    if (record.expiresAtMs <= this.now()) {
      this.entries.delete(sessionId)
      return null
    }
    return record
  }

  revoke(sessionId: string | null | undefined): void {
    if (!sessionId) {
      return
    }
    this.entries.delete(sessionId)
  }
}
