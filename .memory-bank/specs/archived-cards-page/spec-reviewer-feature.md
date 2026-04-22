# TSD Review Report — Página dedicada de cards arquivados (fora do quadro Kanban)

## Addendum v1.1 — Revisão pós-remediação (2026-04-22)

> TSD: `spec-feature.md` **v1.1** | Foco: remediação **C1.9** (§6.3 checkbox de migração) e **C1.14** (identificadores de implementação fora da narrativa principal) | Comparado a: `state.yaml` (aceitação, scope, alinhamento sem scope creep)

### Veredicto: APROVADO COM RESSALVAS

- **🟡 Aprovado com ressalvas** — Zero achados **críticos**; o TSD pode seguir para o **planner**. Ressalvas: avisos **não bloqueantes** de alinhamento ao template do checklist (sobretudo rótulos da §4 e ligação §4.1 ↔ §7.2) permanecem; ver relatório v1.0 abaixo para matriz e histórico.
- **Fase architect:** **não** necessária (sem delta de modelo de dados, migração estrutural, API HTTP nova nem decisão de topologia; só UI/rota/navegação sobre card-archive — coerente com `state.yaml` e recomendação anterior).

### Evidência das remediações (checklist canónico)

| ID | v1.0 | v1.1 (re-auditoria) |
|----|------|----------------------|
| **C1.9** | FALHOU (sem §6.3 com `[x]`) | **PASSOU** — §6.3 com `[x] Não` e resumo; handoff com `Migration necessária: Não (§6.3)` |
| **C1.14** | FALHOU (identificadores de código em prosa) | **PASSOU** — Secções 1–11 sem nomes de ficheiros de implementação, funções, classes CSS; §12.3 como anexo de vocabulário apenas |
| C2.1 (RF08) | AVISO (CA fraco) | **Melhor** — **CA-AC11** cobre coerência com Horas/relatório sem ação no módulo |

### Rastreio rápido `state.yaml` ↔ TSD v1.1

| Fonte (state) | Cobertura no TSD v1.1 |
|---------------|----------------------|
| `acceptance_criteria` (6 itens) | Mapeados em RF/CA/§5; deep-link e testes explícitos |
| `scope.in` / `scope.out` | Alinhado; delta permanece “superfície + navegação” |
| Risco de desvio | Não identificado (card-archive como verdade de domínio) |

### Sumário (addendum)

| Categoria | v1.0 (ref.) | v1.1 (atual) |
|-----------|------------:|-------------:|
| Críticos | 2 | **0** |
| Avisos (ordem de grandeza) | 6 | **~3** (estrutura template / ligação validação–CA) |
| Sugestões | 3 | **~1–2** (opcional) |
| **Score** | 68/100 | **86/100** |

```json
{
  "agent": "spec-reviewer",
  "status": "approved_with_caveats",
  "score": 86,
  "criticals": 0,
  "warnings": 3,
  "suggestions": 2,
  "tsd_version_reviewed": "1.1",
  "architect_recommended": false
}
```

**Sumário de uma linha (v1.1):** TSD v1.1 **aprovado com ressalvas** (86/100), críticos **C1.9** e **C1.14** resolvidos; **architect** não requerido — próximo passo: **planner** com o handoff da §11.

---

*O bloco abaixo conserva o relatório completo da auditoria a **TSD v1.0** (pré-remediação), para rastreio; o veredicto vigente é o do addendum v1.1 acima.*

---

> Data: 2026-04-22 | Revisor: spec-reviewer | TSD Versão: 1.0  
> PRD de origem: não disponível (rastreabilidade via `state.yaml`: acceptance_criteria + scope)

## Veredicto: 🔴 REVISÃO OBRIGATÓRIA

Há achados **críticos** face ao checklist canónico (`references/spec-review-checklist.md`) que impedem declarar o TSD “pronto para o planner” sem correção documental. O conteúdo funcional está alinhado ao `state.yaml`; os bloqueios são sobretudo **estruturais / fronteira spec–planner**.

## Sumário

| Categoria | Qtd |
|-----------|-----|
| 🔴 Críticos | 2 |
| 🟡 Avisos | 6 |
| 🔵 Sugestões | 3 |
| ✅ Auto-correções | 0 |
| **Score de Qualidade** | **68/100** |

---

## Pré-análise (FASE 1)

| Campo | Valor extraído do TSD |
|--------|------------------------|
| Nome / versão | Página dedicada de cards arquivados — **v1.0** |
| Confiança declarada | **87/100** |
| Complexidade declarada | **M** |
| RFs (Secção 3) | **8** (RF01–RF08) |
| Regras / invariantes (Secção 4) | Herdadas + **3** novas/reforçadas explícitas (**INV-NAV01**, **INV-UI01**, **R-COPY01**); mais referências a regras do card-archive |
| “Endpoints” (Secção 5) | **0** HTTP; contrato = UI + rotas + efeito em documento |
| Critérios de aceite (Secção 7) | **10** mapeados (CA-AC01–CA-AC10) |
| Secção 10 — 🔴 sem default | **0** |
| Secção 10 — 🟡 sem default | **0** (Q1–Q3 com default ou “fora de v1.0”) |
| Handoff (Secção 11) | Preenchido; **Bloqueios: 0** |

**Red flags imediatos (leitura):** ausência do formato obrigatório de migração com checkbox em §6 (checklist C1.9); menção recorrente a **identificadores de implementação** (funções, classe CSS, handlers) em prosa fora de blocos de contrato formal (C1.14).

---

## Problemas encontrados

### 🔴 CRÍTICOS

**[C1] Secção 6 — Migração (C1.9 checklist)**

- **Evidência:** A secção 6 declara “**Migração de dados / schema:** N/D.” sem a estrutura exigida pelo checklist: subsecção **6.3** com **exactamente uma** opção marcada `[x] Sim — …` ou `[x] Não — …`.
- **Impacto:** O gate estrutural do spec-reviewer falha; o handoff também não inclui o campo explícito “Migration necessária: Sim/Não” pedido pelo checklist da Secção 11.
- **Correção:** Acrescentar §6.3 (ou equivalente numerado) com checkbox, p.ex. `[x] Não — sem alteração de schema nem migração obrigatória; delta apenas de UI/navegação.`

**[C2] Fronteira spec / planner — identificadores de código (C1.14 checklist)**

- **Evidência (exemplos):** Uso em prosa de nomes concretos do código/domínio, p.ex. classe de estilo **`fb-archived`** (§1); funções **`isCardArchived`**, **`sortArchivedByDefault`** (§2–§3); **`handleDelete`** (§5.2); tipos/caminhos conceptuais como **`CardSearchResult.archived`**, **`CatalogEntryJson.archived`**, **`BoardDocumentJson`** (§2–§3); **`data-testid`** (§12.3).
- **Impacto:** Violação explícita do critério “sem arquivos, classes, funções, padrões de pastas” na spec; arrisca acoplamento do TSD ao código atual e desvia responsabilidade para o planner sem necessidade.
- **Correção:** Substituir na narrativa principal por **comportamento observável** (ex.: “ordenação padrão de arquivados por data de arquivamento descendente, com desempates definidos no TSD card-archive”) e mover vocabulário do repositório para **anexo opcional** “alinhamento terminológico” **após** handoff, ou referenciar apenas o TSD card-archive sem repetir nomes de símbolos.

---

### 🟡 AVISOS

**[A1] Secção 4 — Estrutura vs template do checklist (C1.6)**

- **Evidência:** O checklist espera subsecções 4.1–4.4 com rótulos “Validações de Entrada”, “Regras de Estado”, “Autorização”, “Limites e Quotas”. O TSD usa 4.1 herdadas / 4.2 novas / 4.3 autorização e limites.
- **Risco:** Revisor automatizado ou leitor estrito pode marcar lacunas formais mesmo com conteúdo coberto por herança do card-archive.
- **Ação:** Renumerar ou acrescentar uma linha “**N/A justificado**” por subsecção do template, ou mapear explicitamente “Validações → herdadas em card-archive §…”.

**[A2] Secção 5 — Idempotência HTTP (C1.8)**

- **Evidência:** Não há §5.3 dedicado a idempotência de escrita REST; §5.3 trata busca/modal. Idempotência aparece só como invariante herdada (§4.1).
- **Risco:** Ambiguidade para quem aplica o checklist literalmente.
- **Ação:** Declarar **`N/A`** para API HTTP nesta feature e citar §4.1 / TSD card-archive para operações de persistência.

**[A3] Secção 7 — Partição 7.2 vs 7.3 (C1.10)**

- **Evidência:** “Erros e bordas” estão em §7.2; §7.3 é sobretudo “Verificação (teste)” (CA-AC10).
- **Risco:** Leitura rápida pode sugerir ausência de edge cases em 7.3; funcionalmente os CAs de borda existem (CA-AC06–AC09).
- **Ação:** Renomear §7.3 para “Edge cases e verificação” ou mover CA-AC06–AC09 para 7.3 por consistência com o template.

**[A4] Secção 8 — Justificativa por item FE (C1.11)**

- **Evidência:** FE01–FE06 listados sem frase “— [motivo]” por item, como o checklist sugere.
- **Risco:** Menor; escopo ainda é claro.
- **Ação:** Acrescentar uma frase curta de motivo por FE.

**[A5] Secção 11 — RFs não listados por ID (C2.7 / C1.13)**

- **Evidência:** Handoff descreve comportamento em bullets, sem enumerar **RF01–RF08** nem “Migration necessária: Não”.
- **Risco:** Rastreio mecânico handoff ↔ Secção 3 mais difícil.
- **Ação:** Incluir lista explícita RF01–RF08 e campo de migração.

**[A6] RF08 × critérios de aceite (C2.1)**

- **Evidência:** RF08 exige coerência com abas Quadro/Horas e não alterar regras de relatório; não há CA dedicado que verifique efeito (ou ausência de efeito) no módulo de horas — apenas Q1 sobre realce de aba.
- **Risco:** regressão visual/estado de abas não coberta por CA explícito.
- **Ação:** Acrescentar CA mínimo (ex.: “Com board selecionado, após visitar rota de arquivados, relatório de horas e dados de tempo não são alterados sem acção explícita do utilizador”) **ou** explicitar em §7 que a verificação é apenas manual/UX (com risco aceite).

---

### 🔵 SUGESTÕES

**[S1]** Corrigir typo **`[L01][L01]`** em §4.3 para uma única etiqueta.

**[S2]** Alinhar **Status: Draft** no cabeçalho com a narrativa de handoff “pronto para planner” — ou mudar para “Reviewed” após correções.

**[S3]** Em §5.2, clarificar em uma linha se **excluir** na página aplica-se **apenas** a arquivados ou também a não arquivados “conforme handleDelete hoje”, para evitar ambiguidade de produto na página nova.

---

## Rastreabilidade `state.yaml` ↔ TSD

| Critério em `acceptance_criteria` | Cobertura no TSD |
|-----------------------------------|------------------|
| BoardView sem secção colapsável; só colunas e ativos | RF01, CA-AC01, §2.2 baseline |
| Navegação explícita quando aplicável ao board selecionado | RF05, CA-AC02, §5.1 |
| Lista só `archived === true`, ordenação domínio / `sortArchivedByDefault` | RF03, CA-AC03, §2.1 |
| Restaurar/eliminar com mesmas invariantes | RF04, CA-AC04, §4–§5.2 |
| Busca + badge; spec declara deep-link | RF07, §5.3, CA-AC05, FE06; **alinhado** |
| Testes (domínio + UI/E2E conforme risco) | CA-AC10, handoff | **alinhado** |

**Scope `in`:** nova rota/UI, AppShell/router, remoção `fb-archived` / estado de expansão, reutilização de handlers — **coberto** em RF01–RF05, handoff e §8 `out` coerente com `scope.out`.

**Scope creep face ao `state.yaml`:** não identificado; delta “navigation/UI only” está contido.

---

## Checklist de aprovação (C1.1–C3.5)

| ID | Status | Nota breve |
|----|--------|------------|
| C1.1 | PASSOU | Secções 1–12 presentes (título handoff ligeiramente diferente do template “IMPL-PLANNER”, aceitável). |
| C1.2 | PASSOU | Cabeçalho com nome, data, versão, confiança, complexidade. |
| C1.3 | PASSOU | Sem placeholders de template detectados. |
| C1.4 | PASSOU | Problema, comportamento e ator claros. |
| C1.5 | PASSOU | 8 RFs numerados; linguagem maioritariamente declarativa. |
| C1.6 | AVISO | Estrutura §4 diferente do template (A1). |
| C1.7 | N/A / PASSOU | Sem REST; tabelas UI/rotas substituem “endpoint”. |
| C1.8 | AVISO | Marcar N/A HTTP + referência herança (A2). |
| C1.9 | **FALHOU** | Falta §6.3 com `[x] Não` (C1). |
| C1.10 | AVISO | Partição 7.2/7.3 vs template (A3); conteúdo de bordas existe. |
| C1.11 | AVISO | FE sem “— motivo” explícito (A4). |
| C1.12 | PASSOU | Q1–Q3 não bloqueantes com defaults. |
| C1.13 | AVISO | Handoff sem RFs por ID e sem “Migration necessária” explícito (A5). |
| C1.14 | **FALHOU** | Identificadores de código em prosa (C2). |
| C2.1 | AVISO | RF08 com CA fraco (A6); restantes RFs com CAs. |
| C2.2 | PASSOU | Regras herdadas; CA-AC04 cobre paridade persistência. |
| C2.3 | N/A | Sem matriz HTTP de falhas. |
| C2.4 | PASSOU | Nenhuma migração Sim inconsistente (quando corrigido C1.9: Não). |
| C2.5 | PASSOU | Bordas em CA-AC06–AC09. |
| C2.6 | N/A | Sem §5.2 de endpoints modificados. |
| C2.7 | AVISO | Handoff vs lista RF (A5). |
| C2.8 | PASSOU | Bloqueios 0; alinhado a §10. |
| C3.1–C3.5 | **N/A** | PRD não fornecido; substituído por rastreio ao `state.yaml` (tabela acima). |

---

## Auto-correções aplicadas

Nenhuma (alterações exigem decisão de formato ou reescrita de termos; não aplicadas no TSD fonte).

---

## Recomendação: fase **architect** no pipeline FEATURE

**Não obrigatória** para esta entrega: não há novo modelo de dados, contrato HTTP, migração, nem decisão de topologia de integração. Após corrigir os **críticos documentais** (C1, C2), o encaminhamento natural é **planner** com eventual **designer** leve para o controlo de navegação (Q3). Acionar **architect** só se o time quiser ADR explícito sobre estratégia de rotas aninhadas / estado global do board — hoje o TSD já limita o desenho a “rota estável + board ativo no shell”.

---

## Metadata (pipeline)

```json
{
  "agent": "spec-reviewer",
  "status": "revision_required",
  "score": 68,
  "criticals": 2,
  "warnings": 6,
  "suggestions": 3,
  "auto_corrections": 0,
  "review_report": ".memory-bank/specs/archived-cards-page/spec-reviewer-feature.md"
}
```

---

**Sumário de uma linha:** TSD funcionalmente alinhado ao `state.yaml`, mas **bloqueado** por checklist (migração §6.3 e fronteira spec/planner por nomes de código) — **68/100**.
