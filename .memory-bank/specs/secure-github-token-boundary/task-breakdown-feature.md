# Task Breakdown — Fronteira segura para token GitHub

> IPD de origem: `.memory-bank/specs/secure-github-token-boundary/planner-feature.md`
> Versão do IPD: `v1.1`
> Data: `2026-04-24`
> Gerado por: `task-breakdown v1.0`

## Resumo Executivo

- Objetivo do plano: introduzir uma fronteira BFF/proxy same-origin para autenticação e persistência GitHub, removendo o PAT da sessão pública, do storage do browser e do modelo React, sem alterar o schema de `flowboard/**`.
- Complexidade: `L`
- Total de tasks: `8`
- Estratégia de execução: primeiro consolidar runtime/contratos e guardrails de configuração, depois implementar sessão segura e gateway de conteúdo, integrar a SPA sem quebrar domínio existente, atualizar governança/documentação e fechar com testes e verificações do DoD.

## Guardrails Herdados do IPD

- Não persistir PAT, token bruto, `Authorization` ou segredo equivalente em `localStorage`, `sessionStorage`, `storageState`, logs, URLs, mensagens ou `flowboard/**`.
- Não instanciar cliente GitHub autenticado no browser; chamadas autenticadas da SPA devem ir apenas para `/api/*` same-origin.
- Não aceitar `owner`, `repo` ou `apiBase` vindos do cliente após autenticação; o BFF deve resolver escopo apenas pela sessão.
- Não permitir paths fora de `flowboard/catalog.json`, `flowboard/boards/**` e `flowboard/attachments/**`, nem aceitar traversal, URL, path absoluto ou namespace não permitido.
- Não quebrar os contratos preservados de domínio puro, layout `flowboard/**`, semântica de SHA/conflito, anexos GitHub e fonte estática de `src/data/releases.json`.
- Não hardcode nem versionar configuração sensível do BFF; variáveis novas devem ser tratadas só no runtime do servidor, com defaults explícitos e sem leitura de segredo pelo browser.

## Cuidados Operacionais das Ressalvas do Review

- Tratar `FLOWBOARD_SESSION_TTL_SECONDS`, `FLOWBOARD_COOKIE_SECURE` e `PORT` como configuração exclusiva do runtime server-side, sem hardcode de segredo, sem documentação de valores reais e sem dependência do browser.
- Preservar explicitamente os contratos não ancorados no baseline funcional: `apps/flowboard/src/domain/**` permanece sem mudança de regra, `apps/flowboard/src/data/releases.json` continua como fonte estática de versão e ADRs `002`, `003`, `005` e `008` seguem vigentes.

## Sequência de Tasks

### T1 — Estabelecer o runtime BFF e os contratos operacionais de configuração
- Status: PENDENTE
- Objetivo: preparar a base técnica do runtime same-origin com tipagem, lint e convenções de configuração necessárias para o BFF, sem ainda mudar o comportamento de autenticação da SPA.
- Base no IPD: `2.1`, `4.3`, `4.4`, `4.5`, `5`
- Arquivos ou áreas impactadas: `apps/flowboard/package.json`, `apps/flowboard/package-lock.json`, `apps/flowboard/tsconfig.server.json`, `apps/flowboard/tsconfig.json`, `apps/flowboard/tsconfig.node.json`, `apps/flowboard/eslint.config.js`, `apps/flowboard/vite.config.ts`, `apps/flowboard/playwright.config.ts`, `apps/flowboard/server/app.ts`, `apps/flowboard/server/dev.ts`, `apps/flowboard/server/index.ts`
- Dependências: nenhuma
- Entregável esperado: runtime server-side definido e integrado ao fluxo de desenvolvimento/preview, com guardrail explícito para variáveis novas e CSP alinhada ao uso same-origin.
- Check de conclusão:
  - [ ] O runtime `server/**` existe e está incorporado ao fluxo de desenvolvimento e preview previsto pelo plano.
  - [ ] `vite.config.ts`, configs TS e lint distinguem claramente código browser e código Node.
  - [ ] A CSP de produção deixa de permitir conexão autenticada direta da SPA com `https://api.github.com`.
  - [ ] O tratamento de `FLOWBOARD_SESSION_TTL_SECONDS`, `FLOWBOARD_COOKIE_SECURE` e `PORT` ficou restrito ao runtime server-side, com defaults explícitos e sem leitura pelo browser.
- Riscos ou atenções: não introduzir configuração implícita que reabra o canal browser -> GitHub; manter a ressalva do review sobre gestão de env vars visível no artefato final.

### T2 — Implementar o vault de sessão e as rotas seguras de autenticação
- Status: PENDENTE
- Objetivo: criar a fronteira de sessão segura no BFF, incluindo criação, leitura e revogação de sessão com cookie HttpOnly, redaction e fail-closed de credencial.
- Base no IPD: `3`, `4.1`, `4.2`, `4.5`, `5`, `6.1`
- Arquivos ou áreas impactadas: `apps/flowboard/server/sessions.ts`, `apps/flowboard/server/security.ts`, `apps/flowboard/server/app.ts`, `apps/flowboard/server/*.test.ts`
- Dependências: `T1`
- Entregável esperado: contrato `/api/auth/session` implementado conforme IPD, com vault em memória, cookie seguro, validações de origem/conteúdo e respostas redigidas.
- Check de conclusão:
  - [ ] `POST /api/auth/session`, `GET /api/auth/session` e `DELETE /api/auth/session` seguem o contrato do IPD e não retornam PAT.
  - [ ] O vault associa sessão opaca ao escopo `owner/repo` e permite revogação idempotente.
  - [ ] Métodos unsafe validam origem e formato esperado antes de processar payload.
  - [ ] Testes do servidor cobrem criação de cookie, revogação, idempotência de logout e redaction de segredos.
- Riscos ou atenções: restart do BFF deve falhar fechado; não registrar body de login nem informações suficientes para reconstruir o PAT.

### T3 — Implementar o serviço server-side do GitHub e a allowlist de conteúdo FlowBoard
- Status: PENDENTE
- Objetivo: mover a comunicação autenticada com a GitHub Contents API para o servidor e expor somente o contrato same-origin de conteúdo previsto pela feature.
- Base no IPD: `2.3`, `4.1`, `4.2`, `4.3`, `5`, `6.1`
- Arquivos ou áreas impactadas: `apps/flowboard/server/githubContentsService.ts`, `apps/flowboard/server/flowboardRoutes.ts`, `apps/flowboard/server/security.ts`, `apps/flowboard/server/app.ts`, `apps/flowboard/server/*.test.ts`, `apps/flowboard/src/infrastructure/github/client.ts`, `apps/flowboard/src/infrastructure/github/client.test.ts`
- Dependências: `T1`, `T2`
- Entregável esperado: rota `/api/flowboard/contents` operando com PAT apenas no servidor, allowlist de paths aplicada e semântica atual de `409`, `429` e `422 remote_content_invalid` preservada.
- Check de conclusão:
  - [ ] Leituras, escritas e exclusões usam o escopo da sessão, nunca `owner` ou `repo` vindos do cliente.
  - [ ] Paths fora da allowlist são rejeitados antes de qualquer chamada ao GitHub.
  - [ ] O serviço server-side preserva semântica de SHA/conflito, rate limit e redaction dos erros remotos.
  - [ ] O contrato mínimo de gateway de conteúdo fica explícito e reutilizável pelos adaptadores existentes.
- Riscos ou atenções: não expandir escopo para outros namespaces do repositório; manter intactos os contratos documentados por `ADR-002`, `ADR-005` e `ADR-008`.

### T4 — Remover o PAT da sessão pública e criar os gateways client-side same-origin
- Status: PENDENTE
- Objetivo: adaptar a camada de infraestrutura do browser para operar apenas com sessão pública e chamadas same-origin, eliminando dependência de PAT na sessão local.
- Base no IPD: `2.3`, `3`, `4.2`, `4.3`, `5`, `6.1`
- Arquivos ou áreas impactadas: `apps/flowboard/src/infrastructure/auth/authGateway.ts`, `apps/flowboard/src/infrastructure/auth/authGateway.test.ts`, `apps/flowboard/src/infrastructure/session/sessionStore.ts`, `apps/flowboard/src/infrastructure/session/sessionStore.test.ts`, `apps/flowboard/src/infrastructure/session/boardSelectionStore.test.ts`, `apps/flowboard/src/infrastructure/github/flowBoardGitHubGateway.ts`, `apps/flowboard/src/infrastructure/github/fromSession.ts`, `apps/flowboard/src/infrastructure/github/client.ts`, `apps/flowboard/src/infrastructure/github/client.test.ts`, `apps/flowboard/src/infrastructure/persistence/boardRepository.ts`, `apps/flowboard/src/infrastructure/persistence/boardRepository.test.ts`
- Dependências: `T2`, `T3`
- Entregável esperado: sessão pública sem campos proibidos, limpeza fail-closed de legado com PAT e gateway client-side compatível com o repositório sem `Authorization`.
- Check de conclusão:
  - [ ] `FlowBoardSession` persistida contém apenas metadados públicos definidos pelo IPD.
  - [ ] `loadSession()` remove sessões legadas com PAT de `localStorage` e `sessionStorage` e retorna `null`.
  - [ ] `authGateway` e `flowBoardGitHubGateway` operam com `credentials: include` e sem enviar `Authorization`.
  - [ ] `boardRepository` e helpers aceitam o gateway compatível sem quebrar o contrato mínimo existente.
- Riscos ou atenções: preservar compatibilidade dos adaptadores de domínio e não reintroduzir campos proibidos em fixtures, tipos auxiliares ou testes.

### T5 — Integrar login, boot e logout da SPA ao novo boundary seguro
- Status: PENDENTE
- Objetivo: ligar a UI de autenticação e o ciclo de vida da aplicação ao BFF, removendo bootstrap autenticado no browser e tornando reload/logout dependentes da sessão segura.
- Base no IPD: `1`, `3`, `4.2`, `4.3`, `5`, `6.1`, `6.2`
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/auth/LoginView.tsx`, `apps/flowboard/src/features/auth/LoginView.integration.test.tsx`, `apps/flowboard/src/App.tsx`, `apps/flowboard/src/features/app/AppShell.tsx`
- Dependências: `T4`
- Entregável esperado: fluxo de login, validação de sessão no boot e logout assíncrono funcionando apenas com sessão pública e cookie HttpOnly.
- Check de conclusão:
  - [ ] `LoginView` envia `repoUrl + pat` apenas para `POST /api/auth/session`, limpa o PAT após sucesso e não ecoa o valor em erro.
  - [ ] O boot da aplicação valida a sessão pública no BFF e limpa storage local quando receber `401`.
  - [ ] O logout chama a revogação server-side e limpa o estado local de forma idempotente.
  - [ ] Testes de integração confirmam que `onConnected` e persistência local recebem apenas sessão sem PAT.
- Riscos ou atenções: o fallback após reinício do BFF deve ser observável para o usuário e falhar fechado; não usar estado legado de sessão para contornar ausência de cookie.

### T6 — Migrar features de dados para o gateway same-origin sem tocar o domínio puro
- Status: PENDENTE
- Objetivo: atualizar as features que leem e escrevem dados FlowBoard para usar o gateway same-origin, preservando regras de domínio, schema e semântica atual das operações.
- Base no IPD: `2.3`, `4.2`, `4.3`, `5`, `6.1`
- Arquivos ou áreas impactadas: `apps/flowboard/src/features/board/BoardView.tsx`, `apps/flowboard/src/features/board/ArchivedCardsPage.tsx`, `apps/flowboard/src/features/board/attachmentSync.ts`, `apps/flowboard/src/features/boards/BoardListView.tsx`, `apps/flowboard/src/features/hours/HoursView.tsx`, `apps/flowboard/src/features/app/SearchModal.tsx`, `apps/flowboard/src/features/app/SearchModal.test.tsx`
- Dependências: `T4`, `T5`
- Entregável esperado: features da SPA usando apenas o gateway same-origin para catálogo, boards, horas, anexos e busca, sem alteração de regra de negócio em `src/domain/**`.
- Check de conclusão:
  - [ ] Todas as features listadas deixam de depender de cliente GitHub autenticado no browser.
  - [ ] Mensagens de `401`, `409` e `429` continuam coerentes com a semântica atual.
  - [ ] `attachmentSync` e persistência de anexos preservam o contrato vigente do repositório GitHub.
  - [ ] Nenhum arquivo em `apps/flowboard/src/domain/**` ou `apps/flowboard/src/data/releases.json` foi alterado para acomodar a feature.
- Riscos ou atenções: esta task deve respeitar a ressalva do review sobre itens `NÃO TOCAR`; qualquer necessidade fora da lista precisa ser tratada como exceção justificada no handoff, não como expansão implícita.

### T7 — Atualizar governança e documentação operacional da nova fronteira
- Status: PENDENTE
- Objetivo: alinhar documentação técnica e ADRs ao boundary seguro, registrando supersessão parcial e requisitos operacionais do runtime BFF.
- Base no IPD: `3`, `4.3`, `4.5`, `5`, `8`, `9`
- Arquivos ou áreas impactadas: `apps/flowboard/README.md`, `.memory-bank/adrs/001-flowboard-spa-github-persistence.md`, `.memory-bank/adrs/004-flowboard-session-and-pat-storage.md`
- Dependências: `T1`, `T2`, `T3`, `T5`
- Entregável esperado: README e ADRs ajustados para refletir runtime same-origin, storage sem segredo, fail-closed de sessão legada e supersessão pela `ADR-009`.
- Check de conclusão:
  - [ ] O README descreve corretamente o requisito de runtime BFF para fluxos autenticados, o risco residual do formulário e o comportamento esperado de sessão.
  - [ ] ADR-001 e ADR-004 apontam explicitamente para a `ADR-009` nos trechos supersedidos.
  - [ ] A documentação não contradiz os contratos preservados de layout `flowboard/**`, domínio puro e anexos.
  - [ ] Configuração operacional nova é documentada sem expor valores reais ou incentivar versionamento de segredo.
- Riscos ou atenções: não reescrever ADRs vigentes além do necessário para supersessão parcial; preservar a origem GitHub como fonte de verdade dos dados.

### T8 — Executar a bateria de testes e validar o DoD de segurança
- Status: PENDENTE
- Objetivo: consolidar a evidência objetiva da feature com cobertura unitária, integração server-side e E2E da fronteira segura, incluindo legado, reload e ausência de chamadas autenticadas diretas do browser ao GitHub.
- Base no IPD: `3`, `6`, `8`, `9`
- Arquivos ou áreas impactadas: `apps/flowboard/server/*.test.ts`, `apps/flowboard/tests/e2e/auth.setup.ts`, `apps/flowboard/tests/e2e/security-storage.spec.ts`, `apps/flowboard/tests/e2e/security-boundary.spec.ts`, `apps/flowboard/tests/e2e/login.spec.ts`, `apps/flowboard/tests/e2e/pages/login.page.ts`
- Dependências: `T2`, `T3`, `T4`, `T5`, `T6`, `T7`
- Entregável esperado: suíte de testes cobrindo storage seguro, boundary same-origin, redaction, sessão legada e regressões essenciais do plano.
- Check de conclusão:
  - [ ] Há cobertura unitária para sessão sem PAT, limpeza legada, `authGateway`, gateway same-origin, allowlist, redaction, cookie/logout e mapeamento de erros.
  - [ ] `auth.setup.ts` e as specs E2E provam ausência de PAT em `localStorage`, `sessionStorage` e `storageState`.
  - [ ] As specs E2E provam que operações autenticadas da SPA usam `/api/flowboard/contents` e não disparam request direto com `Authorization` para `https://api.github.com`.
  - [ ] A evidência final cobre login, reload, logout, cookie inválido/expirado, sessão legada e semântica preservada de `409`, `429` e `422`.
- Riscos ou atenções: a validação deve priorizar as specs novas/alteradas da feature e registrar qualquer limitação operacional sem substituir a evidência automatizada por teste manual.

## Cobertura do DoD

- Sessão pública sem segredo e sem `apiBase` controlado pelo usuário → `T4`, `T5`, `T8`
- Migração fail-closed de `flowboard.session.v1` em `localStorage` e `sessionStorage` → `T4`, `T8`
- Login seguro via `POST /api/auth/session` com limpeza do PAT → `T2`, `T5`, `T8`
- Fronteira same-origin para leitura, escrita e exclusão de dados → `T3`, `T4`, `T6`, `T8`
- Logout idempotente com revogação no BFF e limpeza local → `T2`, `T5`, `T8`
- Compatibilidade de schema de catálogo, boards, horas e anexos → `T3`, `T4`, `T6`, `T7`
- Erros redigidos para `400/401/403/404/409/422/429/502/503` → `T2`, `T3`, `T8`
- CSP sem `connect-src https://api.github.com` para a SPA em produção → `T1`
- ADR-001 e ADR-004 alinhadas à `ADR-009` → `T7`
- Testes unitários e E2E cobrindo boundary, storage, cookie e erros → `T2`, `T3`, `T4`, `T5`, `T8`
- Qualidade final e evidência objetiva do plano → `T8`

## Lacunas ou Bloqueios

- Nenhum bloqueio material identificado. O IPD `v1.1` está suficientemente estável para decomposição.

## Matriz de Rastreabilidade

| Task | Base no IPD | Arquivos ou áreas | DoD/Testes relacionados |
|---|---|---|---|
| T1 | `2.1`, `4.3`, `4.4`, `4.5`, `5` | `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.js`, `vite.config.ts`, `playwright.config.ts`, `server/app.ts`, `server/dev.ts`, `server/index.ts` | DoD: fronteira same-origin, CSP, qualidade operacional |
| T2 | `3`, `4.1`, `4.2`, `4.5`, `5`, `6.1` | `server/sessions.ts`, `server/security.ts`, `server/app.ts`, `server/*.test.ts` | DoD: login seguro, logout idempotente, erros redigidos; Testes BFF de cookie, sessão, redaction |
| T3 | `2.3`, `4.1`, `4.2`, `4.3`, `5`, `6.1` | `server/githubContentsService.ts`, `server/flowboardRoutes.ts`, `server/security.ts`, `server/app.ts`, `server/*.test.ts`, `src/infrastructure/github/client.*` | DoD: same-origin de conteúdo, compatibilidade de schema, `409/422/429`; Testes de allowlist e mapeamento de erros |
| T4 | `2.3`, `3`, `4.2`, `4.3`, `5`, `6.1` | `src/infrastructure/auth/authGateway.*`, `src/infrastructure/session/sessionStore.*`, `src/infrastructure/session/boardSelectionStore.test.ts`, `src/infrastructure/github/flowBoardGitHubGateway.ts`, `src/infrastructure/github/fromSession.ts`, `src/infrastructure/github/client.*`, `src/infrastructure/persistence/boardRepository.*` | DoD: sessão pública, migração fail-closed, ausência de `Authorization`; Testes unitários de sessão, gateway e repositório |
| T5 | `1`, `3`, `4.2`, `4.3`, `5`, `6.1`, `6.2` | `src/features/auth/LoginView.tsx`, `src/features/auth/LoginView.integration.test.tsx`, `src/App.tsx`, `src/features/app/AppShell.tsx` | DoD: login seguro, reload, logout, cookie inválido/expirado; Testes de integração e E2E de login |
| T6 | `2.3`, `4.2`, `4.3`, `5`, `6.1` | `src/features/board/BoardView.tsx`, `src/features/board/ArchivedCardsPage.tsx`, `src/features/board/attachmentSync.ts`, `src/features/boards/BoardListView.tsx`, `src/features/hours/HoursView.tsx`, `src/features/app/SearchModal.tsx`, `src/features/app/SearchModal.test.tsx` | DoD: compatibilidade de dados e same-origin; Testes de regressão em features e anexos |
| T7 | `3`, `4.3`, `4.5`, `5`, `8`, `9` | `README.md`, `ADR-001`, `ADR-004` | DoD: ADRs alinhadas, README atualizado, contratos preservados |
| T8 | `3`, `6`, `8`, `9` | `server/*.test.ts`, `tests/e2e/auth.setup.ts`, `tests/e2e/security-storage.spec.ts`, `tests/e2e/security-boundary.spec.ts`, `tests/e2e/login.spec.ts`, `tests/e2e/pages/login.page.ts` | DoD: testes unitários, E2E, storage seguro, ausência de request direto browser -> GitHub, qualidade final |
