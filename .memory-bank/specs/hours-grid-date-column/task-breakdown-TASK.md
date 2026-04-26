# Task Breakdown — Coluna Data na grid Horas no período

> IPD de origem: `.memory-bank/specs/hours-grid-date-column/planner-TASK.md`  
> Versão do IPD: v1.0  
> Data: 2026-04-26  
> Gerado por: task-breakdown v1.0

## Resumo Executivo

- Objetivo do plano: enriquecer `TaskHoursRow` com min/max de `endMs` dos segmentos R09 no período; exibir coluna **Data** pt-BR na grid; manter totais, ordenação e edição; cobrir domínio em Vitest.
- Complexidade: S
- Total de tasks: 6
- Estratégia de execução: domínio primeiro, testes de agregação em seguida, formatação reutilizável (preferência IPD), UI e rodapé, CSS opcional, fechamento do DoD observável.

## Guardrails Herdados do IPD

- Não alterar **qual** segmento entra no período (R09); apenas enriquecer a linha agregada.
- Não usar `startMs` para o rótulo da coluna **Data** — critério é **fim** do segmento (`endMs`).
- Não persistir min/max no GitHub; valores sempre derivados na agregação.
- Em testes de domínio, preferir asserções numéricas em min/max; strings pt-BR na UI não são obrigatórias na suíte de agregação.
- Não tornar obrigatória alteração em `buildTaskHoursCsv` / header CSV nesta entrega.

## Sequência de Tasks

### T1 — Estender TaskHoursRow e min/max endMs na agregação

- Status: CONCLUÍDA
- Objetivo: `aggregateTaskHoursForPeriod` passa a preencher, por par quadro+tarefa, o menor e o maior `endMs` entre segmentos que entram no filtro do período; tipo de linha aditivo; ordenação por `durationMs` decrescente inalterada.
- Base no IPD: §4.1 (Domínio), §4.2 passos 2–3, §4.3 `hoursAggregation.ts`, §5, §7 (nomes de campos equivalentes aceitos se documentados).
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/hoursAggregation.ts`
- Dependências: nenhuma
- Entregável esperado: `TaskHoursRow` com campos aditivos (ex.: `segmentEndMsMin`, `segmentEndMsMax`) preenchidos na agregação com `Math.min` / `Math.max` em cada merge de segmento aceito; invariante `segmentEndMsMin <= segmentEndMsMax`.
- Check de conclusão:
  - [x] Novos campos existem no tipo exportado usado pelos consumidores e são inicializados na primeira ocorrência de um par `boardId`+`cardId`.
  - [x] Em atualizações subsequentes da mesma chave, min/max incorporam o `endMs` de cada novo segmento aceito no período.
  - [x] Assinatura pública de `aggregateTaskHoursForPeriod` e regra de ordenação permanecem como no baseline do IPD.
- Riscos ou atenções: não alterar `hoursProjection.ts` nem a semântica R09; qualquer caller que monte literais `TaskHoursRow` pode exigir ajuste em T2.

### T2 — Cobrir min/max endMs e regressão R09 em Vitest

- Status: CONCLUÍDA
- Objetivo: `hoursAggregation.test.ts` prova os três cenários da §6 do IPD e atualiza expectativas/fixtures para o tipo estendido.
- Base no IPD: §3 (DoD testes), §6, §8 (fixtures incompletos), §4.3 `hoursAggregation.test.ts`, §5 (evitar depender de TZ em asserts de string).
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/hoursAggregation.test.ts`
- Dependências: T1
- Entregável esperado: casos (1) um dia com vários segmentos e mesmo `endMs`, min===max numérico; (2) vários dias com `endMs` distintos, min/max corretos e `durationMs` igual à soma das durações; (3) segmento com `endMs` fora do período não altera min/max de linhas válidas; testes existentes alinhados ao novo contrato (incl. `expect.objectContaining` onde fizer sentido).
- Check de conclusão:
  - [x] Os três comportamentos acima estão expressos em testes dedicados ou extensões claras de casos existentes.
  - [x] Asserções sobre min/max usam valores numéricos (epoch ms), não cópia frágil de texto localizado.
  - [x] Nenhum teste passa a contradizer T10 / R09 já documentados no módulo.
- Riscos ou atenções: ao estender casos “fora do período”, garantir mix dentro/fora no mesmo card para isolar influência em min/max.

### T3 — Centralizar formatação de data local pt-BR a partir de ms

- Status: CONCLUÍDA
- Objetivo: disponibilizar conversão ms → rótulo civil local em pt-BR alinhada a `formatLocalDateYmdFromMs` (mesma semântica de calendário local), mais composição de intervalo quando min≠max, reutilizável pela grid.
- Base no IPD: §2.2–2.4, §4.1 (UI + `formatSegmentEndRangePtBr`), §4.3 linha opcional `taskHoursCsv.ts`, alternativa aceitável helper só em `HoursView.tsx`.
- Arquivos ou áreas impactadas (conforme decisão do implementer): `apps/flowboard/src/domain/taskHoursCsv.ts` **ou** apenas `apps/flowboard/src/features/hours/HoursView.tsx`
- Dependências: T1
- Entregável esperado: função(ões) pura(s) que, dado(s) ms, produz(em) uma data pt-BR legível; para intervalo, padrão de separação espelhando `periodDescription` (semana) na mesma vista; se `minMs === maxMs`, uma única data.
- Check de conclusão:
  - [x] Semântica de “dia civil local” consistente com o módulo CSV existente ou justificativa explícita no mesmo arquivo se ficar só na feature.
  - [x] Intervalo usa o mesmo estilo de separação entre duas datas que o restante de `HoursView` já usa para períodos.
- Riscos ou atenções: preferir DRY em `taskHoursCsv.ts` conforme IPD; evitar duplicar lógica frágil de `Date` em vários pontos.

### T4 — Incluir coluna Data, alinhar tfoot e fluxo de edição na grid

- Status: CONCLUÍDA
- Objetivo: tabela “Horas no período” com cabeçalho **Data** (pt-BR), posição sugerida após **Quadro** e antes **Tempo**; células do corpo usando min/max da linha; rodapé **Total** com soma só em **Tempo**, células de **Data** vazias ou neutras, `colSpan` coerente com o número de colunas do `thead`; `openEdit` continua recebendo `TaskHoursRow` estendido sem que novos campos entrem na persistência.
- Base no IPD: §3 (DoD funcional grid + tfoot + edição), §4.1 (UI), §4.2 passos 3–4, §4.3 `HoursView.tsx`, §8 (colSpan).
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/hours/HoursView.tsx`
- Dependências: T1, T3
- Entregável esperado: nova coluna renderizada; totais e ordenação visualmente alinhados ao comportamento anterior; edição e modal inalterados em regra de negócio; tipagem TypeScript consistente com linhas agregadas.
- Check de conclusão:
  - [x] Cabeçalho **Data** presente e valores por linha refletem o intervalo civil local entre min e max `endMs`, ou um único dia quando coincidem.
  - [x] `tfoot` não desloca colunas; `colSpan` reflete o layout final (incluindo coluna nova).
  - [x] Ordenação por duração e ações **Editar** funcionam como antes do ponto de vista do usuário.
- Riscos ou atenções: se o IPD indicar cinco colunas de dados no corpo, validar manualmente o alinhamento com a célula de tempo total; não alterar contrato CSV nesta task.

### T5 — Ajustar layout da coluna Data no CSS (se necessário)

- Status: CONCLUÍDA
- Objetivo: largura mínima, quebra de linha ou alinhamento da coluna **Data** quando a grid ficar apertada ou ilegível após T4.
- Base no IPD: §4.3 `HoursView.css` (opcional), §2.1 estrutura.
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/hours/HoursView.css`
- Dependências: T4
- Entregável esperado: apenas alterações visuais necessárias; se nada precisar, marcar task como concluída com nota “sem mudança” no check.
- Check de conclusão:
  - [x] Coluna **Data** legível nos breakpoints já usados pela vista **ou** documentado que nenhum ajuste foi necessário após revisão visual.
- Riscos ou atenções: não introduzir estilo conflitante com o restante da tabela; manter acessibilidade de contraste herdada.

### T6 — Fechar critérios residuais do DoD e consistência de tipos

- Status: CONCLUÍDA
- Objetivo: confirmar que critérios do §3 não cobertos explicitamente por checks anteriores estão atendidos e que não há referências quebradas a `TaskHoursRow` no escopo do app.
- Base no IPD: §3 (DoD completo), §9 (entrega focada), §4.3 (o que não tocar).
- Arquivos ou áreas impactadas: revisão transversal dos arquivos já listados; sem novos arquivos fora do mapa sem alinhamento ao IPD.
- Dependências: T2, T4 (e T5 se executada)
- Entregável esperado: lista mental ou nota de implementação de que compilador e consumidores de `TaskHoursRow` estão coerentes; nenhuma mudança em `buildTaskHoursCsv` / header CSV obrigatória.
- Check de conclusão:
  - [x] Itens do §3 DoD todos endereçados por T1–T5 ou por esta revisão.
  - [x] Nenhuma alteração em `hoursProjection.ts` regra R09 nem em contrato CSV obrigatório.
  - [x] Escopo de diff limitado ao mapa de alterações do IPD (com a opção `taskHoursCsv.ts` apenas se T3 seguiu a preferência de DRY).
- Riscos ou atenções: desalinhamento futuro grid vs CSV permanece assumido fora de escopo (`state.yaml` / §7 IPD).

## Cobertura do DoD

- Cabeçalho **Data** e intervalo civil local por linha → T1, T3, T4
- `tfoot` Total coerente (soma tempo; **Data** vazia/neutra; `colSpan`) → T4
- Ordenação, totais e edição preservados → T1, T4, T6
- Vitest em agregação: um dia, vários dias, exclusão R09 → T2
- Qualidade: tipos e ausência de regressões no escopo → T1, T2, T6

## Lacunas ou Bloqueios

- Nenhuma lacuna material identificada no IPD; posição exata da coluna **Data** é sugestão ajustável sem impacto de domínio (§10 IPD).

## Matriz de Rastreabilidade

| Task | Base no IPD | Arquivos ou áreas | DoD/Testes relacionados |
|------|-------------|-------------------|-------------------------|
| T1 | §4.1, §4.2, §4.3, §5, §7 | `apps/flowboard/src/domain/hoursAggregation.ts` | DoD: funcional min/max; preservar ordenação |
| T2 | §3, §6, §8, §4.3 | `apps/flowboard/src/domain/hoursAggregation.test.ts` | DoD: testes §6; guardrail TZ |
| T3 | §2.2–2.4, §4.1, §4.3 | `taskHoursCsv.ts` ou `HoursView.tsx` | DoD: pt-BR legível; espelhar `periodDescription` |
| T4 | §3, §4.1–4.2, §4.3, §8 | `apps/flowboard/src/features/hours/HoursView.tsx` | DoD: grid, tfoot, edição |
| T5 | §4.3, §2.1 | `apps/flowboard/src/features/hours/HoursView.css` | DoD: legibilidade layout |
| T6 | §3, §4.3, §9 | revisão transversal mapa | DoD integral; escopo CSV não obrigatório |
