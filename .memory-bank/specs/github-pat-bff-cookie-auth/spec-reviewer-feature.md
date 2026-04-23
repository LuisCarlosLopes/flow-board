# Spec review — `github-pat-bff-cookie-auth`

**Artefato revisado:** `.memory-bank/specs/github-pat-bff-cookie-auth/spec-feature.md` (TSD v1.0)  
**Data:** 2026-04-23  
**Revisor:** spec-reviewer (execução substituta: limite de API ao subagente remoto)

---

## Veredicto

**Amarelo** — aprovável para `planner` com ressalvas fecháveis no IPD (não bloqueiam o TSD v1.0, mas devem virar decisões explícitas no plano).

**Score:** 78/100

| Dimensão | Nota |
|----------|------|
| Completude RF01–RF06 | 20/20 |
| Alinhamento Constitution III / ADR | 4/5 (falta referência operacional a número do ADR sucessor) |
| Contratos API (nomes, status) | 7/10 (propositalmente deixado para IPD — risco de drift) |
| Rastreio implementação existente (sessionStore, Vite) | 8/10 |
| Riscos (preview vs prod, CSP, E2E) | 8/10 |
| Testabilidade | 6/5 — ok |

**Motivo do não-verde absoluto:** contratos ainda com placeholders (`201` vs `204`, nomes exatos de rotas BFF) e detalhe de shape JSON de erros; aceitável se o **IPD** fechar tudo com zero ambiguidade.

---

## Checklist de rastreio (RF e estado)

| ID | Presente e testável no TSD? | Evidência |
|----|------------------------------|-----------|
| RF01 | Sim | §3.4 |
| RF02 | Sim | §3.3 (cifra, flags) |
| RF03 | Sim | §3.4–3.5 |
| RF04 | Sim | §3.1, 3.5, 6 (proxy same-origin) |
| RF05 | Sim | §3.6 |
| RF06 | Sim | §3.7 |
| Re-login → 409 | Sim | §3.4, 4, 5 |
| ADR-004 / Constitution | Parcial | §2, 8 (precisa **commit** de novo parágrafo no ADR após implementação) |

---

## Gaps (prioridade)

1. **Crítico (fechar no IPD, não reabrir TSD):** mapear **1:1** cada método público de `GitHubContentsClient` (ou agregado de uso) para rota BFF; sem isso, RF04 pode vazar se restar `fetch` direto a `api.github.com` no bundle.
2. **Alto:** `vite preview` vs servidor `node server.mjs` — o TSD já alerta; o IPD deve listar o comando canônico de validação pós-build e ajuste CI.
3. **Médio:** E2E — estratégia concreta (request API + `storageState` com cookies ou `page.context().addCookies`); referenciar `tests/e2e/auth.setup.ts`.
4. **Médio:** `connect-src` em CSP — impacto e diff esperado do plugin em `vite.config.ts` (TSD §6 cita, IPD detalha).
5. **Baixo:** expor ou não `id` numérico do GitHub em `/api/auth/me` — RF06 cita três campos; evitar extensão não necessária.

---

## Riscos de implementação

- **Tamanho do cookie:** se JWE + repo metadata exceder limites, falha em browsers antigos; IPD valida tamanho ou reduz payload.
- **CORS:** se por engano a API for outra origem, cookies quebram; o TSD impõe same-origin — manter.
- **Regressão Playwright:** `localStorage` legado — migrar testes e documentar “primeiro login após deploy”.

---

## Recomendações ao `planner`

1. Incluir no mapa de alterações: `apps/flowboard/package.json` scripts, novo entry `server/`, e grep CI para `api.github.com` no `src/` pós-migração.
2. Exigir `supertest` (ou similar) mínimo para login + 401 + 409.
3. Arquitetura: confirmar `architect` para diagrama 1 painel (browser → BFF → GitHub) se o IPD tiver múltiplas rotas de proxy.

---

**Conclusão:** **GO** para `planner` (track FEATURE), com o IPD endereçando gaps 1–3 explicitamente.
