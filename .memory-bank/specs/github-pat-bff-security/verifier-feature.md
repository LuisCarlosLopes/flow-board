# Verification Report — github-pat-bff-security

**Data:** 2026-04-25  
**Track:** FEATURE  
**Escopo verificado:** `apps/flowboard` (BFF, cliente BFF, sessão, Vite, Vercel)

## Veredicto

**GO condicional** — evolução alinhada ao TSD/plano (PAT fora de Web Storage, HttpOnly, GitHub só no servidor, `/invoke` mapeada para o cliente de conteúdos). Comandos automatizados abaixo passaram. Risco residual: **E2E Playwright não reexecutado nesta sessão** (depende de `.env` e BFF+proxy em `npm run dev`); **revisão adversária de código (code-reviewer)** pendente (subagente indisponível por quota).

## Comandos (evidência)

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | exit 0 |
| `npm test` (Vitest) | 278 testes, exit 0 |
| `npm run build` | `tsc -b` + Vite, exit 0 |
| `npm run typecheck:server` | `tsc -p tsconfig.server.json`, exit 0 |
| Smoke BFF (sessão anterior) | `GET /api/flowboard/health` → `{"ok":true,"service":"flowboard-bff"}` |

## Rastreio aos critérios de aceite (state.yaml)

| Critério | Verificação |
|----------|-------------|
| PAT não acessível a JS de página (HttpOnly) | `iron-session` + resposta pública `toPublic()` sem `pat`; `FlowBoardSession` no cliente sem `pat`; `clearLegacyPatStorage()`. |
| Chamadas a api.github.com com credencial no contexto aprovado | `GitHubContentsClient` usado no servidor (login, `invokeHandler` com token da sessão). Browser usa `BffContentsClient` → `/api/.../invoke` só com cookie. |
| Sem PAT em respostas JSON de login/GET session | `toPublic` e tipos de payload alinhados. |
| Stack Vite + BFF | `server/`, `vite` proxy `/api`, `api/[[...route]].ts` + `hono/vercel`. |
| ADR/Constitution | Entrega toca `apps/flowboard`; confirmação de ADR-001/004/009 alinhada ao conteúdo no repo fica para revisão de documentação em **code-reviewer** ou commit dedicado. |

## Achados (verificação estática leve, não substitui code-reviewer)

| Severidade | Item |
|------------|------|
| Informativo | `POST` login sem validação explícita de `Origin`/`Host` além de same-site; mitigação esperada: SameSite=Lax + uso same-origin. |
| Informativo | `SESSION_SECRET` em dev com fallback — aceitável só com `NODE_ENV=development` (código). |
| Residual | Deploy Vercel: validar *runtime* Node nas funções `/api` e variáveis no painel (documentado no README). |

## Próximos passos (pipeline)

1. **code-reviewer** — quando quota disponível, ou review humano com foco em `server/*`, `bffClient.ts`, `sessionApi.ts`.
2. **tester** — E2E com `npm run dev` (BFF + Vite) e credenciais de teste; regravar `storageState` se necessário (cookies HttpOnly).
3. Encerrar spec após `tester` e atualizar ADRs se texto divergir do código.

---

*Gerado na fase verifier (orquestrador + checagem automatizada; code-reviewer subagente não invocado — limite de API).*
