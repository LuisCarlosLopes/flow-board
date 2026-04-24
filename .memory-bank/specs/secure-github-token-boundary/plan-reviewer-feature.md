# Plan Review Report — Fronteira segura para token GitHub
> Data: 2026-04-24 | Revisor: plan-reviewer | IPD Versão: v1.1
> Artefato auditado: `.memory-bank/specs/secure-github-token-boundary/planner-feature.md`

## Veredicto: 🟡 APROVADO COM RESSALVAS
- Zero críticos remanescentes. O IPD v1.1 ficou executável, mas ainda há ressalvas de consistência interna e rastreabilidade.

## Sumário
| Categoria | Qtd |
|---|---:|
| 🔴 Críticos | 0 |
| 🟡 Avisos | 2 |
| 🔵 Sugestões | 3 |
| ✅ Auto-correções | 0 |
| Score de Qualidade | 80/100 |

## Problemas Encontrados
### 🟡 AVISOS
[A1] Seção 5 / 4.4 — novas env vars sem guardrail explícito de gestão
- Evidência: a Seção 4.4 declara `FLOWBOARD_SESSION_TTL_SECONDS`, `FLOWBOARD_COOKIE_SECURE` e `PORT` como `variaveis_de_ambiente_novas`, mas a Seção 5 não registra guardrail explícito para "não hardcode", "não commitar" ou "gerenciar só por ambiente/configuração".
- Risco: o executor pode introduzir a configuração do BFF de forma inconsistente com a política de segredos/configuração, especialmente em `server/**` e scripts.
- Ação recomendada: adicionar um guardrail explícito na Seção 5 para env vars novas, por exemplo: não hardcode, não commitar `.env`, defaults server-side claros e sem leitura de segredo pelo browser.

[A2] Seção 4.3 × 2.3 — itens `NÃO TOCAR` não estão todos ancorados em contratos preservados
- Evidência: a Seção 4.3 marca `apps/flowboard/src/domain/**`, `apps/flowboard/src/data/releases.json` e ADRs vigentes como `NÃO TOCAR`, mas a Seção 2.3 só ancora contratos de `sessionStore.ts`, `boardRepository.ts` e do layout `flowboard/**`.
- Risco: parte dos guardrails fica só declarativa, sem contrato rastreável para validar preservação durante a implementação.
- Ação recomendada: expandir a Seção 2.3 com uma subseção curta de "contratos preservados" para domínio puro, `releases.json` e ADRs vigentes, ou reduzir `NÃO TOCAR` ao conjunto efetivamente ancorado.

### 🔵 SUGESTÕES
[S1] Cobrir arquivos documentais/config de apoio no fluxo
- Benefício: citar ADR-001/004, README, `playwright.config.ts` e configs TS/lint como passos finais de execução em 4.2 reduz a chance de arquivos órfãos no handoff.

[S2] Tornar o fallback de restart do vault mais observável
- Benefício: incluir no fluxo ou no DoD a resposta esperada para restart do BFF com cookie antigo deixa mais claro como a UI deve reagir ao fail-closed.

[S3] Nomear o contrato mínimo do gateway de conteúdo
- Benefício: promover o tipo `FlowBoardContentGateway` a um contrato nomeado e referenciado em 2.3/4.1 facilita implementação incremental e revisão de impacto em `attachmentSync` e `boardRepository`.

## Checklist de Aprovação
| Check | Status | Evidência |
|---|---|---|
| C1.1 | PASSOU | As 10 seções obrigatórias estão presentes no IPD v1.1. |
| C1.2 | PASSOU | Cabeçalho completo com nome da task, confiança 88, complexidade L, data, versão, track, slug e artefato canônico. |
| C1.3 | PASSOU | Não encontrei placeholders/template literals não preenchidos fora de blocos de código. |
| C1.4 | PASSOU | A missão traz objetivo concreto, restrição explícita e contexto de negócio alinhado ao problema de segurança. |
| C1.5 | PASSOU | A Seção 2 traz zona de trabalho real, tabela de stack preenchida, contratos concretos e módulo de referência existente. |
| C1.6 | PASSOU | O DoD é mensurável e lista edge cases com comportamento esperado explícito. |
| C1.7 | PASSOU | A Seção 4 define contratos de API, fluxo numerado, mapa de alterações e bloco JSON de dependências. |
| C1.8 | PASSOU | A Seção 5 contém vários guardrails específicos da feature e do projeto. |
| C1.9 | PASSOU | A Seção 6 traz happy path, negativos, regressões de storage e E2E de fronteira. |
| C1.10 | PASSOU | As 4 assunções residuais têm default explícito, justificativa e impacto. |
| C1.11 | PASSOU | Metadados preenchidos com confiança ≥ 70, bloqueios = 0 e contagem de assunções coerente. |
| C2.1 | PASSOU | Os edge cases do DoD aparecem refletidos em `sessionStore`, gateway/BFF e specs E2E de storage/fronteira. |
| C2.2 | PASSOU | O fluxo cobre boot, login, operações de dados e logout, que sustentam o núcleo do mapa de alterações. |
| C2.3 | PASSOU | O padrão de erro declarado para a feature é consistente com os outputs de falha do contrato same-origin. |
| C2.4 | PASSOU | As libs novas estão justificadas pelo runtime BFF, cookies e runner de desenvolvimento. |
| C2.5 | PASSOU | Complexidade `L` é compatível com ~42 arquivos e impacto cross-module explícito. |
| C2.6 | FALHOU | Há itens `NÃO TOCAR` sem contrato correspondente documentado em 2.3. |
| C2.7 | FALHOU | Há env vars novas em 4.4 sem guardrail explícito de gestão na Seção 5. |
| C2.8 | PASSOU | `migrations_necessarias` foi normalizado para `false` e a limpeza legada ficou descrita como fail-closed em runtime. |
| C2.9 | PASSOU | Seção 7.3 documenta 4 assunções e a Seção 10 replica 4 assunções com 0 bloqueios. |
| C3.1 | PASSOU | Os arquivos `MODIFICAR` e `NÃO TOCAR` auditados existem no repositório; os principais `CRIAR` ainda não existem e não conflitam. |
| C3.2 | PASSOU | Stack declarada bate com [package.json](/Users/luiscarloslopesjr/GitHub/flow-board/apps/flowboard/package.json:1). |
| C3.3 | PASSOU | A Seção 2.3 agora separa baseline real e contrato alvo, alinhando [sessionStore.ts](/Users/luiscarloslopesjr/GitHub/flow-board/apps/flowboard/src/infrastructure/session/sessionStore.ts:1) e [boardRepository.ts](/Users/luiscarloslopesjr/GitHub/flow-board/apps/flowboard/src/infrastructure/persistence/boardRepository.ts:1). |
| C3.4 | PASSOU | Os módulos de referência declarados existem no repositório, incluindo `client.ts`, `boardRepository.ts`, `sessionStore.ts` e `auth.setup.ts`. |
| C3.5 | PASSOU | `react`, `vite`, `typescript`, `vitest` e `@playwright/test` existem no manifesto atual. |
| C3.6 | PASSOU | O padrão de erro `GitHubHttpError` e o uso atual de `Authorization` no cliente GitHub existem no código real em [client.ts](/Users/luiscarloslopesjr/GitHub/flow-board/apps/flowboard/src/infrastructure/github/client.ts:1). |
| C3.7 | PASSOU | `apps/flowboard/server/`, `tsconfig.server.json`, `authGateway.ts`, `flowBoardGitHubGateway.ts`, `security-storage.spec.ts` e `security-boundary.spec.ts` ainda não existem, sem conflito prévio. |

## Auto-correções Aplicadas
Nenhuma. As ressalvas restantes exigem decisão/documentação explícita do planner, não ajuste automático seguro.

## Resolução de Críticos Anteriores (se re-review)
| Crítico | Status | Evidência da Resolução |
|---|---|---|
| Seção 2.3 descrevia contratos-alvo como baseline atual | ✅ Resolvido | O IPD v1.1 agora separa `2.3.1 Contrato atual do repositório` e `2.3.2 Contrato alvo pós-change`, alinhado a [sessionStore.ts](/Users/luiscarloslopesjr/GitHub/flow-board/apps/flowboard/src/infrastructure/session/sessionStore.ts:1) e [boardRepository.ts](/Users/luiscarloslopesjr/GitHub/flow-board/apps/flowboard/src/infrastructure/persistence/boardRepository.ts:1). |
| `migrations_necessarias: true` sem artefato/passo correspondente | ✅ Resolvido | A Seção 4.4 foi normalizada para `"migrations_necessarias": false` com `migration_tipo` descrevendo limpeza lógica fail-closed em runtime. |
