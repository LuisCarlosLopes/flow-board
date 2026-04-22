# Verification Report — archived-cards-page

> **Agente:** verifier (CodeSteer) | **Data:** 2026-04-22  
> **Cruzamento:** `planner-feature.md` v1.0 (IPD) + `implementer-feature.md` (Delivery) × código + `spec-feature.md` v1.1 (RFs)  
> **State:** `state.yaml` (track em verificação)

---

## Veredicto

**APROVADO**

Implementação alinhada ao IPD, ao TSD v1.1 e ao mapa de entrega: rota `/archived`, `ArchivedCardsPage` com filtro/ordem de domínio, paridade de persistência, remoção da listagem inline no `BoardView`, navegação `nav-archived`, E2E e pipeline local (Vitest 273, build) verdes. Nenhum bloqueador; sem necessidade de `verifier-blocker.md`.

---

## Resumo de evidência (tabela)

| # | Requisito / check | Resultado | Evidência |
|---|-------------------|-----------|-----------|
| 1 | **RF01** — `BoardView` sem secção inline de arquivados (nada tipo `fb-archived` no canvas) | PASSOU | `BoardView.tsx`: zero ocorrências de `fb-archived`, `archived-section-toggle`, `archivedExpanded`, `archivedList`. `BoardView.css`: sem regras `archived*`. |
| 2 | **RF02** — Rota bookmarkável `/archived` | PASSOU | `AppShell.tsx`: `onArchivedRoute = location.pathname === '/archived'`; `<main>` renderiza `ArchivedCardsPage`. |
| 3 | **RF03** — Lista só arquivados do quadro ativo; ordenação padrão | PASSOU | `ArchivedCardsPage.tsx`: `archivedList = sortArchivedByDefault(doc.cards.filter(isCardArchived))`. |
| 4 | **RF04** — Paridade restaurar / excluir | PASSOU | `handleUnarchiveCard` (flags + `reconcileBoardTimeState` + `appendNewSegments` + `saveDocument`); `handleDeleteCard` (confirm, anexos `deleteRepoPathIfExists`, remoção card + time state, `saveDocument`); 409 e reload em `saveDocument` alinhados ao padrão do board. |
| 5 | **RF05** — Navegação explícita + empty sem quadro | PASSOU | `nav-archived` com `selectedBoardId`; `!boardId` → `archived-page` com mensagem para selecionar quadro. |
| 6 | **RF06** — Microcopy arquivar | PASSOU | `BoardView.tsx` `handleArchiveCard` confirma referência a “página Arquivados”. |
| 7 | **RF07** — Busca / modal; sem deep-link obrigatório busca → página de arquivados | PASSOU | `SearchModal.tsx` inalterado no contrato; `AppShell` em `onSelectResult`: se `onArchivedRoute`, `navigate('/')` + `setMainView('kanban')` e depois `setCardToEditId` — abre modal no Kanban (comportamento exigido; não força visita à rota de arquivados a partir do hit). |
| 8 | **Sem drift de JSON / schema** (TSD §6, FE01) | PASSOU | Nenhuma alteração em `persistence/types` ou contrato de card no escopo; uso de `BoardDocumentJson` / `Card` existentes. |
| 9 | **IPD × ficheiros** | PASSOU | Criados `ArchivedCardsPage.tsx` + `.css`; modificados `AppShell`, `BoardView`, E2E; `App.tsx` não exigido alteração (cobre `*`). |
| 10 | **E2E** — `nav-archived`, URL `/archived`, lista, busca, modal, restaurar | PASSOU | `card-archive.spec.ts`: espera `Salvando…` sumir após arquivar (evita corrida UI vs GitHub), `nav-archived`, `toHaveURL(/\/archived$/)`, `archived-row-${cardId}` (timeout 45s), busca e `ctm-*`. |
| 11 | **DoD acessibilidade (lista)** | PASSOU | `section` com `aria-label="Tarefas arquivadas"`; botões com `disabled={saving}`. |
| 12 | **Guardrail** — não `navigate` forçada da busca para `/archived` | PASSOU | Lógica só em `AppShell` (sai de `/archived` para abrir modal no board, não o inverso). |

---

## Validações automatizadas (Camada 2)

| Comando (cwd `apps/flowboard`) | Resultado |
|--------------------------------|-----------|
| `npm run test -- --run` (Vitest) | **273** testes passaram (25 ficheiros). |
| `npm run build` | **OK** (`tsc -b` + `vite build`). |
| `npm run lint` | **0 erros**; 3 *warnings* em ficheiros gerados em `coverage/` (diretiva `eslint-disable` não usada) — fora do escopo da feature e sem impacto em código de produção. |

---

## Notas (não bloqueantes)

- **Risco residual (IPD):** lógica de reload e tick 60s duplicada entre `BoardView` e `ArchivedCardsPage` — aceite no IPD; `ArchivedCardsPage` inclui efeito de intervalo e `visibilitychange`, mitigando divergência de tempo em permanência na rota.
- **RF08 / horas:** visitar só `/archived` não invoca `HoursView`; alinhado ao requisito de não alterar agregados de horas sem ação no módulo.

---

## Metadados

| Campo | Valor |
|-------|--------|
| IPD | `planner-feature.md` v1.0 |
| TSD | `spec-feature.md` v1.1 |
| Delivery | `implementer-feature.md` |
| Artefato | `verifier-feature.md` |

**Resumo (uma linha):** Entrega `archived-cards-page` **aprovada** com evidência no código, E2E e suite Vitest 273 + build ok.
