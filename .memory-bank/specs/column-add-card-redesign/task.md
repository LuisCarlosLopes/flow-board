# task.md — Column add-card redesign (TASK)

> **Status:** Done — code-reviewer + tester (TASK gates)  
> **Track:** TASK  
> **Created:** 2026-04-19  
> **Spec:** `state.yaml` + `planner-task.md`  
> **Reference UI:** protótipo em  
> `.cursor/projects/Users-luiscarloslopesjr-GitHub-test-cursor-codesteer/assets/image-3829e232-316f-4812-bd15-21ffb573e1b5.png`  
> **HTML reference:** `.memory-bank/specs/personal-kanban/prototypes/index.html` (`.add-card`)

---

## Subtasks

### T1: Modelar estado de criação com coluna alvo

**Title:** Estender `taskModal` para criação com `defaultColumnId` por coluna

**Objective:**  
Permitir abrir `CreateTaskModal` em modo criação informando explicitamente qual `columnId` deve ir no payload, sem depender apenas da primeira coluna `backlog` quando o usuário clicou em uma coluna específica.

**Impacted files:**
- `apps/flowboard/src/features/board/BoardView.tsx`

**Dependencies:**  
None

**Deliverable:**
- Tipo `TaskModalState` atualizado (ex.: `'closed' | { mode: 'create'; columnId: string } | { mode: 'edit'; card: Card }` ou equivalente legível).
- `handleAddCard` (toolbar) define criação com `columnId` = `doc.columns.find(c => c.role === 'backlog')?.columnId` (mesmo comportamento atual).
- Nova função `handleAddCardToColumn(columnId: string)` abre modal de criação com essa coluna.

**Definition of Done:**
- [ ] Compilação OK
- [ ] `CreateTaskModal` recebe `defaultColumnId` coerente em ambos os fluxos (toolbar vs coluna)
- [ ] Edição de card existente inalterada

**Time estimate:** 0.5 h

---

### T2: UI do rodapé "+ Adicionar card" em cada coluna

**Title:** Controle visual alinhado ao protótipo no `BoardColumn`

**Objective:**  
Inserir, abaixo da lista de cards da coluna, a zona **"+ Adicionar card"** com borda tracejada, cantos arredondados e cores do tema escuro atual, equivalente ao mock.

**Impacted files:**
- `apps/flowboard/src/features/board/BoardView.tsx` (props e JSX de `BoardColumn`)
- `apps/flowboard/src/features/board/BoardView.css`

**Dependencies:**  
T1

**Deliverable:**
- Botão (recomendado: `<button type="button">`) largura total da área de cards, texto **+ Adicionar card**.
- `data-testid={`column-add-card-${column.columnId}`}`.
- `disabled={saving}` (ou prop `disabled` derivada de `saving`).
- `aria-label` descritivo em PT-BR.
- `onPointerDown={(e) => e.stopPropagation()}` no botão para não iniciar drag.

**Definition of Done:**
- [ ] Três colunas típicas mostram cada uma seu controle
- [ ] Hover/focus-visible distinguível do estado repouso
- [ ] Não quebra layout do `SortableContext`

**Time estimate:** 1 h

---

### T3: Estilos (paridade com protótipo)

**Title:** CSS da área tracejada e tipografia

**Objective:**  
Espelhar o mock: borda dashed/dotted suave, texto secundário, raio compatível com `.fb-card` / coluna.

**Impacted files:**
- `apps/flowboard/src/features/board/BoardView.css`

**Dependencies:**  
T2

**Deliverable:**
- Classe dedicada (ex. `.fb-col-add-card`) usando variáveis CSS já existentes (`--border-*`, `--text-secondary`, `--radius-*`).
- Estados `:hover`, `:focus-visible`, `:disabled`.

**Definition of Done:**
- [ ] Visual revisado lado a lado com a imagem de referência
- [ ] Sem cores hardcoded que quebrem dark theme

**Time estimate:** 0.5 h

---

### T4: Testes automatizados mínimos

**Title:** Cobrir abertura do modal com coluna correta

**Objective:**  
Evitar regressão: ao clicar no add da coluna X, o modal deve ser montado com `defaultColumnId` X.

**Impacted files:**
- Suite de testes existente do flowboard (Vitest + RTL) — criar ou estender arquivo próximo a `BoardView` se já houver padrão; caso não exista teste de view, adicionar teste de unidade em hook/helper extraído **somente se** a extração for trivial; caso contrário, teste de integração leve do componente.

**Dependencies:**  
T1, T2

**Deliverable:**
- Pelo menos um teste que asserta `defaultColumnId` / prop efetiva ao simular clique em `column-add-card-{id}`.
- OU documento em `tester-task.md` com checklist E2E manual se o projeto ainda não tiver infraestrutura para `BoardView` (preferir teste automatizado se já houver setup).

**Definition of Done:**
- [ ] `npm test` (ou comando do pacote) passa no escopo tocado

**Time estimate:** 1 h

---

### T5: Verificação manual / QA

**Title:** Smoke no fluxo completo

**Objective:**  
Criar card pela coluna TODO (ou qualquer coluna), salvar, confirmar que o card aparece na coluna certa após reload.

**Dependencies:**  
T1–T3

**Checklist:**
- [ ] Adicionar da coluna backlog cria no backlog
- [ ] Adicionar da coluna "Em progresso" cria nessa coluna (se aplicável ao modelo de dados)
- [ ] Toolbar ainda cria no backlog
- [ ] Nenhum erro de console ao abrir/fechar modal

**Time estimate:** 0.25 h

---

## Ordem sugerida

`T1 → T2 → T3 → T4 → T5`

**Estimated total:** ~3.25 h
