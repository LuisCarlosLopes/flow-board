# Delivery Report — card-archive (implementer)

> Data: 2026-04-22 | Track: FEATURE | Aprovação HITL: concedida pelo utilizador

## Resumo

Implementação alinhada ao IPD `planner-feature.md` e `task-breakdown-feature.md`: modelo `Card` com `archived` / `archivedAt`, domínio `cardArchive` (merge pós-layout), `applyArchiveToTimeState` no `timeEngine`, Kanban só com ativos, busca com metadado `archived`, UI de arquivar no card e no modal, secção Arquivados, reconciliação de tempo ignora timers para cards arquivados.

## Ficheiros alterados / criados

| Ação | Caminho |
|------|---------|
| CRIAR | `apps/flowboard/src/domain/cardArchive.ts` |
| CRIAR | `apps/flowboard/src/domain/cardArchive.test.ts` |
| MODIFICAR | `apps/flowboard/src/domain/types.ts` |
| MODIFICAR | `apps/flowboard/src/domain/timeEngine.ts` |
| MODIFICAR | `apps/flowboard/src/domain/timeEngine.test.ts` |
| MODIFICAR | `apps/flowboard/src/domain/boardLayout.ts` |
| MODIFICAR | `apps/flowboard/src/domain/boardLayout.test.ts` |
| MODIFICAR | `apps/flowboard/src/domain/cardSearch.ts` |
| MODIFICAR | `apps/flowboard/src/domain/cardSearch.test.ts` |
| MODIFICAR | `apps/flowboard/src/features/board/BoardView.tsx` |
| MODIFICAR | `apps/flowboard/src/features/board/BoardView.css` |
| MODIFICAR | `apps/flowboard/src/features/board/CreateTaskModal.tsx` |
| MODIFICAR | `apps/flowboard/src/features/board/CreateTaskModal.css` |
| MODIFICAR | `apps/flowboard/src/features/board/ColumnEditorModal.tsx` |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.tsx` |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.css` |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.test.tsx` |

**Não tocado (conforme mapa):** `boardRepository.ts`, `HoursView.tsx`, `persistence/types.ts` (re-export de `Card` já cobre novos campos).

## Decisões de implementação

- **Lint react-hooks/purity:** `handleUnarchiveCard` passou a usar IIFE `async` com `Date.now()` no interior, como em `handleArchiveCard`, para satisfazer o compilador de hooks.
- **E2E Playwright:** não adicionado nesta entrega; núcleo coberto por Vitest (domínio + `SearchModal`).

## Verificações executadas

- `pnpm exec vitest run` — 273 testes OK (apps/flowboard)
- `pnpm run lint` — 0 erros (avisos pré-existentes em `coverage/`)
- `pnpm run build` — OK

## DoD (IPD §3)

- [x] Funcional: arquivar, merge após drag, tempo ao arquivar, busca + badge, arquivados/restaurar/excluir, contagem colunas sem arquivados no editor
- [x] Build / tipos
- [x] Testes novos + regressões
- [ ] E2E opcional — adiado

## Próximos passos sugeridos (pipeline)

- `verifier` → `code-reviewer` → `tester` (se a squad continuar o fluxo FEATURE completo).
