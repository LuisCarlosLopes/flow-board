# Implementation Plan Document (IPD) — Exportar apontamentos para CSV

| Campo | Valor |
|--------|--------|
| Slug | `export-apontamentos-csv` |
| Track | FEATURE |
| Versão IPD | 1.0.0 |
| TSD de referência | `.memory-bank/specs/export-apontamentos-csv/spec-feature.md` |
| Revisão TSD | `.memory-bank/specs/export-apontamentos-csv/spec-reviewer-feature.md` (GO com ressalvas — ver §2.5 e DoD) |
| Baseline código | `1030fd8777c6da92ad02175ef65d80dfdeaefd28` (alinhado a `state.yaml`) |

---

## 1. Missão

### 1.1 Objetivo

Entregar na vista **Horas no período** a exportação de apontamentos agregados para ficheiro **CSV** (`;`, UTF-8 com BOM, CRLF, horas em **pt-BR** com vírgula decimal), com filtros de **período** (mesma semântica que hoje) e **um ou mais quadros não arquivados** escolhidos explicitamente pelo utilizador, sem backend próprio, lendo apenas o GitHub já configurado na sessão.

### 1.2 Contexto

- A agregação existente (`aggregateTaskHoursForPeriod` + `PeriodRange`) já implementa a semântica de inclusão por **`endMs`**; a UI atual usa escopo binário «todos os quadros» / «quadro atual» e, ao carregar, **omite silenciosamente** quadros cujo `loadBoard` devolve `null` — o que conflita com **RF-07** / **RF-04** quando aplicados à exportação e à pré-visualização alinhada.
- O revisor de spec pediu: (i) **definição explícita de «R09»** em documentação de planeamento ou vínculo ao domínio; (ii) **rastreabilidade RF×CA** no DoD.

### 1.3 Critério de sucesso (resumo)

Utilizador consegue selecionar subconjunto de boards elegíveis, confirmar período, exportar um CSV que cumpre a secção 7 do TSD; cenários sem dados, zero boards, falha de carga e texto especial nos campos são tratados conforme spec; testes Vitest cobrem construtor CSV e reutilização da agregação.

---

## 2. Estado do Sistema

### 2.1 Stack e framework

- **TypeScript**, **React 19**, **Vite** (`apps/flowboard/`).
- Testes: **Vitest** + happy-dom; ficheiros co-localizados `*.test.ts` / `*.test.tsx`.
- Persistência: cliente **GitHub Contents API** via `createBoardRepository` / `createClientFromSession`.

### 2.2 Zona de trabalho (módulos afetados)

| Camada | Caminhos |
|--------|----------|
| UI | `apps/flowboard/src/features/hours/HoursView.tsx`, `HoursView.css` |
| Domínio (novo) | `apps/flowboard/src/domain/` — módulo dedicado ao CSV (serialização + composição de linhas a partir de `TaskHoursRow` + metadados de período) |
| Domínio (reutilizado) | `hoursAggregation.ts`, `hoursProjection.ts` |
| Infra (reutilizado) | `boardRepository.ts` — `loadCatalog`, `loadBoard` |
| Tipos | `infrastructure/persistence/types.ts` — `CatalogEntryJson.archived` |

### 2.3 Contratos que NÃO podem quebrar

- **`aggregateTaskHoursForPeriod(boards: BoardHoursInput[], period: PeriodRange): TaskHoursRow[]`** — ordenação atual por `durationMs` descendente deve ser **preservada** para **RNB-06** (export na mesma ordem que a tabela).
- **`PeriodRange`**, **`localDayRange` / `localWeekRange` / `localMonthRange`**, **`segmentsCompletedInPeriod`** — semântica civil local e inclusão por **`endMs`** ∈ `[startMs, endMs]` (inclusive).
- **`BoardHoursInput`** / **`TaskHoursRow`** — campos existentes; export pode **mapear** para colunas CSV sem alterar estes tipos (sinalização `card_arquivado` vem de conjunto auxiliar, como hoje com `archivedKeys`).
- **`loadCatalog` / `loadBoard`** — contratos do repositório; export não deve exigir novos endpoints GitHub.

### 2.4 Módulo de referência (padrão a seguir)

- **`hoursAggregation.ts`** + **`hoursAggregation.test.ts`** — lógica pura testada, comentário **R09** já no código.
- **`hoursProjection.test.ts`** — descreve `segmentsCompletedInPeriod (R09)` explicitamente.

### 2.5 Esclarecimentos do revisor (ressalvas A1–A4) endereçados neste IPD

**R09 / CA-03:** No código, **R09** é a regra «segmento conta no período pelo instante de **conclusão**»: `segmentsCompletedInPeriod` em ```32:38:apps/flowboard/src/domain/hoursProjection.ts
export function segmentsCompletedInPeriod(
  segments: CompletedSegment[],
  period: PeriodRange,
): CompletedSegment[] {
  return segments.filter((s) => s.endMs >= period.startMs && s.endMs <= period.endMs)
}
```
Reutilizada por `aggregateTaskHoursForPeriod` (comentário em ```21:24:apps/flowboard/src/domain/hoursAggregation.ts
/**
 * Soma durações por tarefa no período (R09: filtro pelo instante endMs do segmento).
 */
export function aggregateTaskHoursForPeriod(boards: BoardHoursInput[], period: PeriodRange): TaskHoursRow[] {
```
**CA-03** do TSD equivale a **RNB-02** + esta função; evidência de teste: `aggregateTaskHoursForPeriod (T10 / R09)` e `segmentsCompletedInPeriod (R09)` nos ficheiros de teste existentes.

**RF-01 / RF-02 sem CA dedicado:** Cobertos no **DoD** com matriz RF×CA e casos de teste/manuais explícitos (§3 e §6).

**RNB-04 / E1 (board deixa de ser elegível):** Coberto no DoD como **CA-E1** (extensão de rastreio) com verificação obrigatória: revalidar catálogo à confirmação da exportação; se algum `boardId` selecionado não estiver em `catalog.boards` com `archived !== true`, abortar com mensagem clara (sem CSV).

**Handoff sem checklist RF:** §3 contém tabela **RF → CA → evidência**.

---

## 3. Definition of Done (DoD)

### 3.1 Funcional (mensurável)

| ID | Requisito | Verificação |
|----|-----------|-------------|
| D1 | **RF-01** — Ação explícita de exportar CSV na área «Horas no período» | UI: controlo visível (botão ou equivalente) com `data-testid` estável; smoke manual ou E2E futuro opcional |
| D2 | **RF-02** — Período exportado = `periodKind` + `anchor` no momento da confirmação | Teste: linhas CSV com `periodo_tipo` / `periodo_inicio` / `periodo_fim` derivados do mesmo `PeriodRange` que `periodFor(kind, anchor)` |
| D3 | **RF-03** — Multi-board: apenas não arquivados; ≥1 obrigatório | **CA-02**: export desativado ou bloqueado com mensagem se nenhum board selecionado |
| D4 | **RF-04** — Linhas só dos boards selecionados; pré-visualização alinhada | Mesmo conjunto de `BoardHoursInput` para `setRows` e para geração CSV; carregamento **não** pode omitir board selecionado sem erro (ver D12) |
| D5 | **RF-05** — Colunas e ordem secção 7.1 + `card_arquivado` + títulos preservados | **CA-09** + inspeção de fixture |
| D6 | **RF-06** — Sem linhas agregadas: mensagem clara; **sem** ficheiro | **CA-07** |
| D7 | **RF-07** — Atomicidade: tudo ou nada | **CA-08**: se qualquer `loadBoard` falhar ou retornar `null` para board **selecionado**, erro explícito e **nenhum** download |
| D8 | **RF-08** — Cabeçalhos estáveis; texto com `;` `"` `\n` | **CA-06** (Vitest no builder) |
| D9 | **RNB-04 / E1** | **CA-E1**: após seleção, se catálogo revalidado mostrar board arquivado ou ausente, abortar export com mensagem para rever seleção |

### 3.2 Rastreabilidade RF × CA (fechamento revisor)

| RF | CA(s) principal(is) | Notas |
|----|---------------------|--------|
| RF-01 | CA implícito → **DoD D1** | Ação visível na vista Horas |
| RF-02 | **DoD D2** + colunas 7.1 | Snapshot do período na confirmação |
| RF-03 | CA-01, CA-02 | Multi-select + bloqueio zero |
| RF-04 | CA-01, **D4/D12** | Subconjunto + alinhamento preview |
| RF-05 | CA-05, CA-09 | Arquivado + schema colunas |
| RF-06 | CA-07 | Vazio |
| RF-07 | CA-08, **D12** | Falha carga |
| RF-08 | CA-06 | Quoting |

| CA | Domínio / teste principal |
|----|---------------------------|
| CA-01 | Integração: agregação com 2 boards, export parcial selecionado |
| CA-02 | UI ou teste de hook: 0 boards → bloqueado |
| CA-03 | Já coberto por `hoursAggregation.test.ts` / `hoursProjection.test.ts` (R09) |
| CA-04 | Idem exclusão `endMs` fora do período |
| CA-05 | Export com `archivedKeys` / `isCardArchived` |
| CA-06 | `taskHoursCsv.test.ts` (escaping) |
| CA-07 | Vitest ou teste de orquestração: 0 linhas → sem `buildDownload` |
| CA-08 | Teste: simular `loadBoard` → `null` num dos IDs → erro, sem string CSV completa |
| CA-09 | Snapshot do cabeçalho literal |
| CA-E1 | Teste unitário da função de validação pós-`loadCatalog` (entradas sintéticas) |

### 3.3 Qualidade e governança

- **Constitution I**: regras de serialização CSV, formatação de horas e validação de período **não** duplicadas na UI — concentradas em funções puras em `src/domain/` testadas por Vitest.
- **Constitution II**: sem novo backend; apenas leitura GitHub existente.
- **Cobertura**: >80% linhas nos novos módulos de domínio CSV e ramos de erro da orquestração de carga (conforme `AGENTS.md`).
- **Lint**: `eslint` limpo nos ficheiros tocados.
- **Release notes**: entrada em `apps/flowboard/src/data/releases.json` (uma versão ativa `archived: false`, changelog em inglês nos itens), alinhado a `AGENTS.md`.
- **CodeSteer Tags**: orquestração multi-etapa (export + carga atómica) e builder CSV — tags `@MindSpec` / `@MindFlow` / `@MindRisk` onde o contrato não for óbvio (Constitution VIII).

### 3.4 Edge cases (secção 9 TSD)

E2–E7 cobertos por combinação de agregação existente + testes CSV; **E8** = **CA-08** / **D12**.

---

## 4. Especificação Técnica

### 4.1 Contrato de API (módulo novo — planeado)

**Entradas conceituais** (implementação em funções puras, nomes finais em inglês no código):

- `periodKind: 'day' | 'week' | 'month'`
- `period: PeriodRange` (o mesmo objeto usado em `aggregateTaskHoursForPeriod`)
- `rows: TaskHoursRow[]` (ordenados como devolvidos pela agregação)
- `archivedCardKeys: Set<string>` com chave `${boardId}:${cardId}` (igual a `HoursView`)

**Saída:**

- `string` — corpo CSV completo: BOM UTF-8 + linhas com CRLF; primeira linha cabeçalho **exatamente**:
  `periodo_tipo;periodo_inicio;periodo_fim;board_id;board_titulo;card_id;card_titulo;card_arquivado;horas_totais`

**Funções sugeridas** (o executor pode colapsar num único ficheiro):

- `formatLocalDateYmd(d: Date): string` — `YYYY-MM-DD` em **calendário local** (reutilizar padrão mental de `dateInputValue` em `HoursView`, mas a partir de `period.startMs` / `period.endMs`).
- `periodToCsvFields(periodKind, period): { periodo_tipo; periodo_inicio; periodo_fim }` — `periodo_tipo` = `day` | `week` | `month` (valores estáveis TSD).
- `formatHoursPtBr(durationMs: number): string` — duas casas, vírgula, sem milhar; `0` → `0,00`.
- `escapeCsvFieldSemicolon(value: string): string` — regras §7.3 TSD (`;` `"` `\r` `\n` → quoting + `""`).
- `buildTaskHoursCsv(...): string` — junta cabeçalho + linhas.

**Política**: `horas_totais` sempre com vírgula decimal; delimitador `;`; linhas `\r\n`; prefixo `\uFEFF`.

### 4.2 Fluxo de Execução

1. Utilizador define **período** (`periodKind`, data âncora) — reutilizar estado e `period` existentes (`useMemo` + `periodFor`).
2. Utilizador marca **um ou mais** boards na lista derivada de `loadCatalog()` filtrada com `!entry.archived`.
3. **Pré-visualização / refresh**:  
   - Para cada `boardId` na seleção (ou para o conjunto que alimenta a tabela), chamar `loadBoard(boardId)`.  
   - Se **qualquer** chamada falhar (exceção) ou retornar **`null`** → estado de **erro** global na vista, **sem** atualizar `rows` com dados parciais (alinhado **RF-07** / **RF-04**).  
   - Caso contrário, mapear documentos com `toBoardHoursInput`, `aggregateTaskHoursForPeriod(inputs, period)`, atualizar `archivedKeys` como hoje.
4. **Exportar**:  
   - Revalidar **CA-E1**: novo `loadCatalog()`; verificar cada id selecionado ainda elegível.  
   - Revalidar **RF-07**: carregar **todos** os boards selecionados (ou reutilizar cache em memória **apenas** se o executor documentar janela de consistência; o default seguro é recarregar para export para evitar SHA stale — **assunção A** abaixo).  
   - Se `rows.length === 0` → mensagem **RF-06**, não criar `Blob`.  
   - Caso contrário `buildTaskHoursCsv` + `Blob` + download (`text/csv;charset=utf-8`) com nome estável, ex. `flowboard-horas-{periodo_inicio}_{periodo_fim}.csv` (detalhe permitido ao implementer desde que não viole MVP).

### 4.3 Mapa de Alterações

| Ação | Caminho | Notas |
|------|---------|--------|
| **CRIAR** | `apps/flowboard/src/domain/taskHoursCsv.ts` (nome final pode ser ajustado) | Builder puro + helpers de data/horas/escape |
| **CRIAR** | `apps/flowboard/src/domain/taskHoursCsv.test.ts` | Escaping, BOM/CRLF, cabeçalho, `horas_totais`, bordas |
| **MODIFICAR** | `apps/flowboard/src/features/hours/HoursView.tsx` | Multi-select boards; botão export; carga atómica; revalidação catálogo; integração com builder |
| **MODIFICAR** | `apps/flowboard/src/features/hours/HoursView.css` | Layout checkboxes / lista de boards e ação de export |
| **MODIFICAR** | `apps/flowboard/src/data/releases.json` | Novo release conforme `AGENTS.md` |
| **NÃO TOCAR** | `apps/flowboard/src/infrastructure/github/*` (salvo import já usado) | Sem mudança de contrato GitHub |
| **NÃO TOCAR** | Modelo JSON persistido / ADRs | Fora de escopo TSD |
| **OPCIONAL** | `apps/flowboard/src/domain/hoursAggregation.test.ts` | Acrescentar caso integração «dois boards, filtro seleção» se útil para **CA-01** |

### 4.4 Dependências

- **Existentes**: React, `BoardDocumentJson`, `createBoardRepository`, `aggregateTaskHoursForPeriod`, `PeriodRange`, `isCardArchived`.
- **Novas libs npm**: **não** (preferir APIs de `Blob` / `URL` nativas).
- **Variáveis de ambiente**: nenhuma nova.

---

## 5. Guardrails

- **Não** persistir PAT nem dados de export no repositório de dados.
- **Não** gerar CSV parcial quando um board selecionado não carrega — proibido silenciar `loadBoard === null` para conjuntos selecionados.
- **Não** duplicar a regra R09 na UI — sempre `aggregateTaskHoursForPeriod` + mesmo `PeriodRange` que a tabela.
- **Não** incluir boards arquivados na lista de seleção (TSD + `state.yaml`).
- **Não** alterar a ordenação da agregação sem alinhar **RNB-06** e o TSD.

---

## 6. Testes

### 6.1 Vitest — `taskHoursCsv.test.ts` (prioritário)

- Cabeçalho **CA-09** (string exata ou comparação normalizada com BOM).
- **CA-06**: campos com `;`, `"`, `\n`, `\r\n` não deslocam colunas (parser simples ou expect de substring com quoting).
- **horas_totais**: `0`, arredondamento duas casas, vírgula.
- **CRLF** entre linhas; ficheiro começa com BOM.
- `periodo_tipo` e datas civis a partir de `PeriodRange` de fixture (fixar timezone em testes sensíveis ou usar `PeriodRange` numérico + datas esperadas calculadas como o domínio local faz).

### 6.2 Vitest — integração agregação / export

- Dado fixture `BoardHoursInput[]` + `PeriodRange`, verificar que o CSV gerado contém apenas boards pretendidos (**CA-01**) e durações coerentes com `aggregateTaskHoursForPeriod`.
- **CA-08** (estilo integração): mock do repositório ou função auxiliar `loadSelectedBoardsOrThrow` que propaga falha — um board em falta → função de export aborta sem string final.

### 6.3 UI / E2E

- **Opcional** nesta entrega: um teste Playwright pode seguir depois; o IPD prioriza Vitest conforme inputs.

---

## 7. Riscos, Assunções e Pontos de Atenção

| Item | Tipo | Mitigação |
|------|------|-----------|
| **A — Recarregar boards na export** | Assunção não bloqueante | Default: segundo passe de `loadBoard` na confirmação para consistência; se o implementer reutilizar dados em memória, documentar risco de dados desatualizados vs. performance. |
| Catálogo grande | Risco UX | Lista rolável; sem requisito numérico no TSD (S3 revisor). |
| Timezone / datas CSV | Risco | Derivar `periodo_inicio`/`fim` dos mesmos `startMs`/`endMs` que definem o período civil na app; testes com datas fixas em `Date` local. |
| Comportamento atual `load()` ignora `null` | Risco de regressão | Corrigir para seleção multi-board + erro explícito; validar que «todos os quadros» também falha se algum board do catálogo não carregar (comportamento mais estrito, alinhado Constitution VI). |

---

## 8. Protocolo de Auto-Correção

1. Se o `plan-reviewer` apontar gap entre DoD e código, atualizar IPD para v1.0.1+ com matriz RF×CA ajustada.
2. Se `aggregateTaskHoursForPeriod` mudar ordenação no futuro, sincronizar **RNB-06** e testes de export.
3. Se GitHub devolver 404 para board removido, tratar como falha de carga (**CA-08**), não como lista vazia.

---

## 9. Formato de Entrega do Executor

- Diff focado; sem refactors alheios à feature.
- Ficheiros novos de domínio com testes.
- `releases.json` atualizado.
- Mensagem de commit convencional sugerida: `feat(hours): export task hours to CSV for selected boards`.

---

## 10. Metadados

| Campo | Valor |
|--------|--------|
| Confiança do plano | **92** / 100 |
| Complexidade estimada | **M** |
| Decisões bloqueantes em aberto | **0** |
| Assunções documentadas | **1** (recarga na export — §7) |

```json
{
  "agent": "planner",
  "status": "success",
  "slug": "export-apontamentos-csv",
  "track": "FEATURE",
  "subtask_id": null,
  "confidence_score": 92,
  "artifact_path": ".memory-bank/specs/export-apontamentos-csv/planner-FEATURE.md",
  "files_to_create": 2,
  "files_to_modify": 3,
  "files_not_touch": "múltiplos (github client, ADRs, modelo persistido)",
  "blocking_decisions_count": 0,
  "non_blocking_assumptions_count": 1,
  "assumptions_documented": true,
  "complexity": "M",
  "migrations_needed": false
}
```

---

## Próximos passos sugeridos

1. `plan-reviewer` sobre este IPD.  
2. `task-breakdown` → implementação.  
3. Opcional: alinhar `state.yaml` `squad.confidence` com TSD após execução (ressalva A6 do spec-reviewer).

## Sugestões fora de escopo (registo)

- Export por segmento; XLSX; inclusão de boards arquivados na UI de export.

## Decision Register (resumo)

- **Resolvidas na exploração:** mapeamento R09 → `hoursProjection` + `hoursAggregation`; catálogo `archived?`; testes Vitest existentes para R09.  
- **Resolvidas no plano:** RF×CA no DoD; CA-E1 para E1; atomicidade de carga vs. comportamento actual com `loadBoard` null.  
- **Assunção não bloqueante:** segunda leitura dos boards na confirmação de export (§7).
