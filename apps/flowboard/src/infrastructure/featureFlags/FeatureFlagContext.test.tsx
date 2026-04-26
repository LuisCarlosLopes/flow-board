import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { FEATURE_FLAGS_STORAGE_KEY } from './featureFlagConstants'
import {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlagContext,
  useFeatureFlagSetter,
  usePreviewFlagList,
} from './FeatureFlagContext'

vi.mock('./featureFlagRegistry', () => {
  const preview = {
    id: 'preview_a',
    title: 'A',
    defaultEnabled: false,
    lifecycle: 'preview' as const,
  }
  const stable = {
    id: 'stable_b',
    title: 'B',
    defaultEnabled: false,
    lifecycle: 'stable' as const,
  }
  return {
    FEATURE_FLAG_REGISTRY: [preview, stable],
    getFeatureFlagDefinition: (id: string) =>
      id === 'preview_a' ? preview : id === 'stable_b' ? stable : undefined,
    listPreviewFlags: () => [preview],
  }
})

function wrapper({ children }: { children: ReactNode }) {
  return <FeatureFlagProvider>{children}</FeatureFlagProvider>
}

afterEach(() => {
  localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY)
})

describe('FeatureFlagContext hooks', () => {
  it('useFeatureFlag throws outside provider', () => {
    expect(() => renderHook(() => useFeatureFlag('preview_a'))).toThrow(
      /useFeatureFlag must be used within FeatureFlagProvider/,
    )
  })

  it('useFeatureFlagSetter throws outside provider', () => {
    expect(() => renderHook(() => useFeatureFlagSetter())).toThrow(
      /useFeatureFlagSetter must be used within FeatureFlagProvider/,
    )
  })

  it('usePreviewFlagList throws outside provider', () => {
    expect(() => renderHook(() => usePreviewFlagList())).toThrow(
      /usePreviewFlagList must be used within FeatureFlagProvider/,
    )
  })

  it('useFeatureFlagContext throws outside provider', () => {
    expect(() => renderHook(() => useFeatureFlagContext())).toThrow(
      /useFeatureFlagContext must be used within FeatureFlagProvider/,
    )
  })

  it('useFeatureFlag returns false for unknown id', () => {
    const { result } = renderHook(() => useFeatureFlag('missing'), { wrapper })
    expect(result.current).toBe(false)
  })

  it('stable flag is always enabled', () => {
    const { result } = renderHook(() => useFeatureFlag('stable_b'), { wrapper })
    expect(result.current).toBe(true)
  })

  it('preview toggles via setter and stable setter is noop', () => {
    const { result } = renderHook(
      () => ({
        flag: useFeatureFlag('preview_a'),
        set: useFeatureFlagSetter(),
      }),
      { wrapper },
    )
    expect(result.current.flag).toBe(false)
    act(() => result.current.set('preview_a', true))
    expect(result.current.flag).toBe(true)
    act(() => result.current.set('stable_b', false))
    expect(result.current.flag).toBe(true)
  })

  it('usePreviewFlagList returns only previews', () => {
    const { result } = renderHook(() => usePreviewFlagList(), { wrapper })
    expect(result.current.map((f) => f.id)).toEqual(['preview_a'])
  })

  it('useFeatureFlagContext exposes isEnabledForDefinition', () => {
    const { result } = renderHook(() => useFeatureFlagContext(), { wrapper })
    const preview = result.current.previewFlags[0]
    expect(result.current.isEnabledForDefinition(preview)).toBe(false)
  })

  it('reloads overrides on storage event from other tab', () => {
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify({ preview_a: true }))
    const { result } = renderHook(() => useFeatureFlag('preview_a'), { wrapper })
    expect(result.current).toBe(true)
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify({ preview_a: false }))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: FEATURE_FLAGS_STORAGE_KEY,
          newValue: '{"preview_a":false}',
          storageArea: localStorage,
        }),
      )
    })
    expect(result.current).toBe(false)
    localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY)
  })

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useFeatureFlag('preview_a'), { wrapper })
    expect(result.current).toBe(false)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'other',
          newValue: '{}',
          storageArea: localStorage,
        }),
      )
    })
    expect(result.current).toBe(false)
  })
})
