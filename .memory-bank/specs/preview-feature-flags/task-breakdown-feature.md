# Task breakdown — preview-feature-flags

Ordem de execução pós-HITL:

1. **T1** — Criar módulos `featureFlagConstants`, `featureFlagRegistry` (vazio + tipos), `featureFlagStorage`, `featureFlagState` com testes.
2. **T2** — Implementar `FeatureFlagContext` + hooks; testes com `@testing-library/react` mínimos.
3. **T3** — `PreviewFeaturesModal` + CSS; empty state; testes RTL.
4. **T4** — Integrar provider + botão + modal em `AppShell`; `data-testid`s.
5. **T5** — `npm run lint`, `npx vitest run --coverage` nos paths novos; ajustar cobertura >80% nos ficheiros de domínio/infra de flags.
6. **T6** — (Opcional) listener `storage` para multi-tab.

Dependências: T2 depende de T1; T3 depende de T2; T4 depende de T3; T5 após T4.
