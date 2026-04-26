export type FeatureLifecycle = 'preview' | 'stable'

export type FeatureFlagDefinition = {
  id: string
  title: string
  description?: string
  defaultEnabled: boolean
  lifecycle: FeatureLifecycle
}

// @MindContext: Registo canónico — acrescentar previews aqui; `stable` não aparece no painel.
export const FEATURE_FLAG_REGISTRY: readonly FeatureFlagDefinition[] = []

export function getFeatureFlagDefinition(id: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find((f) => f.id === id)
}

export function listPreviewFlags(): FeatureFlagDefinition[] {
  return FEATURE_FLAG_REGISTRY.filter((f) => f.lifecycle === 'preview')
}
