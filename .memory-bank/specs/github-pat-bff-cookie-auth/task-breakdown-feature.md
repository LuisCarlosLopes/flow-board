# task.md — github-pat-bff-cookie-auth (executado)

1. [x] Servidor: `server/bffApp.ts`, `sessionOptions.ts`, `start.ts`
2. [x] Vite: middleware BFF + CSP `connect-src 'self'`
3. [x] Cliente: `client.ts` (useBff), `fromSession`, `sessionStore`, `App`, `LoginView`, `AppShell`
4. [x] Testes unitários/integrados ajustados
5. [x] ADR-005 e status em ADR-004; `.env.example`
6. [x] `package.json` script `start`

## DoD

- [x] `npm test`, `npm run build`, `npm run lint` (código em `src/` + `server/` sem erros)
- [x] Nenhum PAT no tipo `FlowBoardSession` nem em storage após login (evicção de legado)
