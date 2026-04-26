import { describe, expect, it } from 'vitest'
import { getFeatureFlagDefinition, listPreviewFlags } from './featureFlagRegistry'

describe('featureFlagRegistry', () => {
  it('default registry has no preview flags', () => {
    expect(listPreviewFlags()).toEqual([])
  })

  it('getFeatureFlagDefinition returns undefined for unknown id', () => {
    expect(getFeatureFlagDefinition('nope')).toBeUndefined()
  })
})
