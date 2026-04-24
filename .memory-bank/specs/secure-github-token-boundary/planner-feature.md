# IPD: Fronteira segura para token GitHub — v1.1
> Confiança: 88/100 | Complexidade: L | Data: 2026-04-24  
> Track da Squad: FEATURE | Slug: secure-github-token-boundary | Subtask ID: null  
> Artefato Canônico: `.memory-bank/specs/secure-github-token-boundary/planner-feature.md`

---

## 1. MISSÃO

**Objetivo:**  
Implementar uma fronteira BFF/proxy same-origin para credenciais GitHub, removendo PAT da sessão persistida e do modelo React, sem alterar o schema dos dados `flowboard/**` no repositório GitHub.

**Contexto de Negócio:**  
O FlowBoard usa hoje PAT diretamente no browser e o persiste em `localStorage`, com migração legada de `sessionStorage`. A feature reduz exposição a XSS/inspeção de storage mantendo o fluxo de entrada `repoUrl + PAT` e preservando GitHub como fonte de verdade dos dados.

**Critério de Sucesso:**  
Após login, reload e logout, nenhum storage legível por JavaScript contém PAT/token/header `Authorization`; operações autenticadas de dados usam `/api/*` same-origin; ADR-001/ADR-004 ficam alinhadas à ADR-009; testes unitários e E2E provam a nova fronteira.

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura de Arquivos Relevante

```text
apps/flowboard/
├── package.json                         ← MODIFICAR: scripts/runtime e dependências BFF
├── tsconfig.json                        ← MODIFICAR: incluir tsconfig.server se adotado
├── tsconfig.node.json                   ← MODIFICAR: lint/typecheck de config/server se necessário
├── tsconfig.server.json                 ← CRIAR: emissão do BFF para produção
├── vite.config.ts                       ← MODIFICAR: CSP connect-src e/ou integração dev
├── playwright.config.ts                 ← MODIFICAR: webServer deve subir BFF same-origin
├── README.md                            ← MODIFICAR: segurança, runtime e risco residual
├── server/                              ← CRIAR: BFF/proxy same-origin
│   ├── app.ts
│   ├── index.ts
│   ├── dev.ts
│   ├── sessions.ts
│   ├── githubContentsService.ts
│   ├── flowboardRoutes.ts
│   ├── security.ts
│   └── *.test.ts
└── src/
    ├── App.tsx                          ← MODIFICAR: valida sessão atual no BFF
    ├── features/auth/LoginView.tsx       ← MODIFICAR: usa AuthGateway; limpa PAT após sucesso
    ├── features/app/AppShell.tsx         ← MODIFICAR: logout revoga BFF
    ├── features/board/*.tsx              ← MODIFICAR: usa gateway same-origin
    ├── features/boards/BoardListView.tsx ← MODIFICAR: usa gateway same-origin
    ├── features/hours/HoursView.tsx      ← MODIFICAR: usa gateway same-origin
    ├── features/app/SearchModal.tsx      ← MODIFICAR: usa gateway same-origin
    ├── infrastructure/auth/              ← CRIAR: AuthGateway client-side
    ├── infrastructure/github/client.ts   ← MODIFICAR: manter util server/test, não usar em browser
    ├── infrastructure/github/fromSession.ts
    ├── infrastructure/github/flowBoardGitHubGateway.ts ← CRIAR
    ├── infrastructure/persistence/boardRepository.ts
    └── infrastructure/session/sessionStore.ts
```

### 2.2 Stack e Convenções Detectadas

| Dimensão | Valor Detectado |
|---|---|
| Linguagem/Versão | TypeScript `~6.0.2`; React `^19.2.4`; Vite `^8.0.4` |
| Framework UI | SPA React com React Router em `App.tsx` |
| Padrão de camadas | `domain/` puro, `features/` UI, `infrastructure/` adaptadores |
| Padrão de erro GitHub | `GitHubHttpError { status, retryAfterMs? }` em `src/infrastructure/github/client.ts` |
| Padrão de persistência | `createBoardRepository(client)` com métodos Contents-like (`tryGetFileJson`, `putFileJson`, etc.) |
| Padrão de sessão atual | `FlowBoardSession` em `sessionStore.ts`, hoje inclui `pat` e `apiBase` |
| Padrão de teste unitário | Vitest + happy-dom; testes colocalizados `src/**/*.test.ts(x)` |
| Padrão E2E | Playwright; setup grava `tests/e2e/.auth/user.json`; mutações GitHub limitadas/serializadas |
| CSP atual | `vite.config.ts` injeta CSP em build com `connect-src 'self' https://api.github.com` |

### 2.3 Contratos que NÃO Podem Quebrar

#### 2.3.1 Contrato atual do repositório (baseline real)

```typescript
// apps/flowboard/src/infrastructure/session/sessionStore.ts
export type FlowBoardSession = RepoResolution & {
  pat: string
  /** Original URL entered by the user */
  repoUrl: string
}

export function loadSession(): FlowBoardSession | null
export function saveSession(session: FlowBoardSession): void
export function clearSession(): void
export function createSession(pat: string, repoUrl: string, resolution: RepoResolution): FlowBoardSession
```

```typescript
// apps/flowboard/src/infrastructure/persistence/boardRepository.ts
export function createBoardRepository(client: GitHubContentsClient): BoardRepository
export type BoardRepository = ReturnType<typeof createBoardRepository>
```

```typescript
// Operações mínimas esperadas do cliente atual usado pelo repositório
type GitHubContentsClient = {
  tryGetFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown } | null>
  putFileJson(path: string, json: unknown, sha: string | null): Promise<void>
  deleteFile(path: string, sha: string): Promise<void>
}
```

```text
// Conteúdo GitHub existente, preservado por ADR-002/005/008
flowboard/catalog.json
flowboard/boards/<boardId>.json
flowboard/attachments/<boardId>/<cardId>/<attachmentId>_<nomeSanitizado>
```

#### 2.3.2 Contrato alvo pós-change

```typescript
// sessionStore.ts
export type FlowBoardSession = {
  owner: string
  repo: string
  repoUrl: string
  webUrl: string
  authenticated: true
  expiresAt?: string
}

export function loadSession(): FlowBoardSession | null
export function saveSession(session: FlowBoardSession): void
export function clearSession(): void
// createSession deixa de aceitar PAT ou sai do módulo
```

```typescript
// boardRepository.ts
type FlowBoardContentGateway = {
  tryGetFileJson(path: string, signal?: AbortSignal): Promise<{ sha: string; json: unknown } | null>
  putFileJson(path: string, json: unknown, sha: string | null): Promise<void>
  deleteFile(path: string, sha: string): Promise<void>
}

export function createBoardRepository(client: FlowBoardContentGateway): BoardRepository
```

### 2.4 Módulo de Referência

Implementação de referência para padrões existentes:

- `apps/flowboard/src/infrastructure/github/client.ts`: assinatura Contents API, `GitHubHttpError`, SHA/409/429.
- `apps/flowboard/src/infrastructure/persistence/boardRepository.ts`: adaptador de domínio para `flowboard/**`.
- `apps/flowboard/src/infrastructure/session/sessionStore.ts`: storage fail-closed e chaves atuais.
- `apps/flowboard/tests/e2e/auth.setup.ts`: fluxo de sessão Playwright a adaptar para cookie HttpOnly.

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

A feature está completa apenas quando:

- [ ] **Sessão pública:** `FlowBoardSession`, props e storage persistido não têm `pat`, `token`, `accessToken`, `refreshToken`, `authorization`, `apiBase` controlado pelo usuário ou segredo equivalente.
- [ ] **Migração fail-closed:** `loadSession()` remove `flowboard.session.v1` de `localStorage` e `sessionStorage` quando detectar sessão legada com PAT e retorna `null`.
- [ ] **Login seguro:** `LoginView` envia `repoUrl + pat` somente para `POST /api/auth/session`; após sucesso limpa o estado `pat`, salva só metadados públicos e não instancia `GitHubContentsClient` no browser.
- [ ] **Fronteira same-origin:** leituras/escritas/exclusões de dados usam `/api/flowboard/contents` com cookie HttpOnly, não `Authorization` client-side para `https://api.github.com`.
- [ ] **Logout:** botão `Sair` chama `DELETE /api/auth/session`, revoga o vault e limpa metadados locais; chamadas repetidas são idempotentes.
- [ ] **Compatibilidade de dados:** schema de catálogo, boards, horas e anexos permanece igual.
- [ ] **Erros redigidos:** 400/401/403/404/409/422/429/502/503 são mapeados sem PAT, headers, stack trace sensível ou payload bruto de login.
- [ ] **CSP:** build de produção não permite `connect-src https://api.github.com` para a SPA; operações autenticadas esperadas usam `connect-src 'self'`.
- [ ] **ADRs:** ADR-001 e ADR-004 são editadas para marcar os trechos conflitantes como supersedidos pela ADR-009.
- [ ] **Testes unitários:** cobrem sessão sem PAT, limpeza legada, AuthGateway, gateway same-origin, path allowlist, redaction, cookie/logout e mapeamento de erros.
- [ ] **E2E:** cobre login, reload, logout, ausência de PAT em storage/storageState e ausência de request direto da SPA para GitHub com `Authorization`.
- [ ] **Qualidade:** `npm test`, `npm run lint`, `npm run build` passam em `apps/flowboard`; para lógica de domínio/persistência alterada, `npx vitest run --coverage` mantém linhas relevantes >80%.

Edge cases obrigatórios:

- [ ] Sessão legada em `localStorage` com `pat` é removida e usuário volta ao login.
- [ ] Sessão legada em `sessionStorage` com `pat` é removida, não migrada.
- [ ] Cookie ausente/expirado com metadados locais presentes resulta em reconexão ou mensagem clara.
- [ ] Path fora de `flowboard/catalog.json`, `flowboard/boards/**` ou `flowboard/attachments/**` retorna 403/400 sem tocar GitHub.
- [ ] JSON remoto malformado/schema mínimo inválido retorna `422 remote_content_invalid`.
- [ ] GitHub 409 e 429 preservam semântica atual.

---

## 4. ESPECIFICAÇÃO DE IMPLEMENTAÇÃO

### 4.1 Contrato da Feature

Superfície same-origin definida pela ARD/ADR-009:

```text
POST /api/auth/session
INPUT:
  { repoUrl: string, pat: string }
OUTPUT 201:
  { session: { owner, repo, repoUrl, webUrl, authenticated: true, expiresAt? } }
SIDE EFFECT:
  Set-Cookie fb_session=<opaque>; HttpOnly; SameSite=Lax; Secure em produção; Path=/
FAIL:
  400 invalid_request | 401 github_unauthorized | 403 github_forbidden
  404 github_not_found | 502/503 github_unavailable
```

```text
GET /api/auth/session
INPUT:
  Cookie fb_session
OUTPUT 200:
  { session: FlowBoardSession }
FAIL:
  401 session_invalid
```

```text
DELETE /api/auth/session
INPUT:
  Cookie fb_session
OUTPUT:
  204 No Content
SIDE EFFECT:
  remove cookie + revoke vault entry
IDEMPOTENTE:
  sem cookie também retorna 204
```

```text
GET /api/flowboard/contents?path=<path>&kind=json|blob
PUT /api/flowboard/contents
DELETE /api/flowboard/contents
INPUT:
  Cookie fb_session; path allowlisted; owner/repo sempre vem da sessão, nunca do body
OUTPUT:
  leitura: { sha, content }
  escrita: { ok: true, sha? }
  exclusão: { ok: true } ou 204
FAIL:
  400 invalid_request
  401 session_invalid
  403 path_not_allowed | repository_scope_violation | github_forbidden
  404 github_not_found
  409 github_conflict
  422 remote_content_invalid
  429 github_rate_limited
  502/503 github_unavailable
```

### 4.2 Fluxo de Execução

```text
1. Boot da SPA
   1.1 App chama loadSession().
   1.2 loadSession detecta qualquer sessão legada com PAT em localStorage/sessionStorage, remove ambos os storages e falha fechado.
   1.3 Se houver metadados públicos, App chama AuthGateway.getSession().
   1.4 Se o BFF retornar 200, usa a sessão pública; se 401, clearSession() e mostra LoginView.

2. Login
   2.1 LoginView valida repoUrl localmente com parseRepoUrl.
   2.2 Se PAT vazio, erro local sem chamar API.
   2.3 AuthGateway.createSession(repoUrl, pat) faz POST /api/auth/session com credentials: 'include'.
   2.4 BFF valida Origin/Content-Type, repoUrl, PAT contra GitHub e bootstrap de dados.
   2.5 BFF guarda PAT no CredentialVault escopado a owner/repo, emite cookie HttpOnly e retorna sessão pública.
   2.6 LoginView limpa setPat(''), saveSession(session pública) e onConnected(session).

3. Operações de dados
   3.1 Features criam FlowBoardGitHubGateway a partir da sessão pública.
   3.2 boardRepository/attachmentSync usam métodos compatíveis com Contents API.
   3.3 Gateway chama /api/flowboard/contents com credentials: 'include' e sem Authorization.
   3.4 BFF resolve fb_session no vault, valida repo/path/kind e chama GitHub server-side com PAT.
   3.5 BFF redige e normaliza erros antes de retornar.

4. Logout
   4.1 AppShell chama AuthGateway.logout().
   4.2 BFF revoga vault e expira cookie; resposta idempotente 204.
   4.3 Cliente sempre clearSession(), clearActiveBoardId(session) e onLogout().
```

### 4.3 Mapa de Alterações

| Ação | Arquivo | O que muda | Motivo |
|---|---|---|---|
| MODIFICAR | `apps/flowboard/package.json` | Adicionar scripts para BFF (`dev`, `preview`, build server) e dependências diretas necessárias. Recomendação: `express`, `cookie`, `tsx`, `@types/express` se a implementação escolher Express. | Static-only deixa de atender ADR-009; runtime same-origin é obrigatório. |
| MODIFICAR | `apps/flowboard/package-lock.json` | Atualizar lockfile conforme dependências aprovadas. | Reprodutibilidade. |
| CRIAR | `apps/flowboard/tsconfig.server.json` | Config TS para emitir `server/**/*.ts` em `dist-server/`. | Separar Node runtime do TS browser. |
| MODIFICAR | `apps/flowboard/tsconfig.json` | Referenciar `tsconfig.server.json` se o build server for parte de `tsc -b`. | Typecheck completo. |
| MODIFICAR | `apps/flowboard/tsconfig.node.json` | Incluir configs/scripts server se necessário. | Evitar arquivos Node fora do typecheck. |
| MODIFICAR | `apps/flowboard/eslint.config.js` | Adicionar override Node globals para `server/**/*.ts`; manter browser globals para `src/**/*.ts(x)`. | Lint não deve tratar BFF como browser. |
| MODIFICAR | `apps/flowboard/vite.config.ts` | CSP de produção: trocar `connect-src 'self' https://api.github.com` por `connect-src 'self'`; se Vite continuar como middleware dev, integrar sem expor GitHub ao browser. | GA-009-09. |
| MODIFICAR | `apps/flowboard/playwright.config.ts` | `webServer.command` deve subir o BFF same-origin, não apenas `vite`; `storageState` passa a conter cookie HttpOnly e storage público sem PAT. | E2E deve exercitar a fronteira real. |
| CRIAR | `apps/flowboard/server/app.ts` | App HTTP/Express com rotas `/api/auth/session` e `/api/flowboard/contents`, mais fallback SPA. | BFF same-origin. |
| CRIAR | `apps/flowboard/server/dev.ts` | Sobe BFF + Vite middleware em dev. | `npm run dev` preserva DX. |
| CRIAR | `apps/flowboard/server/index.ts` | Serve `dist/` + API em produção/preview. | Runtime de produção local. |
| CRIAR | `apps/flowboard/server/sessions.ts` | `CredentialVault` em memória com `sessionId`, `owner`, `repo`, `repoUrl`, `webUrl`, `pat`, `expiresAt`, `revoke`. | PAT fora do browser e revogável. |
| CRIAR | `apps/flowboard/server/security.ts` | Cookies, redaction, Origin/Referer check, Content-Type JSON, path allowlist. | CSRF e segredo não vazado. |
| CRIAR | `apps/flowboard/server/githubContentsService.ts` | Cliente server-side para GitHub REST API usando PAT do vault; preserva SHA/409/429 e bootstrap. Pode reutilizar ou adaptar `GitHubContentsClient`. | Assinar requests GitHub somente no servidor. |
| CRIAR | `apps/flowboard/server/flowboardRoutes.ts` | Implementa read/write/delete com `path`, `kind`, `sha`, `content`, valida allowlist e mapeia erros. | Contrato `/api/flowboard/contents`. |
| CRIAR | `apps/flowboard/server/*.test.ts` | Testes de cookie, sessão, redaction, allowlist, erro GitHub e `422 remote_content_invalid`. | Evidência BFF. |
| CRIAR | `apps/flowboard/src/infrastructure/auth/authGateway.ts` | Client-side `createSession`, `getSession`, `logout`, tipos de erro; sempre `credentials: 'include'`, nunca `Authorization`. | Login/reload/logout sem PAT persistido. |
| CRIAR | `apps/flowboard/src/infrastructure/auth/authGateway.test.ts` | Testa payloads, ausência de segredo em retorno, `credentials`, erro 401/403/404. | Cobertura RF03/RF09. |
| MODIFICAR | `apps/flowboard/src/infrastructure/session/sessionStore.ts` | `FlowBoardSession` pública sem `pat/apiBase`; `loadSession` remove legado com PAT de local/session storage; `createSession` vira helper de sessão pública ou é removido. | RF01/RF08. |
| MODIFICAR | `apps/flowboard/src/infrastructure/session/sessionStore.test.ts` | Atualizar round-trip sem PAT; adicionar legacy local/session fail-closed; garantir storage final sem token. | CA06/CA08/CA09. |
| MODIFICAR | `apps/flowboard/src/infrastructure/session/boardSelectionStore.test.ts` | Fixtures de sessão sem `pat/apiBase`. | Tipo novo. |
| CRIAR | `apps/flowboard/src/infrastructure/github/flowBoardGitHubGateway.ts` | Gateway same-origin com interface compatível: `tryGetFileJson`, `putFileJson`, `getFileRaw`, `tryGetFileRaw`, `putFileBase64`, `deleteFile`. | Substitui cliente GitHub autenticado no browser. |
| MODIFICAR | `apps/flowboard/src/infrastructure/github/fromSession.ts` | Deixar de criar `GitHubContentsClient` com `session.pat`; exportar `createFlowBoardGitHubGatewayFromSession(session)` ou manter nome com gateway sem token. | GA-009-02. |
| MODIFICAR | `apps/flowboard/src/infrastructure/github/client.ts` | Extrair uma interface comum e manter `GitHubContentsClient` apenas como util server/test; revisar helpers `putJsonWithRetry`/`putFileBase64WithRetry` para aceitar interface, não classe concreta. | Reuso de retry sem acoplar ao PAT no browser. |
| MODIFICAR | `apps/flowboard/src/infrastructure/github/client.test.ts` | Manter testes server/util e adicionar teste explícito de helpers aceitando gateway fake. | Preservar 409/429. |
| MODIFICAR | `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` | Trocar tipo do parâmetro de `GitHubContentsClient` para interface Contents-like; `deleteBoardEntry` também deve aceitar gateway com delete. | Persistência independe de PAT. |
| MODIFICAR | `apps/flowboard/src/infrastructure/persistence/boardRepository.test.ts` | Usar fake gateway em vez de `new GitHubContentsClient` onde possível. | Teste de domínio/infra sem PAT. |
| MODIFICAR | `apps/flowboard/src/features/auth/LoginView.tsx` | Usar AuthGateway; remover `new GitHubContentsClient`, `bootstrapFlowBoardData` e `createSession(pat, ...)` do browser; limpar PAT após sucesso e em erro não ecoar valor. | RF03/RF05. |
| MODIFICAR | `apps/flowboard/src/features/auth/LoginView.integration.test.tsx` | Mockar AuthGateway; assert `onConnected` recebe sessão sem PAT; assert `saveSession` sem PAT. | CA07. |
| MODIFICAR | `apps/flowboard/src/App.tsx` | Adicionar estado `checkingSession`; validar sessão pública local com `GET /api/auth/session`; limpar se 401. | RF06. |
| MODIFICAR | `apps/flowboard/src/features/app/AppShell.tsx` | `logout` assíncrono chama AuthGateway.logout antes/depois de limpar local; idempotente. | RF07. |
| MODIFICAR | `apps/flowboard/src/features/board/BoardView.tsx` | Usar gateway same-origin; mensagens 401 indicam reconexão. | RF04/RF09. |
| MODIFICAR | `apps/flowboard/src/features/board/ArchivedCardsPage.tsx` | Usar gateway same-origin. | RF04. |
| MODIFICAR | `apps/flowboard/src/features/board/attachmentSync.ts` | Tipo do cliente vira interface com blob/delete; retry continua. | Anexos sob ADR-008. |
| MODIFICAR | `apps/flowboard/src/features/boards/BoardListView.tsx` | Usar gateway same-origin em catálogo/CRUD de quadro. | RF04. |
| MODIFICAR | `apps/flowboard/src/features/hours/HoursView.tsx` | Usar gateway same-origin. | RF04. |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.tsx` | Usar gateway same-origin; cache continua por `owner/repo/board`. | RF04. |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.test.tsx` | Fixture de sessão sem PAT; mock gateway. | Tipo novo. |
| MODIFICAR | `apps/flowboard/tests/e2e/auth.setup.ts` | Após login, verificar board e antes de `storageState`, assert storage não contém PAT/Authorization/token; storageState deve capturar cookie HttpOnly. | RF11. |
| CRIAR | `apps/flowboard/tests/e2e/security-storage.spec.ts` | Login, reload, logout e legado local/session; verifica ausência de PAT em localStorage/sessionStorage/storageState. | CA06/CA08/CA09/CA10/CA24. |
| CRIAR | `apps/flowboard/tests/e2e/security-boundary.spec.ts` | Captura requests: após login não deve haver request da SPA para `https://api.github.com` com `Authorization`; operações de dados usam `/api/flowboard/contents`. | RF12/CA12. |
| MODIFICAR | `apps/flowboard/tests/e2e/login.spec.ts` | Atualizar asserts para sessão segura e mensagens sem segredo. | Novo fluxo. |
| MODIFICAR | `apps/flowboard/tests/e2e/pages/login.page.ts` | Manter helpers de preenchimento; não persistir PAT em page object. | Compatibilidade. |
| MODIFICAR | `apps/flowboard/README.md` | Atualizar: app exige runtime BFF para fluxos autenticados, PAT só no login, storage sem segredo, risco residual de digitação, variáveis/scripts. | CA25. |
| MODIFICAR | `.memory-bank/adrs/001-flowboard-spa-github-persistence.md` | Marcar trecho "SPA direta com PAT" como supersedido pela ADR-009; preservar "dados de domínio no GitHub". | RF13. |
| MODIFICAR | `.memory-bank/adrs/004-flowboard-session-and-pat-storage.md` | Marcar PAT em storage como supersedido pela ADR-009; registrar fail-closed de legado. | RF13. |
| NÃO TOCAR | `apps/flowboard/src/domain/**` | — | A feature não muda regras de quadro/cards/horas. |
| NÃO TOCAR | `apps/flowboard/src/data/releases.json` | — | Não publicar release nesta feature sem pedido explícito. |
| NÃO TOCAR | `.memory-bank/adrs/002-flowboard-json-repository-layout.md` | — | Continua vigente; preservar layout `flowboard/**`. |
| NÃO TOCAR | `.memory-bank/adrs/003-flowboard-domain-and-ui-architecture.md` | — | Continua vigente; preservar separação domínio/UI/infra. |
| NÃO TOCAR | `.memory-bank/adrs/005-flowboard-github-concurrency.md` | — | Continua vigente; preservar semântica de SHA/conflito. |
| NÃO TOCAR | `.memory-bank/adrs/008-flowboard-card-attachments-github.md` | — | Continua vigente; preservar contrato de anexos em GitHub. |

> Qualquer arquivo não listado acima não deve ser modificado. Se o executor precisar tocar outro arquivo por erro de tipo real, deve registrar no handoff final com motivo técnico.

### 4.4 Dependências

```json
{
  "novas_libs": [
    "express (runtime BFF, se escolhido pelo executor)",
    "cookie (serialização/parsing explícito de cookies, se não usar helper próprio)",
    "tsx (dev runner para server/dev.ts)",
    "@types/express (dev, se express for usado)"
  ],
  "libs_existentes_usadas": [
    "react@^19.2.4",
    "vite@^8.0.4",
    "typescript@~6.0.2",
    "vitest@^4.1.4",
    "@playwright/test@^1.57.0"
  ],
  "migrations_necessarias": false,
  "migration_tipo": "não há migration formal; há limpeza lógica fail-closed em runtime de sessão legada com PAT",
  "variaveis_de_ambiente_novas": [
    "FLOWBOARD_SESSION_TTL_SECONDS opcional, default 86400",
    "FLOWBOARD_COOKIE_SECURE opcional para override local/teste",
    "PORT opcional para BFF"
  ]
}
```

Observação operacional: instalar dependências novas exige aprovação conforme AGENTS.md. Se o executor optar por Node HTTP puro, pode reduzir `novas_libs`, mas não pode remover os guardrails de cookie, Origin, redaction, vault e testes.

### 4.5 Decisão de Runtime e Rollout

- Runtime planejada: **Node BFF same-origin dentro de `apps/flowboard/server/`**.
- Desenvolvimento: `npm run dev` sobe BFF + Vite middleware na mesma origem `http://localhost:5173`.
- Preview/produção local: `npm run build` gera SPA e server; `npm run preview` serve `dist/` e `/api/*` pelo BFF.
- Vault v1: memória de processo com TTL e revogação; não armazena dados de domínio. Reload de página funciona enquanto o processo BFF existir. Restart do servidor expira sessões e exige reconexão.
- Rollout produção: usar single-instance ou sticky sessions enquanto o vault for em memória. Antes de horizontal scaling, substituir vault por store server-side compartilhado com expiração e criptografia em repouso, sem alterar a API pública.

---

## 5. GUARDRAILS DE IMPLEMENTAÇÃO

- Não persistir PAT, token GitHub bruto, header `Authorization` ou segredo equivalente em `localStorage`, `sessionStorage`, `storageState`, JSON `flowboard/**`, URLs, query string, logs ou mensagens.
- Não criar `GitHubContentsClient` com PAT em componentes React, hooks de UI ou adaptadores browser.
- Não usar criptografia local reversível pela SPA como substituto da fronteira segura.
- Não aceitar `owner`, `repo` ou `apiBase` enviados pelo cliente em operações de dados após login; o BFF deve usar o escopo da sessão.
- Não permitir paths fora de `flowboard/catalog.json`, `flowboard/boards/**` e `flowboard/attachments/**`; rejeitar `..`, path absoluto, URL, backslash e namespace não permitido.
- Não mover catálogo, boards, cards, horas, anexos ou releases para o BFF/vault como fonte de verdade.
- Não quebrar SHA/conflito: 409 continua observável e 429 preserva retry hint quando existir.
- Não retornar erro bruto do GitHub se puder conter headers/body sensível; redigir centralmente.
- Não ampliar para OAuth/GitHub App nesta feature.
- Não rodar E2E completo sem necessidade; para validação da feature, preferir specs novas/alteradas e Chromium quando escrever no repo remoto.
- Não alterar `_codesteer/` nem `.env`/`.auth`.

---

## 6. TESTES A IMPLEMENTAR

### 6.1 Unitários / Integração Vitest

```text
sessionStore
  - round-trip persiste apenas owner/repo/repoUrl/webUrl/authenticated/expiresAt.
  - loadSession remove localStorage legado com pat e retorna null.
  - loadSession remove sessionStorage legado com pat e não migra para localStorage.
  - loadSession remove JSON inválido e campos proibidos como token/accessToken/authorization.

authGateway
  - createSession faz POST /api/auth/session com credentials include e sem Authorization.
  - createSession retorna sessão sem pat mesmo se resposta tiver campos extras proibidos.
  - getSession trata 401 como sessão inválida.
  - logout usa DELETE e é seguro quando 204.

flowBoardGitHubGateway
  - get/put/delete chamam /api/flowboard/contents same-origin com credentials include.
  - nenhum método envia Authorization.
  - 409 gera GitHubHttpError status 409; 429 preserva retryAfterMs.
  - 422 remote_content_invalid vira erro claro sem payload remoto.

BFF server
  - POST /api/auth/session valida repoUrl/PAT obrigatórios e host github.com.
  - sucesso seta cookie HttpOnly/SameSite/Path e não retorna PAT.
  - DELETE revoga vault e expira cookie; repetir retorna 204.
  - Origin/Content-Type inválidos em métodos unsafe são rejeitados.
  - path traversal e paths fora de flowboard/** são rejeitados sem chamar GitHub.
  - owner/repo vem da sessão e não pode ser sobrescrito por body/query.
  - redaction remove PAT, Authorization e stack sensível de respostas.

boardRepository / attachmentSync
  - reexecutar testes existentes com fake gateway compatível.
  - bootstrap mantém catalog/board schema atual.
```

### 6.2 E2E Playwright

```text
security-storage.spec.ts
  - login com FLOWBOARD_E2E_REPO_URL/PAT mostra board.
  - após login, localStorage/sessionStorage não contêm PAT nem Authorization.
  - storageState gravado não contém PAT nem Authorization em origins; contém cookie fb_session.
  - reload mantém sessão quando cookie/vault válido.
  - logout remove metadados locais e chamada subsequente volta ao login.
  - legado: addInitScript injeta flowboard.session.v1 com pat em localStorage e sessionStorage; app remove e exige login.

security-boundary.spec.ts
  - page.on('request') falha se request para https://api.github.com tiver Authorization após login.
  - operação real de dados após login gera request same-origin /api/flowboard/contents.
  - não há request direto browser -> api.github.com com Bearer em reload ou save.

login.spec.ts
  - URL inválida continua erro local.
  - PAT vazio continua erro local.
  - PAT inválido/sem permissão mostra mensagem redigida.
```

### 6.3 Comandos de Verificação

Executar em `apps/flowboard/`:

```bash
npm test
npx vitest run --coverage
npm run lint
npm run build
npm run test:e2e -- tests/e2e/security-storage.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/security-boundary.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/login.spec.ts --project=chromium-login
```

Não rodar `npm run test:e2e` completo sem aprovação se o custo/tempo ou uso do repo GitHub de teste for sensível.

---

## 7. RISCOS, ASSUNÇÕES E PONTOS DE ATENÇÃO

### 7.1 Decision Register

| Decisão | Tipo | Evidência | Status |
|---|---|---|---|
| BFF/proxy same-origin é obrigatório | Decisão arquitetural | ADR-009 e ARD seção 2 | Resolvido |
| Rotas concretas `/api/auth/session` e `/api/flowboard/contents` | Decisão de contrato | ARD seção 6 resolve ressalva A1 | Resolvido |
| `remote_content_invalid` = 422 | Decisão de contrato | ARD seção 6 resolve ressalva A2 | Resolvido |
| Falha externa = 502/503 redigido | Inferível do TSD/ARD | TSD V08/L01 e spec-reviewer A3 | Resolvido no plano/testes |
| Sessão legada com PAT | Default seguro | TSD RF08/assunção; ADR-009 GA-009-07 | Resolvido: remover e exigir reconexão |
| Runtime concreta | Decisão de implementação | ARD pedia escolha do planner | Resolvido: Node BFF same-origin |
| Vault persistente compartilhado | Baixo impacto com default seguro | ADR-009 exige fronteira, não multi-instância | Default: memória v1 + single instance/sticky |

Decisões bloqueantes em aberto: **0**.

### 7.2 Riscos e Mitigações

- **Risco:** BFF em memória perde sessões em restart.  
  **Mitigação:** fail-closed com reconexão; documentar single-instance/sticky no README/rollout.
- **Risco:** cookie HttpOnly introduz CSRF.  
  **Mitigação:** `SameSite=Lax`, Origin/Referer check, JSON-only e header custom em métodos unsafe.
- **Risco:** PAT vaza por logs do servidor.  
  **Mitigação:** não logar body de auth; redaction centralizada; testes com token sentinela.
- **Risco:** testes e fixtures ainda assumem `session.pat`.  
  **Mitigação:** `rg "\bpat\b|createClientFromSession|Authorization"` como verificação pré-final; atualizar fixtures.
- **Risco:** deploy estático antigo fica incompatível.  
  **Mitigação:** scripts e README deixam explícito que fluxos autenticados exigem runtime BFF.

### 7.3 Assunções Não-Bloqueantes

| # | Assunção residual | Default adotado | Justificativa | Impacto se estiver errada |
|---|---|---|---|---|
| A1 | Produção inicial não exige multi-instância stateless | Vault em memória + sticky/single instance | Menor entrega que cumpre RFs sem persistir domínio | Exigirá trocar vault por store compartilhado |
| A2 | Instalar dependências do BFF será aprovado na implementação | Express/cookie/tsx como recomendação | Reduz risco de hand-rolled HTTP/cookie | Se rejeitado, implementar com Node HTTP puro mantendo contratos |
| A3 | Cookie `Secure` pode ser desligado em dev HTTP | Secure em produção, override local/teste | Browsers ignoram Secure em `http://localhost` dependendo do setup | Ajustar config local, sem mudar contrato |
| A4 | PAT manual continua no formulário v1 | Risco residual documentado | TSD deixa OAuth/GitHub App fora de escopo | Se inaceitável, feature volta para spec/architecture |

---

## 8. PROTOCOLO DE AUTO-CORREÇÃO

Antes de declarar a implementação completa, o executor deve:

```text
VERIFICAÇÃO 1 — Segredos
  → rg "\bpat\b|Authorization|accessToken|refreshToken|api.github.com" src tests server
  → Confirmar que ocorrências restantes são: formulário de login, env E2E, servidor/BFF, testes negativos ou documentação.

VERIFICAÇÃO 2 — Storage
  → Teste unitário e E2E provam localStorage/sessionStorage/storageState sem PAT após login/reload/logout.

VERIFICAÇÃO 3 — Fronteira
  → Nenhuma feature React instancia GitHubContentsClient com token.
  → page.on('request') não encontra Authorization browser -> api.github.com após login.

VERIFICAÇÃO 4 — Contratos de domínio
  → `flowboard/catalog.json`, `flowboard/boards/**` e `flowboard/attachments/**` mantêm schema e SHA.

VERIFICAÇÃO 5 — Governança
  → ADR-001 e ADR-004 apontam explicitamente para ADR-009 nos trechos supersedidos.

VERIFICAÇÃO 6 — Qualidade
  → npm test, coverage relevante, lint, build e E2E escopados passam.
```

Se algum item falhar, corrigir antes do handoff. Não aceitar "testado manualmente" como substituto dos testes de storage/fronteira.

---

## 9. FORMATO DE ENTREGA DO EXECUTOR

O executor deve finalizar com:

```text
## Arquivos Gerados/Modificados
- caminho — resumo objetivo

## Decisões de Design Tomadas
- runtime BFF final e dependências usadas
- comportamento de cookie Secure/SameSite em dev/prod
- estratégia de vault e expiração

## Evidência de Segurança
- storage local/session/storageState sem PAT
- ausência de Authorization browser -> GitHub
- logout revoga sessão

## Sugestões Fora de Escopo
- OAuth/GitHub App
- vault compartilhado para multi-instância
- auditoria detalhada de sessões

## Checklist DoD
- [x] Sessão pública sem segredo
- [x] Migração fail-closed
- [x] Fronteira same-origin
- [x] ADRs alinhadas
- [x] Testes e comandos executados
```

---

## 10. METADADOS

| Campo | Valor |
|---|---|
| Confiança do Plano | 88/100 |
| Track da Squad | FEATURE |
| Slug da Task | secure-github-token-boundary |
| Subtask ID | null |
| Artefato Canônico | `.memory-bank/specs/secure-github-token-boundary/planner-feature.md` |
| Complexidade Estimada | L |
| Módulo de Referência | `apps/flowboard/src/infrastructure/github/client.ts` + `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` |
| Total de Arquivos Impactados | ~42 |
| Requer Migration de Banco | Não |
| Requer Migration de Sessão Local | Não formal; apenas limpeza lógica fail-closed em runtime |
| Decisões Bloqueantes em Aberto | 0 |
| Assunções Não-Bloqueantes Documentadas | 4 |
| Versão do IPD | v1.1 |
| Autor | planner v1.1 |

### 10.1 Cálculo de Confiança

| Critério | Peso | Score |
|---|---:|---:|
| Entendo 100% do fluxo de negócio | 0.25 | 23/25 |
| Identifiquei todos os arquivos a tocar | 0.20 | 17/20 |
| Conheço contratos que não podem quebrar | 0.20 | 18/20 |
| Identifiquei padrão de testes do projeto | 0.15 | 14/15 |
| Critério de pronto sem ambiguidade | 0.20 | 16/20 |
| **Total** | **1.00** | **88/100** |

Reduções aplicadas: runtime BFF é nova para o repo e impacta scripts/deploy; o mapa é amplo e pode ganhar 1-2 arquivos auxiliares durante implementação. Não há decisão material bloqueante.
