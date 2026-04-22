# Test Report — archived-cards-page (tester)

> **Data:** 2026-04-22 | **Agente:** tester (CodeSteer) | **Stack:** Vitest 4.1.4 (happy-dom) + Playwright E2E  
> **TSD:** `spec-feature.md` v1.1 (CA-AC* §7) | **Tarefas:** `task-breakdown-feature.md` T5–T6

---

## Alvo e origem

- **Feature:** Página dedicada `/archived`, remoção da secção inline de arquivados no canvas, shell com `nav-archived`, paridade de domínio com card-archive.
- **Origem:** Entrega pós-implementação; cruzamento com verificador e spec §7.1–7.3.

---

## Stack de testes detectada

| Campo | Valor |
|--------|--------|
| Test runner (unit) | Vitest 4.1.4 |
| Estilo | `describe` / `it`, Testing Library onde aplicável |
| Ambiente | happy-dom |
| E2E | Playwright (`@playwright/test`); wrapper `npm run test:e2e` → `scripts/ensure-e2e-auth.mjs` |
| Diretório unit | `apps/flowboard/src/**/*.test.ts(x)` (25 ficheiros) |
| E2E | `apps/flowboard/tests/e2e/card-archive.spec.ts` |

---

## Vitest — o que os 273 testes cobrem *em relação a esta feature*

A suíte completa do pacote `flowboard` regista **273 testes** em **25 ficheiros** (execução local: todos passam). Nenhum ficheiro Vitest importa `ArchivedCardsPage`, `AppShell` ou `BoardView` por nome — a **UI nova e o roteamento** não têm testes de componente dedicados.

### Coberto (domínio e componentes colaterais; alinhado a TSD / card-archive)

| Área | Ficheiros / temas | Ligação a CA-AC* e RF |
|------|--------------------|------------------------|
| **Filtro e ordenação de arquivados** | `domain/cardArchive.test.ts` — `isCardArchived`, `sortArchivedByDefault`, `activeCardsForLayout`, `mergeLayoutCardsWithArchived` | **CA-AC03** (lista só arquivados + ordem padrão) a nível de funções puras; paridade de dados com **RF03**. |
| **Layout Kanban sem arquivados nas colunas** | `domain/boardLayout.test.ts` — cards com `archived: true` omitidos de colunas | Coerente com **RF01** / **R-UX01** no modelo de layout, não com prova de ausência de DOM no `BoardView`. |
| **Busca e badge** | `domain/cardSearch.test.ts` (metadata arquivado); `features/app/SearchModal.test.tsx` (badge “Arquivado” em resultados) | **CA-AC05**, **RF07** (modal + badge; não exige link para `/archived`). |
| **Tempo / segmentos** | `domain/timeEngine.test.ts` — estado com card arquivado | Suporte a invariantes de **CA-AC04** no motor; **não** substitui prova de fluxo `saveDocument` + GitHub. |

### Lacunas explícitas para *esta* feature (Vitest)

| Lacuna | Critério / RF afecto | Nota |
|--------|----------------------|------|
| Sem testes de `ArchivedCardsPage` | **CA-AC04** (restaurar/excluir + saving/disabled), **CA-AC06** (empty sem quadro), **CA-AC07** (erro de carga), **CA-AC08** (troca de quadro com rota aberta) | Comportamento de página só coberto por revisão manual / E2E parcial. |
| Sem testes de `AppShell` (pathname, `main`, `nav-archived`) | **CA-AC02**, **RF05**, **INV-NAV01** | Navegação e condicionais de `selectedBoardId` sem teste isolado. |
| Sem teste de regressão “zero secção de arquivados no canvas” | **CA-AC01** | O domínio exclui arquivados do layout; a **secção `fb-archived` removida** não tem assert Vitest. |
| **RF08** / **CA-AC11** (horas inalteradas só por visitar arquivados) | Não exercitado em Vitest | E2E também não foca o módulo de horas. |

**Alinhamento à spec §7.3 [CA-AC10]:** a spec aceita matriz de tempo concentrada no domínio e **UI/E2E conforme risco** — o estado actual cumpre a parte de domínio; UI nova depende mais de E2E e de gap consciente.

---

## E2E — `card-archive.spec.ts` (cenário e dependências)

### Comportamento actual

- **`test.describe.serial('card-archive E2E')`** — um teste de fluxo: criar card → arquivar (confirm) → desaparece do board → **`getByTestId('nav-archived').click()`** → **`toHaveURL(/\/archived$/)`** → linha `archived-row-${cardId}` com título → busca global → `search-result-*` + `search-result-archived-*` → abrir modal → `ctm-unarchive-btn` → card de volta no quadro.
- **Selectores chave:** `nav-archived`, `archived-row-${cardId}`, `search-result-${cardId}`, `search-result-archived-${cardId}`, `ctm-*`.

### Dependência de autenticação e GitHub

- O script `apps/flowboard/scripts/ensure-e2e-auth.mjs` exige `tests/e2e/.auth/user.json` (senão dispara o projeto Playwright `setup` com **login GitHub** e grava a sessão).
- O fluxo **cria e persiste** tarefa via UI (repositório real / PAT conforme config do ambiente) — o teste é **integração de ponta a ponta** com backend GitHub, não mock.

### Cenários TSD / task-breakdown ainda *não* cobertos pelo E2E presente

| Tema | CA / task T5 | Observação |
|------|----------------|------------|
| Empty state sem quadro em `/archived` | **CA-AC06** | Não há teste que limpe selecção de quadro e asserta empty state. |
| Falha de carregamento / retry | **CA-AC07** | Não simulado. |
| Trocar quadro com `/archived` aberto; lista do novo quadro | **CA-AC08** | Não coberto. |
| Regressão explícita: **ausência** de `archived-section-toggle` / secção no canvas | T5 / regressão toggle | O happy path não asserta a não-presença do toggle removido (recomendado como smoke barato). |
| Excluir arquivado na página dedicada; conflito **409** | **CA-AC04** (extremos) | Só “restaurar” via modal no fluxo actual; paridade de exclusão na página fica fora do E2E. |
| [CA-AC09] “encontrar via navegação” + busca | Parcial | Navegação para lista + busca sim; não há passo explícito só de **CA-AC11** (horas). |

---

## Riscos residuais e testes de follow-up sugeridos

1. **UI sem rede de segurança Vitest** — Regressão em `ArchivedCardsPage` / `AppShell` (empty, erro, `disabled` durante `saving`, troca de board) pode passar o CI de domínio e falhar em produção. *Follow-up:* RTL em `ArchivedCardsPage` com repositório/documento injetáveis, ou E2E enxuto por cenário.
2. **E2E frágil e caro** — Depende de GitHub, sessão, e timeouts longos (ex.: 180s no happy path). *Follow-up:* manter títulos únicos e práticas da suíte; opcional `test.slow` onde já existir padrão.
3. **Matriz de bordas CA-AC06–AC08** — Valor de risco médio; *follow-up:* pelo menos um teste E2E de empty sem `selectedBoard` (se viável com storage) e um de troca de quadro na rota.
4. **Paridade de exclusão na página** — Domínio e BoardView compartilham padrões; *follow-up:* E2E de “excluir na lista de arquivados” com mock de `window.confirm` (já usado padrão em arquivar) se o pipeline suportar.
5. **409 e reload** — Coberto por padrão de código partilhado; *follow-up:* teste de integração ou E2E com simulação só se a stack permitir.

### Estabilização E2E (pós-relatorio)

O happy path passou a aguardar `Salvando…` com contagem zero (até 60s) **antes** de navegar para `/archived`: o Kanban retira o card da coluna antes de `saveDocument` concluir no GitHub; sem esse passo, `loadBoard` na página de arquivados podia ler o JSON antigo e a lista vinha vazia.

---

## Status (teste)

| Campo | Valor |
|-------|--------|
| Vitest | 273/273 (25 ficheiros) — **domínio e SearchModal** fortes para arquivado; **sem** testes de componente da nova rota/shell/canvas. |
| E2E | 1 cenário serial feliz com **nav-archived** + **/archived** + busca + modal + restaurar; **auth GitHub** + **persistência real**. |
| Lacunas principais | Componentes de UI da feature, bordas CA-AC06–AC08, regressão explícita do toggle removido, exclusão/409 na página. |

**Resumo (uma linha):** Vitest 273 prova o **domínio** e **SearchModal** para arquivados; a **página /archived e a shell** dependem de **um E2E** com **GitHub + auth**, deixando **lacunas** em empty/erro/troca de quadro, exclusão na página e ausência de toggle no canvas.
