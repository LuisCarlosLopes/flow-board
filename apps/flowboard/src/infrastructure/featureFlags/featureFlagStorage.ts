import { FEATURE_FLAGS_STORAGE_KEY } from './featureFlagConstants'

/** @MindContext: Parse defensivo de JSON em localStorage (invalid/legacy → {}). */
export function parseFeatureFlagOverrides(raw: string | null): Record<string, boolean> {
  if (raw == null || raw === '') {
    return {}
  }
  try {
    const v = JSON.parse(raw) as unknown
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      return {}
    }
    const out: Record<string, boolean> = {}
    for (const [k, val] of Object.entries(v)) {
      if (typeof k === 'string' && k.trim() && typeof val === 'boolean') {
        out[k] = val
      }
    }
    return out
  } catch {
    return {}
  }
}

export function loadFeatureFlagOverrides(): Record<string, boolean> {
  if (typeof localStorage === 'undefined') {
    return {}
  }
  try {
    return parseFeatureFlagOverrides(localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY))
  } catch {
    return {}
  }
}

export function saveFeatureFlagOverrides(overrides: Record<string, boolean>): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    const keys = Object.keys(overrides)
    if (keys.length === 0) {
      localStorage.removeItem(FEATURE_FLAGS_STORAGE_KEY)
      return
    }
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    /* private mode / quota */
  }
}
