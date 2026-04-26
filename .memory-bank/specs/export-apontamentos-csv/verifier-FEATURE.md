# Verification Report — Export apontamentos CSV (post–UX fix)

> **IPD:** `.memory-bank/specs/export-apontamentos-csv/planner-FEATURE.md` (1.0.0)  
> **TSD:** `.memory-bank/specs/export-apontamentos-csv/spec-feature.md`  
> **Delivery Report:** `.memory-bank/specs/export-apontamentos-csv/implementer-delivery-FEATURE.md`  
> **Data verificação:** 2026-04-26  
> **Agente:** verifier  
> **Veredicto:** ⚠️ **APROVADO COM RESSALVAS** (GO para code-reviewer / tester; ver § Ressalvas)

---

## Resumo executivo

| Métrica | Valor |
|--------|--------|
| Checks críticos Camada 2 (lint / testes / build) | 3/3 pass |
| Divergências 🔴 | 0 |
| Ressalvas 🟡 (documentação / semântica prévia × export) | 2 |
| Conformidade RF-07 (atomicidade) no **fluxo de export** | Sim (evidência em código) |

**Conclusão:** Implementação pós-UX cumpre multi-board via modal, carga atómica e revalidação de catálogo no export, `periodFor(periodKind, anchor)` no CSV, e testes automatizados verdes. Ressalvas: tensão de leitura do TSD **RF-04** (alinhamento pré-visualização × export de boards) e desvio do texto estrito do **IPD §4.2** sobre carga atómica na **pré-visualização** (restaurada tolerância a `loadBoard` → `null`).

---

## 1. Cruzamento UX × DoD / RF (foco pós-implementer)

| Ref | Expectativa | Verificação | Status |
|-----|-------------|------------|--------|
| **D1 / RF-01** | Ação explícita de export com `data-testid` | `hours-export-csv`, modal `hours-export-modal`, `hours-export-confirm` em `HoursView.tsx` | ✅ |
| **D2 / RF-02** | Período = confirmação | `runExportFromModal` usa `periodSnapshot = periodFor(periodKind, anchor)` e passa a `buildTaskHoursCsv` | ✅ |
| **D3 / RF-03** | Multi-board não arquivados; ≥1 | Modal com checkboxes; `exportBoardIds.length === 0` → `MSG_EXPORT_NO_BOARDS`; `validateSelectedBoardsAgainstCatalog` | ✅ |
| **D5 / RF-05–06** | Colunas, vazio sem ficheiro | `buildTaskHoursCsv`; `aggregated.length === 0` → `MSG_EXPORT_EMPTY` sem `Blob` | ✅ |
| **D7 / RF-07** | Atomicidade carga + sem CSV parcial se falha | `loadBoardDocumentsOrThrow` no export; qualquer `null`/throw aborta; mensagem em `exportNotice` | ✅ |
| **D9** | CA-E1 | `loadCatalog` + `validateSelectedBoardsAgainstCatalog` antes de carregar | ✅ |
| **D4 / RF-04** | “Pré-visualização alinhada” (IPD + TSD) | Prévia: escopo `hours-scope-all` / `hours-scope-selected` + **omissão** de boards com `loadBoard` → `null` (sem erro global). Export: **conjunto independente** no modal (default todos elegíveis). **Período** partilhado; **boards** da tabela **podem** diferir da seleção de export. | 🟡 ver § Ressalvas |

**Comentário de produto (código):** `@MindFlow` / `@MindRisk` em `HoursView.tsx` (aprox. linhas 153–156) documentam prévia tolerante vs export atómico.

---

## 2. Risco de regressão (prévia vs export)

| Risco | Descrição | Severidade |
|-------|-----------|------------|
| **R1** | Utilizador vê a **tabela** com recorte A (todos / quadro atual) e exporta recorte B (modal) sem perceber que não é o mesmo conjunto de boards. | 🟡 AVISO (UX) |
| **R2** | Prévia **não** falha de forma atómica se um board do catálogo devolver `null` — horas mostradas podem excluir esse board; o **export** continua a falhar de forma atómica se o mesmo ocorrer para um id **selecionado**. | 🟡 AVISO (comportamento intencional pós-UX) |
| **R3** | Exceção em `repo.loadBoard` (não-`null`) ainda alimenta `setError` no `load()` da prévia — consistente com falha explícita. | 🟢 INFO |

Nenhum achado 🔴: **RF-07** no TSD fala de **exportação**; o fluxo modal cumpre “tudo ou nada” com erro explícito e sem ficheiro parcial.

---

## 3. Camada 1 — Completude e drift

| Check | Status | Evidência |
|-------|--------|------------|
| Ficheiros **CRIAR** do IPD (`taskHoursCsv*`) | ✅ | Presentes em `apps/flowboard/src/domain/` |
| Ficheiros extra (`hoursExport.ts`, `hoursExport.test.ts`) | ✅ esperado | Declarado no Delivery Report; alinha §6.2 IPD |
| `HoursView.tsx` / `HoursView.css` / `releases.json` | ✅ | Modificados conforme plano |
| `infrastructure/github/*` (NÃO TOCAR) | ✅ | Sem alterações no âmbito reportado; feature usa `createBoardRepository` existente |
| `ReleaseNotesPage.test.tsx` | extra escopado | Ajuste de release, coerente com `AGENTS.md` |

---

## 4. Camada 2 — Validações automatizadas (executadas nesta verificação)

**Diretório:** `apps/flowboard/`

### V2.1 — Build (inclui `tsc -b`)

**Status:** ✅ PASSOU

```
> tsc -b && vite build
✓ built in 134ms
```

(Advertência Vite de tamanho de chunk >500 kB: pré-existente, não bloqueante.)

### V2.2 — ESLint (`npm run lint`)

**Status:** ✅ PASSOU (0 erros)

```
✖ 3 problems (0 errors, 3 warnings)
  .../coverage/block-navigation.js — Unused eslint-disable
  .../coverage/prettify.js
  .../coverage/sorter.js
```

**Evidência:** *warnings* apenas em artefactos `coverage/`, alinhado ao Delivery Report (não introduzido pela feature em ficheiros fonte).

### V2.3 — Vitest (`npx vitest run`)

**Status:** ✅ PASSOU

```
Test Files  31 passed (31)
     Tests  308 passed (308)
  Duration  2.97s
```

### V2.6 — Testes desabilitados (`skip` / `only`)

**Status:** ✅ Sem `.only` em testes unitários. `test.skip` existe em E2E (GitHub / browser) com motivo explícito — padrão do repositório, fora do escopo Vitest desta entrega.

---

## 5. Camada 3 — Documentação

| Check | Status |
|-------|--------|
| Release + testes de release | ✅ (Delivery + suite verde) |
| IPD literal §4.2 ponto 3 (prévia atómica) vs implementação atual | 🟡 desvio documentado; ver Ressalvas |

---

## 6. Ressalvas (não bloqueiam GO se time aceita produto)

1. **🟡 TSD RF-04 (último bullet):** “mesmo recorte de período **e boards**” entre prévia e export — com escopo de prévia (chips) e seleção de export (modal independente), a correspondência de **boards** não é garantida. *Mitigação sugerida (fora do âmbito deste reporte):* copy na UI, revisão de TSD, ou pré-selecionar no modal o alinhado ao escopo.
2. **🟡 IPD DoD D4** (“mesmo `BoardHoursInput` para tabela e CSV” em leitura estrita) — o CSV continua a refletir **apenas** os boards carregados na confirmação de export; a tabela reflete o fluxo de prévia. Documentar no planeamento/ADR se a equipa quiser fechar 100% com o IPD v1.0.0.

---

## 7. Indicações para code-reviewer / tester

- **GO** para review de código: domínio (`taskHoursCsv`, `hoursExport`) e UI de hours estão coerentes com contratos e testes.
- Focar review em: semântica aceitável de **R1**; testids `hours-export-*`, `hours-scope-*`.
- Tester manual sugerido: (1) prévia “Todos” com um board 404/null simulado se possível; (2) export com subset do modal; (3) export com board que falha a carga → erro, sem ficheiro.

---

## 8. Veredicto final

| Resultado | Detalhe |
|-----------|---------|
| **⚠️ APROVADO COM RESSALVAS** | Validação automatizada verde; RF-07 atómico no export satisfeito; ressalvas de alinhamento RF-04 / D4 (produto + doc). |
| **Bloqueadores** | Nenhum para merge por qualidade de build/teste. |

**Próximo passo recomendado:** code-review; opcional: ajuste de copy ou TSD se a equipa quiser fechar a ambiguidade **RF-04** em UI desacoplada.
