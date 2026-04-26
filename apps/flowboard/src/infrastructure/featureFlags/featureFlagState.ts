import type { FeatureFlagDefinition } from './featureFlagRegistry'

/** @MindContext: `stable` ignora overrides — comportamento GA; preview usa override ou default. */
export function resolveFeatureEnabled(
  def: FeatureFlagDefinition,
  overrides: Record<string, boolean>,
): boolean {
  if (def.lifecycle === 'stable') {
    return true
  }
  if (Object.prototype.hasOwnProperty.call(overrides, def.id)) {
    return overrides[def.id]
  }
  return def.defaultEnabled
}

/** Persist only deltas vs default for preview flags to keep storage small. */
export function computeOverrideAfterToggle(
  def: FeatureFlagDefinition,
  overrides: Record<string, boolean>,
  enabled: boolean,
): Record<string, boolean> {
  if (def.lifecycle !== 'preview') {
    return overrides
  }
  const next = { ...overrides }
  if (enabled === def.defaultEnabled) {
    delete next[def.id]
  } else {
    next[def.id] = enabled
  }
  return next
}
