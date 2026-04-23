# Delivery Report — Editar horas de apontamento (`edit-horas-apontamento`)

> IPD: `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md`  
> Task Breakdown: `.memory-bank/specs/edit-horas-apontamento/task-breakdown-FEATURE.md`  
> Data: 2026-04-22

## Arquivos Gerados/Modificados

| Ação | Arquivo | Status | Observação |
|------|---------|--------|------------|
| CRIAR | `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.ts` | OK | Função pura, tetos alinhados a `localDayRange` + janela expediente (mesma ideia que `clipIntervalToWorkingHours`). |
| CRIAR | `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.test.ts` | OK | Casos IPD §6.1. |
| MODIFICAR | `apps/flowboard/src/features/hours/HoursView.tsx` | OK | Modal, persistência, 409, `data-testid`, E2/E3. |
| MODIFICAR | `apps/flowboard/src/features/hours/HoursView.css` | OK | Modal + coluna ações. |
| CRIAR | `apps/flowboard/tests/e2e/hours-view.spec.ts` | OK | Smoke + E2 (Chromium); Firefox/WebKit usam `test.skip` no describe mutante. |

## Checklist DoD (IPD §3)

- [x] RF-01: ação por linha (Editar) com `aria-label` e teclado.
- [x] RF-02: modal com título, quadro, tempo atual, input, Cancelar/Salvar, `role="dialog"`, `aria-modal`, loading ao salvar.
- [x] RF-03: `loadBoard` → domínio → patch → `saveBoard` → `load()` da agregação.
- [x] RNB-02: `nextCompleted` reconstruído no domínio a partir dos segmentos do card.
- [x] E1: `NO_SEGMENTS` sem `saveBoard`.
- [x] E2: `useEffect` em `periodKind` / `anchor` / `scope` descarta edição; overlay com `pointer-events: none` para permitir clicar nos filtros com modal aberta (sem isso o período fica ilegível sob backdrop opaco — ver divergência).
- [x] E3: linhas arquivadas com botão desabilitado + `title`.
- [x] E4/E5: domínio multi-segmento; erros de rede/GitHub exibidos sem fechar como sucesso.
- [x] INFEASIBLE / INVALID mapeados pt-BR.
- [x] 409: mensagem IPD + CTA `hours-edit-retry` + `load()` após conflito.
- [x] RF-04: `saveBoard`/`loadBoard` sempre com `boardId` da linha (`edit.boardId` / `doc.boardId` do documento carregado).
- [x] Constitution VI: Vitest domínio + E2E mínimo.

## Comandos executados (repo: `apps/flowboard`)

| Comando | Resultado |
|---------|-----------|
| `pnpm exec vitest run src/domain/applyTargetHoursForCardInPeriod.test.ts` | exit **0** |
| `pnpm run test` (Vitest suite completa) | exit **0** — 26 ficheiros, 281 testes |
| `pnpm exec eslint src/features/hours/HoursView.tsx src/domain/applyTargetHoursForCardInPeriod.ts` | exit **0** |
| `pnpm exec tsc -b` | exit **0** (via `pnpm run build`) |
| `pnpm run build` | exit **0** |
| `pnpm exec playwright test tests/e2e/hours-view.spec.ts --project=chromium` | exit **0** — 3 passed (setup + smoke + E2) |

## Divergências do plano original

| Divergência | Motivo técnico | Impacto |
|---------------|----------------|---------|
| Backdrop do modal não fecha ao clicar fora; overlay com `pointer-events: none` e painel com `pointer-events: auto` | Com backdrop opaco e `inset:0`, os controlos de período/âncora ficam inacessíveis; o E2 exige mudar período com o modal aberto e o Playwright reproduz o mesmo bloqueio. Fecho continua com **Cancelar** e **Esc** (IPD). | Baixo — melhora usabilidade real e destrava E2. |

## Status do Task Breakdown

| Task | Status final | Evidência |
|------|----------------|-----------|
| T1 | CONCLUÍDA | `applyTargetHoursForCardInPeriod.ts` |
| T2 | CONCLUÍDA | `applyTargetHoursForCardInPeriod.test.ts` |
| T3 | CONCLUÍDA | `HoursView.tsx` + CSS + `data-testid` |
| T4 | CONCLUÍDA | `handleSaveHours`, `GitHubHttpError` 409 |
| T5 | CONCLUÍDA | `HoursView.css` |
| T6 | CONCLUÍDA | `hours-view.spec.ts` + Playwright Chromium OK |

## Sugestões fora de escopo (não implementadas)

- Alterar `hoursAggregation` para incluir `archived` na linha (evita varrer `loadBoard` por card arquivado) — proibido pelo mapa §4.3.
- Auto-retry silencioso em 409 — IPD pede CTA explícita.

## Riscos

- **Cliques “no escuro”**: com `pointer-events: none` no overlay, cliques fora do painel podem atingir a página por baixo; o painel continua a capturar interação na área do diálogo.

## Status final

**Implementação:** Completa  
**Bloqueadores:** Nenhum
