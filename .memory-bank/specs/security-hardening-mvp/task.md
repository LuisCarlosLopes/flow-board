# task.md — security-hardening-mvp

Plano executável derivado do IPD (`planner-TASK.md`). Ordem linear; marque itens no PR.

---

## Pré-requisito (HITL)

- [x] Aprovar **D2** (hostname: só `github.com` exato — **aprovado 2026-04-21**).
- [x] Aprovar **D4** (CSP **somente build de produção** — **aprovado 2026-04-21**).
- [x] Aprovar **D3** (validação **mínima** — **aprovado 2026-04-21**).

---

## Fase A — Sessão e API GitHub

- [x] **A1:** Constante `GITHUB_API_BASE` em `url.ts`.
- [x] **A2:** `loadSession` valida `apiBase` via `isOfficialGithubApiBase`; inválido → remove item e `null`. Qualquer JSON inválido ou PAT/owner/repo ausentes → remove item.
- [x] **A3:** `createSession` persiste `apiBase: GITHUB_API_BASE`.
- [x] **A4:** Testes: `apiBase` adulterado, JSON inválido, PAT vazio.
- [x] **A5:** `createClientFromSession` força `GITHUB_API_BASE`.

---

## Fase B — URL do repositório

- [x] **B1:** `hostname === 'github.com'`.
- [x] **B2:** Testes `evilgithub.com`, `www.github.com`, happy paths.

---

## Fase C — Parsers de persistência

- [x] **C1–C3:** Validação mínima em `parseCatalog` / `parseBoard`.
- [x] **C4:** Testes negativos em `boardRepository.test.ts`.

---

## Fase D — CSP / hardening HTML

- [x] **D1:** Plugin Vite; CSP só fora de `ctx.server`.
- [x] **D2:** Build verificado; `dist/index.html` com meta CSP.
- [x] **D3:** ADR-004 documenta CSP apenas em produção.

---

## Fase E — Logging (opcional, baixo risco)

- [x] **E1:** `import.meta.env.DEV` em `CreateTaskModal`, `SearchModal`, `useClipboard`.

---

## Fase F — Governança e qualidade

- [x] **F1:** ADR-004 atualizado (2026-04-21).
- [x] **F2:** lint, test, build OK.
- [x] **F3:** Cobertura linhas projeto ~81%.
- [x] **F4:** `state.yaml` concluído; artefatos `code-reviewer-TASK.md`, `tester-TASK.md`.

---

## Definition of Done

- Todas as fases obrigatórias (A–D, F) concluídas; E se incluída no escopo aprovado.
- Nenhum critério de `planner-TASK.md` §5 pendente.
