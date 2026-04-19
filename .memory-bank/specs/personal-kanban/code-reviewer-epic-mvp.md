# Code review — FlowBoard MVP (`apps/flowboard`)

> **Data:** 2026-04-19 | **Revisor:** code-reviewer (EPIC pós-implementação)  
> **Base:** `implementer-epic-1.md` … `implementer-epic-3.md`, `task.md` T1–T12, ADR-001–005

---

## Veredicto: 🟡 APROVADO COM RESSALVAS

Nenhum achado **🔴 crítico** de segurança ou correção bloqueante para merge. Ressalvas são melhorias incrementais e alinhamento com IPD (React Router opcional).

---

## Sumário

| Categoria | Qtd |
|-----------|-----|
| 🔴 Críticos | 0 |
| 🟡 Avisos | 4 |
| 🔵 Sugestões | 3 |
| **Score** | **84** / 100 |

---

## Pontos positivos

- **Domínio isolado:** `boardRules`, `timeEngine`, `hoursProjection`, `hoursAggregation`, `boardLayout` testáveis sem React.
- **GitHub:** `GitHubContentsClient` + `putJsonWithRetry` (409) + tratamento 401/429 coerente com ADR-005.
- **Persistência:** catálogo + um JSON por quadro; bootstrap e operações de catálogo com ordem escrita razoável.
- **UI:** Kanban com `@dnd-kit`, monitoramento de horas com R09 explícito na agregação; README com matriz RF×teste e DoD.
- **A11y mínimo:** skip link, `#main-content`, `aria-pressed` na navegação Kanban/Horas, `aria-label` no header.

---

## 🟡 Avisos

1. **Carregamento em `useEffect`:** padrão `setTimeout(0)` adotado para satisfazer `react-hooks/set-state-in-effect` no ESLint; em evolução, considerar `AbortController` em `reload`/`load` para evitar `setState` após desmontagem (baixo risco no fluxo atual).
2. **Conflito 409 na UI:** retry existe em `putJsonWithRetry`; caminhos de `BoardView`/`boardRepository` usam `saveBoard` direto — mensagem ao usuário + reload já tratados em parte; documentar comportamento se dois clientes editarem o mesmo quadro simultaneamente.
3. **IPD mencionava React Router 7:** navegação Kanban/Horas é estado local; aceitável para MVP (README já registra).
4. **Teclado no DnD:** `@dnd-kit` pode receber `KeyboardSensor` em iteração futura para RF08 “equivalente por teclado” com mais rigor.

---

## 🔵 Sugestões (não bloqueantes)

- Extrair hook `useBoardDocument(boardId)` para reduzir tamanho de `BoardView`.
- Teste de integração leve (msw) para um fluxo `loadCatalog` → `loadBoard` sem browser.
- `pnpm`/`npm` lockfile único na raiz do monorepo, se o repositório crescer.

---

## Critérios task.md

| Task | Status |
|------|--------|
| T11 — Topbar sem busca/notificações/labels | OK (UI + README) |
| T12 — README + matriz + DoD | OK |

---

```json
{ "agent": "code-reviewer", "epic": "personal-kanban-mvp", "verdict": "approved_with_notes", "score": 84 }
```
