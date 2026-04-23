# TSD — Editar horas de apontamento (vista “Horas no período”)

| Campo | Valor |
|--------|--------|
| Slug | `edit-horas-apontamento` |
| Track | FEATURE |
| Data | 2026-04-22 |
| Confiança (escopo O QUÊ) | **72** — baseline de código inspecionado; regra exata de ajuste multi-segmento requer validação no `plan-reviewer` se surgirem alternativas equivalentes. |

## 1. Visão e problema

Hoje, em **Horas no período** (`HoursView`), a tabela lista tarefas com tempo total (decimal) e **não oferece edição**. Usuários precisam **corrigir** horas exibidas (erro de apontamento, ajuste manual) sem reabrir o quadro, com **modal** de edição e **persistência** no repositório GitHub, alinhada à Constitution (regras no domínio, mudança verificável).

## 2. Glossário

| Termo | Definição |
|--------|------------|
| **Linha de relatório** | Uma linha identificada por `(boardId, cardId)` na tabela; o tempo exibido é a soma de durações de **segmentos concluídos** cujo `endMs` cai no **período selecionado** (R09 / `hoursProjection.segmentsCompletedInPeriod`). |
| **Segmento** | Intervalo `[startMs, endMs]` em `BoardDocumentJson.timeSegments` (e espelhado em `cardTimeState[cardId].completed`). |
| **Período ativo** | Intervalo `PeriodRange` derivado de dia/semana/mês + âncora (`periodFor` em `HoursView`). |

**Evidência de agregação** — `aggregateTaskHoursForPeriod` soma a **duração integral** de cada segmento cujo `endMs` está no período; a chave da linha é `boardId:cardId` (`hoursAggregation.ts`).

## 3. Requisitos funcionais

### RF-01 — Ação de edição

- Cada **linha** da tabela (quando houver dados) expõe uma ação **explícita** para editar o tempo (ex.: botão “Editar” com ícone, ou célula de tempo com `button`/link acessível).
- **Acessibilidade:** foco, `aria-label` ou nome visível, e teclado (abrir modal sem depender só de hover).

### RF-02 — Modal

- Ao acionar, abre **modal** (padrão visual do app: foco preso, fechar com Esc, overlay).
- Conteúdo mínimo: **título da tarefa**, **nome do quadro**, valor atual em horas (formato coerente com a tabela, ex. duas casas decimais + unidade), **campo** para o novo total de horas no **período atual** (mesmo período/âncora/filtro da vista).
- Ações: **Cancelar** (descarta), **Salvar** (valida e persiste).
- **Estados:** carregando ao salvar; mensagem de erro se persistência falhar (GitHub, conflito, validação).

### RF-03 — Atualização da vista

- Após salvar com sucesso, a tabela e o **Total** refletem o novo valor; não é aceitável total desincronizado com as linhas.
- Opcional desejável: manter scroll/período; recarregar dados do repositório após write.

### RF-04 — Escopo de quadro

- Com filtro **Todos os quadros**, a linha sabe o `boardId` alvo; a edição grava **apenas** o documento daquele quadro.
- Com **Quadro atual**, o mesmo; se não houver quadro selecionado, o comportamento atual de escopo vazio permanece (sem linhas editáveis além do que já for exibido).

## 4. Regras de negócio

### RNB-01 — O que “editar horas” altera

- O usuário edita o **total exibido na linha** para o **período e filtros atuais**, isto é, o valor derivado da soma das durações dos segmentos **elegíveis** (mesma regra de inclusão que a agregação: `endMs` ∈ `[period.startMs, period.endMs]`).
- A edição **não** muda título de card, colunas ou período; só o conjunto de segmentos (ou durações) que alimenta esse total **para o período**.

### RNB-02 — Sincronização de persistência (obrigatório)

- O documento `BoardDocumentJson` mantém:
  - `timeSegments[]` — usado por `HoursView` via `toBoardHoursInput`.
  - `cardTimeState[cardId].completed` — usado pelo quadro / `timeEngine` / `appendNewSegments` (`timeBridge.ts`, `BoardView`).
- **Invariante:** após salvar, os intervalos concluídos do card no estado persistido não podem ficar **inconsistentes** entre `timeSegments` (para aquele `cardId`) e `cardTimeState[cardId].completed`. Qualquer ajuste deve aplicar uma **regra domínial única** (função de domínio) que reescreva ambos de forma alinhada (ver §6).

### RNB-03 — Validação de entrada

- Horas **≥ 0**; máximo razoável (ex.: 24 × dias do período ou teto global configurável no plano) — **definir no IPD** se produto quiser teto; na spec: pelo menos rejeitar negativas e `NaN`.
- Resolução: entrada em **horas decimais** (UX alinhada à coluna “Tempo”) com conversão para milissegundos no domínio (ex.: arredondamento documentado: 2 casas decimais → ms).

### RNB-04 — Total zero

- Se o usuário salvar **0 h** para a linha no período, a contribuição daquele card **para o período** deve ser zero após o recálculo (segmentos que só contribuíam para esse total devem ser removidos ou ajustados conforme a função de redistribuição).

### RNB-05 — Concorrência e versão

- Uso de `saveBoard` com **SHA** esperado: em conflito (arquivo alterado), exibir erro e permitir **tentar de novo** após recarregar o board (recomendado no plano de UX).

## 5. Comportamento fora de escopo (MVP)

- Não exige histórico de auditoria (quem editou) além do commit Git, a menos que produto peça.
- Não muda a regra R09 (filtro por `endMs` no período).
- Não introduz backend próprio (Constitution II).

## 6. Contrato de transformação (domínio) — para o planner

> Esta seção delimita **o efeito**; a assinatura exata fica no IPD.

- **Entrada:** `boardId`, `cardId`, `period: PeriodRange`, `targetHours: number` (dec.), documento do quadro.
- **Passo 1 — Selecionar afetados:** segmentos em `timeSegments` com `cardId` igual e `endMs` satisfazendo o período (igual `segmentsCompletedInPeriod` com critério de inclusão de linha).
- **Passo 2 — Ajuste:** a partir do total atual (soma das durações dos selecionados), calcular o alvo em ms e **redistribuir** ou **reescrever** esses segmentos de forma determinística, **e** refletir a mesma semântica em `cardTimeState[cardId].completed` (substituir os intervalos correspondentes ou recompor a lista de `completed` para o card).
- **Preferência padrão sugerida para o IPD (decisão única):** *redistribuição proporcional* das durações dos segmentos selecionados, preservando `startMs` e ajustando `endMs` com clamp de duração mínima, **exceto** quando o alvo for 0 (remover contribuição no período conforme mapeamento em `completed`). Se princípio violar invariantes (expediente, meia-noite), o **planner** deve acionar ajuste ou pedir ronda do **architect**.

**Lacuna explícita:** se redistribuição proporcional conflitar com `workingHours` ou split por dia, a implementação precisa de critério extra — aí **architect* ou refinamento do IPD* é obrigatório antes de codar.

## 7. Casos de borda

| # | Cenário | Comportamento esperado |
|---|---------|------------------------|
| E1 | Nenhum segmento elegível (bug de estado) | Salvar rejeitado com mensagem clara ou no-op documentado. |
| E2 | Período muda com modal aberta | Fechar/cancelar modal ou revalidar alvo; não salvar alvo de período desatualizado. |
| E3 | Card arquivado / removido | Definir no IPD: edição desabilitada ou erro ao carregar. |
| E4 | Múltiplos segmentos no período | Uma única edição ajusta o **total** da linha (RNB-01). |
| E5 | Falha de rede | Erro visível; estado local não marcado como persistido. |

## 8. Não requisitos

- Não impor desenho de componente (modal headless vs. div) — só acessibilidade e contrato de dados.
- Não exige mudança de `schemaVersion` se o JSON permanecer o mesmo; se for introduzido flag opcional (ex. ` editedAt`), requer **ADR** ou nota de compatibilidade retroativa.

## 9. Riscos

| Risco | Mitigação |
|--------|-----------|
| Dessincronia `timeSegments` × `cardTimeState` | Função de domínio única + testes de domínio. |
| Conflito GitHub | SHA + mensagem de conflito + refresh. |
| Ajuste proporcional vs. expediente | Gate no planner/architect. |

## 10. Verificabilidade (testes)

- **Domínio:** dado documento mínimo com N segmentos por card, período e alvo, **aplicar** transformação e assertar `timeSegments` + `completed` + agregado da linha.
- **E2E (mínimo):** abrir Horas, abrir editar, alterar valor, salvar, assertir célula e total (padrão Playwright com `data-testid` alinhado à skill de testid).

## 11. Baseline e dependências

- Código: `HoursView.tsx`, `hoursAggregation.ts`, `hoursProjection.ts`, `types.ts` (`BoardDocumentJson`), `timeBridge.ts`, `boardRepository.ts`.
- Spec relacionada (contexto, **não reabre entrega**): `hours-apontamento-rules` (regras de segmento e R09).

## 12. Próximos passos (pipeline)

1. `spec-reviewer` — veredicto e score.
2. `architect` *se* §6 tiver conflito com invariantes de `timeEngine` / `workingHours`.
3. `planner` — IPD com função de domínio fechada.
4. HITL — aprovar plano executável.
5. `implementer` — conforme CodeSteer.

---

**Nota de processo (2026-04-22):** a invocação do subagente `spec` via automação retornou limite de API; este TSD foi redigido pelo orquestrador com inspeção direta do repositório, mantendo o formato de entrega do agente `spec`.
