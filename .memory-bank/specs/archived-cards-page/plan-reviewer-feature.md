# Plan Review Report — Página dedicada de cards arquivados
> Data: 2026-04-22 | Revisor: plan-reviewer | IPD Versão: 1.0 (referência TSD v1.1)  
> Artefato auditado: `.memory-bank/specs/archived-cards-page/planner-feature.md`  
> TSD de referência: `.memory-bank/specs/archived-cards-page/spec-feature.md` v1.1

## Veredicto: 🟢 APROVADO (approve)
Zero problemas **críticos**. Score ≥ 75. Camada 3 executada contra o repositório. Pronto para `task-breakdown` → implementer.

**Em inglês (pedido):** **approve** — follow-ups abaixo são documentais / implementação fina, não bloqueiam execução.

## Sumário
| Categoria | Qtd |
|---|---|
| 🔴 Críticos | 0 |
| 🟡 Avisos | 2 |
| 🔵 Sugestões | 2 |
| ✅ Auto-correções | 0 |
| **Score de Qualidade** | **90/100** |

**Cálculo:** base 100 − 5 (A1) − 5 (A2) = **90** (avisos documentais).

---

## FASE 1 — Pré-análise (extração)
| Campo | Valor |
|-------|--------|
| Artefato | `.memory-bank/specs/archived-cards-page/planner-feature.md` |
| Track / subtask | FEATURE / null |
| Nome da task | Página dedicada de cards arquivados (fora do canvas Kanban) |
| Versão do IPD (cabeçalho) | v1.0 |
| TSD referenciado | `spec-feature.md` v1.1 |
| Confiança declarada | 86/100 |
| Complexidade declarada | M |
| Ficheiros no mapa §4.3 | Criar: 1 obrigatório + 2 opcionais; Modificar: 5 linhas (incl. `App.tsx` “default sem mudança”); Não tocar: 4 entradas |
| Stack declarada | React 19, Vite, TS, `react-router-dom` ^6.30, Vitest, Playwright |
| Edge cases no DoD | INV-NAV01, RF07, empty state sem quadro, 409/paridade, a11y |
| Testes §6 | E2E obrigatório (`card-archive.spec.ts`); unit opcional |
| Assunções §7.2 | A1–A3 com defaults explícitos |
| Bloqueios §10 | 0 |
| Red flags imediatos | Nenhum bloqueante; ver Avisos (alinhamento de versão / detalhe de imports) |

---

## Problemas Encontrados

### 🔴 CRÍTICOS
*Nenhum.*

### 🟡 AVISOS

**[A1] Cabeçalho do IPD (v1.0) vs TSD canónico (v1.1)**  
- **Evidência:** IPD linha 1: `# IPD: ... — v1.0` e linha 6: `spec-feature.md` v1.1.  
- **Risco:** Rastreabilidade formal “IPD deriva de TSD x.y” fica ambígua em auditorias ou pipeline.  
- **Ação recomendada:** Na próxima revisão do planner, alinhar versão do IPD ao TSD (ex. v1.1) **ou** acrescentar uma linha explícita “IPD v1.0 validado contra TSD v1.1”.

**[A2] §4.3 — Instrução de imports em `AppShell.tsx`**  
- **Evidência:** “Importar `useLocation`, `useNavigate`” — no código actual `AppShell.tsx` já importa `useNavigate` (L2).  
- **Risco:** Baixo; pode gerar diff desnecessário ou dúvida ao implementer.  
- **Ação recomendada:** Tratar como “adicionar `useLocation`; `useNavigate` já existe”.

### 🔵 SUGESTÕES

**[S1] Classes de `<main>` quando `pathname === '/archived'`**  
- **Benefício:** Hoje `className` de `main` depende de `mainView` (`fb-main--kanban` / `fb-main--hours`). Ao mostrar só a página de arquivados, convém definir explicitamente se mantém `--kanban`, neutro, ou variante própria para evitar layout estranho ou CSS que assuma sempre board/hours.

**[S2] Checklist canónico `references/review-checklist.md`**  
- O agente plan-reviewer referencia esse ficheiro; **não existe** no repo pesquisado. Os checks C1–C3 foram aplicados pelo conteúdo do próprio agente.

---

## Checklist de Aprovação (Camadas 1–3)

### CAMADA 1 — Estrutural
| ID | Check | Status | Evidência breve |
|----|--------|--------|-----------------|
| C1.1 | 10 secções obrigatórias | **PASSOU** | Secções 1–10 presentes no IPD |
| C1.2 | Cabeçalho completo | **PASSOU** | Confiança, complexidade, data, track, slug |
| C1.3 | Sem placeholders não preenchidos | **PASSOU** | Sem `TODO`/`TBD` óbvios no IPD |
| C1.4 | Missão com objetivo e contexto | **PASSOU** | §1 alinhada ao TSD |
| C1.5 | Estado do sistema (zona + contratos) | **PASSOU** | §2.2–2.3 |
| C1.6 | DoD mensurável + edge cases | **PASSOU** | §3 com RF/INV/CA mapeáveis |
| C1.7 | §4 contrato, fluxo, mapa | **PASSOU** | §4.1–4.3 preenchidos |
| C1.8 | Guardrails ≥1 específico do projeto | **PASSOU** | GitHubHttpError 409 / PT (§5) |
| C1.9 | Testes happy + negativos | **PASSOU** | §6.2 |
| C1.10 | Assunções com default explícito | **PASSOU** | A1–A3 §7 |
| C1.11 | Metadados: confiança ≥70, bloqueios 0 | **PASSOU** | §10: 86/100, 0 bloqueios |

### CAMADA 2 — Consistência interna
| ID | Check | Status | Evidência breve |
|----|--------|--------|-----------------|
| C2.1 | DoD × testes | **PASSOU** | E2E cobre happy path, empty, regressão toggle |
| C2.2 | Mapa × fluxo | **PASSOU** | Ficheiros ligados aos passos §4.2; `App.tsx` explicitamente “default sem mudança” |
| C2.3 | Padrão de erro × outputs | **PASSOU** | Paridade `saveDocument`/409 com `BoardView` descrita |
| C2.4 | Dependências × fluxo | **PASSOU** | Sem libs novas; reuso domínio/persistência |
| C2.5 | Complexidade × mapa | **PASSOU** | M coerente com shell + board + E2E + CSS |
| C2.6 | NÃO TOCAR × contratos | **PASSOU** | SearchModal/cardSearch/types/cardArchive rastreáveis |
| C2.7 | Novas env vars | **N/A** | Nenhuma prevista |
| C2.8 | `migrations_necessarias` × mapa | **PASSOU** | `false`; sem ficheiros de migração |
| C2.9 | §7 × metadados | **PASSOU** | Assunções e bloqueios coerentes |

### CAMADA 3 — Acurácia contra o repositório
| ID | Check | Status | Evidência breve |
|----|--------|--------|-----------------|
| C3.1 | Ficheiros MODIFICAR / NÃO TOCAR existem | **PASSOU** | `App.tsx`, `AppShell.tsx`, `BoardView.tsx`, `BoardView.css`, `card-archive.spec.ts`, `cardArchive.ts`, `types.ts`, `SearchModal.tsx`, `cardSearch.ts` verificados |
| C3.2 | Stack × manifesto | **PASSOU** | `apps/flowboard/package.json`: React ^19.2.4, `react-router-dom` ^6.30.3 |
| C3.3 | Contratos × código | **PASSOU** | `BoardView`: `createBoardRepository`, `loadBoard`, `archivedList` = `filter(isCardArchived)` + `sortArchivedByDefault`, `handleUnarchiveCard` / `handleDeleteCard` / `handleArchiveCard` presentes |
| C3.4 | Módulo de referência | **PASSOU** | Secção `fb-archived` em `BoardView.tsx` L605–646; `archived-section-toggle` e `archived-row-*` |
| C3.5 | Libs existentes | **PASSOU** | Sem novas dependências no IPD; manifesto compatível |
| C3.6 | Padrão de erro 409 | **PASSOU** | `GitHubHttpError` usado em `BoardView` (`saveDocument`); IPD alinha |
| C3.7 | CRIAR sem conflito | **PASSOU** | `ArchivedCardsPage.tsx` (e opcionais) **não** existem ainda |

**Referência de código (rotas):** `App.tsx` usa `BrowserRouter`, `Route path="/releases"` e `path="*"` com `AppShell` quando há sessão — compatível com rota bookmarkable `/archived` sem alterar `App.tsx` por defeito, como o IPD indica.

**Referência de código (shell):** `AppShell.tsx` — `mainView`, `selectedBoardId`, `BoardView` condicionado a `kanban && selectedBoardId`, `HoursView`, `SearchModal` com `onSelectResult` → `setCardToEditId`; coincide com §2.1 do IPD.

---

## Auto-correções Aplicadas
*Nenhuma persistida no artefato `planner-feature.md` (escopo de escrita do revisor: apenas este report).*

## IPD Corrigido
*N/A.*

## Resolução de Críticos Anteriores
*N/A — primeira revisão registada neste ficheiro.*

---

## Ficheiros que o implementer pode tocar (lista explícita)

**Criar (mapa + opções):**
- `apps/flowboard/src/features/board/ArchivedCardsPage.tsx`
- `apps/flowboard/src/features/board/useBoardDocumentForBoard.ts` (ou nome equivalente) — *opcional*
- `apps/flowboard/src/features/board/ArchivedCardsPage.css` — *opcional*

**Modificar (mapa):**
- `apps/flowboard/src/features/app/AppShell.tsx`
- `apps/flowboard/src/features/board/BoardView.tsx`
- `apps/flowboard/src/features/board/BoardView.css`
- `apps/flowboard/tests/e2e/card-archive.spec.ts`
- `apps/flowboard/src/App.tsx` — *apenas se* adoptar `Outlet` / rotas aninhadas (alternativa descrita no IPD)

**Não tocar (salvo quebra de build de imports — IPD):**
- `apps/flowboard/src/domain/cardArchive.ts`
- `apps/flowboard/src/infrastructure/persistence/types.ts`
- `apps/flowboard/src/features/app/SearchModal.tsx`
- `apps/flowboard/src/domain/cardSearch.ts`

**Possível extensão de baixa probabilidade:** `BoardListView.tsx` / `BoardListView.css` — só se o link “Arquivados” tiver de integrar-se no interior do componente em vez de irmão em `AppShell` (o IPD não obriga; um `Link` ao lado de `BoardListView` em `fb-board-bar` tende a bastar).

---

## Metadata (pipeline)
```json
{
  "agent": "plan-reviewer",
  "status": "approved",
  "slug": "archived-cards-page",
  "track": "FEATURE",
  "subtask_id": null,
  "score": 90,
  "criticals": 0,
  "warnings": 2,
  "suggestions": 2,
  "auto_corrections": 0,
  "layer3_executed": true,
  "reviewed_artifact": ".memory-bank/specs/archived-cards-page/planner-feature.md",
  "review_report": ".memory-bank/specs/archived-cards-page/plan-reviewer-feature.md"
}
```

---

**Resumo (uma linha):** IPD alinhado ao TSD v1.1 e ao código actual (`path="*"`, shell, secção `fb-archived` e E2E); **aprovar** com dois avisos menores de documentação e lista de ficheiros acima para o implementer.
