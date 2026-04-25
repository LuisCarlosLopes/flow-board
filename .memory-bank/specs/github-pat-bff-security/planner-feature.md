# IPD: Proteção do PAT (BFF + sessão) — v1.0

> Confiança: 78/100 | Complexidade: L | Data: 2026-04-25  
> Track: FEATURE | Slug: `github-pat-bff-security`  
> Artefato: `.memory-bank/specs/github-pat-bff-security/planner-feature.md`  
> Base: TSD `spec-feature.md` + ARD `architect-feature.md` + **ADR-009**

---

## 1. MISSÃO

**Objetivo:** Implementar processo **Node (BFF)** *same-origin* com sessão **iron-session** (cookie `HttpOnly` cifrado), de modo que o **PAT** deixe de ser persistido em `localStorage` / `sessionStorage` e deixe de ser usado em `fetch` do browser à `api.github.com`; manter o comportamento funcional do FlowBoard (login, quadros, anexos, testes) com **custo controlado** de latência e com **migração** explícita de sessões legadas.

**Contexto de negócio:** Reduzir impacto de XSS e alinhamento ao guia de referência, cumprindo Constitution III e **ADR-009** (e atualização de **ADR-001** / **ADR-004**).

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura relevante (apps/flowboard)

```
apps/flowboard/
├── package.json                 ← scripts: só Vite; sem servidor
├── vite.config.ts
├── src/
│   ├── App.tsx                  ← loadSession() na montagem
│   ├── features/auth/LoginView.tsx
│   ├── features/board/...       ← createClientFromSession
│   ├── infrastructure/
│   │   ├── session/sessionStore.ts   ← localStorage + pat
│   │   ├── github/client.ts         ← GitHubContentsClient (browser fetch + Bearer)
│   │   ├── github/fromSession.ts
│   │   └── persistence/boardRepository.ts
│   └── ...
└── tests/e2e/                   ← storageState, login
```

### 2.2 Stack detectada

| Dimensão | Valor |
|----------|--------|
| TS / React / Vite | 6 / 19 / 8 |
| Testes | Vitest + Playwright |
| Sessão | `FlowBoardSession` com `pat: string` em JSON local |
| Erros | `GitHubHttpError` |

### 2.3 Contratos a preservar (domínio / UI)

- **Domínio puro** (`src/domain/*`): **sem** alteração de regras; dados continuam a vir de JSON.
- **Invariantes** ADR-002 / ADR-005 (layout JSON, 409/retry): mantêm-se; o **cliente** continua a expor as mesmas operações lógicas, mudando **só o transporte** (BFF em vez de GitHub direto).
- `parseRepoUrl` / `GITHUB_API_BASE` / allowlist: **reutilizar** no BFF no login.

### 2.4 Referência

Padrão interno: `GitHubContentsClient` — a implementação BFF pode **reutilizar a classe** no Node (fetch nativo) com token vindo do `getIronSession`, evitando duplicar lógica de URL/erros.

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

- [ ] Login cria **apenas** cookie de sessão; **não** grava `pat` em `flowboard.session.v1` (remover chave após sucesso ou deixar de usar).
- [ ] `FlowBoardSession` (cliente) **não** inclui `pat` no tipo exportado usado pela UI, ou o campo é opcional/depreciado e **nunca** preenchido a partir de storage.
- [ ] Todas as chamadas que hoje usam `createClientFromSession` passam a usar **adaptador** que fala com `/api/flowboard/...` (ou o prefixo fechado no IPD) com `credentials: 'include'`.
- [ ] `npm run build` (SPA) + build/start do BFF (script unificado a definir) **sem** erros; `npm test` (Vitest) verde; E2E ajustados ou, no mínimo, plano de execução E2E documentado com bloqueio explícito se dependência de env.
- [ ] `npm run lint` (flowboard) limpo.
- [ ] **ADR-009** e atualizações em **ADR-001** / **ADR-004** **commitados** (já propostas em 2026-04-25; revisar se o `implementer` precisar ajuste de redação).
- [ ] Documentação: `README` do `apps/flowboard` a refletir **dev** (Vite + BFF local) e **produção (Vercel)** — variáveis `SESSION_SECRET` no painel Vercel, `BFF_PORT` só *dev*, e passos de *Preview Deploy*.
- [ ] Edge: PAT inválido → 401/403, sem cookie; logout → cookie limpo; sessão expirada → fluxo de re-login; tentativa de uso de storage legado → ignorar / limpar.

---

## 4. ESPECIFICAÇÃO DE IMPLEMENTAÇÃO

### 4.1 Estratégia: padrão *strangler*

1. **Fase A — BFF mínimo + login**  
   - Novo pacote/pasta `apps/flowboard/server` (ou `src/server` — preferir `server/` no root do app para clareza `client` vs `server`).  
   - Dependências: `iron-session`, framework HTTP (Hono **ou** Express — **Hono** recomendado: leve, TypeScript, subida rápida), `zod` para body do login.  
   - `POST /api/flowboard/session`: valida body; `parseRepoUrl`; instancia `GitHubContentsClient` com PAT **só** em variável local; `verifyRepositoryAccess` + `bootstrap` (chamar a mesma sequência que `LoginView` hoje, extraída para módulo **compartilhado** `src/infrastructure/persistence` ou `server/lib/bootstrap.ts` importando `bootstrapFlowBoardData`).  
   - Sessão iron-session: `{ pat, owner, repo, repoUrl, webUrl, apiBase }` — *atenção:* o payload cifrado contém o PAT; **G-009-1** exige nunca o devolver.  
   - `POST /api/flowboard/session/logout`: `session.destroy()`.

2. **Fase B — API de dados via BFF**  
   - Introduzir `BffContentsClient` (ou expandir `GitHubContentsClient` com `apiBase: '/api/flowboard/github/internal'` **não** — melhor: novo tipo `FlowBoardApiClient` no browser) que implementa a **mesma** superfície usada por `boardRepository` e anexos:  
     *Opção recomendada no MVP deste IPD:* **um** endpoint `POST /api/flowboard/github/invoke` com corpo Zod: `{ op: 'getFileJson' | 'putFileJson' | ... , path, args? }` que o servidor mapeia para `GitHubContentsClient` com PAT da sessão. **Alternativa:** rotas REST por operação — mais verboso, mais fácil de auditar. O *implementer* escolhe **uma** abordagem; prioridade é **não** expor `owner/repo` arbitrários no body **sem** validar contra a sessão.  
   - Regra **GA:** `owner` e `repo` do path GitHub vêm **só** da sessão; o cliente **não** os envia, ou o servidor **ignora** e sobrescreve com sessão.

3. **Fase C — SPA**  
   - `LoginView`: `fetch(POST /api/flowboard/session)` em vez de `saveSession` com PAT.  
   - `sessionStore`: persiste **apenas** preferências não sensíveis **ou** nada, se tudo for cookie; estado em memória React para `owner/repo/repoUrl` vindo de `GET /api/flowboard/session` (novo) **ou** de resposta do login.  
   - Remover `pat` de `loadSession` / `createSession`.

4. **Fase D — Dev local e produção (Vercel)**  
   - **Desenvolvimento:** `vite.config.ts` com `server.proxy['/api']` → `http://127.0.0.1:${BFF_PORT}`; script `dev` = BFF local (Hono/Express) + `vite`. O código de negócio do BFF vive em módulos **partilhados** importados tanto pelo servidor de *dev* como pelos *handlers* de produção.  
   - **Produção (obrigatório — Vercel):** o alojamento alvo **não** é um processo Node *always-on* com `express.static`. É **estático** (output do `vite build`) + **Vercel Serverless Functions** sob `/api/**`, **runtime Node.js** (para `iron-session`). Configurar `vercel.json` (*build command*, *output directory*, *rewrites* para SPA: rotas não-API → `index.html`; `/api/*` → funções). **Root Directory** do projeto na Vercel = `apps/flowboard` (ou equivalente no monorepo).  
   - **Variáveis:** `SESSION_SECRET` em *Environment Variables* (Production/Preview); nunca no cliente.  
   - **Limitações:** respeitar *timeout* de funções; operações muito longas contra a API GitHub podem exigir `maxDuration` (plano Pro) ou divisão de trabalho — documentar no *implementer*.  
   - **Edge Runtime:** **não** usar para os *handlers* de sessão/BFF com `iron-session` (ADR-009 G-009-6).

### 4.2 Mapa de alterações (ficheiros)

| Ação | Caminho / notas |
|------|-----------------|
| Criar | `apps/flowboard/server/**` — núcleo BFF, iron-session, rotas (reutilizado em *dev*) |
| Criar | `apps/flowboard/api/**` — *handlers* Vercel (Node) que delegam ao núcleo |
| Criar | `apps/flowboard/vercel.json` — *build*, *rewrites*, *routes* |
| Criar | `apps/flowboard/src/infrastructure/github/bffClient.ts` (ou nome alinhado) — substituto browser |
| Modificar | `sessionStore.ts` — remover PAT persistido; tipos |
| Modificar | `fromSession.ts` / `createClientFromSession` — retornar cliente BFF |
| Modificar | `LoginView.tsx` — submissão para BFF |
| Modificar | `package.json` — deps + scripts `dev:server`, `dev` composto |
| Modificar | `vite.config.ts` — proxy |
| Modificar | `client.ts` — opcional: extrair *interface* comum; **ou** BFF reutiliza a classe no Node sem mudar o browser (duas entradas de build — preferir reutilizar ficheiro com `fetchImpl` injetado) |
| Modificar | `tests/e2e/**` — env `SESSION_SECRET`, subir BFF, ou *mock* (preferência: E2E real) |
| Modificar | `README.md` (flowboard) |

### 4.3 Variáveis de ambiente (novas)

- `SESSION_SECRET` — mín. 32 caracteres (produção obrigatório).  
- `BFF_PORT` — ex. 8787 (dev).  
- (Opcional) `FLOWBOARD_PUBLIC_ORIGIN` — validação *Origin* se necessário além de SameSite.

---

## 5. ORDEM DE EXECUÇÃO SUGERIDA

1. Esqueleto `server` + `GET /health` + iron-session *cookie* de teste.  
2. `POST /api/flowboard/session` + teste manual + Vitest de integração (supertest ou fetch local) se viável.  
3. `logout` + extração de `bootstrapFlowBoardData` compartilhada.  
4. Implementar *invoke* (ou rotas) + `BffContentsClient` + trocar **uma** feature (ex.: `BoardListView`) e testes.  
5. Trocar restantes usos de `createClientFromSession`.  
6. Limpar `sessionStore`, tipos, legado `localStorage`.  
7. E2E + README + lint full.

---

## 6. CASOS DE TESTE (mínimo)

- Unit: Zod rejeita body; iron-session *round-trip* (dev).  
- Integração: login sucesso / PAT errado.  
- `parseRepoUrl` *evil* host continua a falhar no servidor.  
- E2E: conectar e ver *board* (ajustar credenciais e arranque BFF).  
- Regressão: *retry* 409 em `putJsonWithRetry` continua a funcionar (com cliente BFF).

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Mitigação |
|-------|------------|
| Tamanho do cookie (sessão com PAT) | iron-session; monitorar; se exceder, ADR futuro *refresh* + storage server-side mínimo |
| CSRF | SameSite + validação *Origin* no POST de login (planear no `implementer`) |
| Paridade dev/prod | *Proxy* local e mesmas paths `/api/*` na Vercel; *Preview* antes de *Production* |
| *Timeout* / *cold start* na Vercel | Dimensionar chamadas; `maxDuration` se necessário; evitar trabalho pesado no *import* dos módulos |

---

## 8. FORA DESTE IPD

OAuth GitHub; migração para Next.js; otimizações de cache agressivo no BFF; **hospedagem que não seja Vercel** (outro provider exigiria novo ARD ou adenda).

---

## 9. HANDOFF

Pronto para `plan-reviewer` → `task-breakdown` → **HITL** → `implementer`.

- **Aprovar explicitamente** o Mapa de Alterações (§4.2) e a opção *invoke* vs rotas finas **antes** do *implementer* se houver desvio.

---

*Gerado pelo planner (orquestrador; subagente indisponível por quota).*

---

## 10. Auto-correção (2026-04-25) — Vercel

A redação original da Fase D pressupunha **um processo Node** a servir `dist` + API. O *deploy* real do produto é **Vercel**: **Serverless Functions (Node)** + estático. Secção 4 §Fase D e mapa de ficheiros foram actualizados; **ADR-009** contém a secção *Plataforma de alojamento: Vercel*.
