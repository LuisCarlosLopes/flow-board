# IPD — github-pat-bff-cookie-auth

**Track:** FEATURE  
**Data:** 2026-04-23  
**Entrada:** TSD `spec-feature.md`, ARD `architect-feature.md`, aprovação HITL 2026-04-23

## Mapa de alterações (arquivos)

| # | Arquivo / pasta | Ação |
|---|-----------------|------|
| 1 | `apps/flowboard/package.json` | Dependências: `express`, `iron-session`, `dotenv`, `sirv`; dev: `tsx`, `@types/express`. Scripts: `start` = servidor BFF+static, `dev` inalterado (Vite + middleware) |
| 2 | `apps/flowboard/server/bffApp.ts` | Criar: Express com POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`, GET `/api/auth/session` (perfil+repo, sem PAT), proxy `ALL /api/github/*` com PAT da sessão iron |
| 3 | `apps/flowboard/server/sessionOptions.ts` | Opções `iron-session` + leitura `FLOWBOARD_SESSION_SECRET` (≥32 chars) |
| 4 | `apps/flowboard/server/ironSession.d.ts` | Augment `SessionData` (iron-session) |
| 5 | `apps/flowboard/server/start.ts` | Produção: `createBff()` + `sirv('dist', { single: true })` + `PORT` |
| 6 | `apps/flowboard/vite.config.ts` | `configureServer`: `import createBff` e `middlewares.use(bffApp)`; CSP `connect-src` só `'self'` (BFF) |
| 7 | `apps/flowboard/tsconfig.node.json` | `include` + `server/**/*.ts` |
| 8 | `apps/flowboard/eslint.config.js` | Bloco `server/**` com `globals.node` |
| 9 | `apps/flowboard/.env.example` | `FLOWBOARD_SESSION_SECRET` |
| 10 | `src/infrastructure/github/client.ts` | `useBff` + omitir `Authorization` quando BFF; `apiBase` = `/api/github` |
| 11 | `src/infrastructure/github/fromSession.ts` | BFF: token vazio, `useBff: true` |
| 12 | `src/infrastructure/session/sessionStore.ts` | Remover `pat` do tipo; `loadSession` sync → `clearLegacyPatStorage`; `saveSession` noop ou só metadados não-sensíveis; `fetchSession` async; `logoutSession` POST |
| 13 | `src/App.tsx` | Estado inicial: `useEffect` + `fetchSession` (cookie) |
| 14 | `src/features/auth/LoginView.tsx` | POST login; 409/401 tratados; `fetchSession` pós-201 |
| 15 | `src/features/app/AppShell.tsx` | `logout` assíncrono com `logoutSession` |
| 16 | `tests/e2e/*` e `auth.setup` | Enviar `FLOWBOARD_SESSION_SECRET`; login via `POST /api/auth/login` + cookie |
| 17 | `src/infrastructure/session/sessionStore.test.ts` / integrações | Ajustar mocks |
| 18 | `.memory-bank/adrs/005-flowboard-bff-pat-session.md` | Novo ADR; ADR-004 status *Superseded by 005* (parágrafo) |
| 19 | `specs/.../state.yaml` | Estado squad pós-implementer |

## DoD

- Nenhum PAT em `localStorage`/`sessionStorage` após login BFF; legado com `pat` removido.
- `npm test`, `npm run build`, `npm run start` (smoke) e E2E conforme ajuste.
- RF01–RF06 cobertos por implementação + testes mínimos BFF (login 401, 409, me 401) onde aplicável.

## Fluxo de execução

1. Criar servidor + integração Vite.  
2. Ajustar cliente + tipos.  
3. E2E + ADR.  
4. `verifier` + `code-reviewer` + `tester` (metadados no state).
