# Task Breakdown — Arquivar card (área de arquivados e busca)

> IPD de origem: `.memory-bank/specs/card-archive/planner-feature.md`  
> Versão do IPD: v1.0  
> Data: 2026-04-22  
> Gerado por: task-breakdown v1.0

## Resumo Executivo

- Objetivo do plano: arquivamento de cards com flags e tempo alinhado ao TSD, exclusão de arquivados do Kanban e do DnD, área Arquivados (restaurar/excluir), busca com indicação de arquivado e bateria de testes de domínio (E2E opcional), sem quebrar contratos de documento além de campos opcionais em `Card`.
- Complexidade: M
- Total de tasks: 8
- Estratégia de execução: fundações (tipos + domínio de merge) antes de `timeEngine`, depois layout e busca, em seguida `BoardView` (risco de perda de arquivados no drag), modais e busca na app, e verificação final de DoD; E2E agrupada na verificação por ser opcional.

## Guardrails Herdados do IPD

- Não confundir `CatalogEntryJson.archived` (quadro) com `Card.archived`.
- A busca deve iterar sobre todos os `card` do documento: não filtrar arquivados antes de `searchCards`.
- Após `itemsRecordToCards`, sempre reanexar arquivados via merge estável; nunca atribuir `nextDoc.cards` só com o layout ativo.
- Fechamento de tempo ao arquivar: reutilizar a mesma lógica que `in_progress` → `done` em `timeEngine` / `workingHours`, sem duplicar fórmulas na UI.
- Não introduzir `any` em novos contratos; manter `Card` e `CardSearchResult` tipados.
- Não instalar dependências novas nem alterar `package.json` fora do escopo.
- Não expandir escopo a FE01–FE05 (TSD §8). Não alterar a fórmula de `scoreCard` (apenas `archived` no resultado de busca).
- Não tocar `boardRepository.ts` salvo correção justificada; `HoursView` só se houver evidência de bug na contagem.

## Sequência de Tasks

### T1 — Estender `Card` e implementar módulo `cardArchive` com testes
- Status: PENDENTE
- Objetivo: Definir `archived?` e `archivedAt?` no modelo; expor `isCardArchived`, `activeCardsForLayout`, ordenação padrão de arquivados e `mergeLayoutCardsWithArchived` (ou equivalente) com comportamento testável e documentado.
- Base no IPD: §4.2 passos 1–2, 4.3 (types, `cardArchive.ts`/`cardArchive.test.ts`), §6 domínio `cardArchive`, §5 guardrails (merge, legado)
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/types.ts`, `apps/flowboard/src/domain/cardArchive.ts` (criar), `apps/flowboard/src/domain/cardArchive.test.ts` (criar)
- Dependências: nenhuma
- Entregável esperado: tipos estendidos; módulo de domínio exportando helpers e merge; suite Vitest cobrindo legado sem `archived`, merge após reordenação, ordenação Q1
- Check de conclusão:
  - [ ] `Card` inclui campos opcionais conforme TSD
  - [ ] `isCardArchived` trata ausente ou falso como ativo
  - [ ] Testes de merge não permitem perder arquivados após reordenação do layout
  - [ ] Ordenação de arquivados: `archivedAt` desc com fallback alinhado ao plano
- Riscos ou atenções: merge estável é o ponto crítico para drag; qualquer outra tarefa que reconstrói `doc.cards` deve usar este contrato.
- Notas de teste: descrever('cardArchive') com casos do §6.1 (legado, merge, Q1). Idempotência de flags (CA08) se coberta aqui ou em T2 conforme implementação.

### T2 — Exportar `applyArchiveToTimeState` (ou equivalente) no `timeEngine` com testes
- Status: PENDENTE
- Objetivo: Fechar segmento e materializar intervalos de forma alinhada a transição in_progress → done quando aplicável, sem duplicar lógica fora de `timeEngine` / `workingHours`.
- Base no IPD: §4.1–4.2 passos 4, 4.3 (`timeEngine.ts`, `timeEngine.test.ts`), §6.2, §7.1 risco tempo, guardrail duplicação
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/timeEngine.ts`, `apps/flowboard/src/domain/timeEngine.test.ts`
- Dependências: T1 (tipos e semântica de arquivado claros)
- Entregável esperado: função exportada reutilizando `materializeCountableIntervals` (ou o mesmo caminho que `applyCardMove` in_progress → done) e testes para timer aberto, sem timer, idempotência
- Check de conclusão:
  - [ ] `in_progress` com `activeStartMs`: `completed` materializado e `activeStartMs` limpo (CA04)
  - [ ] Não in_progress: não inventa segmentos; política de `activeStartMs` coerente com o plano
  - [ ] Re-arquivar não duplica completed (idempotência)
- Riscos ou atenções: divergência vs. “mover para Concluído” gera erros de horas; alinhar com `timeBridge` / `appendNewSegments` na integração (T5)
- Notas de teste: `describe` alinhado ao §6.2; validar com memória, não só mocks frágeis.

### T3 — Ajustar `boardLayout` e testes para mapa só com ativos e `doc` completo
- Status: PENDENTE
- Objetivo: Garantir que o recorde de itens do Kanban use apenas cards não arquivados, mantendo a integridade do array completo em conjunto com `cardArchive` (e preparar chamadas para o merge no BoardView).
- Base no IPD: §4.2 passos 3, 5–6, 4.3 (`boardLayout.ts`, `boardLayout.test.ts`), §6.4, RF02, CA01, CA09
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/boardLayout.ts`, `apps/flowboard/src/domain/boardLayout.test.ts`
- Dependências: T1
- Entregável esperado: Uma abordagem documentada (função delegada `buildKanbanItemsRecord` ou filtragem nas chamadas) e testes de regressão com mix ativo/arquivado
- Check de conclusão:
  - [ ] `itemsMap` / record lógico não inclui arquivados nas posições do Kanban
  - [ ] Testes refletem que o “mapa de items” contém só ativos e que o documento completo ainda contém arquivados (quando o cenário for exercitado com helpers)
- Riscos ou atenções: coordenar com T5: todo `itemsRecordToCards` seguido de atribuição a `nextDoc.cards` exige merge (T1)
- Notas de teste: `describe` integrado do §6.4; foco em regressão, não replicar toda a UI.

### T4 — Estender `CardSearchResult` e preencher `archived` na busca com testes
- Status: PENDENTE
- Objetivo: Incluir `archived?: boolean` no resultado sem alterar fórmula de score; iterar sobre todos os cards do documento.
- Base no IPD: §4.1–4.2 passo 9, 4.3 (`cardSearch.ts`, `cardSearch.test.ts`), RF04, R-SEARCH01, §5.2, §6.3, guardrails busca
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/cardSearch.ts`, `apps/flowboard/src/domain/cardSearch.test.ts`
- Dependências: T1
- Entregável esperado: mapeamento de `archived` a partir de `card.archived`; asserção de score inalterado para card arquivado
- Check de conclusão:
  - [ ] `searchCardsWithTotal` (e fluxo usado) preenche `archived: true` quando aplicável
  - [ ] Teste de card arquivado com score inalterado (CA03)
- Riscos ou atenções: não excluir arquivados do loop de busca; não alterar `scoreCard`
- Notas de teste: §6.3 explícito.

### T5 — Integrar arquivar, merge pós-drag, DnD só ativos e área Arquivados em `BoardView`
- Status: PENDENTE
- Objetivo: `itemsMap` a partir de ativos; `commitAfterDrag` e caminhos que reconstroem `nextDoc.cards` com merge; handlers arquivar, restaurar e excluir (exclusão reutilizando padrão de `handleDeleteCard`); secção Arquivados com ordenação Q1; alinhar `writeTimeBoardStateToDoc`, `appendNewSegments` e `reconcile` no fluxo de arquivar; DnD apenas sobre ids ativos.
- Base no IPD: §4.2 (passos 4–8, 3, 5–6), 4.3 (`BoardView.tsx`, `BoardView.css`, `timeBridge` usado a partir de Board), RF01–RF03, RF07, CA01, CA04, CA05, CA09, §7.1
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/board/BoardView.tsx`, `apps/flowboard/src/features/board/BoardView.css` (e uso de `apps/flowboard/src/features/board/timeBridge.ts` sem alterar contrato, apenas chamadas)
- Dependências: T1, T2, T3
- Entregável esperado: UI de Arquivados; fluxos de domínio integrados; nenhum card arquivado desaparece de `doc.cards` após drag; exclusão de arquivado com a mesma higiene de `handleDeleteCard`
- Check de conclusão:
  - [ ] Após `itemsRecordToCards`, merge reanexa todos os arquivados
  - [ ] DnD não opaca sobre cards arquivados
  - [ ] Arquivar encerra tempo como exigido (via T2) e persiste
  - [ ] CA05/RF09: exclusão de arquivado limpa tempo e anexos como o fluxo atual
- Riscos ou atenções: auditar **todos** os atribulamentos a `nextDoc.cards` no ficheiro; 409 inalterado (CA07)
- Notas de teste: núcleo coberto por Vitest nos módulos; smoke manual ou E2E na T8 se optado.

### T6 — Ações de arquivar e fluxo coerente em `CreateTaskModal` e contagem em `ColumnEditorModal`
- Status: PENDENTE
- Objetivo: Ação "Arquivar" no modal de edição (default Q2) usando o mesmo contrato de domínio do pai; quando o card em edição estiver arquivado, respeitar RF05 e defaults Q2–Q3. Na edição de coluna, excluir arquivados da contagem ao remover coluna (R-UX01).
- Base no IPD: §4.2 (UI, passo 10), 4.3 (`CreateTaskModal.tsx`, `CreateTaskModal.css`, `ColumnEditorModal.tsx`), RF01, RF05, R-UX01
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/board/CreateTaskModal.tsx`, `apps/flowboard/src/features/board/CreateTaskModal.css`, `apps/flowboard/src/features/board/ColumnEditorModal.tsx`
- Dependências: T5 (handlers e props coerentes)
- Entregável esperado: Arquivar no edit mode; contagem de cards por coluna em remoção ignora arquivados; estilos mínimos alinhados ao board
- Check de conclusão:
  - [ ] `CreateTaskModal` chama o mesmo contrato de arquivar que o board
  - [ ] `ColumnEditorModal` filtra com `isCardArchived` (ou equivalente) na contagem de remoção
- Riscos ou atenções: não duplicar regra de negócio de tempo no modal — delegar a domínio / Board
- Notas de teste: IPD cita ajuste opcional de testes de `CreateTaskModal` com mocks de props; fazer se risco de regressão for alto.

### T7 — Indicação visual de arquivado em `SearchModal` e testes de UI
- Status: PENDENTE
- Objetivo: Exibir badge ou texto "Arquivado" quando `result.archived` for verdade; estilos; atualizar `SearchModal.test.tsx` se o DOM exibir a flag.
- Base no IPD: §4.2 passo 9, 4.3 (`SearchModal.tsx`, `SearchModal.css`, `SearchModal.test.tsx`), R-SEARCH01
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/app/SearchModal.tsx`, `apps/flowboard/src/features/app/SearchModal.css`, `apps/flowboard/src/features/app/SearchModal.test.tsx`
- Dependências: T4
- Entregável esperado: UI acessível e consistente; testes ajustados sem quebrar regressões
- Check de conclusão:
  - [ ] Resultado com `archived: true` mostra indicação visível
  - [ ] `SearchModal.test.tsx` alinhado ao comportamento (incl. data-testid se o projeto adotar)
- Riscos ou atenções: não filtrar arquivados na busca; apenas exibição
- Notas de teste: testes de UI §6; integração com T4 (dados) e não duplicar asserção de score no modal se for só domínio.

### T8 — Confirmar `persistence/types`, E2E opcional e fecho de DoD (build, lint, suítes)
- Status: PENDENTE
- Objetivo: Confirmar re-export e ausência de mudança estrutural obrigatória; opcionalmente criar `apps/flowboard/tests/e2e/card-archive.spec.ts` (smoke); executar build, tipos, lint e todas as suítes no escopo; validar itens de DoD e edge TSD §7.3.
- Base no IPD: §3 DoD, §4.3 (persistence `types.ts`, E2E opcional), §8 protocolo, §2.2 stack de teste
- Arquivos ou áreas impactadas: `apps/flowboard/src/infrastructure/persistence/types.ts` (confirmação; alteração só se re-export exigir); `apps/flowboard/tests/e2e/card-archive.spec.ts` (criar apenas se aprovado/risco)
- Dependências: T1–T7
- Entregável esperado: compilação limpa; testes e lint acordados; nenhum arquivo fora do mapa alterado sem justificação; E2E ou decisão explícita de adiar com Vitest como núcleo
- Check de conclusão:
  - [ ] Build do pacote `flowboard` sem erro de tipo
  - [ ] `npm`/`pnpm` scripts de lint e testes usados no projeto passam; suítes existentes intactas
  - [ ] DoD funcional: RFs, CA, edge cases (idempotência, 409, card inexistente) verificáveis
  - [ ] E2E: criado e verde, ou registo de risco com testes de domínio considerados suficientes
- Riscos ou atenções: se for necessário tocar `HoursView` por contagem, uma alteração mínima documentada; caso contrário manter fora
- Notas de teste: E2E §6 fim — arquivar → não na coluna → em Arquivados → busca encontra → restaurar; alinhar a Playwright do repo.

## Cobertura do DoD

- Funcional (RFs, CAs TSD §3, §7) → T1–T8; merge e drag (T1, T5); tempo (T2, T5); busca (T4, T7); colunas (T6)
- Compilação (build do pacote) → T8
- Testes existentes sem regressão → T8 (e cada task com checks próprios)
- Novos testes (§6) → T1, T2, T3, T4, T7; E2E opcional T8
- Lint (escopo alterado) → T8
- Edge §7.3: idempotência, não sumir de `doc.cards` no drag, 409, card inexistente → T1, T2, T5, T8

## Lacunas ou Bloqueios

- Nenhuma: decisões bloqueantes 0 no IPD (§10).

## Matriz de Rastreabilidade

| Task | Base no IPD | Arquivos ou áreas | DoD/Testes relacionados |
|------|-------------|-------------------|-------------------------|
| T1 | §4.1–4.2, 4.3, §6.1, guardrails merge | `domain/types.ts`, `cardArchive.ts`, `cardArchive.test.ts` | DoD: modelo + merge; testes domínio |
| T2 | §4.2.4, 4.3, §6.2, §7.1 | `timeEngine.ts`, `timeEngine.test.ts` | CA04, CA08 tempo; DoD horas coerentes |
| T3 | §4.2.3,5–6, 4.3, §6.4 | `boardLayout.ts`, `boardLayout.test.ts` | RF02, CA01, CA09 |
| T4 | §4.2.9, 4.3, §5.2, §6.3 | `cardSearch.ts`, `cardSearch.test.ts` | RF04, R-SEARCH01, CA03 |
| T5 | §4.2, 4.3, §7.1 | `BoardView.tsx`, `BoardView.css`, uso de `timeBridge.ts` | RF01–03,07; CA01,04,05,09; DoD integração |
| T6 | §4.2.10, 4.3 | `CreateTaskModal.tsx/css`, `ColumnEditorModal.tsx` | RF01,05; R-UX01 |
| T7 | §4.2.9, 4.3 | `SearchModal.tsx/css`, `SearchModal.test.tsx` | R-SEARCH01; testes UI |
| T8 | §3, 4.3, §8 | `persistence/types.ts` (confirmação), E2E opcional | DoD compilação, lint, E2E opcional, edge §7.3 |
