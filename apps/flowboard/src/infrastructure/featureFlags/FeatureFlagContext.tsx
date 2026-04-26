import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { FEATURE_FLAGS_STORAGE_KEY } from './featureFlagConstants'
import { getFeatureFlagDefinition, listPreviewFlags, type FeatureFlagDefinition } from './featureFlagRegistry'
import { computeOverrideAfterToggle, resolveFeatureEnabled } from './featureFlagState'
import { loadFeatureFlagOverrides, saveFeatureFlagOverrides } from './featureFlagStorage'

export type FeatureFlagContextValue = {
  overrides: Record<string, boolean>
  /** Resolved enabled state for any registered flag id (unknown → false). */
  isFeatureEnabled: (id: string) => boolean
  setPreviewFlagEnabled: (id: string, enabled: boolean) => void
  previewFlags: FeatureFlagDefinition[]
  isEnabledForDefinition: (def: FeatureFlagDefinition) => boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null)

// @MindContext: Provider limitado ao AppShell — prefs só em localStorage; `storage` sincroniza abas.
export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => loadFeatureFlagOverrides())

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== FEATURE_FLAGS_STORAGE_KEY || e.storageArea !== localStorage) {
        return
      }
      setOverrides(loadFeatureFlagOverrides())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setPreviewFlagEnabled = useCallback((id: string, enabled: boolean) => {
    const def = getFeatureFlagDefinition(id)
    if (!def || def.lifecycle !== 'preview') {
      if (import.meta.env.DEV) {
        console.warn('FeatureFlagProvider: attempted to set non-preview flag:', id)
      }
      return
    }
    setOverrides((prev) => {
      const next = computeOverrideAfterToggle(def, prev, enabled)
      saveFeatureFlagOverrides(next)
      return next
    })
  }, [])

  const isFeatureEnabled = useCallback(
    (id: string) => {
      const def = getFeatureFlagDefinition(id)
      if (!def) {
        return false
      }
      return resolveFeatureEnabled(def, overrides)
    },
    [overrides],
  )

  const isEnabledForDefinition = useCallback(
    (def: FeatureFlagDefinition) => resolveFeatureEnabled(def, overrides),
    [overrides],
  )

  const previewFlags = listPreviewFlags()

  const value = useMemo(
    () => ({
      overrides,
      isFeatureEnabled,
      setPreviewFlagEnabled,
      previewFlags,
      isEnabledForDefinition,
    }),
    [overrides, isFeatureEnabled, setPreviewFlagEnabled, previewFlags, isEnabledForDefinition],
  )

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- hooks colocated with provider by design */
export function useFeatureFlag(id: string): boolean {
  const ctx = useContext(FeatureFlagContext)
  if (!ctx) {
    throw new Error('useFeatureFlag must be used within FeatureFlagProvider')
  }
  return ctx.isFeatureEnabled(id)
}

export function useFeatureFlagSetter(): (id: string, enabled: boolean) => void {
  const ctx = useContext(FeatureFlagContext)
  if (!ctx) {
    throw new Error('useFeatureFlagSetter must be used within FeatureFlagProvider')
  }
  return ctx.setPreviewFlagEnabled
}

export function usePreviewFlagList(): FeatureFlagDefinition[] {
  const ctx = useContext(FeatureFlagContext)
  if (!ctx) {
    throw new Error('usePreviewFlagList must be used within FeatureFlagProvider')
  }
  return ctx.previewFlags
}

/** Full context for components that list dynamic preview flags (e.g. modal rows). */
export function useFeatureFlagContext(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext)
  if (!ctx) {
    throw new Error('useFeatureFlagContext must be used within FeatureFlagProvider')
  }
  return ctx
}
/* eslint-enable react-refresh/only-export-components */
