# Code review — security-hardening-mvp

**Track:** TASK  
**Data:** 2026-04-21  
**Veredito:** **GO** (sem bloqueadores)

---

## Escopo revisado

- `sessionStore.ts` / testes — allowlist `apiBase`, fail-closed com remoção de storage em qualquer sessão inválida (incl. JSON inválido, campos ausentes, `apiBase` adulterado).
- `url.ts` / testes — `GITHUB_API_BASE`, `isOfficialGithubApiBase`, hostname estrito `github.com`.
- `client.ts`, `fromSession.ts` — uso consistente da origem oficial da API.
- `boardRepository.ts` / testes — validação mínima de `catalog` e `board`.
- `vite.config.ts` — CSP apenas fora de `ctx.server` (build).
- `CreateTaskModal.tsx`, `SearchModal.tsx`, `useClipboard.ts` — `console.error` condicionado a `DEV`.
- ADR-004 — subseção 2026-04-21 alinhada às decisões HITL.

---

## Achados

| Severidade | Descrição |
|------------|-----------|
| — | Nenhum **Critical** / **High**. |
| Low | **CSP:** ao adicionar integrações (analytics, Sentry, outros hosts), será necessário estender `connect-src` / `script-src` no plugin — já registrado como tech debt no `state.yaml`. |
| Low | **Parsers:** validação “mínima” (D3) não garante profundidade de `columns`/`cards`; aceitável pelo escopo; dados estranhos ainda podem quebrar em runtime no domínio — risco conhecido. |

---

## Rastreabilidade

- Constitution III: ADR-004 atualizado para mudanças de sessão/API.
- Critérios de aceite do `state.yaml`: atendidos pelo conjunto implementado + testes.

---

## Ajuste pós-review (incluído no mesmo PR)

- `loadSession` passou a remover `STORAGE_KEY` também quando JSON inválido, PAT vazio ou owner/repo ausentes — evita sessão “zumbi” no storage.
