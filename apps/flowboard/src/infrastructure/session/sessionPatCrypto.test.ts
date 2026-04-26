import { describe, expect, it } from 'vitest'
import { decryptPat, encryptPat } from './sessionPatCrypto'

const TEST_KEY = 'flowboard-vitest-default-pat-encryption-key-min-length'

describe('sessionPatCrypto', () => {
  it('round-trips a PAT with distinct ciphertext per call', async () => {
    const pat = 'github_pat_11_fake_token_for_test_only'
    const a = await encryptPat(pat, TEST_KEY)
    const b = await encryptPat(pat, TEST_KEY)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
    expect(await decryptPat(a, TEST_KEY)).toBe(pat)
    expect(await decryptPat(b, TEST_KEY)).toBe(pat)
  })

  it('fails decrypt with wrong key', async () => {
    const p = await encryptPat('ghp_s', TEST_KEY)
    await expect(decryptPat(p, 'wrong-key-wrong-key-wrong-key-wrong!')).rejects.toThrow()
  })

  it('rejects empty encryption password', async () => {
    await expect(encryptPat('ghp_s', '')).rejects.toThrow('encryptPat: missing')
    const p = await encryptPat('a', TEST_KEY)
    await expect(decryptPat(p, '')).rejects.toThrow('decryptPat: missing')
  })
})
