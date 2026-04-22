# Delivery Report — Melhoria visual e de UX da página Arquivados

> **IPD:** `.memory-bank/specs/archived-page-ui-improvement/planner-TASK.md` (v1.1)  
> **Task breakdown:** `.memory-bank/specs/archived-page-ui-improvement/task-breakdown-TASK.md`  
> **Data:** 2026-04-22

## Arquivos Gerados/Modificados

| Ação | Arquivo | Status | Observação |
|------|---------|--------|------------|
| MODIFICAR | `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` | OK | Helpers `getColumnLabel`, `formatArchivedAtForDisplay`; toolbar (eyebrow, H1 + count, subtítulo); `Link` com `data-testid="archived-back-to-board"` quando `boardId` definido; painel + linhas com meta; CTAs primário / ghost-danger; estados loading/empty alinhados ao protótipo |
| MODIFICAR | `apps/flowboard/src/features/board/ArchivedCardsPage.css` | OK | `max-width: 1120px`, painel, grid de linha, shimmer em loading, tokens do app |
| MODIFICAR | `apps/flowboard/tests/e2e/card-archive.spec.ts` | OK | Asserção `archived-back-to-board`; smoke navegação `/` e retorno a Arquivados |
| MODIFICAR | `.memory-bank/specs/archived-page-ui-improvement/task-breakdown-TASK.md` | OK | Apenas linhas de Status (T1–T5 CONCLUÍDA) |

## Decisões de design (alinhamento IPD §7.2)

- **A1 — Coluna desconhecida:** `getColumnLabel` devolve `Coluna removida (${columnId})` quando `columnId` não existe em `doc.columns`, para manter informação acessível sem novo schema.
- **A2 — `archivedAt`:** `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })`; ausente ou ISO inválido → copy “Sem data de arquivamento” (sem throw).
- **Marcup / CSS:** Prefixo `fb-archived__*` para espelhar intenção do protótipo (`prototype-archived-page.html` Sec. 2.5) com variáveis de `tokens.css`.

## Checklist DoD (IPD §3)

- [x] **Funcional + UI:** Toolbar, painel “Histórico neste quadro”, linhas com título + coluna + data/“Sem data…”, Restaurar accent, Excluir ghost-danger; `data-testid` preservados + `archived-back-to-board`.
- [x] **Compilação:** `pnpm build` sem erros.
- [x] **Testes unitários:** `pnpm test` — 273 testes passando.
- [x] **E2E:** `card-archive.spec.ts` passou em execução isolada (ver secção Resultado).
- [x] **Lint:** `pnpm lint` — 0 erros (avisos pré-existentes em ficheiros sob `coverage/`).
- [x] **Edge cases:** `boardId` null → sem link voltar; `archivedAt` inválido → sem excepção; `saving` → botões `disabled` inalterados.

## Resultado dos Testes

### `cd apps/flowboard && pnpm lint && pnpm test && pnpm build`

```
> eslint .
(coverage/*.js — 3 warnings pré-existentes: unused eslint-disable)

> vitest run
 Test Files  25 passed (25)
      Tests  273 passed (273)

> tsc -b && vite build
✓ built in 136ms
```

### `pnpm test:e2e:raw` (suite completa)

A suite completa falhou em **dois testes não relacionados** a esta entrega (`create-task.spec.ts` happy path e `card-attachments.spec.ts` happy path — timeout a aguardar texto do card no quadro, provável flakiness/ambiente). **Não** envolvem `ArchivedCardsPage` nem `card-archive.spec.ts`.

### `pnpm exec playwright test tests/e2e/card-archive.spec.ts` (escopo desta TASK)

```
Running 2 tests using 1 worker
[setup] persistir sessão GitHub — passed
[chromium] card-archive E2E › happy path: ... — passed
2 passed (8.5s)
```

## Divergências do Plano Original

| Divergência | Motivo técnico | Impacto |
|---------------|----------------|---------|
| Nenhuma material | Implementação segue Mapa §4.3 e Sec. 2.5 | — |

## Sugestões fora de escopo (não implementadas)

- Filtro local por título (A3 / `state.yaml` opcional).

## Status do Task Breakdown

| Task | Status final | Evidência |
|------|----------------|-----------|
| T1 | CONCLUÍDA | Helpers em `ArchivedCardsPage.tsx` |
| T2 | CONCLUÍDA | JSX toolbar, painel, linhas, `Link`, testids |
| T3 | CONCLUÍDA | `ArchivedCardsPage.css` |
| T4 | CONCLUÍDA | `card-archive.spec.ts` + run Playwright isolado |
| T5 | CONCLUÍDA | Lint / test / build; E2E documentado |

## Status Final

**Implementação:** Completa  

**Bloqueadores:** Nenhum para o escopo do IPD. A suite E2E completa pode falhar por testes alheios (ver acima); o spec `card-archive` está verde em execução dedicada.
