# ADR-009: FlowBoard — Fronteira segura para token GitHub

**Status:** Aceito  
**Data:** 2026-04-24  
**Feature de origem:** secure-github-token-boundary  
**Autores:** architect skill  
**Supersede parcial:** ADR-001 no trecho que autoriza chamadas autenticadas diretamente do browser para GitHub com PAT  
**Supersede:** ADR-004 para armazenamento e modelo de sessão com PAT no browser

---

## Contexto

O FlowBoard foi lançado como SPA static-only que chama a GitHub REST API diretamente do browser usando PAT informado pelo usuário. Essa decisão reduziu infraestrutura no MVP, mas deixou o PAT acessível a JavaScript do mesmo origin e persistido no modelo de sessão do cliente. A feature `secure-github-token-boundary` exige que a sessão persistida no browser não contenha PAT, token GitHub bruto, header `Authorization` nem segredo equivalente, e que chamadas autenticadas após login não sejam assinadas pela SPA diretamente contra `https://api.github.com`.

A restrição central continua válida: catálogo, boards, cards, apontamentos de horas e anexos permanecem como dados de domínio versionados sob `flowboard/**` no repositório GitHub configurado pelo usuário. A nova fronteira pode guardar credencial e estado de sessão, mas não pode virar fonte de verdade de dados de produto.

## Decisão

Decidimos introduzir uma **fronteira BFF/proxy same-origin para credenciais GitHub**. A SPA envia o PAT somente durante o estabelecimento da sessão segura; a fronteira valida o repositório, guarda a credencial fora do JavaScript do browser, emite uma sessão por cookie `HttpOnly`/`Secure`/`SameSite`, e passa a assinar no servidor as operações GitHub necessárias para ler, escrever e excluir arquivos `flowboard/**`.

O browser pode persistir apenas metadados públicos de sessão (`owner`, `repo`, `repoUrl`, `webUrl`, `authenticated`, `expiresAt`). A capacidade autenticada deve ser representada por cookie ou referência opaca inacessível a JavaScript, não por PAT, access token GitHub, refresh token GitHub ou segredo cifrado reversível pela SPA.

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Manter PAT no cliente com hardening adicional | CSP, validação de `apiBase`, `password` input, limpeza de storage e PAT apenas em memória reduzem exposição acidental, mas não cumprem RF04/RF05: a SPA continuaria capaz de assinar requests GitHub e XSS no origin ainda alcançaria a credencial durante a sessão. |
| BFF/proxy de credencial same-origin | Selecionada porque remove o PAT do modelo de sessão do cliente, mantém dados de domínio no GitHub, preserva o fluxo inicial com URL + PAT e evita introduzir OAuth/GitHub App completo como primeira entrega. |
| OAuth App completo | Melhora UX em relação a PAT manual, mas GitHub recomenda considerar GitHub Apps; OAuth App tende a ter escopo menos fino e ainda exige backend para troca de code/secret e guarda de tokens. É mudança maior de produto, consentimento e configuração. |
| GitHub App completo | Arquiteturalmente superior no longo prazo por permissões finas e tokens de instalação de curta duração, mas exige registro/instalação do App, callback, gestão de installation id, chaves privadas e UX de instalação. Não é obrigatório na primeira entrega da TSD. |
| Service Worker ou vault no browser | Não cria fronteira de segurança suficiente contra XSS de mesmo origin; continua executando no ambiente do cliente e não elimina a capacidade do browser de obter ou usar a credencial. |

## Referências externas

- GitHub Docs — OAuth Apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub Docs — GitHub App installation authentication: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- GitHub Docs — generating installation access tokens: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app

## Consequências

**Positivas:**
- O PAT deixa de ser persistido e restaurado por `localStorage`, `sessionStorage` ou storage state E2E.
- Chamadas autenticadas ao GitHub passam por uma superfície controlada, com escopo por `owner/repo`, paths permitidos e respostas redigidas.
- O contrato de dados de domínio permanece compatível com ADR-002, ADR-005 e ADR-008.
- A solução permite evoluir futuramente para GitHub App sem alterar a fonte de verdade dos dados.

**Trade-offs aceitos:**
- FlowBoard deixa de ser static-only para fluxos autenticados; produção passa a exigir uma runtime de API same-origin ou serverless equivalente.
- A fronteira precisa proteger o vault de credenciais, aplicar CSRF/origin checks e ter expiração/revogação de sessão.
- O risco residual de XSS durante a digitação inicial do PAT permanece enquanto OAuth/GitHub App não for adotado.
- Testes E2E precisam validar cookie/sessão e ausência de PAT em storage, não mais reutilizar PAT salvo em `localStorage`.

## Guardrails derivados desta decisão

- **GA-009-01:** A SPA não deve persistir, expor em props, ou restaurar `pat`, `token`, `accessToken`, `refreshToken`, `authorization` ou segredo equivalente.
- **GA-009-02:** Após login bem-sucedido, a SPA não deve enviar `Authorization: Bearer <PAT>` para `https://api.github.com` nem criar `GitHubContentsClient` autenticado com PAT no browser.
- **GA-009-03:** Toda operação GitHub autenticada deve passar pela fronteira same-origin e ser escopada ao `owner/repo` validado na sessão.
- **GA-009-04:** A fronteira deve permitir apenas paths de dados FlowBoard aprovados, inicialmente `flowboard/catalog.json`, `flowboard/boards/**` e `flowboard/attachments/**`.
- **GA-009-05:** O vault de credenciais pode persistir somente segredo e metadados de sessão; não pode armazenar catálogo, boards, cards, horas, anexos ou cache autoritativo de domínio.
- **GA-009-06:** Logout deve invalidar a sessão local e a credencial/referência mantida pela fronteira; repetição de logout deve ser idempotente.
- **GA-009-07:** Sessões legadas contendo PAT em `localStorage` ou `sessionStorage` devem ser removidas fail-closed e exigir reconexão.
- **GA-009-08:** Erros retornados ao browser devem ser redigidos e mapear autenticação, autorização, não encontrado, conflito, limite de taxa, conteúdo remoto inválido e falha externa sem payloads sensíveis.
- **GA-009-09:** A CSP de produção deve deixar de exigir `connect-src https://api.github.com` para operações autenticadas da SPA; o caminho esperado passa a ser `connect-src 'self'` para a fronteira.

## Status de vigência

- **Aceito** — em vigor desde 2026-04-24 para `secure-github-token-boundary`.
- Enquanto ADR-001 e ADR-004 não forem editadas, este ADR prevalece no escopo de segurança de credenciais: dados de domínio continuam no GitHub, mas PAT no browser e chamadas GitHub autenticadas diretamente pela SPA ficam deprecados.
