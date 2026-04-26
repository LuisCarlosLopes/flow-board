import { describe, expect, it } from 'vitest'
import type { FeatureFlagDefinition } from './featureFlagRegistry'
import { computeOverrideAfterToggle, resolveFeatureEnabled } from './featureFlagState'

const previewOff: FeatureFlagDefinition = {
  id: 'p1',
  title: 'Preview one',
  defaultEnabled: false,
  lifecycle: 'preview',
}

const previewOn: FeatureFlagDefinition = {
  id: 'p2',
  title: 'Preview two',
  defaultEnabled: true,
  lifecycle: 'preview',
}

const stable: FeatureFlagDefinition = {
  id: 'ga',
  title: 'GA',
  defaultEnabled: false,
  lifecycle: 'stable',
}

describe('resolveFeatureEnabled', () => {
  it('uses default when no override for preview', () => {
    expect(resolveFeatureEnabled(previewOff, {})).toBe(false)
    expect(resolveFeatureEnabled(previewOn, {})).toBe(true)
  })

  it('uses override for preview', () => {
    expect(resolveFeatureEnabled(previewOff, { p1: true })).toBe(true)
    expect(resolveFeatureEnabled(previewOn, { p2: false })).toBe(false)
  })

  it('stable is always enabled regardless of overrides', () => {
    expect(resolveFeatureEnabled(stable, {})).toBe(true)
    expect(resolveFeatureEnabled(stable, { ga: false })).toBe(true)
  })
})

describe('computeOverrideAfterToggle', () => {
  it('stores delta when different from default', () => {
    expect(computeOverrideAfterToggle(previewOff, {}, true)).toEqual({ p1: true })
    expect(computeOverrideAfterToggle(previewOn, {}, false)).toEqual({ p2: false })
  })

  it('removes key when toggled back to default', () => {
    expect(computeOverrideAfterToggle(previewOff, { p1: true }, false)).toEqual({})
    expect(computeOverrideAfterToggle(previewOn, { p2: false }, true)).toEqual({})
  })

  it('does not change overrides for stable', () => {
    const o = { ga: false }
    expect(computeOverrideAfterToggle(stable, o, false)).toBe(o)
  })
})
