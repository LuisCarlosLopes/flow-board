import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FeatureFlagProvider } from '../../infrastructure/featureFlags/FeatureFlagContext'
import { PreviewFeaturesModal } from './PreviewFeaturesModal'

vi.mock('../../infrastructure/featureFlags/featureFlagRegistry', () => ({
  FEATURE_FLAG_REGISTRY: [],
  getFeatureFlagDefinition: () => undefined,
  listPreviewFlags: () => [],
}))

describe('PreviewFeaturesModal (empty registry)', () => {
  it('shows empty state', () => {
    render(
      <FeatureFlagProvider>
        <PreviewFeaturesModal isOpen onClose={vi.fn()} />
      </FeatureFlagProvider>,
    )
    expect(screen.getByTestId('preview-features-empty')).toBeInTheDocument()
  })
})
