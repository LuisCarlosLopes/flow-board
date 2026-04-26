# Delivery Report — Export apontamentos CSV

> IPD: `.memory-bank/specs/export-apontamentos-csv/planner-FEATURE.md` (1.0.0) | Task Breakdown: `task-breakdown-FEATURE.md` | Data: 2026-04-26

## Arquivos gerados ou modificados

| Ação | Arquivo | Status | Observação |
|------|---------|--------|------------|
| CRIAR | `apps/flowboard/src/domain/taskHoursCsv.ts` | OK | BOM, CRLF, `;`, TSD §7 |
| CRIAR | `apps/flowboard/src/domain/taskHoursCsv.test.ts` | OK | TZ=UTC nos testes de data |
| CRIAR | `apps/flowboard/src/domain/hoursExport.ts` | OK | CA-E1 + carga atómica reutilizável |
| CRIAR | `apps/flowboard/src/domain/hoursExport.test.ts` | OK | CA-01, CA-08, CA-E1 |
| MODIFICAR | `apps/flowboard/src/features/hours/HoursView.tsx` | OK | Multi-select, export, `loadSeqRef` anti‑corrida |
| MODIFICAR | `apps/flowboard/src/features/hours/HoursView.css` | OK | Painel de quadros + botão export |
| MODIFICAR | `apps/flowboard/src/data/releases.json` | OK | 0.3.0 ativo; 0.2.0 arquivado |
| MODIFICAR | `apps/flowboard/src/features/release-notes/ReleaseNotesPage.test.tsx` | OK | Expectativas alinhadas ao novo release |

## Checklist DoD (D1–D9)

| ID | Como foi atendido |
|----|-------------------|
| **D1** | Botão **Exportar CSV** na vista Horas com `data-testid="hours-export-csv"`. |
| **D2** | Export usa `periodFor(periodKind, anchor)` no clique (`periodSnapshot`) nas colunas `periodo_*` via `buildTaskHoursCsv`. |
| **D3** | Checkboxes só de boards `archived !== true`; ≥1 obrigatório — botão desabilitado e mensagem se zero selecionados. |
| **D4** | Pré-visualização = `aggregateTaskHoursForPeriod` sobre o mesmo subconjunto carregado com `loadBoardDocumentsOrThrow`; ordenação das linhas = saída da agregação (RNB-06). |
| **D5** | Cabeçalho e colunas conforme TSD §7.1; `card_arquivado` a partir do mesmo conjunto de chaves que a tabela. |
| **D6** | Se agregação após recarga no export tem 0 linhas → `MSG_EXPORT_EMPTY` e **sem** `Blob`/download. |
| **D7** | `loadBoardDocumentsOrThrow`: qualquer `null`/erro interrompe a carga; preview não atualiza `rows` com subset parcial em caso de erro no ramo feliz (erro global). |
| **D8** | `escapeCsvField` §7.3; cabeçalho estável `TASK_HOURS_CSV_HEADER`. |
| **D9** | `loadCatalog()` antes do export + `validateSelectedBoardsAgainstCatalog`; falha → mensagem CA-E1, sem ficheiro. |

## Fluxo de export (assunção A IPD)

Segundo passe completo: novo `loadCatalog`, validação de elegibilidade, novo `loadBoard` por id selecionado, depois agregação e CSV.

## Testes executados

```bash
cd apps/flowboard
npx eslint src/features/hours/HoursView.tsx src/domain/taskHoursCsv.ts src/domain/taskHoursCsv.test.ts src/domain/hoursExport.ts src/domain/hoursExport.test.ts
npx vitest run
npm run build
npx vitest run --coverage --pool=forks --maxWorkers=1   # relatório: taskHoursCsv.ts e hoursExport.ts com statements cobertos 100% no clover
```

**Nota:** `npm run lint` na raiz do app ainda emite *warnings* em artefactos gerados sob `coverage/` (pré-existente / após rodar cobertura); os ficheiros tocados da feature passam no eslint escopado.

## Divergências do plano original

| Divergência | Motivo | Impacto |
|-------------|--------|---------|
| `hoursExport.ts` além de só `taskHoursCsv.ts` | Funções puras reutilizáveis para CA-E1 e CA-08, sem tocar `infrastructure/github/*`. | Baixo — alinha ao §6.2 do IPD. |
| Atalho «só quadro atual» removido | Evita conflito com regra `react-hooks/rules-of-hooks` (nome `use*`) e mantém escopo pedido (multi-select explícito). | Baixo — `selectedBoardId` mantido na API do componente por compatibilidade com `AppShell`. |
| `loadSeqRef` | Evita que conclusões fora de ordem de `load()` sobrescrevam estado quando o utilizador altera checkboxes rápido. | Baixo — melhora robustez. |

## Status do task breakdown

| Task | Status final | Evidência |
|------|----------------|-----------|
| T1 | CONCLUÍDA | `taskHoursCsv.ts` |
| T2 | CONCLUÍDA | `taskHoursCsv.test.ts` |
| T3 | CONCLUÍDA | `HoursView.tsx` / `.css` |
| T4 | CONCLUÍDA | `handleExportCsv` + mensagens RF-06 / CA-E1 |
| T5 | CONCLUÍDA | `hoursExport.test.ts` + `hoursExport.ts` |
| T6 | CONCLUÍDA | `releases.json` + tags `@Mind*` em domínio/UI |
| T7 | CONCLUÍDA | lint escopado, vitest, build, cobertura módulos novos |

## Status final

**Implementação:** Completa  
**Bloqueadores:** Nenhum
