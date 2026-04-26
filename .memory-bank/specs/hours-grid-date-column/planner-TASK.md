# IPD: Coluna Data na grid Horas no período — v1.0

> **Confiança:** 92/100 | **Complexidade:** S | **Data:** 2026-04-26  
> **Track:** TASK | **Slug:** `hours-grid-date-column` | **Subtask ID:** null  
> **Artefato canônico:** `.memory-bank/specs/hours-grid-date-column/planner-TASK.md`

---

## 1. MISSÃO

**Objetivo:** Incluir na tabela “Horas no período” uma coluna **Data** que, por linha (quadro + tarefa), mostre o intervalo civil **local** entre o menor e o maior `endMs` dos segmentos cuja conclusão entra na agregação do período (regra R09 já usada em `aggregateTaskHoursForPeriod`); se `min === max`, exibir um único dia. Formato de exibição **pt-BR**. Ordenação por duração, totais e fluxo de edição de horas permanecem como hoje.

**Contexto:** A agregação já filtra por `endMs` dentro do período (`segmentsCompletedInPeriod`); a UI não mostra *quando* esses segmentos foram concluídos. A coluna fecha essa lacuna sem alterar o contrato de export CSV nesta task (ver `state.yaml` / riscos).

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura relevante (verificada)

```
apps/flowboard/src/
├── domain/
│   ├── hoursAggregation.ts      ← agregação R09, tipo TaskHoursRow
│   ├── hoursAggregation.test.ts
│   ├── taskHoursCsv.ts          ← formatLocalDateYmdFromMs (calendário local)
│   └── hoursProjection.ts       ← PeriodRange, segmentsCompletedInPeriod (NÃO alterar contrato)
└── features/hours/
    ├── HoursView.tsx            ← tabela thead: Tarefa | Quadro | Tempo | Ações
    └── HoursView.css            ← ajuste opcional de layout/coluna
```

### 2.2 Stack e convenções

| Dimensão | Valor |
|---|---|
| Linguagem | TypeScript (strict), React 19 |
| Build / test | Vite, Vitest (happy-dom), testes colocados em `*.test.ts` junto ao domínio |
| Datas na UI | `Intl.DateTimeFormat('pt-BR', …)` e `toLocaleDateString('pt-BR')` já usados em `HoursView` (ex.: `periodDescription`) |
| Datas no domínio CSV | `formatLocalDateYmdFromMs` em `taskHoursCsv.ts` — **mesma semântica** (calendário civil local do runtime) |

### 2.3 Contratos a preservar

- **`aggregateTaskHoursForPeriod(boards, period): TaskHoursRow[]`** — manter assinatura e ordenação **por `durationMs` decrescente**.
- **R09:** só entram segmentos cujo `endMs` cai no período; duração somada continua sendo `endMs - startMs` do segmento inteiro (comportamento atual dos testes T10).
- **`BoardHoursInput`** — inalterado.
- **`buildTaskHoursCsv` / `TASK_HOURS_CSV_HEADER`** — **não obrigatório** alterar nesta task (`state.yaml` scope out). Novos campos em `TaskHoursRow` devem ser **aditivos** para não exigir mudança no CSV.

### 2.4 Módulo de referência

- **`taskHoursCsv.ts`** — reutilizar ou espelhar a ideia de “data local a partir de `ms`” (`formatLocalDateYmdFromMs`). Para a **grid**, preferir **rótulo pt-BR legível** (ex. dia/mês/ano via `Intl`), não necessariamente o formato ISO do CSV.
- **`HoursView.tsx`** — alinhar estilo de intervalo ao padrão já usado em `periodDescription` para semana (`" – "` entre duas datas `pt-BR`).

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

- [ ] **Funcional:** Cabeçalho **Data** na grid; cada linha mostra intervalo civil local `min(endMs)…max(endMs)` dos segmentos contabilizados no período, ou um único dia se coincidirem.
- [ ] **Funcional:** `tfoot` “Total” permanece correto (só **Tempo** somado; células de **Data** vazias ou neutras; `colSpan` coerente com o número de colunas).
- [ ] **Funcional:** Ordenação das linhas inalterada; botão **Editar** e modal de edição continuam operando (estado `edit` pode carregar o row estendido; domínio de persistência não depende dos novos campos).
- [ ] **Testes:** `hoursAggregation.test.ts` cobre agregação de **min/max endMs** (casos abaixo na §6).
- [ ] **Qualidade:** `npm test` / lint no escopo tocado sem regressões; tipos consistentes (callers de `TaskHoursRow` compilam).

---

## 4. ESPECIFICAÇÃO TÉCNICA

### 4.1 Contrato da feature (domínio + UI)

**Domínio — extensão de `TaskHoursRow` (aditiva):**

- Incluir dois campos numéricos derivados da agregação, por exemplo:
  - `segmentEndMsMin: number`
  - `segmentEndMsMax: number`  
  Semântica: entre todos os segmentos daquele `boardId`+`cardId` que passam pelo filtro R09 no período, `segmentEndMsMin = min(endMs)`, `segmentEndMsMax = max(endMs)`. Invariante: `segmentEndMsMin <= segmentEndMsMax`.

**Atualização em `aggregateTaskHoursForPeriod`:**

- Ao **criar** entrada no map: inicializar min/max com o `endMs` do segmento aceito.
- Ao **somar** duração em entrada existente: `segmentEndMsMin = Math.min(prev, endMs)`, `segmentEndMsMax = Math.max(prev, endMs)`.

**UI — `HoursView.tsx`:**

- Nova coluna **Data** (posição sugerida: após **Quadro**, antes de **Tempo**, para leitura natural “tarefa / onde / quando / quanto”).
- Função pura local ou importada, ex.: `formatSegmentEndRangePtBr(minMs, maxMs): string`:
  - Se `minMs === maxMs`: uma data `pt-BR` (mesmo estilo que o restante da página).
  - Caso contrário: `dataInicial + " – " + dataFinal` (espelhar `periodDescription` semana).

**Onde colocar o formatador:**

- **Preferência:** função pequena em `taskHoursCsv.ts` ao lado de `formatLocalDateYmdFromMs` (ex. `formatLocalDatePtBrFromMs`) para centralizar “ms → calendário local”, e compor o intervalo em `HoursView` **ou** num helper exportado mínimo — evita duplicar lógica de `Date`/`getFullYear` etc.
- **Alternativa aceitável:** helper privado só em `HoursView.tsx` se o time quiser evitar tocar `taskHoursCsv.ts` (mirror explícito da semântica de `formatLocalDateYmdFromMs`).

### 4.2 Fluxo de execução

1. Carregar documentos e montar `BoardHoursInput[]` (inalterado).
2. `aggregateTaskHoursForPeriod` produz linhas com `durationMs` + **min/max `endMs`** por linha.
3. `HoursView` renderiza tabela incluindo coluna **Data** formatada em pt-BR a partir de `segmentEndMsMin` / `segmentEndMsMax`.
4. Edição: `openEdit(row)` recebe `TaskHoursRow` estendido; apenas `durationMs` e identificadores importam para salvar — novos campos são só leitura na UI.

### 4.3 Mapa de alterações

| Ação | Arquivo | O que muda |
|---|---|---|
| **MODIFICAR** | `apps/flowboard/src/domain/hoursAggregation.ts` | Estender `TaskHoursRow`; em `aggregateTaskHoursForPeriod`, manter acumulador de min/max `endMs` por chave `boardId:cardId` apenas para segmentos incluídos no período. |
| **MODIFICAR** | `apps/flowboard/src/domain/hoursAggregation.test.ts` | Novos casos §6; atualizar fixtures existentes se o tipo exigir campos obrigatórios nos asserts. |
| **MODIFICAR** | `apps/flowboard/src/features/hours/HoursView.tsx` | Coluna **Data** + formatação pt-BR; ajuste de `colSpan` no `tfoot`. |
| **MODIFICAR (opcional)** | `apps/flowboard/src/domain/taskHoursCsv.ts` | Exportar helper de formatação data local pt-BR (recomendado para DRY). |
| **MODIFICAR (opcional)** | `apps/flowboard/src/features/hours/HoursView.css` | Largura mínima ou quebra de linha da coluna Data, se necessário. |
| **NÃO TOCAR (escopo)** | `buildTaskHoursCsv`, header CSV | Alinhamento CSV com coluna de datas é **follow-up opcional** (`state.yaml`). |
| **NÃO TOCAR** | `hoursProjection.ts` regra R09 | Apenas consumo; sem mudança de filtro. |

### 4.4 Dependências

- **Novas libs:** nenhuma.
- **Existentes:** `Math.min`/`max`, `Intl` / `Date` no browser; Vitest para testes.

---

## 5. GUARDRAILS

- Não mudar a regra **qual** segmento entra no período — só enriquecer a linha agregada.
- Não usar `startMs` para o rótulo da coluna **Data** (critério é **fim** do segmento / R09).
- Não persistir min/max no GitHub — valores sempre **derivados** na agregação.
- Evitar dependência de fuso em testes: testar **valores numéricos** min/max em `hoursAggregation.test.ts`; testes de string pt-BR são opcionais e podem ser frágeis a TZ do runner.

---

## 6. TESTES (`hoursAggregation.test.ts`)

Adicionar pelo menos:

1. **Um dia (min === max):** vários segmentos no período para o mesmo card com o **mesmo** `endMs` (diferentes `startMs`); esperar `segmentEndMsMin === segmentEndMsMax === endMs` comum.
2. **Vários dias:** dois ou mais segmentos no período com `endMs` distintos; esperar min e max corretos **e** `durationMs` ainda igual à soma das durações (regressão).
3. **Exclusão R09:** segmento com `endMs` fora do período não deve influenciar min/max (pode estender o teste “excludes segment when completion end is outside period” ou novo caso com mix dentro/fora).

Atualizar testes existentes que instanciam resultados esperados para incluir asserções nos novos campos (ou `expect.objectContaining` se preferir foco parcial).

**Fora do escopo obrigatório:** snapshot de string pt-BR na UI (E2E); só se o produto exigir.

---

## 7. RISCOS, ASSUNÇÕES E PONTOS DE ATENÇÃO

| Item | Detalhe |
|---|---|
| **CSV desalinhado semanticamente** | A grid mostrará intervalo por **segmentos da linha**; o CSV continua com colunas de **período global** + horas. Aceito como **fora de escopo** nesta task; documentar para possível follow-up (`state.yaml`). |
| **TZ do runner vs browser** | Agregação só manipula `number` (epoch ms); formatação roda no cliente — consistente com `formatLocalDateYmdFromMs`. |
| **Nome dos campos** | `segmentEndMsMin` / `segmentEndMsMax` são sugestão; implementer pode usar nomes equivalentes desde que documentados e únicos. |

---

## 8. PROTOCOLO DE AUTO-CORREÇÃO

- Se o build falhar por `TaskHoursRow` incompleto em algum literal de teste: completar campos min/max nos fixtures.
- Se o `tfoot` desalinhar colunas: revisar `colSpan` (5 colunas no corpo → total tipicamente `colSpan={3}` antes da célula de tempo).

---

## 9. FORMATO DE ENTREGA DO EXECUTOR

- Diff focado nos arquivos do mapa; sem alterações em export CSV obrigatórias.
- Comando de verificação sugerido: `cd apps/flowboard && npx vitest run src/domain/hoursAggregation.test.ts && npm run lint` (e testes de release notes apenas se tocar dados de versão — **não aplicável** aqui).

---

## 10. METADADOS

```json
{
  "agent": "planner",
  "status": "success",
  "slug": "hours-grid-date-column",
  "track": "TASK",
  "subtask_id": null,
  "confidence_score": 92,
  "artifact_path": ".memory-bank/specs/hours-grid-date-column/planner-TASK.md",
  "files_to_create": 0,
  "files_to_modify": 4,
  "files_not_touch": "CSV contrato obrigatório; hoursProjection R09",
  "blocking_decisions_count": 0,
  "non_blocking_assumptions_count": 1,
  "assumptions_documented": true,
  "complexity": "S",
  "migrations_needed": false
}
```

**Decision register (resumo):** Nenhuma decisão bloqueante. **Assunção não bloqueante:** posição da coluna **Data** entre Quadro e Tempo (ajustável sem impacto de domínio).

**Próximos passos:** `task-breakdown` → HITL → `implementer`.

**Sugestão fora de escopo:** Coluna opcional no CSV para intervalo de conclusão por linha, alinhada a `segmentEndMsMin`/`Max`.
