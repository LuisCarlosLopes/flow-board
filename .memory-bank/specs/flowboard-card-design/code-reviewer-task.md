# Code review — FlowBoard Kanban card redesign

> **Data:** 2026-04-20 | **Agente:** code-reviewer | **Escopo:** `plannedDateStatus*`, `BoardView.tsx` (SortableCard/BoardColumn), `BoardView.css`, alinhado a `state.yaml` / `task.md`

## Resolução dos findings (2026-04-20)

- **Medium (alert vs sr-only):** removido `.fb-card__sr-only` redundante; conteúdo visível + `role="alert"` é a única fonte.
- **Low (DST / dias):** `getCalendarDaysOverdue` passa a usar **ordinal gregoriano** da data local (`localCalendarOrdinal`), sem `Math.round(ms / 86400000)`.
- **Low (dois relógios):** `SortableCard` usa um único `const now = new Date()` e repassa a `getPlannedDateUiStatusForColumn` e `overdueMessage`.
- **Low (testes):** trim em `parseLocalDateOnly` / `getPlannedDateUiStatus`; caso mês (fev → mar).

## Veredicto

**go with notes** — Nenhum bloqueador de corretude ou segurança nos arquivos lidos; domínio e coluna “done” batem com a intenção de produto. Há melhorias recomendadas (a11y verboso, robustez de “dias atrasados” em DST, pequenos gaps de teste).

## Findings

| Severidade | Local (aprox.) | Problema | Recomendação |
|------------|----------------|----------|--------------|
| medium | `BoardView.tsx` ~659–683 | Bloco `role="alert"` já expõe o atraso; o `.fb-card__sr-only` (“Esta tarefa está atrasada…”) pode gerar **dupla leitura** ou anúncio redundante em leitores de tela. | Manter uma única fonte de verdade no alerta (texto visível + `aria` mínimo) ou remover o `sr-only` se o conteúdo do alerta for equivalente. |
| low | `plannedDateStatus.ts` ~55–61 | `getCalendarDaysOverdue` usa `Math.round((tNow - tPlanned) / 86_400_000)`. Entre dois “meia-noites locais” o delta em ms **não é sempre** múltiplo exato de 24h (DST), o que pode, em fusos afetados, distorcer o número de dias em casos limite. | Documentar a limitação no módulo ou calcular diferença em **dias de calendário** (ex. contagem via UTC components / loop local) se o produto exigir precisão em DST. |
| low | `BoardView.tsx` ~575–580, ~609 | `getPlannedDateUiStatusForColumn` usa `now` default; `overdueMessage` → `getCalendarDaysOverdue(plannedDate)` usa outro `new Date()` implícito. Na prática raro divergir; ainda é **dois relógios** no mesmo render. | Opcional: obter `const now = new Date()` uma vez no componente e passar para helpers de domínio que aceitam `now`. |
| low | `plannedDateStatus.test.ts` | Boa cobertura de happy path e coluna `done`; faltam casos menores (ex. string `YYYY-MM-DD` com padding trim, ou mais asserts em `formatPlannedDateForCard` para mês abreviado). | Acrescentar 1–2 testes de borda em `parseLocalDateOnly` / `getPlannedDateUiStatus` com espaços laterais se quiser travar regressão de trim. |
| low | — (verificação visual) | Contraste WCAG em **tema escuro** para `fb-card__alert--warn` / `--danger` e texto mono no planejado não é provável só pelo CSS sem inspecionar `tokens.css` em runtime. | Smoke visual ou ferramenta de contraste no build de tema escuro (fora do escopo desta revisão estática). |

**Segurança:** Nenhum segredo ou dado sensível nos trechos revisados. **Excluir:** a implementação **usa** `window.confirm` em `handleDeleteCard` (`BoardView.tsx` ~337–340); o item do checklist “delete still no confirm” **não se aplica** ao código atual.

## Positive notes

- **Domínio puro:** `parseLocalDateOnly` com regex estrita + validação de calendário (`Date` rollover → `null`); `getPlannedDateUiStatusForColumn` suprime `due_today` / `overdue` na coluna `done`, alinhado ao produto.
- **Cartões sem data:** `none` não aplica modificadores extras; `showPlanned` exige status ≠ `none` e `plannedDate` truthy — sem ruído para string inválida (status cai em `none`).
- **A11y base:** `role="status"` (vence hoje) e `role="alert"` (atrasado); rótulos `aria-label` nos botões e no bloco planejado; ícones decorativos com `aria-hidden`.
- **Foco:** botões herdam `button:focus-visible` de `apps/flowboard/src/index.css` (~93–101), coerente com o restante do app.
- **CSS:** especificidade de hover trata modificadores (ex. `.fb-card--overdue:hover` com `animation: none`); animação de overdue só com `prefers-reduced-motion: no-preference`.
- **DnD vs cliques:** `onPointerDown` / `onClick` com `stopPropagation` nos botões evita disparo indesejado do sortable.
- **Testes Vitest:** cobrem inválidos, coluna `done`, dias de atraso simples e formatação pt-BR.

## Suggested follow-ups (opcional, fora de escopo)

- Substituir `window.confirm` por modal in-app se o `state.yaml` evoluir nessa direção.
- Teste de componente ou E2E leve para `data-testid` `card-delete-*` se a suíte E2E passar a depender dele.
- Se o board ganhar papéis de coluna além de `backlog | in_progress | done`, rever `getPlannedDateUiStatusForColumn` (hoje o tipo já fecha esse conjunto).

---

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "modules_loaded": ["quality", "security"],
  "findings_total": 5,
  "findings_critical": 0,
  "findings_high": 0,
  "findings_medium": 1,
  "findings_low": 4,
  "recommendation": "APROVAR",
  "priority_fix": "Reduzir redundância entre role=alert e sr-only no card atrasado (a11y)",
  "report_path": ".memory-bank/specs/flowboard-card-design/code-reviewer-task.md"
}
```
