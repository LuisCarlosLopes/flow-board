# Task Breakdown — Editar horas de apontamento (Horas no período)

> IPD de origem: `.memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md`  
> Versão do IPD: v1.0  
> Revisão de plano: `.memory-bank/specs/edit-horas-apontamento/plan-reviewer-FEATURE.md` (VERDE 90)  
> Data: 2026-04-22  
> Gerado por: task-breakdown v1.0

## Resumo Executivo

- Objetivo do plano: permitir editar o total de horas de uma linha `(boardId, cardId)` na vista Horas no período via modal, com função de domínio única, persistência GitHub e UI coerente com totais e mensagens pt-BR.
- Complexidade: M
- Total de tasks: 6
- Estratégia de execução: fundação de domínio e testes Vitest primeiro; em seguida UI e orquestração de persistência em `HoursView`; estilos; por fim E2E cobrindo E2 (aviso plan-reviewer A2) e smoke de fluxo, com caminho de deferência explícito se dados forem instáveis (IPD §6.2).

## Guardrails Herdados do IPD

- Não implementar redistribuição só na UI; persistência apenas quando o domínio retornar `ok: true`.
- Não usar apenas `appendNewSegments` para refletir edição.
- Não alterar `hoursAggregation.ts`, `hoursProjection.ts`, `timeBridge.ts`, `boardRepository.ts` nesta entrega.
- Não introduzir campos novos em `BoardDocumentJson`.
- Mensagens de erro e conflito ao usuário final em pt-BR.
- Preservar R09 e contratos citados no IPD §2.3.

## Sequência de Tasks

### T1 — Implementar função pura de domínio e contratos de retorno

- Status: PENDENTE
- Objetivo: Existir a função `applyTargetHoursForCardInPeriod` com tipos `BoardTimeSegment` e `ApplyTargetHoursForPeriodResult`, implementando seleção por período (R09), proporcional com correção de resto, remoção em alvo zero, tetos por dia e expediente, códigos `NO_SEGMENTS`, `INFEASIBLE_TARGET`, `INVALID_TARGET` e política `maxTargetMs` conforme IPD.
- Base no IPD: §1, §4.1, §4.1.1, §4.1.2, §4.2 (passos de domínio), §4.3 (CRIAR domínio), §5, §7.1
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.ts` (CRIAR); leitura semântica de `workingHours` / `hoursProjection` / `types` apenas como dependências de importação (sem editar arquivos proibidos)
- Dependências: nenhuma
- Entregável esperado: módulo de domínio exportando a função e tipos alinhados ao contrato do IPD; sem chamadas a GitHub ou React
- Check de conclusão:
  - [ ] Arquivo de domínio criado com a assinatura e union de resultado descritos no IPD §4.1.2
  - [ ] Semântica de `nextCompleted` como reconstrução a partir de todos os segmentos do card após mutação, e projeção de `nextSegments` coerente com o fluxo §4.2 (merge final feito na feature, não no repositório proibido)
  - [ ] Nenhum arquivo listado como NÃO TOCAR no mapa §4.3 foi alterado
- Riscos ou atenções: alinhar tetos à semântica de `clipIntervalToWorkingHours` / expediente; resto proporcional determinístico; validar `INVALID_TARGET` com teto `maxTargetMs` do IPD

### T2 — Cobrir domínio com testes Vitest obrigatórios

- Status: PENDENTE
- Objetivo: Garantir verificabilidade da função de domínio com os cenários listados no IPD, incluindo working hours ligado e desligado.
- Base no IPD: §3 (Constitution VI, DoD testes), §6.1, §4.3 (CRIAR teste), §8 (verificação de contratos)
- Arquivos ou áreas impactadas: `apps/flowboard/src/domain/applyTargetHoursForCardInPeriod.test.ts` (CRIAR); estilo e fixtures espelhando `hoursAggregation.test.ts` como referência de pacote (somente leitura da referência)
- Dependências: T1
- Entregável esperado: suíte Vitest exercitando happy path multi-segmento, arredondamento com resto, alvo zero, `NO_SEGMENTS`, `INFEASIBLE_TARGET`, `INVALID_TARGET` por cap, variação working hours on/off
- Check de conclusão:
  - [ ] Cada bullet de §6.1 possui pelo menos um caso de teste nomeado e assertivo correspondente
  - [ ] Testes falham antes da implementação correta e passam após T1 completa (sanidade de verificação)
  - [ ] Nenhum import que force alteração a arquivos fora do mapa §4.3
- Riscos ou atenções: fixtures mínimas mas suficientes para reproduzir tetos e resto; manter critério de inclusão no período idêntico a R09

### T3 — Adicionar modal, ação por linha, acessibilidade e guardas de contexto na vista Horas

- Status: PENDENTE
- Objetivo: Cada linha com dados oferece ação explícita para editar tempo; modal com contexto de tarefa e quadro, valor atual coerente com a coluna Tempo, campo para novo total, Cancelar e Salvar, papéis e estados de diálogo acessíveis; linhas de card arquivado sem abrir edição; fechar e descartar ao mudar `periodKind`, `anchor` ou `scope` com modal aberta; comportamento do alvo da linha coerente com filtro Todos os quadros vs quadro atual (lacuna A1 do plan-reviewer).
- Base no IPD: §3 (RF-01, RF-02, E2, E3), §4.2 (passos 1–3 e gatilho E2), §6.2 (data-testid), §2.4 (referência `CreateTaskModal.tsx` — padrão modal, sem editar esse arquivo)
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/hours/HoursView.tsx` (MODIFICAR); referência somente leitura `apps/flowboard/src/features/board/CreateTaskModal.tsx`
- Dependências: nenhuma (pode paralelizar com T1–T2 em equipe distinta, mas o integrador precisa da função para salvar; ordem recomendada após T1 para evitar stub eterno)
- Entregável esperado: UI da modal e gatilhos por linha com `data-testid` alinhados a §6.2 (nomes sugeridos ou equivalentes com `data-board-id` / `data-card-id` conforme IPD); guardas E2 e E3 verificáveis manualmente
- Check de conclusão:
  - [ ] RF-01 atendido: controle por linha com nome acessível e operável por teclado
  - [ ] RF-02 atendido em layout mínimo: título, quadro, valor atual, entrada numérica, Cancelar e Salvar, `role="dialog"` e `aria-modal` coerentes com o padrão de referência
  - [ ] E3: cards arquivados não abrem a modal de edição de horas (ação desabilitada com auxílio compreensível)
  - [ ] E2: alteração de período ou escopo enquanto a modal está aberta fecha a modal e descarta edição sem persistir
  - [ ] RF-04 (A1 plan-reviewer): para o modo “Todos os quadros” vs “Quadro atual”, a linha e o alvo persistido usam o `boardId` correto da linha, sem ambiguidade de escopo
  - [ ] `data-testid` para navegação existente (`hours-view`, `nav-hours`) permanece intacto
- Riscos ou atenções: não persistir nesta task; foco em estado de UI e fechamento seguro; copiar padrões de overlay do projeto sem divergir de guardrails

### T4 — Orquestrar validação, domínio, montagem do documento e persistência com tratamento de erros

- Status: PENDENTE
- Objetivo: Fluxo de Salvar valida entrada, calcula `targetMs` com fator único, carrega documento fresco, aplica domínio, monta `nextDoc` substituindo segmentos e atualizando `cardTimeState` com reconstrução de `completed`, chama `saveBoard`, recarrega agregação para tabela e rodapé Total, e trata erros de domínio, rede, e 409 com CTA de recarregar conforme IPD.
- Base no IPD: §3 (RF-03, RNB-02, E1, E4, E5, INFEASIBLE_TARGET, 409), §4.1 (validação), §4.2 (passos 4–5), §4.3 (MODIFICAR HoursView), §7.1
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/hours/HoursView.tsx` (MODIFICAR); uso de `boardRepository` via API existente (arquivo do repositório intocado); tratamento de `GitHubHttpError` 409 conforme IPD
- Dependências: T1, T3
- Entregável esperado: Caminho feliz completo até persistência e refresh; mensagens pt-BR por código e para 409; estado de carregamento no salvar; ausência de persistência quando domínio retorna `ok: false`
- Check de conclusão:
  - [ ] E1: cenário sem segmentos elegíveis no período não chama persistência e exibe mensagem clara mapeada a `NO_SEGMENTS`
  - [ ] E4: com múltiplos segmentos no período, uma edição ajusta o total da linha via domínio e reflete na UI após reload
  - [ ] E5 e erros genéricos: falhas de rede ou erro GitHub não-409 não marcam sucesso e exibem feedback visível
  - [ ] `INFEASIBLE_TARGET` e `INVALID_TARGET` exibem mensagens do mapeamento §4.1.2
  - [ ] 409: fluxo de mensagem de conflito com ação de recarregar e tentar novamente alinhado a §4.2
  - [ ] Sucesso: modal fecha e lista mais Total consistentes após re-agregação
  - [ ] `saveBoard` invocado apenas com SHA do último `loadBoard` imediatamente antes do patch
- Riscos ou atenções: não mutar JSON com campos novos; substituição por `segmentId`; se card arquivado aparecer por corrida, abortar com feedback suave (alinhar a §4.2)

### T5 — Aplicar estilos mínimos da modal na folha de Horas

- Status: PENDENTE
- Objetivo: Visual do overlay e do diálogo alinhado ao restante do app, reutilizando convenções visuais do modal de referência sem copiar código indevido.
- Base no IPD: §4.3 (MODIFICAR HoursView.css), §2.4 (referência visual CreateTaskModal / padrão `fb-ctm`)
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/hours/HoursView.css` (MODIFICAR)
- Dependências: T3 (estrutura DOM e classes estáveis da modal)
- Entregável esperado: Estilos consistentes com o tema Horas e legibilidade do formulário
- Check de conclusão:
  - [ ] Overlay e painel da modal não quebram layout da tabela existente
  - [ ] Contraste e espaçamentos usáveis em desktop alvo do MVP
  - [ ] Sem alterações em folhas de componentes fora do mapa §4.3
- Riscos ou atenções: evitar dependência rígida de detalhes internos do CreateTaskModal; preferir tokens/classes já usados no módulo Horas quando possível

### T6 — Automatizar verificação de E2 e smoke E2E da vista Horas

- Status: PENDENTE
- Objetivo: Cumprir plano de teste para fechamento da modal em mudança de contexto (aviso A2 do plan-reviewer) e entregar smoke E2E mínimo da vista com seletores §6.2, preferindo reutilizar autenticação e padrões existentes em `tests/e2e/`; se dados estáveis não forem viáveis, registrar deferência motivada no relatório do executor ainda cumprindo domínio e lint (IPD §6.2 último parágrafo).
- Base no IPD: §3 (E2, DoD Constitution VI), §6.2, §8 (verificação final), plan-reviewer FEATURE (A2)
- Arquivos ou áreas impactadas: `tests/e2e/` (novo ou estendido spec conforme convenção já usada no pacote; não alterar arquivos do mapa §4.3 além do necessário para expor `data-testid` já previstos em T3)
- Dependências: T3, T4 (fluxo E2E de edição completa); T2 para confiança de domínio
- Entregável esperado: Pelo menos um teste automatizado que falhe se E2 regressar; smoke que navegue até Horas e exercite interação mínima de edição quando dados permitirem; caso contrário, evidência documentada de bloqueio por dados
- Check de conclusão:
  - [ ] Cenário E2 coberto por Playwright ou alternativa aprovada no relatório do executor com reprodução manual rastreada a esta task
  - [ ] Uso de `getByTestId` para `nav-hours` e `hours-view` e para controles da modal conforme §6.2
  - [ ] Teste de smoke não depende de IDs frágeis proibidos pelo IPD
  - [ ] Se deferido: relatório do executor descreve motivo e confirma que domínio e lint permanecem obrigatórios
- Riscos ou atenções: flaky por dados — preferir fixture ou fluxo Kanban já existente no repositório; não expandir escopo além do IPD

## Cobertura do DoD

- RF-01 → T3  
- RF-02 → T3, T4  
- RF-03 / persistência e Total → T4  
- RNB-02 / reconstrução `completed` → T1, T4  
- Constitution VI / lint e build do pacote → T2, T6, verificação final do executor (§8)  
- E1 → T2, T4  
- E2 → T3, T6  
- E3 → T3  
- E4 → T2, T4  
- E5 → T4  
- INFEASIBLE_TARGET → T2, T4  
- 409 Conflict → T4, T6 (quando cenário reproduzível)  
- RF-04 escopo quadro (A1 plan-reviewer) → T3, verificação em T4 e T6 quando aplicável  

## Lacunas ou Bloqueios

- Nenhum bloqueio de decomposição: o IPD está completo para execução. Ambiguidade leve sobre o formato exato de `nextSegments` (sugestão S2 do plan-reviewer) deve ser resolvida na implementação seguindo §4.2: substituição por `segmentId` no array completo do documento, com projeção coerente da função conforme T1.

## Matriz de Rastreabilidade

| Task | Base no IPD | Arquivos ou áreas | DoD/Testes relacionados |
|------|----------------|-------------------|-------------------------|
| T1 | §1, §4.1, §4.1.2, §4.2, §4.3, §5, §7.1 | `applyTargetHoursForCardInPeriod.ts` | RNB-02, INFEASIBLE, INVALID, Constitution VI |
| T2 | §3, §6.1, §4.3, §8 | `applyTargetHoursForCardInPeriod.test.ts` | Constitution VI, E1, E4, códigos de domínio |
| T3 | §3, §4.2, §6.2, §2.4; A1 plan-reviewer | `HoursView.tsx` | RF-01, RF-02, E2, E3, RF-04 |
| T4 | §3, §4.1, §4.2, §4.3, §7.1 | `HoursView.tsx` | RF-03, RNB-02, E1, E4, E5, 409, INFEASIBLE |
| T5 | §4.3, §2.4 | `HoursView.css` | RF-02 (UX visual mínima) |
| T6 | §3, §6.2, §8; A2 plan-reviewer | `tests/e2e/` | E2 automatizado, smoke Horas, Constitution VI |

## Metadata JSON

```json
{
  "agent": "task-breakdown",
  "status": "success",
  "ipd_source": ".memory-bank/specs/edit-horas-apontamento/planner-FEATURE.md",
  "plan_review": ".memory-bank/specs/edit-horas-apontamento/plan-reviewer-FEATURE.md",
  "total_tasks": 6,
  "complexity": "M",
  "blocked_tasks": 0,
  "blockers": [],
  "task_md_path": ".memory-bank/specs/edit-horas-apontamento/task-breakdown-FEATURE.md"
}
```
