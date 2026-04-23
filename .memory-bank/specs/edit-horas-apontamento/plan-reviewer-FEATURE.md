# Plan Review Report — Editar horas de apontamento (Horas no período)

> Data: 2026-04-22 | Revisor: plan-reviewer | IPD Versão: 1.0  
> Artefato auditado: `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md`

## Veredicto: VERDE (APROVADO)

**Go para task-breakdown:** sim. Não há itens críticos bloqueadores; o IPD está alinhado ao TSD, ARD vinculante e Constitution, com rastreabilidade ao código verificada por spot-check. Resolver os avisos na decomposição de tarefas (checkbox DoD / plano de teste E2) reduz risco de esquecimento na implementação.

- **Score de qualidade:** **90 / 100** (base 100 − 2 × aviso −5)

---

## Sumário

| Categoria | Qtd |
|-----------|-----|
| Críticos | 0 |
| Avisos | 2 |
| Sugestões | 2 |
| Auto-correções aplicadas ao IPD | 0 |
| Score de qualidade | 90/100 |

---

## Pré-análise (Fase 1)

| Campo | Valor extraído |
|--------|----------------|
| Caminho do artefato | `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md` |
| Track / subtask | FEATURE / null |
| Nome / versão IPD | Editar horas de apontamento — v1.0 |
| Confiança declarada | 82/100 |
| Complexidade | M |
| Arquivos no mapa §4.3 | 2 CRIAR + 2 MODIFICAR + 4 NÃO TOCAR |
| Stack declarada | TypeScript, React 19, Vite 8, Vitest 4 |
| Edge cases no DoD §3 | E1–E5 + INFEASIBLE_TARGET + 409 (8 itens) |
| Testes declarados §6 | Domínio (7 bullets) + E2E ponteiros |
| Assunções §7.2 | 2 (A1–A2) com default explícito |
| Bloqueios / decisões pendentes §10 | 0 |

**Red flags na leitura inicial:** nenhum crítico; ambiguidade leve em §4.1.2 item 8 sobre o significado exato de `nextSegments` (ver avisos).

---

## Problemas encontrados

### Críticos

*Nenhum.*

### Avisos

**[A1] Seção 3 (DoD) × TSD RF-04 — rastreabilidade**

- **Evidência:** O TSD (`spec-feature.md` §RF-04) exige comportamento explícito com filtro **Todos os quadros** vs **Quadro atual** (`boardId` alvo). O DoD do IPD cobre RF-01–RF-03, RNB-02, etc., mas **não há checkbox explícito** para RF-04.
- **Risco:** Na task-breakdown, a validação de escopo por linha pode ficar sub-especificada.
- **Ação recomendada:** Incluir no DoD (ou na primeira tarefa de UI) um critério verificável para RF-04 antes do merge.

**[A2] Seção 3 (DoD E2) × Seção 6 (Testes) — cobertura**

- **Evidência:** DoD exige E2 (fechar modal ao mudar `periodKind`, `anchor` ou `scope`). §6 descreve testes de domínio e E2E genérico, **sem** estratégia explícita para E2 (ex.: teste de componente com RTL, ou E2E que muda período com modal aberta).
- **Risco:** regressão silenciosa em estado de modal.
- **Ação recomendada:** O task-breakdown deve alocar pelo menos um teste automatizado explícito para E2 ou justificar deferimento documentado.

### Sugestões

**[S1] Seção 4.1.1 — redação da política horas → ms**

- Benefício: a frase “meia-unidade … no 0,5 ms” é facilmente lida como erro conceitual; o comportamento real é **arredondamento para inteiro de ms** de `hoursDecimal * 3_600_000`. Ajustar redação evita implementação hesitante.

**[S2] Seção 4.1.2 item 8 — semântica de `nextSegments`**

- Benefício: deixar explícito no IPD (numa v1.1) se `nextSegments` é a lista **completa de segmentos do card após mutação** ou **apenas linhas alteradas/removidas** para merge no `doc.timeSegments`, alinhando com o comentário “a feature monta o array final”.

---

## Checklist de aprovação (Camadas 1–3)

Legenda: PASSOU / FALHOU / N/A

### Camada 1 — Estrutural

| ID | Check | Status | Evidência breve |
|----|--------|--------|------------------|
| C1.1 | 10 seções obrigatórias | PASSOU | §1–§10 presentes e numeradas |
| C1.2 | Cabeçalho (confiança, complexidade, data, versão, track, slug) | PASSOU | Linhas 3–6 do IPD |
| C1.3 | Sem placeholders vazios | PASSOU | Sem `TODO`/`TBD`/`???` |
| C1.4 | §1 Missão com objetivo e contexto | PASSOU | Alinhado a `state.yaml` + Constitution |
| C1.5 | §2 Estado do sistema, zona, contratos | PASSOU | Árvore + contratos `saveBoard`, R09, JSON |
| C1.6 | §3 DoD mensurável + edge cases | PASSOU | Checklist com E1–E5, códigos de domínio, 409 |
| C1.7 | §4 Contrato, fluxo, mapa | PASSOU | §4.1–4.3 completos |
| C1.8 | §5 Guardrails com ≥1 do projeto | PASSOU | Constitution I/II, GA-02, R09, pt-BR |
| C1.9 | §6 Testes happy + negativos | PASSOU | Vitest + E2E ponteiros |
| C1.10 | §7 Assunções com default | PASSOU | Tabela A1–A2 |
| C1.11 | §10 Confiança ≥ 70, bloqueios 0 | PASSOU | 82/100; “Decisões bloqueantes em aberto \| 0” |

### Camada 2 — Consistência interna

| ID | Check | Status | Evidência breve |
|----|--------|--------|------------------|
| C2.1 | DoD × testes (edge cases) | PASSOU* | *E2 sem plano de teste dedicado → ver [A2] |
| C2.2 | Mapa × fluxo (sem órfãos) | PASSOU | Fluxo §4.2 referencia domínio novo + `HoursView` |
| C2.3 | Padrão de erro × mensagens | PASSOU | Tabela §4.1.2 ↔ códigos domínio + 409 |
| C2.4 | Dependências × fluxo | PASSOU | `novas_libs: []`; uso coerente |
| C2.5 | Complexidade × mapa | PASSOU | M com 4 arquivos + domínio não trivial |
| C2.6 | NÃO TOCAR × contratos | PASSOU | Agregação/projeção/timeBridge/repo estáveis |
| C2.7 | Novas env vars | N/A | Lista vazia |
| C2.8 | `migrations_necessarias: false` × mapa | PASSOU | Sem migration no mapa |
| C2.9 | §7 × §10 coerentes | PASSOU | 2 assunções; 0 bloqueios |

### Camada 3 — Acurácia vs repositório (spot-check)

| ID | Check | Status | Evidência |
|----|--------|--------|-----------|
| C3.1 | Arquivos MODIFICAR / NÃO TOCAR existem | PASSOU | `HoursView.tsx`, `HoursView.css`, `hoursAggregation.ts`, `hoursProjection.ts`, `timeBridge.ts`, `boardRepository.ts` presentes sob `apps/flowboard/src/...` |
| C3.2 | Stack vs `package.json` | PASSOU | `react` ^19.2.4, `vite` ^8.0.4, `vitest` ^4.1.4 |
| C3.3 | `saveBoard` / `loadBoard` | PASSOU | `boardRepository.ts`: `saveBoard(boardId, doc, previousSha)`, `loadBoard` → `{ doc, sha } \| null` |
| C3.4 | Módulos de referência | PASSOU | `CreateTaskModal.tsx` (`role="dialog"`, `aria-modal="true"` ~L443); `hoursAggregation.test.ts` existe |
| C3.5 | Libs declaradas | PASSOU | React/Vitest listados no manifest |
| C3.6 | `GitHubHttpError` + 409 | PASSOU | `client.ts`: `GitHubHttpError`, `status === 409` |
| C3.7 | Arquivos CRIAR ainda inexistentes | PASSOU | `applyTargetHoursForCardInPeriod.ts` e `.test.ts` **não** existem (glob/repo); sem conflito de nome |
| C3.8 | R09 / `segmentsCompletedInPeriod` | PASSOU | `hoursProjection.ts` L34–38: `endMs >= period.startMs && endMs <= period.endMs` — coerente com IPD |
| C3.9 | `data-testid` navegação Horas | PASSOU | `HoursView.tsx` L155 `data-testid="hours-view"`; `AppShell.tsx` `data-testid="nav-hours"` |
| C3.10 | `Card.archived` | PASSOU | `domain/types.ts` `archived?: boolean` |

---

## Auto-correções aplicadas

Nenhuma. (Escopo de escrita restrito ao relatório; o IPD não foi editado.)

---

## IPD corrigido

N/A.

---

## Alinhamento normativo (TSD + ARD + Constitution)

| Fonte | Cobertura no IPD |
|--------|------------------|
| **TSD** | RF modal, RNB-02 sincronia, validação, 409, testes — coberto; lacuna RF-04 no DoD ([A1]) |
| **ARD M1** | Proporcional, tetos, `NO_SEGMENTS` / `INFEASIBLE_TARGET`, reconstrução `completed`, não usar só `appendNewSegments` — espelhado em §4.1.2 e DoD |
| **Constitution I–II, VI** | Domínio puro, GitHub-only, testes + lint — explícito em DoD e guardrails |

---

## Metadata JSON

```json
{
  "agent": "plan-reviewer",
  "status": "approved",
  "slug": "edit-horas-apontamento",
  "track": "FEATURE",
  "subtask_id": null,
  "score": 90,
  "criticals": 0,
  "warnings": 2,
  "suggestions": 2,
  "auto_corrections": 0,
  "layer3_executed": true,
  "reviewed_artifact": ".memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md",
  "review_report": ".memory-bank/specs/edit-horas-apontamento/plan-reviewer-FEATURE.md"
}
```
