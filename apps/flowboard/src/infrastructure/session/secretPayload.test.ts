import { describe, expect, it } from 'vitest'
import { hasForbiddenSecretShape, hasForbiddenSerializedSecretMarkers } from './secretPayload'

describe('secretPayload', () => {
  it('detects forbidden legacy session keys', () => {
    expect(hasForbiddenSecretShape({ pat: 'ghp_secret' })).toBe(true)
    expect(hasForbiddenSecretShape({ apiBase: 'https://api.github.com' })).toBe(true)
    expect(hasForbiddenSecretShape({ owner: 'acme', repo: 'flowboard' })).toBe(false)
  })

  it('detects serialized token markers', () => {
    expect(hasForbiddenSerializedSecretMarkers('{"pat":"ghp_secret"}')).toBe(true)
    expect(hasForbiddenSerializedSecretMarkers('{"token":"github_pat_secret"}')).toBe(true)
    expect(
      hasForbiddenSerializedSecretMarkers(
        '{"owner":"acme","repo":"flowboard","repoUrl":"https://github.com/acme/flowboard"}',
      ),
    ).toBe(false)
  })
})
