# Tester Report — github-pat-bff-security

**Data:** 2026-04-25 (atualizado)  
**Escopo:** regressão automática + E2E com GitHub

## Vitest (unit / integração UI)

| Comando | Resultado |
|---------|-----------|
| `npm test` (Vitest) | 278 testes, passou |

## Causa raiz do E2E “Internal Server Error” (resolvida)

O `.env` já continha `FLOWBOARD_E2E_REPO_URL` e `FLOWBOARD_E2E_PAT` (Playwright carrega via `loadEnv`). O problema **não** era ausência de credenciais E2E.

O BFF (`tsx` / Node) muitas vezes corre com **`NODE_ENV` indefinido**. Em `sessionOptions.ts`, o fallback de desenvolvimento para a password do iron-session só aplicava quando `NODE_ENV === 'development'`, logo **sem** `NODE_ENV` o código exigia `SESSION_SECRET` e lançava antes do login — resposta **500** e o browser mostrava “Internal Server Error”.

**Correção:** tratar `NODE_ENV` ausente (e `test`) como ambiente local para o fallback de secret; adicionar `server/bootstrapEnv.ts` com `loadEnv` (alinhado ao Playwright) para que `SESSION_SECRET` no `.env` chegue ao processo do BFF quando definido.

## E2E Playwright (auth.setup)

| Execução | Resultado |
|----------|------------|
| `npx playwright test tests/e2e/auth.setup.ts --project=setup` (após correção) | **Passou** |

## Outras melhorias nesta spec

- `playwright.config.ts`: espera `http://localhost:5173/api/flowboard/health` (Vite + proxy + BFF).
- `sessionApi.postBffLogin`: mensagens de erro mais explícitas.

## Veredicto

- **GO:** unit + E2E setup com GitHub real após fix de `NODE_ENV`/`.env` no BFF.

## Nota de segurança

Artefactos em `test-results/` podem conter snapshots de UI com campos preenchidos em E2E — manter no `.gitignore` e **revogar tokens** se tiverem sido expostos em ficheiros partilhados.
