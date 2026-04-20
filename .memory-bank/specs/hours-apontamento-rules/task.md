# task.md — hours-apontamento-rules

**Origem:** `planner-TASK.md` (D1–D6) + ressalvas `plan-reviewer-TASK.md` (A1–A3)  
**Track:** TASK  
**Decisão travada para implementação:** D6 **Opção A** — após fim de janela ou período não contábil, o próximo `activeStartMs` é o **início da próxima janela válida** (não limpar até novo drag).  
**Alinhamento A1 (D4×D5):** sempre que existir `workingHours` ativo, após qualquer passo que defina `activeStartMs` para um novo dia ou após meia-noite, o valor contábil deve ser o **início da janela daquele dia civil** se o instante “bruto” cair antes do expediente; em conjunto com o pipeline dia → janela, evitar intervalo aberto fora da faixa.

---

## T1 — Contrato persistido e default do board

**Objetivo:** Permitir armazenar a janela de trabalho opcional no documento do quadro sem quebrar JSON existente.

**Rastreio IPD:** §5 (Persistência), D5, `state.yaml` escopo in.

**Áreas:** `apps/flowboard/src/infrastructure/persistence/types.ts`, `apps/flowboard/src/infrastructure/persistence/boardFactory.ts`, qualquer loader/normalizador de board que assuma formato fixo (se existir além do factory).

**Dependências:** nenhuma.

**Entregável:** Tipo opcional `workingHours` documentado no `BoardDocumentJson`; boards novos sem valor explícito equivalem a “sem janela” (24h contábil legado); documentos antigos sem campo continuam válidos.

**Check de conclusão:**
- Campo opcional presente no tipo; ausência não exige migração destrutiva.
- Novos boards criados pelo factory não quebram consumidores existentes.

**Atenção:** Não subir `schemaVersion` sem necessidade; validar que o cliente tolera campo novo no JSON.

---

## T2 — Domínio: divisão por dia civil

**Objetivo:** Expressar intervalos wall-clock como lista de segmentos fechados, cada um contido em um único dia civil local.

**Rastreio IPD:** §4 D1, D3; DoD item “mesmo dia local”.

**Áreas:** `apps/flowboard/src/domain/hoursProjection.ts` e/ou `apps/flowboard/src/domain/timeSegments.ts` (se criado).

**Dependências:** T1 não é estritamente necessária; pode paralelizar com T1, mas deve anteceder T4.

**Entregável:** Função pura de split por meia-noite local (assinatura e comportamento alinhados ao IPD §4 D3), com testes unitários que cubram dois dias consecutivos e borda 23:59:59.999.

**Check de conclusão:**
- Nenhum segmento retornado tem `startMs` e `endMs` em dias civis locais diferentes.
- Testes Vitest verdes para o módulo.

---

## T3 — Domínio: interseção com janela de trabalho

**Objetivo:** Recortar intervalos (já preferencialmente dentro de um dia) pela faixa `startMinute`–`endMinute`, descartando vazios.

**Rastreio IPD:** §4 D5; DoD “fora da faixa não entra”; fora de escopo turno noturno.

**Áreas:** `apps/flowboard/src/domain/workingHours.ts` (recomendado) ou extensão de `hoursProjection.ts`.

**Dependências:** T2 recomendada (ordem dia → janela).

**Entregável:** Função pura `clipIntervalToWorkingHours` (ou equivalente) com `workingHours` opcional; quando `undefined`, retorno equivalente ao intervalo de entrada (paridade legado).

**Check de conclusão:**
- Com janela 9–18, intervalo 08:00–20:00 no mesmo dia produz apenas o trecho 9–18.
- Sem `workingHours`, saída reflete entrada (teste de regressão).

---

## T4 — Domínio: pipeline único “bruto → dia → janela”

**Objetivo:** Orquestrar (1) intervalo bruto, (2) split por dia, (3) clip por dia pela janela, (4) lista final de `CompletedSegment` persistível.

**Rastreio IPD:** §4 último parágrafo D6; A3 (loop multi-dia).

**Áreas:** `apps/flowboard/src/domain/timeSegments.ts` (opcional) ou módulo dedicado; consumido por `timeEngine.ts`.

**Dependências:** T2, T3.

**Entregável:** API de domínio única usada ao fechar tempo e ao reconciliar; documentada para o implementer da T5.

**Check de conclusão:**
- Ordem **sempre** dia civil, depois janela, conforme `state.yaml` decisão “Ordem das transformações”.
- Testes com intervalo que cruza dois dias **e** janela em cada dia.

---

## T5 — Domínio: `reconcileTimeStateWithCardPositions` (D2)

**Objetivo:** Garantir que card fora de `in_progress` não mantenha `activeStartMs`.

**Rastreio IPD:** §4 D2; DoD “nunca mantém activeStartMs”.

**Áreas:** `apps/flowboard/src/domain/timeEngine.ts` (ou arquivo colateral de domínio importado por ele).

**Dependências:** pode iniciar após T1; integração em Board em T6.

**Entregável:** Função pura aplicável a `cards`, `columns`, `TimeBoardState`; limpa `activeStartMs` sem criar segmento quando papel ≠ `in_progress`.

**Check de conclusão:**
- Teste: card em backlog com `activeStartMs` definido → após reconciliação, campo ausente e nenhum novo `completed`.

---

## T6 — Domínio: estender `applyCardMove` e reconciliação de ativo (D4, D6, A1)

**Objetivo:** Ao mover para `done`, produzir um ou mais segmentos completos via pipeline T4; reconciliar timer aberto para meia-noite, fim de janela e reentrada, com **loop** até estado coerente com `now` (aba dormindo vários dias).

**Rastreio IPD:** §4 D3–D6; ressalvas A1, A3; decisão Opção A.

**Áreas:** `apps/flowboard/src/domain/timeEngine.ts`, `apps/flowboard/src/domain/timeEngine.test.ts`.

**Dependências:** T2, T3, T4, T5; assinaturas recebem `workingHours` opcional e colunas.

**Entregável:** Comportamento atual preservado quando `workingHours` ausente (testes de regressão); novos casos: done após meia-noite; ativo atravessa meia-noite; ativo atravessa fim de janela com Opção A; `activeStartMs` após virada de dia com janela = início da janela **daquele** dia civil quando aplicável (fecha A1).

**Check de conclusão:**
- Todos os testes novos e existentes em `timeEngine.test.ts` passam.
- Nenhum segmento `completed` viola dia único nem (com janela) minutos fora da faixa.

---

## T7 — Bridge: garantir múltiplos apontamentos por transição

**Objetivo:** Assegurar que vários novos elementos em `completed` geram múltiplas entradas em `timeSegments` com UUID distinto.

**Rastreio IPD:** §5 Bridge; DoD UUID.

**Áreas:** `apps/flowboard/src/features/board/timeBridge.ts`; testes (Vitest) dedicados se não houver cobertura indireta suficiente via T6.

**Dependências:** T6.

**Entregável:** Comportamento confirmado por teste ou evidência de que `appendNewSegments` já cobre `n - p > 1` de forma estável.

**Check de conclusão:**
- Cenário com dois segmentos novos numa única transição grava dois itens em `timeSegments`.

---

## T8 — UI + fluxo Board: configurar janela e reconciliar tempo

**Objetivo:** Expor formulário “Horário de trabalho” (habilitar + início/fim, validar `start < end` mesmo dia); persistir no doc; rodar reconciliação periódica e em `visibilitychange` usando a mesma rotina de commit de tempo do drag.

**Rastreio IPD:** §5 UI, D6 gatilhos; §7 riscos save concorrente.

**Áreas:** `apps/flowboard/src/features/board/BoardView.tsx`; modal novo ou extensão de `ColumnEditorModal.tsx` / fluxo de edição do board conforme IPD.

**Dependências:** T1, T6, T7.

**Entregável:** Usuário consegue ligar/desligar janela e salvar; ao carregar board, D2 aplicado; ticks reconciliam bordas de dia e janela sem duplicar persistência desnecessária (debounce ou caminho único de escrita conforme mitigação §7).

**Check de conclusão:**
- Alterar janela e recarregar mantém valor.
- Nenhum erro de consistência entre `cardTimeState` e `timeSegments` após uso normal.

---

## T9 — Verificação final DoD e qualidade

**Objetivo:** Fechar checklist do IPD §6 e `state.yaml` acceptance_criteria; rodar lint e testes do pacote conforme convenção do repositório.

**Rastreio IPD:** §6; `state.yaml`.

**Áreas:** suite Vitest, ESLint do pacote `apps/flowboard`.

**Dependências:** T1–T8.

**Entregável:** Todos os itens DoD marcados como atendidos com evidência (testes ou comportamento verificado); E2E apenas se IPD mantiver como opcional.

**Check de conclusão:**
- DoD §6 integralmente satisfeito.
- `npm test` e `npm run lint` em `apps/flowboard` sem falhas (ou comandos equivalentes acordados no repo).

---

## Matriz de rastreabilidade

| Task | Seções IPD | Arquivos / áreas | DoD / teste |
|------|------------|------------------|-------------|
| T1 | §5, D5 | `types.ts`, `boardFactory.ts` | DoD persistência; regressão sem campo |
| T2 | D1, D3 | `hoursProjection` / `timeSegments` | DoD mesmo dia civil |
| T3 | D5 | `workingHours.ts` ou `hoursProjection` | DoD fora da faixa |
| T4 | D6 composição | pipeline domínio | DoD combinação dia+janela |
| T5 | D2 | `timeEngine` | DoD sem fantasma `activeStartMs` |
| T6 | D3–D6, A1, A3 | `timeEngine`, `timeEngine.test` | DoD principal + regressão |
| T7 | §5 Bridge | `timeBridge` (+ teste) | DoD UUID múltiplos |
| T8 | §5 UI, D6 | `BoardView`, modal | Critérios aceite UX/persistência |
| T9 | §6 | pacote flowboard | Lint + test + DoD fechado |

---

```json
{
  "agent": "task-breakdown",
  "status": "success",
  "ipd_source": ".memory-bank/specs/hours-apontamento-rules/planner-TASK.md",
  "total_tasks": 9,
  "complexity": "M",
  "blocked_tasks": 0,
  "blockers": [],
  "task_md_path": ".memory-bank/specs/hours-apontamento-rules/task.md"
}
```
