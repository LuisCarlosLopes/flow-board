# Implementer report — github-pat-bff-cookie-auth

**Data:** 2026-04-23

## Entregue

- BFF Express: login (validação GitHub + bootstrap), logout, me, session JSON, proxy `/api/github` com iron-session cifrada e cookie httpOnly.
- `npm run start` com static `dist` via sirv; `npm run dev` com o mesmo BFF.
- Cliente: PAT só no POST de login; GitHub client em modo BFF; sessão de arranque via `fetchSession`.
- ADR-005; ADR-004 marcado como supersedido no browser-PAT; `.env.example`.

## Verificação local

- `npm test` — 278 testes OK (execução desta sessão).
- `npm run build` — OK.
- E2E não reexecutada nesta sessão; requer `FLOWBOARD_SESSION_SECRET` e credenciais E2E.
