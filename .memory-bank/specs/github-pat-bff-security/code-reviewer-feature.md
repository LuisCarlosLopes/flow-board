# Code Review Report — github-pat-bff-security (BFF / PAT)

**Data:** 2026-04-25  
**Revisor:** subagente `code-reviewer` + aplicação de mitigações no repo

## Veredicto inicial (subagente)

**NO-GO** até corrigir: fallback de `SESSION_SECRET` com `NODE_ENV === undefined`, cookie `Secure`, vazamento em 500, detalhes Zod em 400, merge `bootstrapEnv`.

## Mitigações aplicadas no código

| Achado (severidade) | Acção |
|---------------------|--------|
| **Crítico** — `NODE_ENV` indefinido aceitava segredo padrão | `isLocalDevNode()` só `development` \| `test`. `dev:server` usa `cross-env NODE_ENV=development` (portável). |
| **Alto** — cookie `secure` só com `production` literal | `secure: production \|\| VERCEL===1` (HTTPS em Vercel Preview/Prod). |
| **Alto** — `e.message` em 500 | Em `NODE_ENV===production`, corpo genérico `Falha interna ao conectar`. |
| **Médio** — `details` Zod no 400 | `details` só fora de produção. |
| **Médio** — `Object.assign` sobrescrevia env | `bootstrapEnv` mescla ficheiro só onde `process.env[k] === undefined`. |

## Ficheiros tocados (remediação)

- `server/sessionOptions.ts` — lógica dev / `secure` Vercel  
- `server/bootstrapEnv.ts` — merge defensivo  
- `server/app.ts` — `isProduction`, 400/500  
- `package.json` — `dev:server` com `cross-env`  
- dependência: `cross-env` (dev)

## Veredicto pós-mitigação

**GO** com ressalvas operacionais: é necessário **reiniciar** `npm run dev` após estas alterações (processo antigo do BFF pode ainda correr sem `NODE_ENV=development`, causando 500 no login). Em CI, garantir `SESSION_SECRET` e `NODE_ENV=production` nos ambientes alvo.

## Notas do revisor (resumo)

- **Invoke** e **toPublic** sem PAT no cliente: mantido OK.  
- **CSRF:** SameSite=Lax; modelo assumido (SPA mesma origem) documentado noutros artefatos.

---

*Relatório alinhado à execução do subagente; mitigações verificadas com `npm test`, `npm run typecheck:server`, `npm run lint`.*
