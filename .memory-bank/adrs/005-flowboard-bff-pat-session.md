# ADR-005: FlowBoard — PAT na camada BFF; sessão cifrada em cookie httpOnly

**Status:** Aceito  
**Data:** 2026-04-23  
**Substitui:** decisão de persistência de PAT no browser de [ADR-004](./004-flowboard-session-and-pat-storage.md) para deploys que usam o servidor fornecido com este repositório.

---

## Contexto

O MVP original ([ADR-001](./001-flowboard-spa-github-persistence.md), [ADR-004](./004-flowboard-session-and-pat-storage.md)) manteve o PAT no cliente para simplicidade. A superfície de ameaça inclui qualquer script no mesmo origin (XSS) lendo `localStorage`/`sessionStorage`. Uma rota BFF no **mesmo origin** valida o PAT com `GET /user`, coloca a sessão cifrada (iron-session) em cookie **httpOnly** e repassa as chamadas à API GitHub **somente** no servidor.

## Decisão

1. `POST /api/auth/login` valida o PAT (GitHub) e, após sucesso, grava a sessão cifrada; `409` se já houver sessão (novo login exige logout).
2. `POST /api/auth/logout` invalida a sessão.
3. `GET /api/auth/me` e `GET /api/auth/session` expõem metadados **sem** o PAT; o cliente usa `fetch` com `credentials: 'include'`.
4. O prefixo `/api/github` faz proxy de requests para `https://api.github.com` com `Authorization: Bearer` definido a partir do cookie de sessão.
5. O segredo `FLOWBOARD_SESSION_SECRET` (≥32 caracteres) é obrigatório em `npm run start` com `NODE_ENV=production` (ver `server/start.ts`).

## Consequências

- **Positivo:** o PAT deixa de estar disponível para JavaScript da SPA após o login.
- **Operacional:** a produção requer processo Node (`npm run start`) a servir `dist/` e o BFF, não só ficheiros estáticos, se se quiser o modelo de ameaça completo.
- **Ambiente de desenvolvimento:** `vite` integra o mesmo BFF em `configureServer` (ver `vite.config.ts`).

## Rastreio

- Especificação: `.memory-bank/specs/github-pat-bff-cookie-auth/spec-feature.md`
- **ADR-004** permanece documentado por histórico; o modelo “PAT no storage do browser” fica **supersedido** por esta arquitetura nas instalações com BFF.
