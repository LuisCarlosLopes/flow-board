# Relatório de revisão TSD — Exportar apontamentos para CSV

> **Data:** 2026-04-26 | **Revisor:** spec-reviewer | **Documento:** `spec-feature.md` (TSD)  
> **PRD dedicado:** não fornecido como `*.prd.md` — **Camada 3** executada contra `state.yaml` (objetivo + critérios de aceite) e `constitution.md`.

## Veredicto: 🟡 GO COM RESSALVAS

- **GO:** não há falhas **críticas** que impeçam encaminhar ao planner; contrato CSV, RFs principais e critérios de `state.yaml` estão cobertos com boa densidade.
- **Ressalvas:** lacunas de rastreabilidade interna (RF ↔ CA), identificador órfão em CA-03, handoff sem enumeração explícita dos RFs e desalinhamento de **confiança** entre artefatos — devem ser corrigidos **antes** ou **no início** do planejamento para evitar ambiguidade em testes e DoD.

## Sumário

| Categoria | Qtd |
|-----------|-----|
| Críticos | 0 |
| Avisos | 6 |
| Sugestões | 3 |
| Auto-correções aplicadas | 0 (revisor não altera o TSD) |
| **Score de qualidade** | **70 / 100** |

**Score (base 100):** −30 (6 × aviso −5, conforme rubrica do agente); sem penalidades por crítico, placeholder ou perguntas em aberto sem default.

---

## Pré-análise (Fase 1)

| Extrato | Valor |
|---------|--------|
| Nome da feature | Exportar apontamentos para CSV |
| Versão do TSD no cabeçalho | **Não declarada** (apenas data 2026-04-26) |
| Confiança declarada no TSD | **89** |
| Confiança em `state.yaml` (squad) | **78** ⚠️ divergente |
| Complexidade declarada | **M** (secção 15) |
| RFs (secção 5) | **8** (RF-01 … RF-08) |
| Regras de negócio (secção 6) | **7** (RNB-01 … RNB-07) |
| “Endpoints” (contrato API HTTP) | **N/A** — export CSV no cliente; contrato em secção 7 |
| Critérios de aceite (secção 8) | **9** (CA-01 … CA-09) |
| Perguntas em aberto (secção 13) | **0** bloqueantes; texto “Nenhuma…” |
| Handoff (secção 14) | Preenchido, sem placeholders óbvios |

**Red flags imediatos:** referência **“R09”** no título de CA-03 sem definição no próprio TSD; metadados de confiança divergentes entre `spec-feature.md` e `state.yaml`.

---

## Problemas por severidade

### Críticos

*Nenhum.* O contrato de colunas (7.1), serialização (7.3–7.4), atomicidade (RF-07 / CA-08), vazio (RF-06 / CA-07) e alinhamento com persistência GitHub (Constitution II / RNF na secção 12) estão suficientemente especificados para não bloquear o planner.

### Avisos

**[A1] Secção 8 — CA-03: identificador “R09” órfão no TSD**

- **Evidência:** `### CA-03 — Regra R09 preservada` — não existe “R09” no glossário nem nas RNB numeradas (apenas RNB-01…07). O comportamento no corpo do CA é claro, mas o **rótulo** aponta para um id externo ao documento.
- **Risco:** revisores e QA podem exigir rastreio formal; risco de interpretação “CA não verificável” em auditorias literais.
- **Ação:** renomear para **“RNB-02 preservada”** (ou “semântica de inclusão por `endMs`”) e remover “R09”, **ou** definir R09 no glossário com referência explícita ao domínio (sem depender só de `context-cache.yaml`).

**[A2] Secção 5 / 8 — RF-01 e RF-02 sem CA dedicado explícito**

- **Evidência:** RF-01 (ação visível na vista de horas) e RF-02 (período + data de referência refletidos no export) não têm CA com ids próprios; parte do comportamento aparece de forma **difusa** (contrato 7.1 com colunas de período, CAs de semântica temporal).
- **Risco:** DoD e testes podem sub-representar “presença da ação” e “snapshot do período no momento da confirmação”.
- **Ação:** adicionar CA explícitos (ex.: disponibilidade da ação na área de Horas; ficheiro reflete período ativo à confirmação) ou mapear em tabela RF×CA na spec.

**[A3] Secção 6 / 8 / 9 — RNB-04 (ineligibilidade antes da confirmação) vs critérios verificáveis**

- **Evidência:** RNB-04 e linha **E1** da secção 9 descrevem invalidação quando um board deixa de ser elegível; **não há CA** espelhando esse cenário (CA-08 cobre falha de carga, não necessariamente “arquivado entre seleção e confirmação”).
- **Risco:** gap entre regra de negócio e suíte de aceite formal.
- **Ação:** acrescentar CA-10 (ou estender CA-08 com subcasos) para E1, ou declarar que E1 é coberto por teste de integração com id explícito.

**[A4] Secção 14 — Handoff vs checklist C2.7 (RFs enumerados)**

- **Evidência:** o handoff é por temas; **não lista RF-01…RF-08** nem CA-01…CA-09.
- **Risco:** planner pode omitir requisito periférico (ex.: RF-08 textual) sem checklist explícito.
- **Ação:** incluir bullet final “Checklist: RF-01…RF-08 e CA-01…CA-09” ou tabela de rastreio.

**[A5] Cabeçalho do TSD — versão e rastreio de revisão**

- **Evidência:** tabela inicial tem data e confiança, mas **sem versão semver** (ex. 1.0.0) nem nota de revisão; dificulta diff entre iterações.
- **Risco:** governança e histórico de spec.
- **Ação:** adicionar campo `Versão TSD` e, se aplicável, `Changelog` mínimo.

**[A6] `state.yaml` × `spec-feature.md` — confiança numérica divergente**

- **Evidência:** TSD **89** vs `squad.confidence: 78` em `state.yaml`.
- **Risco:** sinal contraditório para pipeline e HITL.
- **Ação:** alinhar após revisão (subir state ou baixar texto da spec com justificativa).

### Sugestões

**[S1] Constitution I (domínio puro)** — Acrescentar uma linha nas RNFs ou no handoff: geração/validação do CSV e reutilização das regras de agregação devem ser **testáveis na camada de domínio**, com UI apenas a orquestrar (sem duplicar regra de período/inclusão).

**[S2] Rastreio `state.yaml` → TSD** — Incluir nota explícita de que os quatro bullets de `acceptance_criteria` mapeiam para RF-02/03, secção 7, RNB-02 e RF-06/07 + RNB-04/07 (facilita Camada 3 em futuras revisões).

**[S3] Performance / limites** — Opcional: limite prático (nº de boards, tamanho do CSV) ou comportamento esperado com catálogo muito grande; hoje ausente e pode ser assumido pelo planner sem base.

---

## Três camadas de verificação

### Camada 1 — Estrutural

| ID | Check | Status | Notas |
|----|--------|--------|--------|
| C1.1 | 12 secções “canónicas” do agente | **ADAPTADO** | O TSD usa 15 secções com outra numeração (glossário, decisões fechadas, etc.). Conteúdo equivalente presente; não é o template literal do `spec-reviewer.agent.md`. |
| C1.2 | Cabeçalho completo | **FALHOU** | Falta **versão** explícita do TSD; confiança e data OK. |
| C1.3 | Placeholders fora de código | **PASSOU** | Exemplo em 7.2 é ilustrativo, não `TODO`. |
| C1.4 | Secção 1: problema, comportamento, ator | **PASSOU** | |
| C1.5 | RFs numerados / linguagem de obrigação | **PASSOU** | |
| C1.6 | Regras V/A/L ou N/A | **ADAPTADO** | Formato é RNB narrativas; válido para feature sem API REST. |
| C1.7 | Contrato completo (request/response) | **N/A** | Contrato = CSV secção 7; sem HTTP. |
| C1.8 | Idempotência escrita (5.3) | **N/A** | Export não persiste estado de domínio; leitura + ficheiro. |
| C1.9 | Migration (6.3) | **N/A** | Sem migração de BD. |
| C1.10 | Happy path + erros + edge | **PASSOU** | Secções 8–9; ressalva A3 (E1). |
| C1.11 | Fora de escopo ≥ 3 itens | **PASSOU** | Secção 10. |
| C1.12 | Perguntas 🔴/🟡 sem default | **PASSOU** | Secção 13 vazia de bloqueios. |
| C1.13 | Handoff sem placeholders | **PASSOU** | Ressalva A4 (enumeração RFs). |
| C1.14 | Fronteira spec/planner (sem ficheiros/libs) | **PASSOU** | Sem caminhos `src/` ou classes. |

### Camada 2 — Consistência interna

| ID | Check | Status | Notas |
|----|--------|--------|--------|
| C2.1 | Cada RF ≥ 1 CA | **FALHOU (parcial)** | RF-01, RF-02 fracos; A2. |
| C2.2 | Regras × CA erro/validação | **FALHOU (parcial)** | RNB-04 / E1 sem CA dedicado; A3. |
| C2.3 | Contrato × regras (falhas) | **PASSOU** | CA-08 / RNB-07 alinhados. |
| C2.4 | Migration × modelo | **N/A** | |
| C2.5 | Edge DoD × 7.3 / 9 | **PASSOU** | Maioria espelhada; E1 ver A3. |
| C2.6 | “Endpoints” × contexto | **N/A** | |
| C2.7 | Handoff × RFs | **FALHOU** | Handoff temático; A4. |
| C2.8 | Perguntas × handoff | **PASSOU** | Sem bloqueios declarados. |

### Camada 3 — Rastreabilidade (`state.yaml` + `constitution.md`)

| ID | Check | Status | Notas |
|----|--------|--------|--------|
| C3.1 | Objetivo / critérios → RFs | **PASSOU** | Período + multi-board + `;` + semântica + erros/vazio cobertos. |
| C3.2 | Comportamentos obrigatórios do state → RFs/CAs | **PASSOU** | Inclui “boards arquivados tratados” via RNB-04/05, fora de escopo de fonte, E1. |
| C3.3 | Fora de escopo do state → secção 10 | **PASSOU** | OAuth / backend / modelo alinhados. |
| C3.4 | Métricas / performance | **N/A** | State não impõe métricas numéricas; S3 opcional. |
| C3.5 | Scope creep vs state | **PASSOU** | Sem RF claramente alienígena ao objetivo. |

**Constitution**

| Princípio | Avaliação |
|-----------|-----------|
| I Domínio puro | **Ressalva** — implícito; S1 recomenda explicitar. |
| II GitHub only | **PASSOU** — contexto + RNF secção 12. |
| III–V | **N/A / PASSOU** — sem mudança de PAT/OAuth no escopo. |
| VI Evidência / testes | **PASSOU** — CAs verificáveis; ressalvas A2/A3. |
| VII Economia | **PASSOU** — TSD relativamente enxuto. |
| VIII CodeSteer Tags | **Para implementação** — não exige alteração do TSD agora. |

---

## Auto-correções

Nenhuma aplicada neste artefato (revisão adversarial apenas; alterações ao TSD ficam a cargo do autor).

---

## Próximo passo

1. Resolver **A1–A6** (idealmente antes do planner) ou aceitar risco explícito no `plan-reviewer`.  
2. Com isso, o score tende a subir para a faixa **≥ 85** e o veredicto pode tornar-se **GO** sem ressalvas materialmente relevantes.  
3. Acionar **planner** com secção 14 ampliada com checklist RF×CA.

---

## Metadados (JSON)

```json
{
  "agent": "spec-reviewer",
  "status": "approved_with_caveats",
  "score": 70,
  "criticals": 0,
  "warnings": 6,
  "suggestions": 3,
  "auto_corrections": 0,
  "review_report": ".memory-bank/specs/export-apontamentos-csv/spec-reviewer-feature.md",
  "verdict_go": true,
  "blocker_file_required": false
}
```
