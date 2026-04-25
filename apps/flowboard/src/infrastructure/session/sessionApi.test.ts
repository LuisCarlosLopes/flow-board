import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBffSession } from './sessionApi'

describe('sessionApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchBffSession returns null when the bootstrap request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network blocked'))

    await expect(fetchBffSession()).resolves.toBeNull()
  })

  it('fetchBffSession returns null for unauthenticated responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }))

    await expect(fetchBffSession()).resolves.toBeNull()
  })
})
