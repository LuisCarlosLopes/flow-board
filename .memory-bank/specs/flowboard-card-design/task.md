# task.md — FlowBoard: design do card (TASK)

> **Track:** TASK  
> **Created:** 2026-04-20  
> **State:** `.memory-bank/specs/flowboard-card-design/state.yaml`  
> **Referência visual (fonte de verdade):** `prototypes/card-data-planejada-atraso.html`  
> **Código atual do card:** `SortableCard` em `apps/flowboard/src/features/board/BoardView.tsx` + `BoardView.css`

---

## Contexto

- O protótipo define: baseline **sem data**; **no prazo** (barra accent); **vence hoje** (warning + alerta); **atrasado** (danger + `role="alert"` + ênfase suave); ações **ícone + `aria-label` + `title`**.
- O domínio já expõe `Card.plannedDate?: string` (ISO). O modal já persiste a data. Falta **superfície no card** e **regra testável** de classificação.

---

## Subtasks

### T1 — Classificação de `plannedDate` (domínio testável)

**Title:** Função pura “hoje / vence hoje / atrasado / sem data”

**Objective:**  
Centralizar comparação por **dia civil no fuso local** (alinhado ao MVP), retornando um discriminante estável para a UI.

**Impacted files (sugerido):**

- `apps/flowboard/src/domain/plannedDateStatus.ts` (novo)
- `apps/flowboard/src/domain/plannedDateStatus.test.ts` (novo)

**Dependencies:** Nenhuma

**Deliverable:**

- API sugerida (ajustar nomes ao estilo do repo):
  - `export type PlannedDateUiStatus = 'none' | 'scheduled' | 'due_today' | 'overdue'`
  - `export function getPlannedDateUiStatus(plannedDate: string | undefined, now?: Date): PlannedDateUiStatus`
- Comportamento:
  - `undefined` / string vazia → `'none'`
  - ISO `YYYY-MM-DD` válido: comparar apenas **data** (ignorar hora de `now`)
  - Mesmo dia que `now` (local) → `'due_today'`
  - Anterior ao dia local → `'overdue'`
  - Posterior → `'scheduled'`
- Casos de teste: meia-noite, fuso consistente (fixar `now` em testes), string inválida → tratar de forma previsível (`'none'` ou documentar).

**Definition of Done:**

- [ ] Vitest cobre happy path + bordas (hoje, ontem, amanhã, sem campo)
- [ ] Nenhuma dependência de React

**Time estimate:** 0.5–1 h

---

### T2 — Marcação e estilos do card por estado

**Title:** Classes BEM-like espelhando o protótipo

**Objective:**  
Aplicar modificadores de card conforme `PlannedDateUiStatus`, sem poluir markup quando `none`.

**Impacted files:**

- `apps/flowboard/src/features/board/BoardView.tsx`
- `apps/flowboard/src/features/board/BoardView.css`

**Dependencies:** T1

**Deliverable:**

- Modificadores alinhados ao protótipo (nomes podem mapear 1:1):
  - `fb-card--accent-planned` (scheduled)
  - `fb-card--due-soon` (due_today)
  - `fb-card--overdue` (overdue)
  - sem classe extra quando `none` (comportamento atual)
- Barra lateral inset + bordas/sombras como no HTML de referência.
- Gradiente leve só em overdue; animação de ênfase só se `prefers-reduced-motion: no-preference` (espelhar `@keyframes` do protótipo ou simplificar para sombra).
- Hover do card atrasado não deve “brigar” com animação (protótipo pausa no `:hover`).

**Definition of Done:**

- [ ] Contraste de texto alerta/data verificável no tema escuro
- [ ] Lint CSS/TS OK

**Time estimate:** 1–1.5 h

---

### T3 — Conteúdo: bloco “Planejado” + alertas

**Title:** JSX do meta stack (alerta + data)

**Objective:**  
Empilhar alerta (quando `due_today` / `overdue`) e bloco de data como no protótipo.

**Impacted files:**

- `apps/flowboard/src/features/board/BoardView.tsx`

**Dependencies:** T1, T2

**Deliverable:**

- Quando `scheduled`: apenas bloco planejado (ícone calendário + rótulo + valor); sem chip de alerta.
- Quando `due_today`: faixa `role="status"` + texto acionável (ex. “Vence hoje — priorize encerrar ou reagendar”) — copiar ou encurtar do protótipo.
- Quando `overdue`: `role="alert"` + título + mensagem (ex. “Fora do prazo” + linha secundária; dias úteis pode ser **fase 2** se não houver função de expediente no card — nesta task, “dias corridos” ou “X dias” com cálculo simples local é aceitável se testado).
- Formatação de data: `Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })` ou padrão já usado no app — **consistente** com `SearchModal` se possível.
- `aria-label` / `sr-only` onde o protótipo indica.

**Definition of Done:**

- [ ] Leitor de tela anuncia atraso via `role="alert"` apenas em overdue
- [ ] Cards sem `plannedDate` não ganham ruído visual

**Time estimate:** 1–1.5 h

---

### T4 — Ações: ícones Editar / Excluir

**Title:** Substituir rótulos por ícones acessíveis

**Objective:**  
Paridade com o protótipo: ícones lápis e lixeira, mantendo testes E2E que dependem de `data-testid`.

**Impacted files:**

- `apps/flowboard/src/features/board/BoardView.tsx`
- `apps/flowboard/src/features/board/BoardView.css` (tamanho mínimo, hover, danger)

**Dependencies:** T2 (opcional), pode ser paralelo a T3 com cuidado no merge

**Deliverable:**

- `aria-label` PT-BR, ex.: “Editar card”, “Excluir card”; `title` opcional para tooltip.
- Preservar `data-testid={`card-edit-${card.cardId}`}` no botão de editar (já usado em testes).
- Adicionar `data-testid` estável para excluir se E2E precisar (ex. `card-delete-${card.cardId}`) — ver usos em `tests/e2e`.
- SVG `stroke="currentColor"`, tamanho ~18px, área clicável ≥ 44px.

**Definition of Done:**

- [ ] Nenhuma regressão em seletores E2E existentes
- [ ] Foco visível (`:focus-visible`) coerente com o app

**Time estimate:** 0.5–1 h

---

### T5 — Qualidade (regressão)

**Title:** Lint, testes, revisão rápida

**Objective:**  
Fechar o track TASK com evidência.

**Impacted files:** —

**Dependencies:** T1–T4

**Deliverable:**

- `cd apps/flowboard && npm run lint && npm test && npm run build`
- Atualizar ou adicionar teste de componente apenas se já houver padrão para `BoardView` (não obrigatório se domínio + E2E cobrirem); prioridade é **domínio** em T1.

**Definition of Done:**

- [ ] Comandos verdes
- [ ] `state.yaml` atualizado (`status`, `history`, `summary`) após merge humano

**Time estimate:** 0.5 h

---

## Ordem sugerida

`T1 → T2 → T3 → T4 → T5` (T4 pode entrar após T2 se quiser fatiar PR).

## Riscos / notas

- **Dias úteis vs corridos:** protótipo menciona “dias úteis”; se `workingHours` do board não for aplicável ao card nesta entrega, usar texto neutro (“Atrasado”) ou dias corridos calculados e testados — evitar prometer “úteis” sem regra de domínio.
- **Constitution:** não introduzir persistência nova; apenas UI + função pura sobre campo existente.

## Referência rápida de arquivos

| Área        | Caminho |
|------------|---------|
| Protótipo  | `prototypes/card-data-planejada-atraso.html` |
| Card       | `apps/flowboard/src/features/board/BoardView.tsx` |
| Estilos    | `apps/flowboard/src/features/board/BoardView.css` |
| Tipo Card  | `apps/flowboard/src/domain/types.ts` |
