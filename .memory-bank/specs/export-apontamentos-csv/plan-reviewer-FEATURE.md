# Plan Review Report — Exportar apontamentos para CSV

> **Data:** 2026-04-26 | **Revisor:** plan-reviewer | **IPD Versão:** 1.0.0  
> **Artefato auditado:** `.memory-bank/specs/export-apontamentos-csv/planner-FEATURE.md`  
> **TSD de referência:** `spec-feature.md` | **Revisão TSD:** `spec-reviewer-feature.md` (GO com ressalvas)

## Veredicto: APROVADO (GO)

- O IPD está **alinhado ao TSD** nos contratos centrais (CSV §7, atomicidade, multi-board, R09 vía `segmentsCompletedInPeriod` + `aggregateTaskHoursForPeriod`) e **factualmente consistente** com o código inspecionado em `HoursView` e `hoursAggregation`.  
- **Não há achados críticos** que impeçam execução. Há **avisos e sugestões** de consistência documental (identificador DoD órfão, citação de linhas) e ressalvas herdadas do revisor de spec (R09 no rótulo do CA, RF×CA no TSD).  
- **Camada 3** executada por leitura de ficheiros e comparação com `HoursView.tsx`, `hoursProjection.ts`, `hoursAggregation.ts`, `types.ts`, inexistência de `taskHoursCsv*`.

| Dimensão | Notas |
|----------|--------|
| IPD × TSD | Contrato de colunas, encoding, RNB de agregação/ordem, RF-06/07, E1 (CA-E1) coerentes. |
| IPD × repo | Diagnóstico do `load()` que ignora `loadBoard === null` confirma-se; módulos e tipos citados existem. |
| IPD × `state.yaml` | `baseline_ref` e objetivo alinhados; `squad.confidence` (82) ainda difere do TSD (89) — ressalva de pipeline, não falha de plano. |

## Sumário

| Categoria | Qtd |
|-----------|-----|
| Críticos | 0 |
| Avisos | 2 |
| Sugestões | 3 |
| Auto-correções | 0 (nenhuma escrita no IPD; recomendações abaixo) |
| **Score de qualidade** | **90 / 100** |

**Score (base 100):** −5 (referência cruzada DoD **D12** sem linha na tabela 3.1) −5 (redundância/ambiguidade com **D7**). Sem penalidade por divergência TSD×state (fora do escopo de correção do IPD nesta revisão).

---

## Problemas encontrados

### Avisos

**[A1] Secção 3.1 / 3.2 / 3.4 — identificador `D12` referenciado mas ausente da tabela DoD (3.1)**

- **Evidência:** o texto cita `D12` em D4, matriz RF×CA (RF-04, RF-07) e em «E8 = **CA-08** / **D12**», mas a tabela 3.1 só contém **D1–D9** e a extensão **CA-E1**; não existe linha **D12**.
- **Impacto:** rastreio DoD e handoff para testes/verifier podem procurar um critério inexistente; o **conteúdo** pretendido (carga atómica / falha se `loadBoard` falha ou `null` num board selecionado) já está coberto por **D7** e guardrails.
- **Correção recomendada:** substituir referências a `D12` por **D7** (e/ou **D4**), **ou** introduzir explicitamente a linha **D12** na tabela com o mesmo enunciado de D7 para não duplicar sem querer.

**[A2] Secção 2.5 — citação de `hoursProjection.ts` (bloco `segmentsCompletedInPeriod`)**

- **Evidência:** o IPD indica trecho `32:38`; no ficheiro atual o comentário **R09** e o JSDoc ocupam as linhas **31–33** e a função **export** está nas linhas **34–38** (conteúdo lógico idêntico ao citado).
- **Impacto:** baixo — apenas desvio de numeração em futuras diffs; o contrato (filtro `endMs ∈ [startMs, endMs]` inclusive) está correto.
- **Ação:** ajustar o intervalo de linhas no IPD numa revisão **v1.0.1** (ex. `31:38` ou `34:38` conforme o que se quiser incluir: só corpo da função vs. comentário R09).

### Sugestões

**[S1]** Manter a **matriz RF×CA** (§3.2) como fechamento do revisor de spec; opcionalmente referenciar no relatório de implementação que **CA-03** do TSD corresponde a **RNB-02** + `segmentsCompletedInPeriod` (como o IPD já explica com **R09** no código).

**[S2]** Alinhar `state.yaml` `squad.confidence` com o TSD após a implementação (ressalva **A6** do `spec-reviewer-feature.md`) — tarefa de governança, não de código.

**[S3]** O IPD antecipa comportamento **mais estrito** para o modo «todos os quadros» (§7, última linha da tabela de riscos); documentar no delivery/PR que é **mudança intencional** de UX face ao silêncio atual sobre `loadBoard === null`, para evitar surpresa em QA.

---

## Pré-análise (FASE 1) — extraído do IPD

| Campo | Valor |
|--------|--------|
| Artefato | `planner-FEATURE.md` |
| Track / subtask | FEATURE / nulo |
| Versão IPD | 1.0.0 |
| Confiança declarada | 92 |
| Complexidade | M |
| Ficheiros no mapa (criar) | `taskHoursCsv.ts`, `taskHoursCsv.test.ts` |
| Ficheiros no mapa (modificar) | `HoursView.tsx`, `HoursView.css`, `releases.json` |
| Edge cases (TSD §9) | E2–E7 + E8; IPD mapeia E8 para CA-08 |
| Testes (secção 6) | Vitest prioridade; E2E opcional |
| Assunção não bloqueante (§7) | A — recarga na export (default segundo passe) |
| Secção 10 — bloqueios | 0; confiança ≥ 70 |

**Red flags na leitura:** referência **D12** sem entrada na tabela (resolvida em [A1]).

---

## Checklist de aprovação (C1.1 – C3.7)

| ID | Check | Status | Evidência breve |
|----|--------|--------|-----------------|
| C1.1 | 10 secções (1–10) | PASSOU | Missão … Metadados |
| C1.2 | Cabeçalho (slug, track, versão, TSD, baseline) | PASSOU | Tabela inicial |
| C1.3 | Placeholders | PASSOU | Sem `TODO`/`TBD` críticos |
| C1.4–1.6 | Missão, estado, DoD | PASSOU | Objetivo, módulos, tabela D1… |
| C1.7 | Especificação e mapa | PASSOU | §4.1–4.3 preenchidos |
| C1.8 | Guardrails | PASSOU | ≥1 específico (PAT, parcial, R09, arquivados) |
| C1.9 | Testes | PASSOU | §6 happy + negativo |
| C1.10 | Assunções (§7) | PASSOU | A com default explícito |
| C1.11 | Metadados ≥70, bloqueios 0 | PASSOU | confiança 92; decisões 0 |
| C2.1 | DoD × testes / edge | PASSOU c/ ressalva TSD A2/A3 já mitigada no IPD (D1, D2, CA-E1) |
| C2.2 | Mapa × fluxo | PASSOU | CRIAR/MODIFICAR batem com §4.2 |
| C2.3–2.5 | Erro, deps, complexidade | PASSOU | sem libs novas; M coerente |
| C2.6 | NÃO TOCAR | PASSOU | GitHub/ADRs explícitos |
| C2.7 | env vars | N/A | nenhuma nova |
| C2.8 | migrations | N/A | `migrations_needed: false` |
| C2.9 | §7 × §10 | PASSOU | 1 assunção; 0 bloqueios |
| C3.1 | Ficheiros MODIFICAR existem | PASSOU | `ls` lógico — paths presentes no repo |
| C3.2 | Stack | PASSOU | `React`/Vite/TS alinhados ao app |
| C3.3 | Contratos citados | PASSOU | `aggregateTaskHoursForPeriod`, `TaskHoursRow`, `PeriodRange` coincidem com código |
| C3.4 | Módulo referência | PASSOU | `hoursAggregation.ts` + testes |
| C3.5 | Libs novas | PASSOU | IPD: nenhuma |
| C3.6 | Padrão erro / atomicidade | PASSOU | Plano exige falha explícita; código atual ainda **não** cumpre — objetivo da feature |
| C3.7 | Ficheiros CRIAR | PASSOU | `taskHoursCsv*` inexistente (sem conflito) |

---

## Auto-correções aplicadas

Nenhuma. As correções seguras (typos, numeração de linhas no IPD, unificação D12↔D7) ficam como **recomendações** para o autor do IPD v1.0.1+; este revisor **não** alterou `planner-FEATURE.md` (âmbito: apenas ficheiros `plan-reviewer*` nesta pasta, conforme pedido).

---

## IPD corrigido

* Não reproduzido — nenhuma auto-correção no artefato fonte.

---

## Metadados (JSON)

```json
{
  "agent": "plan-reviewer",
  "status": "approved",
  "slug": "export-apontamentos-csv",
  "track": "FEATURE",
  "subtask_id": null,
  "score": 90,
  "criticals": 0,
  "warnings": 2,
  "suggestions": 3,
  "auto_corrections": 0,
  "layer3_executed": true,
  "reviewed_artifact": ".memory-bank/specs/export-apontamentos-csv/planner-FEATURE.md",
  "review_report": ".memory-bank/specs/export-apontamentos-csv/plan-reviewer-FEATURE.md"
}
```
