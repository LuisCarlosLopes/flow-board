/**
 * Criptografia do PAT em repouso (Web Crypto, AES-256-GCM, chave via PBKDF2).
 * A chave vem só de `VITE_SESSION_SECRET` no build (ver `vite.config.ts`). Não usar
 * `SESSION_SECRET` no cliente — esse valor é só para cookies no servidor.
 */
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_SALT = new TextEncoder().encode('flowboard.pat.salt.v1')

export type PatEncPayload = {
  iv: string
  ct: string
}

function getPatKey(): string {
  return import.meta.env.FLOWBOARD_PAT_KEY as string
}

export function hasPatEncryptionKey(): boolean {
  return getPatKey().length > 0
}

function bytesToB64(u8: Uint8Array): string {
  let s = ''
  for (let i = 0; i < u8.length; i++) {
    s += String.fromCharCode(u8[i]!)
  }
  return btoa(s)
}

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    u8[i] = bin.charCodeAt(i)
  }
  return u8
}

async function deriveAesKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: PBKDF2_SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptPat(plain: string, password: string = getPatKey()): Promise<PatEncPayload> {
  if (!password) {
    throw new Error('encryptPat: missing encryption key')
  }
  const key = await deriveAesKey(password)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(plain),
  )
  return {
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(buf)),
  }
}

export async function decryptPat(payload: PatEncPayload, password: string = getPatKey()): Promise<string> {
  if (!password) {
    throw new Error('decryptPat: missing encryption key')
  }
  const key = await deriveAesKey(password)
  const iv = b64ToBytes(payload.iv)
  const data = b64ToBytes(payload.ct)
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource,
  )
  return new TextDecoder().decode(buf)
}
