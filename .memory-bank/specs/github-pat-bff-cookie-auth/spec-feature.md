# TSD — Autenticação BFF: PAT no servidor, sessão cifrada, cookie httpOnly

**Slug:** `github-pat-bff-cookie-auth`  
**Versão:** 1.0  
**Data:** 2026-04-23  
**Rastreio:** RF01–RF06 e máquina de estados fornecida pelo pedido; Constitution III (ADR obrigatório); substitui o modelo de ADR-004 (PAT em storage do browser) para esta arquitetura.

---

## 1. Contexto e motivação

Hoje o FlowBoard (`apps/flowboard`) autentica chamando a API GitHub **diretamente do browser** com o PAT, e persiste `pat` em `localStorage` (com migração legada de `sessionStorage` — `sessionStore.ts`). Isso cumpre o MVP com superfície mínima, mas o PAT fica acessível a JavaScript do mesmo origin (XSS) e aparece no modelo de sessão do cliente.

**Objetivo desta entrega:** após o login, o **PAT nunca more no cliente**; só o **servidor** o injeta em `Authorization` ao falar com `api.github.com`. A sessão é **cifrada/assinada** e transportada em **cookie httpOnly**.

**Baseline de código (referência):**

- `LoginView.tsx` — cria `GitHubContentsClient` com token do formulário, depois `createSession` + `saveSession`.
- `GitHubContentsClient` — `fetch` para `https://api.github.com/repos/.../contents/...` com `Authorization: Bearer <token>`.
- `fromSession.ts` / `createClientFromSession` — PAT lido de `FlowBoardSession`.

---

## 2. Objetivos e não-objetivos

### 2.1 In scope

- Validação do PAT com `GET /user` (RF01).
- Sessão server-side cifrada no cookie httpOnly (RF02).
- 401 em rotas protegidas se cookie inválido/ausente (RF03).
- Uso do PAT **apenas** no servidor em chamadas GitHub (RF04).
- Logout idempotente que limpa cookie (RF05).
- Rota “me” com `login`, `name`, `avatar_url` apenas (RF06).
- Regra: **com sessão ativa, novo login com PAT rejeitado** até logout (409) — explicitamente, não haver “troca silenciosa” de sessão.

### 2.2 Fora de escopo (explícito)

- OAuth GitHub / GitHub App (fluxo de redirect).
- Rotação de PAT, 2FA, device flow.
- GitHub Enterprise Server com host de API custom (só se HITL futuro ampliar allowlist).
- Otimizar rate limit; persistência de dados além do que já existe no repositório GitHub.

---

## 3. Visão de arquitetura

### 3.1 Padrão: BFF no mesmo “site” (same origin)

O browser fala **apenas** com a origem do app (`https://<deploy>/...`). Subconjuntos de rotas são API do servidor:

| Área | Comportamento |
|------|----------------|
| `GET` assets + SPA | Estático (Vite `index.html` + chunk JS) — inalterado em conceito. |
| `POST /api/auth/login` | Valida PAT (GitHub), cria cookie de sessão. |
| `POST /api/auth/logout` | Invalida cookie. |
| `GET /api/auth/me` | 200 + perfil mínimo se sessão ok; 401 se não. |
| `...` rotas de **proxy** ou **RPC** para operações hoje feitas via `GitHubContentsClient` | Exigem cookie; servidor adiciona `Authorization: Bearer <PAT>`. O cliente **não** envia PAT no body/headers. |

**Decisão de produto técnica:** o cliente deixa de usar `fetch` direto a `https://api.github.com` para operações autenticadas. Passa a usar caminhos **same-origin** (ex. prefixo `/api/github/...` ou recursos de domínio agregado no IPD) implementados pelo BFF, que reutilizam a mesma lógica de path/repo que o cliente usa hoje (`owner`, `repo` vêm da sessão cifrada ou de payload validado, conforme desenho do mapa de alterações).

> **Risco a endereçar no IPD:** mapear **todas** as chamadas de `GitHubContentsClient` (e usos de `apiBase` no cliente) para não deixar vazamento de PAT via chamada antiga.

### 3.2 Opções de empaquetamento (recomendação + alternativa)

| Opção | Dev | Produção | Notas |
|--------|-----|----------|--------|
| **A — Recomendada:** `configureServer` (Vite) + servidor Node dedicado para preview/prod | Middleware Connect em `vite.config.ts` para `/api/*` em `npm run dev`. | Um único `server.mjs` (ou `apps/flowboard/server/`) com **Express/Fastify/Polka** que: (1) define rotas `/api/*`; (2) serve `dist/` com `static` ou `sirv` após `vite build`. | Uma origem, cookies simples, `SameSite` previsível. `preview` hoje (`vite preview`) **não** carrega o mesmo middleware de `configureServer` de forma a substituir o servidor de produção — a documentação e scripts devem deixar explícito o comando de “start produção” (ex. `node server.mjs`) em vez de confundir com `vite preview` para validação BFF. |
| **B:** Proxy reverso (nginx) só para static + separar API em outro processo | Possível, mas adiciona CORS e cookies entre domínios se API ≠ front; **não** recomendado no MVP. | Evitar a menos que infra já exija. |

O **TSD** fixa: **BFF e SPA na mesma origem**; o IPD descreve o binário/entry e alterações em `package.json` (`dev`, `start`, `build`).

### 3.3 Formato da sessão (RF02)

- **Conteúdo lógico mínimo sugerido** (nomes canônicos em inglês no código):
  - `pat` (string) — não exportar nunca em JSON de resposta.
  - `githubUser` ou campos: `id`, `login`, `name?`, `avatar_url` (como retornados por `GET /user` — alinhar nomes exatos ao contract JSON GitHub usado no response trimming para RF06).
  - Dados de repositório já usados hoje: `owner`, `repo`, `repoUrl`, `webUrl`, e `apiBase` fixo `https://api.github.com` (ou omitir se always official).

- **Transporte:** cookie (nome único, ex. `__Host-fb.sid` se path `/` e HTTPS, ou `fb_session` com `Path` documentado) com valor:
  - **Cifrado** (enc + auth) **ou** forma equivalente aprovada na arquitetura (ex. Iron Session, `hono/secure-headers`, JWE com chave em env).
- **Chave(s):** `FLOWBOARD_SESSION_SECRET` (ou par de chaves) — **obrigatoriamente** via env, nunca em repositório; tamanho mínimo a definir no IPD (ex. ≥ 32 bytes aleatórios em base64url).

- **Flags do cookie (produção):** `HttpOnly; Secure; SameSite=Lax` (ou `Strict` se fluxos de navegação permitirem — HITL se houver abertura em nova aba de links externos). `Max-Age` ou `Expires` alinhado à política de sessão (ex. 7 dias) — a definir no IPD, consistente com “cookie expirado” na máquina de estados.

### 3.4 Validação RF01 (login)

- **Entrada (POST /api/auth/login):** corpo JSON, ex. `{ "pat": "<string>", "repoUrl": "<string>" }` (nomes exatos e campos opcionais/obrigatórios fechados no IPD; `repoUrl` necessário para continuar a validar repo como hoje `parseRepoUrl` + acesso).
- **Passos sugeridos:**
  1. Se cookie de sessão **válido** presente → **409** `SESSION_ACTIVE` (não prosseguir; RF estado).
  2. `GET https://api.github.com/user` com `Authorization: Bearer <PAT>`, headers GitHub padrão (Api-Version, Accept).
  3. Se status ≠ 200 → **401** (ou 400) com corpo de erro opaco, sem vazar se o token era inválido em excesso (mensagem genérica no cliente).
  4. Revalidar repositório (equivalente a `verifyRepositoryAccess` + `bootstrap` se necessário) **no servidor** com o mesmo PAT.
  5. Montar payload de sessão, gravar cookie, responder **201** ou **204** (IPD fixa) **sem** PAT no corpo.

### 3.5 RF03, RF04 — Rotas protegidas e GitHub

- **Middleware** em cadeia: parse cookie → decifrar → se falha → 401.
- **Handlers** de proxy: montam request à API GitHub com `Authorization: Bearer` do payload interno; repassam status/body com sanitização mínima (não repassar headers sensíveis do GitHub para o cliente indevidamente).
- O **cliente** envia `credentials: 'include'` em `fetch` same-origin.

### 3.6 RF05 — Logout

- `POST /api/auth/logout`: limpar cookie (Set-Cookie com Max-Age=0), resposta 204. Idempotente.

### 3.7 RF06 — Dados básicos ao cliente

- `GET /api/auth/me`: 200 com `{ "login", "name", "avatar_url" }` (campos faltando podem ser `null` se GitHub retornar null). **Nunca** incluir `pat` nem `id` interno de sessão bruto, se id for sensível a enumerar (opcional: omitir `id` ou só expor se necessário à UI; default: espelhar o que a UI hoje precisa; se só login/name/avatar, cumpre RF06).

### 3.8 CSRF e métodos

- **Login/Logout/POST** em same-origin: preferir **SameSite=Lax** + token CSRF em cookie visível (double submit) **ou** header `X-CSRF-Token` derivado de sessão, se o app passar a usar formulários cruzando site. O IPD documenta a estratégia; mínimo viável: `SameSite` + evitar CORS aberto; se API aceitar somente `Content-Type: application/json` de mesma origem, superfície é menor.

---

## 4. Máquina de estados (requisito explícito)

| De | Para | Evento |
|----|------|--------|
| Anônimo | Autenticado | PAT válido via GitHub e sessão criada |
| Autenticado | Anônimo | Logout **ou** cookie expirado/corrompido (load → 401) |
| Autenticado | Autenticado (substituição) | **Proibido** — novo login com PAT enquanto cookie válido: **409**; utilizador deve `logout` primeiro |

---

## 5. Contratos de API (resumo — detalhamento de schema no IPD)

| Método | Rota | Auth | Respostas |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Não (ou cookie ignorado se 409) | 201/204 sucesso; 401 PAT/repo inválido; 409 sessão já ativa |
| POST | `/api/auth/logout` | Cookie | 204; cookie limpo |
| GET | `/api/auth/me` | Cookie | 200 perfil; 401 |
| * | Caminhos BFF p/ GitHub (prefixo a fixar) | Cookie | 401 se não autenticado; proxy 2xx/4xx GitHub |

Códigos de erro sugeridos no JSON: `SESSION_ACTIVE`, `INVALID_TOKEN`, `REPO_INACCESSIBLE`, `INVALID_BODY` (exemplos — padronizar no IPD).

---

## 6. Impacto no cliente (SPA)

1. **`FlowBoardSession` (tipo):** remover `pat` do tipo exposto ao restante da app **ou** split em `ClientSession` (sem pat) + dados só servidor. Todos os usos de `session.pat` e `createClientFromSession` com token desaparecem do browser.
2. **LoginView:** após sucesso, não gravar PAT em storage; resposta de login seta cookie; estado React carrega de `/api/auth/me` + eventual endpoint de “session repo metadata” se não couber tudo no me.
3. **`loadSession` / `localStorage`:** migrar para “sem credencial” — só dados não sensíveis **ou** nada, se tudo vier do BFF. Plano de migração: ao detectar `flowboard.session.v1` antigo, **obrigar novo login** ou mostrar one-shot “atualize a sua sessão” (recomendado: limpar e pedir login — mais simples e seguro).
4. **E2E (Playwright):** `storageState` hoje grava `localStorage`; ajustar para autenticar via API de login ou `page.request.post` com cookie jar, conforme padrão do IPD.
5. **CSP `connect-src`:** hoje inclui `https://api.github.com` — após BFF, o browser pode falar **apenas** `self` para API; ajuste no plugin CSP em `vite.config.ts` (produção) para não quebrar.

---

## 7. Testes (estratégia)

| Camada | O quê |
|--------|--------|
| Unitário (Vitest) | Parser de corpo, helpers de cifra (vetores fixos com mock secret), `parseRepoUrl` no servidor, regras 409. |
| Integração HTTP | Rotas com `supertest` ou `fetch` local ao servidor de teste (in-process) com cookies. |
| E2E | Login real ou fixture; board visível; logout limpa; tentativa de segundo login com sessão → 409 se coberto. |

Cobertura: meta herdada do pacote; módulo novo BFF alvo ≥ a média do projeto ou justificativa no verifier.

---

## 8. Governança: ADR

- **Atualizar ou substituir** `.memory-bank/adrs/004-flowboard-session-and-pat-storage.md** com status e data: **não** persiste mais PAT em `localStorage` nesta arquitetura; descreve cookie cifrado e BFF.
- Se ADR-001 afirmar “sem backend de dados” de forma rígida, clarificar BFF **sem banco** — só proxy + sessão — para não conflitar com princípio II (persistência de dados ainda no GitHub).

---

## 9. Riscos e mitigação

| Risco | Mitigação |
|-------|------------|
| BFF incompatível com `vite preview` | Documentar `npm start` pós-build; CI executar testes BFF+build. |
| Escore de tamanho de cookie | Payload mínimo; se exceder, sessão com id opaco e store server-side = **não** no RF atual (evitar) — preferir JWE compacto. |
| Regressão de chamadas GitHub diretas | Auditoria de `api.github.com` no bundle (grep/CI) + teste de fumaça. |
| Log de PAT | Nunca logar header Authorization nem payload de login. |

---

## 10. Definição de pronto (para o planner)

- [ ] Todos os RF01–RF06 verificáveis com teste e/ou checklist manual mínima documentada.
- [ ] Nenhum PAT em `localStorage` / `sessionStorage` / estado React persistido após login bem-sucedido.
- [ ] ADR-004 (ou sucessor) reflete a decisão.
- [ ] Comandos `lint`, `test`, `build` e pipeline E2E acordada passando no CI.

---

## 11. Rastreio RF

| RF | Onde se demonstra no TSD/entrega |
|----|-----------------------------------|
| RF01 | §3.4 |
| RF02 | §3.3 |
| RF03 | §3.4, 3.5 |
| RF04 | §3.1, 3.5, 6 |
| RF05 | §3.6 |
| RF06 | §3.7 |
| Re-login | §3.4, 4, 5 |

---

*Fim do TSD v1.0 — Próxima fase: `spec-reviewer` (FEATURE).*
