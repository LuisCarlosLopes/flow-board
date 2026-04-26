import { afterEach, describe, expect, it, vi } from 'vitest'
import { FEATURE_FLAGS_STORAGE_KEY } from './featureFlagConstants'
import {
  loadFeatureFlagOverrides,
  parseFeatureFlagOverrides,
  saveFeatureFlagOverrides,
} from './featureFlagStorage'

describe('parseFeatureFlagOverrides', () => {
  it('returns empty object for null or empty', () => {
    expect(parseFeatureFlagOverrides(null)).toEqual({})
    expect(parseFeatureFlagOverrides('')).toEqual({})
  })

  it('returns empty for invalid JSON', () => {
    expect(parseFeatureFlagOverrides('{')).toEqual({})
  })

  it('returns empty for non-object root', () => {
    expect(parseFeatureFlagOverrides('[]')).toEqual({})
    expect(parseFeatureFlagOverrides('"x"')).toEqual({})
  })

  it('keeps only string keys with boolean values', () => {
    expect(
      parseFeatureFlagOverrides(
        JSON.stringify({
          a: true,
          b: false,
          c: 1,
          '': true,
          ' ': false,
        }),
      ),
    ).toEqual({ a: true, b: false })
  })
})

describe('loadFeatureFlagOverrides / saveFeatureFlagOverrides', () => {
  afterEach(() => {
    localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY)
    vi.unstubAllGlobals()
  })

  it('round-trips overrides', () => {
    saveFeatureFlagOverrides({ foo: true, bar: false })
    expect(loadFeatureFlagOverrides()).toEqual({ foo: true, bar: false })
  })

  it('removes key when saving empty object', () => {
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, '{"x":true}')
    saveFeatureFlagOverrides({})
    expect(localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY)).toBeNull()
  })

  it('returns {} when storage missing', () => {
    expect(loadFeatureFlagOverrides()).toEqual({})
  })

  it('returns {} when getItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadFeatureFlagOverrides()).toEqual({})
    spy.mockRestore()
  })
})
