# Verification Report — card-archive

> **IPD:** `.memory-bank/specs/card-archive/planner-feature.md`  
> **Delivery Report:** `.memory-bank/specs/card-archive/implementer-feature.md`  
> **Data:** 2026-04-22  
> **Agente:** verifier  
> **Veredicto:** APROVADO COM RESSALVAS (E2E opcional não entregue; drift de repo fora do mapa de código)

---

## Resumo executivo

| Métrica | Valor |
|---------|-------|
| Total de checks executados | 12 |
| PASSOU | 10 |
| FALHOU | 0 |
| N/A | 0 |
| CRÍTICAS | 0 |
| AVISOS | 2 |

---

## Camada 1 — Completude (IPD × Delivery × filesystem)

| Check | Status | Evidência |
|-------|--------|-----------|
| V1.1 CRIAR existem | PASSOU | `cardArchive.ts`, `cardArchive.test.ts` presentes em `apps/flowboard/src/domain/` |
| V1.2 MODIFICAR alterados | PASSOU | `git status` mostra `M` em types, timeEngine, boardLayout, cardSearch, BoardView, modais, SearchModal conforme IPD §4.3 |
| V1.3 NÃO TOCAR | PASSOU | `boardRepository.ts` sem entrada em `git diff --name-only` |
| V1.4 Delivery × Mapa | PASSOU | Tabela do implementer cobre os mesmos paths do mapa; `persistence/types.ts` explicitamente omitido com justificativa |
| V1.5 Drift | RESSALVA | Alterações em `.memory-bank/specs/card-archive/*` e `.cursor/skills/squad-codesteer` aparecem no working tree; esperável para governança / tooling, não fazem parte do mapa de código do IPD |
| V1.6 Divergências justificadas | PASSOU | E2E opcional e purity hook documentados no Delivery Report |

---

## Camada 2 — Validações automatizadas (apps/flowboard)

### V2.1 Typecheck / build

**PASSOU** — `pnpm run build` (tsc -b && vite build) concluído sem erro.

### V2.2 Linter

**PASSOU com avisos pré-existentes** — `pnpm run lint`: 0 erros; 3 warnings em `coverage/*` (eslint-disable não usado).

### V2.3 Testes

**PASSOU** — `pnpm exec vitest run`: **25** ficheiros, **273** testes, todos verdes.

---

## Camada 3 — Rastreabilidade ao TSD (amostragem)

| RF/CA | Evidência no código / testes |
|-------|------------------------------|
| RF02 / Kanban sem arquivados | `buildKanbanItemsRecord`, testes `boardLayout` |
| Merge pós-drag | `mergeLayoutCardsWithArchived` em `commitAfterDrag`, testes `cardArchive` |
| Tempo ao arquivar | `applyArchiveToTimeState`, testes `timeEngine` |
| Busca + badge | `cardSearch` + `SearchModal.test.tsx` (Arquivado) |
| R-UX01 | `ColumnEditorModal` filtra `isCardArchived` |

---

## Camada 4 — Risco residual

| Item | Severidade | Nota |
|------|------------|------|
| Sem E2E Playwright dedicado a card-archive | Baixa | IPD marcava opcional; núcleo coberto por Vitest |
| Ficheiros não commitados | Operacional | `cardArchive*.ts` e `implementer-feature.md` ainda untracked/`??` no momento da verificação — normal antes de `git add` |

---

## Veredicto final

**APROVADO COM RESSALVAS** para avançar para `code-reviewer` e `tester`: zero bloqueios críticos; completude e suíte automatizada coerentes com o FEATURE. Resolver commit/stage dos ficheiros novos antes do merge.
