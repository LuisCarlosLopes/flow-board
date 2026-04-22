# Plan Review Report — Arquivar card — área de arquivados e busca
> Data: 2026-04-22 | Revisor: plan-reviewer | IPD Versão: v1.0
> TSD de referência: `.memory-bank/specs/card-archive/spec-feature.md` (v1.0)
> Artefato auditado: `.memory-bank/specs/card-archive/planner-feature.md`

## Veredicto: 🟢 APROVADO
- Condições: zero críticos, score 80/100, Camada 3 executada. Plano alinhado ao TSD (RF/CA, merge pós-`itemsRecordToCards`, tempo §4.2, R-SEARCH01, R-UX01). Pronto para `task-breakdown` / implementação; aplicar as edições recomendadas abaixo reduz risco de três rastreabilidade.

## Sumário
| Categoria | Qtd |
|---|---|
| 🔴 Críticos | 0 |
| 🟡 Avisos | 4 |
| 🔵 Sugestões | 2 |
| ✅ Auto-correções | 0 |
| Score de Qualidade | 80/100 |

## Problemas Encontrados

### 🔴 CRÍTICOS
*— Nenhum. —*

### 🟡 AVISOS
[A1] Seção 4.1 e TSD §5.1 / §7.2 — Contrato de falha e persistência pouco explícito no IPD
- Evidência: 4.1 documenta INPUT/OUTPUT de sucesso; não enumera **OUTPUT (falha)** com condição (ex. CA06 card inexistente, CA07 conflito 409 / `GitHubHttpError`) nem referência cruzada à tabela do TSD §5.1. O padrão 409 está forte na secção 2.3, não no contrato 4.1.
- Risco: executor subdocumenta tratamento de erro e critérios de teste de integração; checklist C1.7 (OUTPUT falha) fica parcialmente por cobrir.
- Ação recomendada: Acrescentar em 4.1 um bloco **OUTPUT (falha lógica / persistência)** alinhado a TSD: CA06 (no-op/erro de UI sem corrupção), CA07 (comportamento 409 inalterado, `saveBoard` / `GitHubHttpError`); manter a distinção domínio puro vs. camada de gravação.

[A2] Seção 4.2 × 4.3 e Seção 2.3 — Ficheiro e NÃO TOCAR `HoursView` vs. rastreabilidade de contrato
- Evidência: 4.3 inclui `infrastructure/persistence/types.ts` (confirmar re-export) **sem** passo explícito no fluxo numerado 4.2. 4.3 marca `features/hours/HoursView.tsx` como **NÃO TOCAR** com TSD 2.3, mas 2.3 não descreve `HoursView` como artefacto a preservar (há regra de negócio sobre relatório, não o ficheiro).
- Risco: C2.2 (ficheiro tecnicamente no mapa sem eco no fluxo); C2.6 (NÃO TOCAR sem “contrato” em 2.3 para o ficheiro).
- Ação recomendada: Inserir no fluxo 4.2 um passo curto pós-extensão de `Card` em `types.ts` para validar compilação/re-export em `persistence/types.ts` se aplicável. Em 2.3, **uma** linha explícita: “`HoursView.tsx` (relatório de horas / CA10) — não tocar exceto com evidência de contagem de cards por coluna (nota 4.3).”

[A3] Cabeçalho / Seção 10 — Complexidade **M** vs. mapa de alterações
- Evidência: Metadados e cabeçalho: `M`. Mapa: ~21 linhas, múltiplos `.ts`/`.tsx`/`.css` + testes + E2E opcional; alinhado a “15–18” ficheiros no metadado, acima do intervalo 5–10 da heurística C2.5 para **M** no checklist.
- Risco: subestima esforço em planning externo; não bloqueia execução.
- Ação recomendada: Ajustar complexidade a **L** *ou* manter **M** com uma nota de que a maior parte das alterações são mecânicas (CSS/estrito ao mapa) e a densidade lógica está em `cardArchive` + `BoardView` + `timeEngine`.

[A4] Seção 3 (DoD) / Seção 6 (Testes) × TSD §7.1–7.3 — Cobertura de testes e formato de edge cases
- Evidência: DoD cita 409, card inexistente e idempotência; a Seção 6 cobre bem domínio (merge, tempo, idempotência, `archived` na busca). Não declara teste mínimo para **CA11** (busca → seleção → modal com estado arquivado) nem estratégia explícita para **CA07** (E2E ou integração; aceitar só manual fica fraco). Edge cases do DoD (linha 95) usam **lista com `;`**, não o formato “`situação → comportamento`” por item (C1.6).
- Risco: lacuna de rastreabilidade TSD ↔ testes; aceite de produto (RF05) menos garantido em CI.
- Ação recomendada: Especificar em §6: pelo menos teste de `SearchModal` (ou POM E2E) que abre o card arquivado a partir da busca, **ou** justificar E2E opcional como requisito se Vitest for insuficiente. Acrescentar linha/ítem de teste ou **smoke** para fluxo 409 *se* houver padrão no repo. Afinar o DoD para 2+ edge cases no formato TSD (uma linha por `→`).

### 🔵 SUGESTÕES
[S1] Seção 4.2, passo 2 — Corrigir typo `Dominio` → `Domínio` (clareza editorial).

[S2] Seção 4.4 e TSD §6.3 — A `nota_migração` já explica *migração lógica*; opcionalmente referenciar explicitamente que o TSD marca “**Sim**” para migração de *leitura* e o IPD usa `migrations_necessarias: false` no sentido **sem** script/SQL, para evitarem confusão com metadados do TSD §12 (Requer Migration: Sim).

## Checklist de Aprovação

### Camada 1 — Estrutural
| ID | Descrição | Status | Notas |
|----|-----------|--------|--------|
| C1.1 | 10 seções obrigatórias | **PASSOU** | Sec. 1–10 presentes; nota pós-sec. 10 (contagem mapa) é extra, aceitável. |
| C1.2 | Cabeçalho completo | **PASSOU** | Nome, confiança 88, M, data 2026-04-22, v1.0, FEATURE, slug, artefato canónico. |
| C1.3 | Placeholders | **PASSOU** | Sem `[NOME_DA_TASK]`, `lib1`/`campo1`, ou template literal não substituído fora de código. |
| C1.4 | Seção 1 (MISSÃO) | **PASSOU** | Objetivo com restrição (sem alterar persistência além de opcionais); contexto concreto. |
| C1.5 | Seção 2 (estado) | **PASSOU** | Zona de trabalho 2.1; tabela 2.2; contratos 2.3; módulos 2.4 com paths reais. |
| C1.6 | Seção 3 (DoD) | **FALHOU (aviso)** | Funcional e edge cases alinhados ao TSD; formato `→` por edge case a melhorar (ver A4). |
| C1.7 | Seção 4 (especificação) | **FALHOU (aviso)** | 4.2–4.3 e 4.4 sólidos; 4.1 sem ramo de falha explícito (ver A1). |
| C1.8 | Seção 5 (guardrails) | **PASSOU** | Vários guardrails do projeto; universais (any, deps, mapa, escopo FE01, sem mudar fórmula de score) cobertos; “banco direto” *de facto* N/A (cliente JSON + repo). |
| C1.9 | Seção 6 (testes) | **FALHOU (aviso)** | ≥3 casos, happy+negativos; gaps CA11/409 (ver A4). |
| C1.10 | Seção 7 (assunções) | **PASSOU** | A1–A3 com default, impacto; tabela 7.2. |
| C1.11 | Seção 10 (metadados) | **PASSOU** | Confiança ≥70, bloqueios 0, 3 assunções documentadas, migration “Não” alinhada a JSON. |

### Camada 2 — Consistência interna
| ID | Descrição | Status | Notas |
|----|-----------|--------|--------|
| C2.1 | DoD × testes | **FALHOU (aviso)** | Parcial: CA11/CA07 não espelhados (A4). |
| C2.2 | Mapa × fluxo | **FALHOU (aviso)** | `persistence/types` fraco no fluxo; resto mapeado (A2). |
| C2.3 | Padrão erro 2.2 × 4.1 | **PASSOU** | 409 / `GitHubHttpError` coerente com código; 4.1 não contradiz, só incompleto em outputs de falha. |
| C2.4 | Deps × fluxo | **PASSOU** | `libs_existentes_usadas` usadas no mapa/fluxo; `novas_libs` vazio. |
| C2.5 | Complexidade × mapa | **FALHOU (aviso)** | M vs. ~20 ficheiros (A3). |
| C2.6 | NÃO TOCAR × 2.3 | **FALHOU (aviso)** | `boardRepository` OK em 2.3; `HoursView` em 4.3 sem 2.3 explícita (A2). |
| C2.7 | Env × guardrails | **PASSOU** | `variaveis_de_ambiente_novas` vazia. |
| C2.8 | Migration × mapa | **PASSOU** | `migrations_necessarias: false`; sem ficheiro SQL esperado. |
| C2.9 | Sec.7 × metadados | **PASSOU** | 3 assunções, 0 bloqueios, alinhado. |

### Camada 3 — Acurácia repositório
| ID | Descrição | Status | Evidência |
|----|-----------|--------|-----------|
| C3.1 | MODIFICAR / NÃO TOCAR existem | **PASSOU** | Todos os paths do mapa (exceto CRIAR) existem no repo. |
| C3.2 | Stack vs `package.json` | **PASSOU** | `react@^19.2.4`, `vite@^8.0.4`, `typescript@~6.0.2`, `@dnd-kit/*`, `@tanstack/react-virtual`, `vitest@^4.1.4` — alinhado ao IPD. |
| C3.3 | Contratos 2.3 vs código | **PASSOU** | `applyCardMove`, `reconcileBoardTimeState`, `searchCardsWithTotal`/`scoreCard`, `buildItemsRecord`/`itemsRecordToCards`, `saveBoard` em `boardRepository` — existem. `parseBoard` em `boardRepository`. `Card` ainda sem `archived` em `types.ts` (esperado pré-implementação). |
| C3.4 | Módulo de referência | **PASSOU** | `timeEngine.ts`, `boardLayout.ts`, `cardSearch.ts` e testes presentes. |
| C3.5 | `libs_existentes_usadas` | **PASSOU** | Declaradas no `package.json` do pacote `flowboard`. |
| C3.6 | Padrão de erro | **PASSOU** | `GitHubHttpError` e 409 em `infrastructure/github/client.ts`; uso de persistência alinhado ao relato. |
| C3.7 | CRIAR vs existente | **PASSOU** | `cardArchive.ts`, `cardArchive.test.ts`, `card-archive.spec.ts` — ausentes (OK). |

### Alinhamento TSD (auditoria adicional)
| Tópico | Status |
|--------|--------|
| RF01–RF09, R-UX01, R-SEARCH01, §4.2 tempo, V01–V03, same array `cards[]` | **PASSOU** (mapeado em fluxo, mapa, guardrails) |
| `spec-feature.md` metadata **Status: Draft** (linha 3) | **Nota** | O handoff do TSD (§11) e o IPD assumem *approved*; formalizar *status* no TSD no repositório evita conflito de processo. Não gera crítico no IPD. |

## Auto-correções Aplicadas
*— Nenhuma. O plan-reviewer não edita o IPD no repositório; apenas recomenda alterações. —*

## IPD Corrigido (se auto-correções aplicadas)
*— N/A —*

## Resolução de Críticos Anteriores
*— N/A (primeira revisão do artefato neste track). —*

## Edições IPD requeridas para fechar avisos (opcional mas recomendado)
1. **4.1:** Adicionar OUTPUTs de falha / persistência (CA06, CA07 / 409) conforme TSD §5.1.
2. **4.2:** Incluir passo para `persistence/types.ts`; corrigir typo “Dominio”.
3. **2.3:** Uma frase explícita sobre `HoursView.tsx` e CA10.
4. **3 e 6:** Afinar DoD (formato edge cases) e testes (CA11, estratégia 409/CA07).
5. **Cabeçalho/10:** Rever **M** vs **L** (ou nota de mitigação).

---
## Metadata (machine-readable)
```json
{
  "agent": "plan-reviewer",
  "status": "approved",
  "slug": "card-archive",
  "track": "FEATURE",
  "subtask_id": null,
  "score": 80,
  "criticals": 0,
  "warnings": 4,
  "suggestions": 2,
  "auto_corrections": 0,
  "layer3_executed": true,
  "reviewed_artifact": ".memory-bank/specs/card-archive/planner-feature.md",
  "review_report": ".memory-bank/specs/card-archive/plan-reviewer-feature.md"
}
```
