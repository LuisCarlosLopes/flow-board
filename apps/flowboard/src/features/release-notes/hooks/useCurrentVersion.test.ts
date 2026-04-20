import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentVersion } from './useCurrentVersion'

vi.mock('../../../data/releases.json', () => ({
  default: [
    {
      version: '0.1.0',
      releaseDate: '2026-01-01T00:00:00.000Z',
      archived: true,
      changes: [],
    },
    {
      version: '0.9.0',
      releaseDate: '2026-02-01T00:00:00.000Z',
      archived: false,
      changes: [],
    },
  ],
}))

describe('useCurrentVersion', () => {
  it('returns the version of the active non-archived release', () => {
    const { result } = renderHook(() => useCurrentVersion())
    expect(result.current.version).toBe('0.9.0')
  })
})
