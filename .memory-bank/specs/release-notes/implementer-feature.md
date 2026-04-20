# Implementer — Release Notes (FEATURE)

**Data:** 2026-04-20  
**Base:** `task-breakdown-feature.md`, ADR-007, `planner-feature.md` (ajustes do plan-reviewer)

## Entregue

- **Roteamento:** `react-router-dom@^6` em `App.tsx` — rota pública `/releases` (`ReleaseNotesPage`) e `path="*"` mantendo login + `AppShell`.
- **Dados:** `src/data/releases.json` com versões `0.1.0` (arquivada) e `0.2.0` (ativa).
- **Tipos:** `src/features/release-notes/types/releases.types.ts`.
- **Hook:** `useCurrentVersion` lê JSON e retorna a versão do release não arquivado.
- **UI:** `ReleaseNotesPage`, `ReleaseCard`, `ChangeCard`, `FilterBar`, `release-notes.css` (tokens do projeto).
- **Shell:** badge `fb-version-badge` no topbar com `useNavigate` → `/releases`.
- **Testes:** Vitest (`ReleaseNotesPage.test.tsx`, `useCurrentVersion.test.ts`); `cleanup()` global em `vitest.setup.ts`. Playwright `tests/e2e/release-notes.spec.ts` (rota pública + badge condicionado à sessão).
- **Scripts:** `npm run test:e2e` em `package.json`.
- **TS:** `resolveJsonModule` em `tsconfig.app.json`.

## Verificações executadas

- `npm run build` — OK  
- `npm test` — OK (231 testes)  
- `npx playwright test tests/e2e/release-notes.spec.ts --project=chromium` — 3 passed, 1 skipped (sem sessão GitHub no ambiente)

## Notas

- Título do change em `0.2.0` ajustado para **"Version history UI"** para não colidir com `getByRole('heading', /release notes/i)` (antes o `h3` “Release notes page” quebrava RTL/E2E).
- E2E do badge faz `test.skip` se `board-canvas` não aparecer (depende de sessão FlowBoard), alinhado ao comportamento dos outros specs sem `storageState` global.

## Próximo passo sugerido (pipeline)

Fase **verifier** → **code-reviewer** → **tester** (Playwright multi-browser se desejado).
