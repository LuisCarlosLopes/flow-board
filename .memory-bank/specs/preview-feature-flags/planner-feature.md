# IPD — Feature flags de preview (FlowBoard)

**Slug:** `preview-feature-flags`  
**Tipo:** Implementation Plan Document (FEATURE)  
**Data:** 2026-04-26

## 1. Resumo executivo

Implementar registo de flags, persistência em `localStorage`, provider React, modal/painel de previews acionado por controlo discreto no `AppShell`, e funções puras testadas para merge defaults/overrides. Funcionalidades `stable` permanecem no registo mas fora do painel.

## 2. Mapa de alterações (ordem sugerida)

| # | Caminho | Alteração |
|---|---------|-----------|
| 1 | `apps/flowboard/src/infrastructure/featureFlags/featureFlagConstants.ts` | Constante `FEATURE_FLAGS_STORAGE_KEY = 'flowboard.featureFlags.v1'` |
| 2 | `apps/flowboard/src/infrastructure/featureFlags/featureFlagRegistry.ts` | Registo inicial (array vazio ou 1 exemplo `preview` comentado para CI não alterar UX até primeira feature) — **preferência:** começar com array vazio + teste unitário com registo mock |
| 3 | `apps/flowboard/src/infrastructure/featureFlags/featureFlagStorage.ts` | `loadOverrides`, `saveOverrides`, parsing defensivo |
| 4 | `apps/flowboard/src/infrastructure/featureFlags/featureFlagState.ts` | `resolveFeatureEnabled(def, overrides)`, `mergePreviewList` |
| 5 | `apps/flowboard/src/infrastructure/featureFlags/FeatureFlagContext.tsx` | Provider + `useFeatureFlag`, `useFeatureFlagSetter`, `usePreviewFlagList` |
| 6 | `apps/flowboard/src/infrastructure/featureFlags/featureFlagStorage.test.ts` | Casos: vazio, inválido, merge |
| 7 | `apps/flowboard/src/infrastructure/featureFlags/featureFlagState.test.ts` | Casos: default, override, stable sempre true |
| 8 | `apps/flowboard/src/features/app/PreviewFeaturesModal.tsx` + `.css` | Modal com lista `listPreviewFlags`, toggles, empty state |
| 9 | `apps/flowboard/src/features/app/AppShell.tsx` | Botão discreto na topbar (após theme ou antes do version badge), estado `previewPanelOpen`, provider envolvendo shell ou integração no `main.tsx` se mais limpo |
| 10 | `apps/flowboard/src/main.tsx` ou `App.tsx` | Se provider for global à app autenticada, envolver só `AppShell` ramo — evitar flags no login |
| 11 | `apps/flowboard/src/features/app/PreviewFeaturesModal.test.tsx` | RTL: abre, toggle chama setter |

**Nota:** Se o provider envolver apenas `AppShell`, não alterar `main.tsx`; usar wrapper interno em `AppShell` para manter escopo.

## 3. Fluxo de execução

1. Infra + testes puros (itens 1–7).
2. UI modal (8).
3. Wire AppShell + provider (9–10).
4. `npm run lint` + `npx vitest run` nos paths tocados + cobertura >80% nos novos módulos.

## 4. Definition of Done

- [ ] Registo e `isFeatureEnabled` / `useFeatureFlag` utilizados por pelo menos um call-site de exemplo **ou** documentado no PR que próximas features devem usar o hook (call-site opcional se registo vazio).
- [ ] Painel lista só previews; stable nunca na lista.
- [ ] Testes Vitest nos módulos de merge/storage.
- [ ] `data-testid` para E2E futuro.
- [ ] Sem secrets; sem writes GitHub.

## 5. Riscos residuais

- Multi-tab: fase 2 opcional (`storage` event).

## 6. Estimativa

4–8 h para desenvolvedor familiarizado com o repo.
