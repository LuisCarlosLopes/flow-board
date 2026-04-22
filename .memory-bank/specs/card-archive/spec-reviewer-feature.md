# TSD Review Report — Arquivar card — área de arquivados e busca

> Data: 2026-04-22 | Revisor: spec-reviewer | TSD Versão: v1.0  
> PRD de origem: não disponível (pasta `.memory-bank/specs/card-archive/` sem `*.prd.md`)

## Veredicto: revisão obrigatória

**Status:** revisão obrigatória — há **1** achado **crítico** (checklist canônico C1.14) que bloqueia aprovação plena antes do planner, apesar da **alta acurácia** do §2 frente ao repositório.

## Sumário

| Categoria | Qtd |
|-----------|-----|
| Críticos | 1 |
| Avisos | 3 |
| Sugestões | 2 |
| Auto-correções | 0 |
| Score de qualidade | 85/100 |

**Cálculo:** base 100 − 15 (1 crítico). Avisos documentados abaixo; não duplicados na penalidade numérica (orientação de correção).

## Pré-análise (Fase 1)

| Campo | Valor |
|--------|--------|
| Nome / versão TSD | Arquivar card — área de arquivados e busca / v1.0 |
| Confiança declarada | 88/100 |
| Complexidade | M |
| RFs (§3) | 9 (RF01–RF09) |
| Regras (§4) | V01–V03, subseções A, L, R-UX, R-SEARCH, §4.2 |
| “Endpoints” REST (§5.3) | 0 (N/A declarado) |
| CAs (§7) | 11 (CA01–CA11) — 7.1: 5, 7.2: 2, 7.3: 4 |
| §10: 🔴 / 🟡 sem default | 0 / 0 |
| Handoff (§11) | Preenchido; bloqueios: 0 |
| RFs no handoff | RF01–RF09 listados de forma agregada |

## Verificação de acurácia (código × TSD)

Referências de **§2 e metadados** cruzadas com o repositório (amostra representativa):

| Alegação | Resultado |
|----------|-----------|
| `Card` em `apps/flowboard/src/domain/types.ts` com campos citados | Confere (sem `archived` ainda; esperado para delta) |
| `BoardDocumentJson` / `CatalogEntryJson` em `.../persistence/types.ts` | Confere, incl. `CatalogEntryJson.archived?` |
| `CardSearchResult` e `scoreCard` / `searchCardsWithTotal` em `src/domain/cardSearch.ts` | Confere; campos alinhados ao TSD |
| `SearchModal.tsx` + `createBoardRepository` + `searchCardsWithTotal` sobre `board.cards` | Confere (imports e fluxo) |
| `buildItemsRecord` em `boardLayout.ts`; uso em `BoardView.tsx` | Confere |
| `parseBoard` em `boardRepository.ts` exige `schemaVersion`, `columns`, `cards`, `timeSegments`, `cardTimeState` | Confere (linhas 143–158) |
| `applyCardMove`, `reconcileTimeStateWithCardPositions`, `reconcileBoardTimeState` em `timeEngine.ts` | Confere |
| ADRs `.memory-bank/adrs/002-...`, `005-...`, `008-...` | Caminhos existem |
| `validateColumnLayout`: mínimo **3** colunas; papéis backlog ≥1, in_progress =1, done =1 | Confere `boardRules.ts` — suporta **mais de três** colunas (ex.: múltiplas backlog) |

**Conclusão de acurácia:** o contexto de sistema e os tipos estão, em geral, corretos e auditáveis. A única divergência material notada vs. texto de aceite é **CA01** (vide A2).

## Problemas por severidade

### Crítico

**[C1] C1.14 — Fronteira spec / planner (referências a implementação no corpo do TSD)**

- **Evidência:** O TSD contém, fora de blocos de “contrato” mínimo, múltiplas referências a caminhos de arquivo (`.ts`, `.tsx`), componentes e funções concretas — por exemplo §2.1–2.3 (`apps/flowboard/src/.../SearchModal.tsx`, `boardLayout.ts`, `buildItemsRecord`, `parseBoard`, `createBoardRepository`, `reconcileTimeStateWithCardPositions`, etc.), e menções reiteradas em §7, §11 e §12.
- **Checklist:** `spec-review-checklist.md` C1.14 classifica isso como **FALHA → CRÍTICO** (termos proibidos fora de exemplos de código no contrato).
- **Impacto:** Pela regra canônica do spec-reviewer, o TSD **não** cumpre a barreira spec/planner; o planner receberia o desenho já “ancorado” em arquivos e API interna.
- **Correção (escolher uma linha, antes do planner):**
  1. **Sanear o TSD:** mover referências concretas para um anexo de rastreabilidade (ou documento separado consumido pelo planner) e manter no TSD apenas entidades, invariantes, contrato observável e critérios de aceite; **ou**
  2. **Exceção formal** registrada (constitution / processo) de que a seção “CONTEXTO DO SISTEMA” pode citar o repositório, com revisão de checklist ajustada — caso contrário o item permanece crítico.

### Avisos

**[A1] C1.7 / contrato de interface — Forma vs. checklist HTTP**

- **Evidência:** §5.1 descreve operações de domínio (pré-condição / efeito), sem request/response tipados estilo REST; §5.3 declara N/A para HTTP. O checklist C1.7 pressupõe endpoints com método, rota, corpo, sucesso e falha.
- **Risco:** Revisor automatizado ou squads estritos podem sinalizar “contrato incompleto” mesmo com intenção MVP correta.
- **Ação:** Explicitar no §5 uma linha “**N/A — API REST; contrato = JSON + operações de domínio**” já existe; acrescentar sub-tabela **opcional** de falhas lógicas por operação (alinhada a CA06/CA07) ou referência cruzada “matriz de falhas → CAs 7.2/7.3”.

**[A2] CA01 — Redação “três colunas” vs. regra real de layout**

- **Evidência:** `CA01` fala em remover o card das “**três** colunas visíveis”. Em `boardRules.ts`, o quadro pode ter **três ou mais** colunas (mínimo 3; múltiplas colunas de papel backlog permitidas além de uma in_progress e uma done).
- **Risco:** Critério de aceite tecnicamente falso para quadros com >3 colunas.
- **Ação:** Substituir por “**todas as colunas** do Kanban (exceto a área de arquivados)” ou “de qualquer coluna em que o card estivesse listado”.

**[A3] C1.10 / C2.2 — Validações §4.1 e cobertura em §7.2**

- **Evidência:** [V01] idempotência de arquivar está bem coberta por **CA08** (§7.3, não 7.2). [V02] restaurar em não arquivado e [V03] ISO 8601 não têm CA dedicado; **CA06** é genérico (card inexistente).
- **Risco:** Lacuna menor de rastreabilidade regra → teste; não inviabiliza o MVP.
- **Ação:** Incluir 1–2 CAs (ou nota de teste) para “restaurar não arquivado” (no-op) e, se desejado, formato de `archivedAt`.

### Sugestões

**[S1]** [C2.1] **RF06** (compatibilidade JSON / defaults): reforçar com um CA explícito do tipo “abrir board persistido **sem** `archived`/`archivedAt` trata cards como não arquivados e persiste sem erro” — hoje inferível de §6 e CA03, mas difuso.

**[S2]** [C1.4 / clareza] Cabeçalho do TSD: `> **Status:** Draft` — alinhar a **§12** e ao fluxo (Draft vs pronto para planner) numa passada editorial.

## Checklist de aprovação (C1.1 — C3.5)

### CAMADA 1 — Estrutural

| ID | Descrição | Resultado | Notas |
|----|-----------|------------|--------|
| C1.1 | 12 seções obrigatórias | **PASS** | Seções 1–12 presentes com títulos equivalentes |
| C1.2 | Cabeçalho (nome, confiança, complexidade, data, versão) | **PASS** | Data 2026-04-22; v1.0; 88/100; M (Status Draft é extra) |
| C1.3 | Placeholders de template | **PASS** | Sem colchetes de instrução; `[V01]` = ID de regra, permitido |
| C1.4 | §1 visão geral | **PASS** | Problema, comportamento, ator |
| C1.5 | RFs numerados, “O sistema deve” | **PASS** | RF01–RF09 |
| C1.6 | §4 subseções V, estado, A, L | **PASS** | Incl. §4.5 regras extra |
| C1.7 | Contrato §5 completo (modelo HTTP) | **AVISO** | Contrato de domínio; ver A1 |
| C1.8 | Idempotência escrita (§5.3) | **PASS** | N/A HTTP; idempotência declarada em §5.1 (arquivar) |
| C1.9 | §6.3 migration exatamente uma opção [x] | **PASS** | Sim [x], Não [ ] |
| C1.10 | §7 happy, erros, edge | **AVISO** | 7.1/7.3 fortes; 7.2 vs V*** parcial; ver A3 |
| C1.11 | §8 ≥3 FE com motivo | **PASS** | FE01–FE05 |
| C1.12 | §10 sem 🔴/🟡 sem default | **PASS** | Q1–Q3 com default, justificativa, impacto |
| C1.13 | §11 handoff | **PASS** | Sem placeholders; bloqueios 0; RFs cobertos |
| C1.14 | Fronteira spec/planner | **FALHOU (CRÍTICO)** | Ver [C1] |

### CAMADA 2 — Consistência interna

| ID | Descrição | Resultado | Notas |
|----|-----------|------------|--------|
| C2.1 | RF × CA | **PASS c/ ressalva** | RF06 tênue; S1 |
| C2.2 | Regras 4.1 × CA erro | **AVISO** | A3 |
| C2.3 | Falhas HTTP × regras | **N/A** | Sem responses HTTP em §5.1 |
| C2.4 | Migration × §6 | **PASS** | Sim + campos em §6.2; leitura tolerante |
| C2.5 | Edge 7.3 × limites / idempotência | **PASS** | CA08, CA10; L01 “sem limite” ok |
| C2.6 | Endpoints 5.2 vs §2.2 | **N/A** | Sem 5.2 de endpoints HTTP |
| C2.7 | Handoff × RFs | **PASS** | RF01–RF09 no handoff |
| C2.8 | §10 × handoff (assunções, bloqueios) | **PASS** | 3 assunções, 0 bloqueios |

### CAMADA 3 — PRD

| ID | Descrição | Resultado | Notas |
|----|-----------|------------|--------|
| C3.1 — C3.5 | Rastreabilidade PRD | **N/A** | PRD não fornecido para esta trilha |

## Auto-correções aplicadas

Nenhuma (edição do TSD fica a cargo do time após o review).

## Alterações explícitas necessárias antes do planner (se aprovação plena for exigida)

1. **Resolver [C1]:** cumprir C1.14 (retirar ou realocar referências a ficheiros/funções do TSD, **ou** formalizar exceção de processo).
2. **A2:** ajustar redação de **CA01** (colunas: não limitar a “três” se o produto admite N≥3 colunas de Kanban).
3. **(Recomendado) A1:** clarificar em §5 que o “contrato” é domínio+JSON e, se útil, tabela mínima de **efeitos de falha** lógica → remete a **CA06/CA07**.
4. **(Opcional) A3 / S1:** CAs ou notas de teste para [V02]/[V03] e **RF06** explícito.

## Status final

**Revisão obrigatória** — 1 crítico de processo (C1.14) pendente. Após remediar [C1] (e, de preferência, A2), o TSD fica alinhado ao checklist e à evidence no código. Próximo passo canônico após aprovação: handoff **§11** → planner.

---

**Metadados (revisor)**

```json
{
  "agent": "spec-reviewer",
  "status": "revision_required",
  "score": 85,
  "criticals": 1,
  "warnings": 3,
  "suggestions": 2,
  "auto_corrections": 0,
  "review_report": ".memory-bank/specs/card-archive/spec-reviewer-feature.md"
}
```

## Revisão de follow-up (2026-04-22)

**Escopo:** re-auditoria pós-remediação de **C1.14** (fronteira spec/planner), conforme alterações declaradas (§2 sem paths; paths em **§12.2 Anexo**; CA01; CA12/CA13; matriz de falhas em §5.1).

### C1.14 — Resultado

**PASSOU.**

**Evidência:** §2 permanece em termos de entidades, superfícies e invariantes, com remissão explícita a **§12.2** para ficheiros. Caminhos `apps/...` e extensões ficam **apenas** no anexo, com aviso de que não integra o contrato observável — alinhado à linha de correção aceite no [C1] original (anexo de rastreabilidade).

**Ressalva não bloqueante (🔵):** Fora do §12.2 ainda aparecem identificadores de implementação pontuais — **RF04** (`SearchModal`, `cardSearch`, `scoreCard`) e **§6.3** (`parseBoard`). Não reintroduzem a falha “pathificada” do §2; para aderência **literal** ao texto completo do checklist (nomes de função/componente em qualquer secção), uma passada editorial opcional generalizaria essas frases.

### Veredicto atualizado

**🟢 APROVADO** — **sim, apto para acionar o planner** com **§11**; **zero críticos** pendentes após a remediação de C1.14.

### Score atualizado

**95/100** (base 100; sem penalidade por crítico; pequena margem reservada a ressalvas editoriais 🔵 e à interpretação estrita de C1.14 no corpo fora do anexo).

### Issues remanescentes (não bloqueantes)

| Severidade | Item |
|------------|------|
| 🔵 | Generalizar RF04 e §6.3 se quiser eliminar últimos nomes concretos fora do anexo. |
| 🔵 | [S2] original: alinhar `Status: Draft` no cabeçalho ao fluxo “pronto para planner” (editorial). |

**Fechamento de avisos anteriores (contexto):** [A2] atendido por CA01 (N colunas); [A3]/[S1] reforçados por CA12/CA13; [A1] mitigado pela coluna de falha lógica → CA em **§5.1**.

### Metadados (follow-up)

```json
{
  "agent": "spec-reviewer",
  "status": "approved",
  "score": 95,
  "criticals": 0,
  "warnings": 0,
  "suggestions": 2,
  "auto_corrections": 0,
  "c1_14": "pass",
  "review_report": ".memory-bank/specs/card-archive/spec-reviewer-feature.md"
}
```
