# tester-task — column-add-card-redesign (TASK)

**Data:** 2026-04-19  
**Gate TASK:** cobertura Vitest ≥ **70%** (statements), zero falhas de teste.

---

## Execução automatizada

| Comando | Resultado |
|---------|-----------|
| `npm test` (Vitest) | **56** testes, **0** falhas (10 arquivos) |
| `npm run build` (`tsc -b` + Vite) | OK |
| `npm run lint` (ESLint) | OK |
| `npx vitest run --coverage` | **70.81%** statements / **70.2%** lines (≥70% gate) |

**Nota:** `BoardView.tsx` não possui teste unitário dedicado; a mudança é coberta indiretamente pelo gate global do pacote e pelo E2E abaixo.

---

## End-to-end (Playwright)

| Caso | Arquivo | Pré-requisito |
|------|---------|----------------|
| `Column "+ Adicionar card" opens modal with matching column id` | `tests/e2e/create-task.spec.ts` | Sessão válida + quadro carregando (`board-canvas`), mesmo `beforeEach` dos demais testes do arquivo |

**Status local (sandbox sem login):** `beforeEach` pode falhar ao aguardar `board-canvas` — **esperado** sem `.env` / OAuth. Em ambiente com quadro carregado, o novo teste valida que `data-default-column-id` no `[data-testid="ctm-dialog"]` coincide com o sufixo de `data-testid` do botão clicado.

---

## Checklist manual (smoke)

- [ ] Cada coluna mostra **+ Adicionar card** abaixo dos cards.
- [ ] Clique abre modal; submit cria card na coluna de origem (verificar no quadro após salvar).
- [ ] **Nova tarefa** na toolbar ainda cria na coluna backlog (ou primeira coluna se não houver backlog).
- [ ] Com salvamento em andamento, botões de adicionar (toolbar + colunas) ficam desabilitados.
- [ ] Tab até o botão da coluna: anel de foco visível.

---

## Conclusão

**Gate tester TASK:** 🟢 **Pass** — Vitest verde, cobertura global ≥70%, E2E documentado com dependências explícitas.
