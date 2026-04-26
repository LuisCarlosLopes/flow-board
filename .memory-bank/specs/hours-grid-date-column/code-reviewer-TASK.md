# Code Review Report — `hours-grid-date-column` (FlowBoard)
> Data: 2026-04-26 | Agente: code-reviewer | Módulos: quality (corretude, contratos, testes)

## Contexto
**Linguagem/Stack:** TypeScript (strict), React 19, Vitest (happy-dom)  
**Contexto de execução:** SPA no browser; agregação pura com epoch ms; formatação de datas com calendário local do runtime.  
**Escopo revisto (IPD + diff):**  
`apps/flowboard/src/domain/hoursAggregation.ts`, `hoursAggregation.test.ts`, `taskHoursCsv.ts`, `taskHoursCsv.test.ts`, `features/hours/HoursView.tsx`, `HoursView.css`  
**Módulos aplicados:** quality — foco explícito: R09, min/max só de segmentos incluídos, `colSpan`, contrato CSV, adequação de testes.

**Verificação cruzada:** `segmentsCompletedInPeriod` em `hoursProjection.ts` (R09: `endMs` dentro de `[period.startMs, period.endMs]`) alinha-se com a agregação: só após `inPeriod.length > 0` a linha acumula duração e min/max de `endMs`.

---

### 🔴 Problemas Críticos
Nenhum encontrado.

---

### 🟠 Problemas Altos
Nenhum encontrado.

---

### 🟡 Problemas Médios
Nenhum encontrado.

---

### 🔵 Baixo / Info

🔵 [QUALIDADE] Testes unitários ausentes para helpers de rótulo pt-BR

**LOCALIZAÇÃO:** `apps/flowboard/src/domain/taskHoursCsv.ts` — funções `formatLocalDatePtBrFromMs`, `formatSegmentEndRangePtBr` (aprox. linhas 18–31)  
**PROBLEMA:** A semântica exibida na grid depende desses formatadores; não há casos dedicados em `taskHoursCsv.test.ts` (o IPD §5 admite testes de string frágeis a TZ como opcionais). A regressão de formatação só seria pega indiretamente ou por E2E.  
**EVIDÊNCIA:** `taskHoursCsv.test.ts` cobre `formatHoursPtBr`, `escapeCsvField`, `periodToCsvFields`, `formatLocalDateYmdFromMs`, `buildTaskHoursCsv`, mas não importa/asserção sobre `formatSegmentEndRangePtBr`.  
**CORREÇÃO (opcional):** Com `process.env.TZ` fixo (já usado no arquivo), adicionar 1–2 testes: `min===max` → uma data; `min!==max` → duas datas com o separador ` – `; ou extrair o separador numa constante e testar só a composição.  
**JUSTIFICATIVA:** Aumenta confiança sem duplicar o escopo de testes de agregação; alinha-se ao desejo de evitar flakiness por TZ em `hoursAggregation.test.ts`.

---

⚪ [QUALIDADE] Fixture CSV com `segmentEndMsMin` / `Max` em `0` é pouco idiomática

**LOCALIZAÇÃO:** `apps/flowboard/src/domain/taskHoursCsv.test.ts` — objeto de linha no teste “serializes row with escaping like TSD example” (aprox. linhas 96–105)  
**PROBLEMA:** O tipo exige os campos aditivos; `0`/`0` não corresponde a um agregado real e pode confundir leitores futuros, embora `buildTaskHoursCsv` ignore esses campos.  
**EVIDÊNCIA:**
```ts
segmentEndMsMin: 0,
segmentEndMsMax: 0,
```
**CORREÇÃO:** Substituir por timestamps plausíveis (ex. `Date.UTC(2026, 3, 22, 12, 0, 0)`) em ambos se `min===max`, ou pares distintos coerentes com o `period` do teste.  
**JUSTIFICATIVA:** Melhora a legibilidade do fixture sem alterar o contrato de saída do CSV.

---

## Resumo
| Campo | Valor |
|-------|-------|
| Total de achados | 2 |
| Críticos | 0 |
| Altos | 0 |
| Médios | 0 |
| Baixos / Info | 2 |
| **Recomendação** | **APROVAR** |
| Correção prioritária | Nenhuma obrigatória; opcional: testes mínimos para `formatSegmentEndRangePtBr` com TZ fixo em `taskHoursCsv.test.ts` |

---

### Evidência de aderência ao IPD (foco do pedido)

| Critério | Veredito |
|----------|----------|
| **R09 preservada** | OK: duração continua `endMs - startMs` do segmento inteiro; filtro inalterado via `segmentsCompletedInPeriod` antes de acumular. |
| **min/max só de segmentos incluídos** | OK: `continue` quando `inPeriod` vazio; primeiro merge inicializa e atualiza só com `endMs` de segmentos aceitos. |
| **UI `colSpan`** | OK: 5 colunas (Tarefa, Quadro, Data, Tempo, Ações); `tfoot` com `colSpan={3}` + célula Tempo + célula Ações vazia = 5. |
| **Sem quebra de contrato CSV** | OK: `TASK_HOURS_CSV_HEADER` e corpo de `buildTaskHoursCsv` inalterados; novos campos em `TaskHoursRow` não serializados. |
| **Testes (§6 IPD)** | OK: “um dia (mesmo endMs)”, “vários dias + regressão de soma”, “mix in/out R09” presentes em `hoursAggregation.test.ts`. |

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "modules_loaded": ["quality"],
  "findings_total": 2,
  "findings_critical": 0,
  "findings_high": 0,
  "findings_medium": 0,
  "findings_low": 1,
  "findings_info": 1,
  "tagger_missing": 0,
  "tagger_inadequate": 0,
  "recommendation": "APROVAR",
  "priority_fix": "None required",
  "report_path": ".memory-bank/specs/hours-grid-date-column/code-reviewer-TASK.md"
}
```
