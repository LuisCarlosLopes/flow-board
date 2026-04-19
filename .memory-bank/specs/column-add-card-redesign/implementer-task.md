# implementer-task — column-add-card-redesign (TASK)

**Data:** 2026-04-19  
**Status:** Entregue (código + teste E2E)

## Alterações no produto

- `BoardView.tsx`: estado do modal discriminado por `{ mode: 'create', columnId }` | `{ mode: 'edit', card }`; toolbar mantém criação no backlog (primeira coluna `backlog` ou primeira coluna do doc); cada coluna chama `handleAddCardToColumn`; botão **+ Adicionar card** fora do `SortableContext`, com `stopPropagation`, `data-testid`, `disabled` quando `saving`.
- `BoardView.css`: estilos `.fb-col-add-card` (borda tracejada, hover, focus-visible, disabled).
- `CreateTaskModal.tsx`: `data-testid="ctm-dialog"` e `data-default-column-id` para asserção de coluna alvo (create e edit).
- `tests/e2e/create-task.spec.ts`: cenário que valida `data-default-column-id` após clique no add da última coluna.
- `package.json`: devDependency `@playwright/test` (os E2E já importavam o pacote sem declará-lo).

## Verificação

- `npm run build` e `npm test` (Vitest) no app `flowboard`: OK.
- Playwright local falhou no `beforeEach` por ausência de sessão/quadro (`board-canvas`); mesmo pré-requisito dos demais E2E do arquivo.

## Follow-up opcional

- Rodar `npx playwright test` em ambiente com `.env` e login válidos.
- Documentar no README do flowboard o comando de instalação de browsers (`npx playwright install`).
