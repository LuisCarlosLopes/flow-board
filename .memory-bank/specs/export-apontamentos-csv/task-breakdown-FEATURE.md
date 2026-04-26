# Task Breakdown — Exportar apontamentos para CSV

> IPD de origem: `.memory-bank/specs/export-apontamentos-csv/planner-FEATURE.md`  
> Versão do IPD: 1.0.0  
> TSD de referência: `.memory-bank/specs/export-apontamentos-csv/spec-feature.md`  
> Revisão de plano: `.memory-bank/specs/export-apontamentos-csv/plan-reviewer-FEATURE.md` (GO)  
> Data: 2026-04-26  
> Gerado por: task-breakdown (artefato de execução, sem código)

## Resumo executivo

- **Objetivo do plano:** entregar na vista **Horas no período** exportação CSV (contrato TSD §7) com filtro de período existente, seleção de um ou mais quadros não arquivados, carga atómica e revalidação de catálogo, sem backend novo.
- **Complexidade (IPD):** M  
- **Total de tasks:** 7  
- **Estratégia de execução:** fundações de domínio puro e testes do builder primeiro; em seguida UI de seleção, carga atómica e alinhamento da pré-visualização; fluxo de export com revalidação e vazio; testes de integração/orquestração; *release* e verificação de governança.

## Nota de alinhamento (revisor de plano — D12)

O IPD referencia o identificador **D12** em D4, matriz RF×CA e E8, mas a tabela DoD (§3.1) só lista **D1–D9** e **CA-E1**. O revisor (avisos A1) indica que o conteúdo pretendido (carga atómica, falha se `loadBoard` falha ou retorna `null` para board selecionado) **já corresponde a D7** (e coerência **D4**). Neste *task.md*, a rastreabilidade liga **RF-07 / CA-08 / E8** a **DoD D7 e D4**; não é necessário procurar um DoD "D12" inexistente na tabela.

## Risco de regressão: carga de quadros mais estrita

O comportamento **atual** pode omitir silenciosamente quadros cujo `loadBoard` retorna `null`. O plano e o TSD exigem **falha explícita e atomicidade** quando qualquer board **selecionado** (ou, no modo "todos os quadros" tal como definido na implementação alinhada ao IPD §7) **não** carregar. Isto implica **regressão intencional e mais estrita**: o modo de agregação que envolve **múltiplos quadros deixa de tolerar carga parcial** — se **qualquer** quadro exigido pelo recorte falhar, o utilizador vê **erro global** e **não** dados parciais. Validar em QA/PR o impacto nesse caminho; documentar a mudança de UX (sugestão S3 do *plan-reviewer*).

## Guardrails herdados do IPD

- Não persistir PAT nem conteúdo de export no repositório de dados.  
- Não gerar CSV parcial se um board selecionado não carregar.  
- Não duplicar regra R09 na UI: usar sempre `aggregateTaskHoursForPeriod` e o mesmo `PeriodRange` que a tabela.  
- Não listar boards arquivados no seletor.  
- Não alterar ordenação da agregação sem alinhar RNB-06.  
- Não tocar `infrastructure/github/*` (além de imports já usados), ADRs nem modelo JSON persistido, salvo o mapa.  
- Sem novas dependências *npm* nem novas variáveis de ambiente.

## Lembrete *release notes* (AGENTS.md)

Ao concluir a feature: atualizar `apps/flowboard/src/data/releases.json` — **exatamente um** *release* com `archived: false`; o anterior passa a `archived: true`; novo bloco com `version`, `releaseDate` (ISO 8601 UTC), `archived: false` e itens de `changes` com `id` único, `type`, `title` e `description` em **inglês**; validar com testes da área *release* quando aplicável.

## Sequência de tasks

### T1 — Implementar módulo de domínio do CSV
- **Status:** CONCLUÍDA  
- **Objetivo:** Disponibilizar funções puras de serialização do CSV (BOM, CRLF, `;`, horas pt-BR, datas civis locais, cabeçalho literal §7.1) sem acoplar à UI.  
- **Base no IPD:** §4.1 contrato, §4.3 CRIAR `taskHoursCsv.ts` (nome final conforme repositório), Mapa de Alterações, DoD D2/D5/D8, RF-02, RF-05, RF-08, DC-01–04 TSD, RNB-06 (ordem das linhas vem de *rows* já ordenados de fora).  
- **Rastreio RF/CA/DoD:** D2, D5, D8; RF-02, RF-05, RF-08; **CA-09** (cabeçalho); **CA-06** (regras de *escape* no builder, evidência de teste em T2).  
- **Arquivos ou áreas impactadas:** CRIAR `apps/flowboard/src/domain/taskHoursCsv.ts` (ou nome final ajustado no IPD).  
- **Dependências:** nenhuma.  
- **Entregável esperado:** API de domínio alinhada ao TSD §7: período em colunas, linhas a partir de `TaskHoursRow` + metadados de `periodKind`, `archived` via mapeamento para `card_arquivado`, sem duplicar lógica de agregação.  
- **Check de conclusão:**
  - [ ] Existe ficheiro de domínio com `buildTaskHoursCsv` (ou equivalente) e helpers acordados no IPD (formatação de data local, `periodo_tipo` estável, `horas_totais` com vírgula, *escape* §7.3).  
  - [ ] Cabeçalho **exatamente** como TSD 7.1, nesta ordem.  
  - [ ] *Output* com BOM UTF-8 e finais de linha CRLF.  
- **Riscos ou atenções:** Consistência de `YYYY-MM-DD` com o mesmo *mindset* de recorte civil que `PeriodRange`; não alimentar a UI com regras R09 — só formatar o que a agregação já devolve.

### T2 — Cubrir o builder de CSV com Vitest
- **Status:** CONCLUÍDA  
- **Objetivo:** Garantir com testes a parte legível do DoD (escaping, encoding, cabeçalho, bordas decimais e de período).  
- **Base no IPD:** §3.3 cobertura >80% nos novos módulos, §6.1, Mapa CRIAR `taskHoursCsv.test.ts`, DoD D5/D8, Constitution I.  
- **Rastreio RF/CA/DoD:** D5, D8; **CA-09**; **CA-06**; testes reforçam RF-05/RF-08 no contrato.  
- **Arquivos ou áreas impactadas:** CRIAR `apps/flowboard/src/domain/taskHoursCsv.test.ts`.  
- **Dependências:** T1.  
- **Entregável esperado:** Conjunto de testes *happy path* e *edge* para *escape* (`;`, `"`, `\n`, `\r\n`), BOM, CRLF, `horas_totais` (`0,00` etc.), e `periodo_*` a partir de *fixtures* de `PeriodRange` (atendendo a sensibilidade de fuso, conforme IPD: fixar *timezone* em testes sensíveis ou derivar de intervalos numéricos como o domínio).  
- **Check de conclusão:**
  - [ ] `taskHoursCsv.test.ts` passa.  
  - [ ] Critério de cobertura de linhas do repositório aplicável ao módulo novo atendido ou justificado no *delivery*.  
- **Riscos ou atenções:** Testes de data: evitar flakiness; alinhar expectativas ao cálculo local usado no módulo.

### T3 — Seleção multi-board, estilos e carga atómica na vista
- **Status:** CONCLUÍDA  
- **Objetivo:** Substituir o escopo binário por seleção explícita de um ou mais quadros elegíveis; a pré-visualização e a agregação usam o **mesmo** conjunto de `BoardHoursInput` após carga completa.  
- **Base no IPD:** §4.2 passos 1–3, §4.3 MODIFICAR `HoursView.tsx` e `HoursView.css`, DoD D1, D3, D4, D7, RF-01, RF-03, RF-04, RF-07, RNB-04, TSD RNB-07, *guardrails* de `null` e parcial.  
- **Rastreio RF/CA/DoD:** D1, D3, D4, D7; RF-01, RF-03, RF-04, RF-07; **CA-01** (integração *dataset*), **CA-02**, **CA-08**; **E8** → D7.  
- **Arquivos ou áreas impactadas:** MODIFICAR `apps/flowboard/src/features/hours/HoursView.tsx`, `HoursView.css`.  
- **Dependências:** T1 (não impeditivo para início de UI, mas a exportação *full* requer T1 para T5; o carregamento e *preview* podem ser feitos com agregação antes do *download*). Ordem canónica: após T1.  
- **Entregável esperado:** UI com lista/ *checkbox* de boards não arquivados; exportação e pré-visualização bloqueadas com mensagem com **zero** selecionados; ao refrescar, carregar **todos** os boards da seleção: em caso de exceção ou `loadBoard === null` para qualquer id selecionado — **erro** explícito, **sem** atualizar *rows* com *subset*; `data-testid` estável na ação de export (D1).  
- **Check de conclusão:**
  - [ ] Filtro multi-board com ≥1 obrigatório; só não arquivados.  
  - [ ] Tabela e agregação alinhadas ao *subset*; ordenação *rows* preserva RNB-06.  
  - [ ] Nenhum silêncio sobre falha de carga; modo "todos os quadros" (se mantido) **falha** se qualquer quadro requerido não carregar (risco de regressão §7 IPD).  
- **Riscos ou atenções:** *Performance* com muitos boards (lista rolável, IPD); não misturar `archivedKeys` de forma incompatível com TSD *card_arquivado*.

### T4 — Completar fluxo de export: revalidação, vazio, *download* e *escape* fim-a-fim
- **Status:** CONCLUÍDA  
- **Objetivo:** Na confirmação do export, revalidar catálogo (**CA-E1**), recarregar boards selecionados (assunção A: segundo *pass* por *default*), recusar ficheiro se zero linhas, construir *blob* e disparar *download* com `Content-Type` e nome de ficheiro estáveis.  
- **Base no IPD:** §4.2 passo 4, DoD D2, D6, D7, D9, RF-02, RF-06, **RNB-04 / E1**, §3.1 D3 *export* desativado.  
- **Rastreio RF/CA/DoD:** D2, D6, D7, D9; RF-02, RF-06; **CA-07**; **CA-E1**; **E1** TSD.  
- **Arquivos ou áreas impactadas:** MODIFICAR `HoursView.tsx` (e CSS se ações *layout* adicionais). Reutilizar `loadCatalog` / `loadBoard` de `boardRepository` sem alterar contrato GitHub.  
- **Dependências:** T1, T2, T3.  
- **Entregável esperado:** Antes de construir o CSV, novo `loadCatalog` e checagem de que cada *id* selecionado ainda é elegível; recarga dos boards; se `rows.length === 0`, mensagem RF-06 e **sem** *Blob*; caso sucesso, *download* do *string* de T1.  
- **Check de conclusão:**
  - [ ] Nenhum *download* em caso vazio.  
  - [ ] Se o catálogo pós-revalidação falhar a elegibilidade, abortar com mensagem (sem CSV).  
  - [ ] Ficheiro e período no CSV batem com o *snapshot* do momento da confirmação (D2).  
- **Riscos ou atenções:** Se optar por *cache* em memória em vez de segundo *load*, documentar *trade-off* (IPD §7, assunção A); *default* do plano é recarregar.

### T5 — Testes de integração e orquestração (carga, *subset*, E1)
- **Status:** CONCLUÍDA  
- **Objetivo:** Cobrir, em Vitest, a junção de agregação + CSV e a política "tudo ou nada" e *subset* de boards, conforme IPD §6.2.  
- **Base no IPD:** §6.2, §3.1 matriz, OPCIONAL `hoursAggregation.test.ts` se útil a **CA-01**.  
- **Rastreio RF/CA/DoD:** **CA-01**, **CA-08**, **CA-E1**; reforçam D4, D7; **E8** mapeado a D7.  
- **Arquivos ou áreas impactadas:** Novo ou co-localizado: testes de integração (caminho e nome a definir no *implement* — *mock* de repositório ou helper `loadSelectedBoardsOrThrow` *style* do IPD); OPCIONAL alteração a `apps/flowboard/src/domain/hoursAggregation.test.ts`.  
- **Dependências:** T1, T2; T3–T4 para *integration* fiel ao repositório real ou *mocks* equivalentes.  
- **Entregável esperado:** Cenário *fixture* de vários *boards* com *subset* selecionado e CSV contendo **apenas** esses; cenário *mock* *loadBoard* → *null* ou exceção num *id* → operação de export/roteamento aborta **sem** *string* CSV completa; teste (unitário) da validação pós-`loadCatalog` para **CA-E1** se extraída a função.  
- **Check de conclusão:**
  - [ ] Casos alinhados a **CA-01**, **CA-08**, **CA-E1** documentados e verdes.  
  - [ ] Documentação mínima no PR ou comentário de *code review* se **"todos os quadros"** tiver regra de *subset* implementada.  
- **Riscos ou atenções:** *Mocks* alinhados ao contrato de `loadBoard` e `loadCatalog` reais; não *skipp* de ramos de erro (cobertura DoD e AGENTS.md).

### T6 — *Release notes* e *tags* CodeSteer
- **Status:** CONCLUÍDA  
- **Objetivo:** Publicar a versão na lista oficial e cumprir Constitution VIII com marcas mínimas onde o fluxo o exige.  
- **Base no IPD:** §3.3 *release* + *CodeSteer Tags*; Mapa MODIFICAR `releases.json`.  
- **Rastreio:** Governança DoD; sem RF direto.  
- **Arquivos ou áreas impactadas:** MODIFICAR `apps/flowboard/src/data/releases.json`; `HoursView.tsx` e/ou `taskHoursCsv.ts` para `@MindSpec` / `@MindFlow` / `@MindRisk` em pontos de orquestração e contrato, conforme regra do repositório.  
- **Dependências:** T4 funcional mínima (para descrever *changes* de forma honesta).  
- **Entregável esperado:** *Release* com `archived` correto, texto *changelog* em inglês, entradas `id` únicas; *tags* só onde o contrato o justifica.  
- **Check de conclusão:**
  - [ ] `releases.json` cumpre AGENTS.md (um ativo, datas/semver).  
  - [ ] `npm test` (ou *scope* *release* se só dados) de acordo com a alteração.  
- **Riscos ou atenções:** Não antecipar *version* ainda sem funcionalidade entregue.

### T7 — Verificação de fecho DoD (qualidade, *lint*, cobertura)
- **Status:** CONCLUÍDA  
- **Objetivo:** Fechar a matriz RF×CA e o DoD com evidência na pasta do app, sem *scope creep*.  
- **Base no IPD:** §3.3 (Constitution, cobertura >80%, *eslint*), §9 *auto-correção*, *Definition of Done* completo.  
- **Rastreio RF/CA/DoD:** Todos D1–D9 e *CA* associados, exceto **CA-03/CA-04** já existentes (não reimplementar; regressão por integração T5).  
- **Arquivos ou áreas impactadas:** Conjunto de ficheiros tocados na feature.  
- **Dependências:** T1–T6.  
- **Entregável esperado:** *Lint* limpo nas áreas editadas, cobertura alinhada ao requisito do repositório nos módulos novos/ramos de orquestração, nenhum *partial CSV* com falha, mensagens claras (RNB-07).  
- **Check de conclusão:**
  - [ ] Tabela interna *RF → CA* verificada contra implementação.  
  - [ ] Nenhum *guardrail* do §5 do IPD violado.  
  - [ ] Pronto para *commit* com mensagem sugerida no IPD §9 (`feat(hours): …`).  
- **Riscos ou atenções:** Reexecutar pós-ajustes; E2E **opcional** no IPD — não bloquear se Vitest cumpre o plano.

## Cobertura do DoD (IPD §3) e ligação a tasks

| DoD / extensão | Resumo | Tasks |
|----------------|--------|-------|
| D1 | Ação de export + *data-testid* | T3, T7 |
| D2 | Período no CSV = *PeriodRange* da confirmação | T1, T4, T7 |
| D3 | Multi-board, ≥1, só não arquivados | T3, T4, T7 |
| D4 | *Dataset* = seleção, *preview* alinhada | T3, T5, T7 |
| D5 / CA-05 / CA-09 | Colunas, `card_arquivado`, títulos | T1, T2, T7 |
| D6 / CA-07 | Sem linhas: mensagem, sem ficheiro | T4, T7 |
| D7 / CA-08 / E8 | Carga atómica; nenhum *download* se falha em board selecionado | T3, T4, T5, T7 |
| D8 / CA-06 | *Escaping* e cabeçalhos estáveis | T1, T2, T7 |
| D9 / CA-E1 / E1 | Revalidar catálogo; abortar se elegibilidade quebrar | T4, T5, T7 |
| Qualidade, *lint*, *release* | *Constitution I–II, VIII*; *releases.json*; cobertura | T2, T5, T6, T7 |

## Lacunas ou bloqueios

- Nenhum bloqueio *material* identificado. Rótulo **D12** orfão: usar **D7** + **D4** como fonte de verdade (revisor *plan-reviewer*).

## Matriz de rastreabilidade

| Task | Base no IPD | Arquivos ou áreas | DoD / RF / CA / testes |
|------|-------------|--------------------|------------------------|
| T1 | §4.1, §4.3 CRIAR, Mapa | `src/domain/taskHoursCsv.ts` | D2, D5, D8; RF-02, RF-05, RF-08; CA-09; CA-06 (implementação) |
| T2 | §6.1, Mapa, §3.3 | `src/domain/taskHoursCsv.test.ts` | D5, D8; CA-09, CA-06; Vitest |
| T3 | §4.2 (1–3), §4.3, DoD, §7 *regressão* | `HoursView.tsx`, `HoursView.css` | D1, D3, D4, D7; RF-01,03,04,07; CA-01,02,08; *stricter* *load* |
| T4 | §4.2 (4), *Assunção A*, DoD | `HoursView.tsx` (fluxo) | D2, D6, D7, D9; RF-02,06; CA-07; CA-E1; E1 |
| T5 | §6.2, OPC *hoursAggregation* | Ficheiro(s) de teste *integration*; opc. `hoursAggregation.test.ts` | D4, D7, D9; CA-01,08, E1; Vitest |
| T6 | §3.3, Mapa, AGENTS *release* | `releases.json`; *tags* em componentes *builder* / *flow* | DoD *governance*; *release* |
| T7 | §3 completo, §5 *guardrails* | Todos os ficheiros da feature | Fecho D1–D9, matriz RF×CA, *lint*/*coverage* |

---

**Metadata (execução *task-breakdown*):** agente *task-breakdown*; *status* *success*; *ipd_source* *planner-FEATURE.md*; *total_tasks* 7; *complexity* M; *blocked_tasks* 0; *artifact* *path* *task-breakdown-FEATURE.md*.
