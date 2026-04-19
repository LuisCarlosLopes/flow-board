# IPD (leve) — Redesign adicionar card por coluna

**Track:** TASK  
**Slug:** `column-add-card-redesign`  
**Data:** 2026-04-19  

---

## 1. Contexto

O protótipo do Kanban pessoal mostra, no rodapé de cada coluna, uma área tracejada com o texto **"+ Adicionar card"**. No **Flowboard** (`apps/flowboard`), a criação ocorre hoje principalmente pelo botão **"Nova tarefa"** na toolbar, que abre `CreateTaskModal` com coluna padrão = primeira coluna de papel `backlog`. As colunas em `BoardColumn` não possuem ação de adicionar.

---

## 2. Objetivo da mudança

Aproximar o produto do protótipo: **criar tarefa a partir da coluna** onde o card deve nascer, com visual consistente (dark, borda tracejada, cantos arredondados).

---

## 3. Mapa de alterações

| # | Área | Alteração |
|---|------|-----------|
| D1 | `BoardView.tsx` | Estado do modal de tarefa passa a carregar `defaultColumnId` opcional ao abrir criação a partir de uma coluna (ex.: `TaskModalState = 'closed' \| 'create' \| { edit: Card }` → estender `'create'` para incluir `columnId` ou usar objeto `{ create: string }`). |
| D2 | `BoardView.tsx` | Nova callback `handleAddCardToColumn(columnId)` que seta o estado e abre `CreateTaskModal` com `defaultColumnId={columnId}`. |
| D3 | `BoardColumn` | Novas props: `onAddCard: (columnId: string) => void`, `disabled?: boolean`. Renderizar botão/área "+ Adicionar card" após a lista sortable. |
| D4 | `BoardView.css` | Classes para `.fb-col-add-card` (borda tracejada, padding, hover, focus-visible, tipografia alinhada ao board). |
| D5 | Toolbar | Manter botão "Nova tarefa" chamando criação com backlog (comportamento atual) para não regressar power users. |

---

## 4. Contratos / integração

- `CreateTaskModal` já define `defaultColumnId?: string` e inclui `columnId` no `payload` em modo criação — **não exige mudança de contrato** se `BoardView` passar o id real da coluna.
- `handleCreateTask` já usa `task.columnId || firstBacklog` — garantir que o modal receba o id da coluna clicada.

---

## 5. Riscos

| Risco | Mitigação |
|-------|-----------|
| Colisão de clique com DnD | Usar `onPointerDown` stopPropagation no botão de adicionar (mesmo padrão dos botões Editar/Excluir do card). |
| Regressão no fluxo global | Manter handler atual da toolbar com `defaultColumnId` do backlog. |

---

## 6. DoD (implementação)

- Build TypeScript sem erros.
- Controle desabilitado quando `saving`.
- Foco visível e rótulo acessível (`aria-label` coerente com "+ Adicionar card").

---

## 7. Próximo passo

Decomposição em `task.md` (task-breakdown).
