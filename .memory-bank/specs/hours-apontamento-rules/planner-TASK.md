# IPD — Regras de soma de horas e apontamento por dia civil

**Track:** TASK  
**Slug:** `hours-apontamento-rules`  
**Data:** 2026-04-20  
**Revisão:** 2026-04-20 — inclusão de janela de trabalho por board (D5–D6).

---

## 1. Contexto técnico atual

- Papéis de coluna: `ColumnRole = 'backlog' | 'in_progress' | 'done'` (`apps/flowboard/src/domain/types.ts`). O rótulo de UI “Em Progresso” corresponde a `in_progress`.
- Tempo por card: `CardTimeState` com `activeStartMs` (segmento aberto) e `completed[]` (segmentos fechados).
- Movimentação de cards: `applyCardMove` em `timeEngine.ts` implementa regras R01–R06 (abrir ao entrar em `in_progress`, fechar ao ir para `done`, descartar aberto ao sair de `in_progress` para não-done).
- Persistência incremental de apontamentos: `appendNewSegments` compara tamanho de `completed` antes/depois e grava novos itens em `doc.timeSegments`.
- Relatório de horas: `aggregateTaskHoursForPeriod` usa apenas `timeSegments` filtrados por `endMs` no período (R09).
- Documento do board (`BoardDocumentJson` em `apps/flowboard/src/infrastructure/persistence/types.ts`): hoje não há campo de jornada; colunas, cards, `timeSegments` e `cardTimeState`.

---

## 2. Objetivo de produto (traduzido)

1. **Só somar horas no papel Em Progresso:** Fora de `in_progress`, o card não deve acumular tempo válido (nem “fantasma” por estado inconsistente).
2. **Virada de dia = novo apontamento:** Qualquer trabalho contínuo que atravesse meia-noite **local** deve ser representado como **vários segmentos** (vários apontamentos), um por dia civil.
3. **Janela de trabalho configurável no board:** O usuário define a faixa horária em que o tempo conta (ex.: 09:00–18:00 no fuso local). Fora dessa faixa, **não soma** — reduz o problema de deixar o card em progresso à noite ou no fim de semana e “acumular” horas em período em que não está trabalhando.

---

## 3. Lacunas vs. comportamento desejado

| Necessidade | Comportamento atual (resumo) | Lacuna |
|-------------|------------------------------|--------|
| Não somar fora de `in_progress` | Só entra tempo concluído ao `in_progress → done`; `totalCompletedMs` usa só `completed` | Possível **inconsistência**: card com `activeStartMs` definido enquanto `columnId` não é `in_progress` (dados antigos, bug, edição de colunas). Esse tempo aberto não entra em `totalCompletedMs`, mas pode confundir e, em futuras transições, gerar segmentos indesejados. |
| Novo apontamento ao virar o dia | Um único segmento `[start, end]` ao fechar em `done`, mesmo cruzando dias | **Não há split** por dia civil; um apontamento pode cobrir >24h ou dois calendários. |
| Timer ativo à meia-noite | `activeStartMs` continua no dia anterior até o próximo evento | **Não há fechamento automático** ao virar o dia; o relatório por dia pode ficar desalinhado da expectativa de “um apontamento por dia”. |
| Não somar fora do expediente | Tempo em `in_progress` conta 24h se o card ficar aberto | **Não há limite por horário**; esquecimento overnight/fim de semana infla horas. |

---

## 4. Decisões de desenho (propostas)

### D1 — Dia civil

Usar **dia civil local** do browser, consistente com `localDayRange` / períodos em `hoursProjection.ts`.

### D2 — Consistência “card não está em in_progress”

Ao aplicar qualquer atualização de tempo que conheça `columns` + `card.columnId`:

- Se `roleOf(columns, card.columnId) !== 'in_progress'` e existir `activeStartMs`, **não criar segmento** a partir desse estado: **limpar** `activeStartMs` (reparo de dados; tempo não contado).

*Onde acionar:* no mínimo ao persistir/carregar board ou antes de `applyCardMove`; avaliar função única `reconcileTimeStateWithCardPositions(cards, columns, state)`.

### D3 — Split ao fechar segmento (`in_progress → done`)

Quando `endMs - startMs` cruza uma ou mais fronteiras de meia-noite local:

- Gerar **vários** `CompletedSegment`: para cada dia parcial, `startMs` = max(início real, 00:00:00 do dia), `endMs` = min(fim real, 23:59:59.999 do mesmo dia).
- Último pedaço termina em `nowMs` real.

Função pura sugerida: `splitSegmentByLocalDays(startMs, endMs): CompletedSegment[]` em domínio (ex.: `timeEngine.ts` ou `hoursProjection.ts`).

### D4 — Split com segmento ainda ativo (virada de dia com card em `in_progress`)

Quando `activeStartMs` existe e o relógio atual passa para um **novo dia local** em relação a `activeStartMs`:

1. Fechar automaticamente um segmento até o **fim do dia local** do dia de `activeStartMs` (inclusivo 23:59:59.999).
2. Acrescentar esse segmento a `completed`.
3. Definir novo `activeStartMs` = **início do dia local atual** (00:00:00.000) — mantendo o card em trabalho sem mover coluna.

*Gatilho no cliente:* `BoardView` (ou hook dedicado): `setInterval` conservador (ex.: 60s) + `document.visibilitychange` ao voltar para a aba, chamando rotina que recebe `Date.now()`, `cards`, `columns`, `timeState` e devolve estado atualizado + novos segmentos para `appendNewSegments`.

Constitution I: **lógica de split e reconciliação no domínio**; UI só orquestra tempo e chama funções puras + persistência já existente.

### D5 — Janela de trabalho por board (expediente)

- **Persistência:** campo opcional no JSON do board (ex.: `workingHours?: { startMinute: number; endMinute: number }` com minutos 0–1439 no **dia local**, ou par `"HH:mm"` normalizado no load). **Ausente ou null** = comportamento legado (**24h válidas**), para não alterar quadros existentes nem exigir migração destrutiva.
- **Regra:** todo intervalo de tempo que seria contabilizado (segmentos fechados e reconciliação do `activeStartMs`) passa por **interseção** com a janela do **mesmo dia civil local**. Trechos fora da faixa **não** viram `CompletedSegment` nem entram em `timeSegments`.
- **MVP de produto:** uma única faixa **por dia**, **sem cruzar meia-noite** (`startMinute < endMinute`). Casos `22:00–06:00` ficam para iteração futura (HITL se aparecer requisito).

### D6 — Reconciliação com a janela (timer aberto e esquecimento)

- **Fechamento implícito ao sair da janela:** quando o relógio atual ultrapassa o **fim** da janela no dia local e o card continua em `in_progress`, o domínio deve **encerar** o pedaço contável até `endMinute` daquele dia, gravar em `completed` (e `timeSegments`), e **ajustar** `activeStartMs`:
  - **Opção A (recomendada no MVP):** `activeStartMs` passa a ser o **início da próxima janela** (ex.: 09:00 do dia seguinte em timestamp UTC correspondente), mantendo o card “em progresso” mas sem contar o intervalo entre fim da janela e essa abertura.
  - **Opção B:** limpar `activeStartMs` até o usuário “reabrir” o trabalho (mais simples, porém exige novo evento para voltar a contar — pode divergir da expectativa de “card já está em Working”).
- **Reentrada:** ao cruzar o **início** da janela com timer ainda coerente com `in_progress`, garantir que novos segmentos só comecem a contar a partir do início da janela (alinhado à Opção A).
- **Composição com D3/D4:** ordem sugerida nos pipelines de domínio: (1) partir do intervalo bruto wall-clock; (2) **recortar por dia civil** (D3/D4); (3) **para cada pedaço diário**, **recortar pela janela D5**; (4) descartar pedaços de duração zero após o clip.

*Gatilhos no cliente:* além de intervalo + `visibilitychange`, considerar tick quando `now` atravessa `startMinute`/`endMinute` no dia atual (ou reconciliar “atrasado” ao focar a aba, como no plan-reviewer para multi-dia).

---

## 5. Mapa de alterações

| Área | Arquivo (previsto) | Alteração |
|------|-------------------|-----------|
| Persistência | `apps/flowboard/src/infrastructure/persistence/types.ts` | Estender `BoardDocumentJson` com `workingHours?` (e validar `schemaVersion` / defaults no load). |
| Persistência | `apps/flowboard/src/infrastructure/persistence/boardFactory.ts` | Default sem janela (24h) ou valor inicial documentado. |
| Domínio | `apps/flowboard/src/domain/hoursProjection.ts` ou novo `apps/flowboard/src/domain/workingHours.ts` | Helpers: limites do dia em ms, `clipIntervalToWorkingHours` (entrada: start/end ms + config; saída: lista de segmentos válidos). |
| Domínio | `apps/flowboard/src/domain/timeSegments.ts` (opcional) | Orquestrar `splitSegmentByLocalDays` + clip D5 num pipeline único testável. |
| Domínio | `apps/flowboard/src/domain/timeEngine.ts` | Integrar split + clip ao fechar (`in_progress → done`), reconciliações de active (D4 + D6); assinaturas podem receber `workingHours \| undefined`. |
| Domínio | `apps/flowboard/src/domain/timeEngine.test.ts` | Casos: expediente 9–18, card esquecido 08–20 → só ~9h; meia-noite + janela; config ausente = paridade com hoje. |
| Bridge | `apps/flowboard/src/features/board/timeBridge.ts` | Confirmar múltiplos `completed`; sem mudança obrigatória se API do domínio já emitir lista clipada. |
| UI | `apps/flowboard/src/features/board/BoardView.tsx` | Reconciliar bordas de janela (e dia) + persistir. |
| UI | Novo modal ou extensão de `ColumnEditorModal` / settings do board | Formulário “Horário de trabalho” (enable + início/fim), gravar no doc e validar `start < end` no mesmo dia. |
| Agregação | `apps/flowboard/src/domain/hoursAggregation.ts` | Provavelmente **sem mudança** se `timeSegments` já refletirem só tempo contábil. |
| E2E (opcional TASK) | `apps/flowboard/tests/e2e/...` | Smoke se houver forma estável de simular troca de data (senão manter cobertura em Vitest). |

---

## 6. Critérios de pronto (DoD técnico)

- [ ] Nenhum segmento concluído com `startMs` e `endMs` em **dias civis locais diferentes** (invariante verificada nos testes).
- [ ] Card cuja coluna atual não é `in_progress` nunca mantém `activeStartMs` após reconciliação.
- [ ] Com `workingHours` configurado, **nenhum** segmento gravado contém minutos **fora** da faixa no respectivo dia local (testes com horários fixos / fake timers).
- [ ] Com `workingHours` **ausente**, comportamento de horas totais permanece equivalente ao atual (teste de regressão).
- [ ] `appendNewSegments` + persistência geram um UUID por apontamento novo, como hoje.
- [ ] `npm test` no pacote `apps/flowboard` verde; sem regressão em `timeEngine.test.ts` existente.

---

## 7. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Múltiplos saves concorrentes ao virar meia-noite | Debounce ou flag curta “persistindo”; um único caminho de escrita de `cardTimeState`. |
| Fuso / DST | Documentar MVP: usa `Date` local; edge DST coberto por testes com datas fixas mockadas se necessário. |
| Performance interval | Intervalo 60s + visibilitychange costuma ser suficiente; não precisa tick por segundo. |
| Janela mal configurada ou borda DST | Validar `start < end` na UI; documentar MVP sem turno noturno; testes com datas mockadas próximas a DST se necessário. |
| Opção A vs B (D6) | Escolher uma antes do implementer; Opção A evita “buraco” de UX no card ainda em progresso. |

---

## 8. Próximo passo na squad

**task-breakdown:** gerar `task.md` com tarefas ordenadas (schema + UI de janela → helpers de data / clip → `applyCardMove` → reconciliação dia + janela → hook/UI → testes).

**plan-reviewer:** 2ª rodada concluída (2026-04-20) — ver `plan-reviewer-TASK.md` (ressalvas A1–A4).

---

## 9. Confirmações úteis do produto (HITL leve)

- **Pausa à meia-noite:** O trecho após 00:00 continua automático no mesmo card (novo `activeStartMs` à meia-noite) — confirma que não exige ação manual do usuário.
- **Fuso:** MVP = local do browser; a **janela** é interpretada no mesmo fuso (não há fuso por board).
- **Expediente:** Confirmar **Opção A** (próximo `activeStartMs` no próximo início de janela) vs **Opção B** (pausar até novo evento) em D6.
- **Default:** Janela desligada = 24h contábeis como hoje.

Se estas premissas estiverem erradas, ajustar D3–D6 antes do `implementer`.
