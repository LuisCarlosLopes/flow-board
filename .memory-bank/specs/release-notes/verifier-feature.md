# Verifier — Release Notes (FEATURE)

**Data:** 2026-04-20  
**Entrada:** `state.yaml`, `implementer-feature.md`, `task-breakdown-feature.md`, código em `apps/flowboard`

## Veredicto: **CONFORME** (com notas operacionais)

A implementação cobre os 8 critérios de aceite do `state.yaml` com evidência em código e testes.

---

## Cruzamento com critérios de aceite

| # | Critério | Evidência |
|---|-----------|-----------|
| 1 | Versão atual no App Shell | `AppShell.tsx` — botão `fb-version-badge` com `useCurrentVersion()` |
| 2 | Rota `/releases` | `App.tsx` — `<Route path="/releases" element={<ReleaseNotesPage />} />` |
| 3 | `releases.json` com ≥2 versões tipadas | `src/data/releases.json` + `releases.types.ts` |
| 4 | Cards com versão, data, tipo, descrição | `ReleaseCard`, `ChangeCard` (ícones + texto) |
| 5 | Responsivo + tokens | `release-notes.css` usa `var(--space-*)`, `--bg-*`, media queries |
| 6 | Fonte única de verdade | `useCurrentVersion` e página importam o mesmo JSON |
| 7 | E2E da página | `tests/e2e/release-notes.spec.ts` — rota pública + filtros + badge (condicional) |
| 8 | Unit tests página + hook | `ReleaseNotesPage.test.tsx`, `useCurrentVersion.test.ts` |

---

## Validações automatizadas (executadas)

| Comando | Resultado |
|---------|-----------|
| `npm run build` | OK |
| `npm test` (Vitest) | 231 testes OK |
| `npm run lint` | OK (0 erros; 3 avisos em artefactos gerados sob `coverage/*.js`, fora do scope da feature) |
| `npx playwright test tests/e2e/release-notes.spec.ts` | 9 passed, 3 skipped (teste do badge sem sessão GitHub em 3 browsers) |

**Browsers Playwright:** após `npx playwright install chromium firefox webkit`, Firefox e WebKit passam nos mesmos cenários que Chromium. Sem binários instalados, falha é de ambiente, não de código.

---

## Ajuste durante verificação

- **`LoginView.integration.test.tsx`:** substituído `this: any` por tipo explícito no mock de `GitHubContentsClient` para `npm run lint` fechar sem erros (dívida pré-existente, não ligada a release notes).

---

## Riscos residuais (baixos)

- **Múltiplos releases não arquivados:** `useCurrentVersion` usa o primeiro `!archived`; convém manter apenas um ativo no JSON.
- **E2E do badge:** depende de sessão real; skip documentado quando `board-canvas` não aparece.

---

## Próximo passo

Seguir para **code-reviewer** e **tester**; merge recomendável após revisão sem achados críticos.
