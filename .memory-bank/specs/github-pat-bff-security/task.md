# Task breakdown — github-pat-bff-security

> Gerado a partir de `planner-feature.md` e `plan-reviewer-feature.md` | 2026-04-25

## Ordem (dependências)

1. **T1 — Fundação BFF**  
   Criar `apps/flowboard/server` (bootstrap HTTP, `SESSION_SECRET`, iron-session, health).  
   *DoD local:* `GET /api/.../health` ou equivalente; cookie de teste.

2. **T2 — Sessão: login e logout**  
   `POST /api/flowboard/session` e `POST /api/flowboard/session/logout`; validação Zod; `parseRepoUrl`; `verifyRepositoryAccess` + bootstrap (extrair lógica partilhada com `LoginView`).  
   *DoD:* sem PAT no response body; `Set-Cookie` HttpOnly.

3. **T3 — Decisão + contrato API GitHub (bloqueio único de desenho)**  
   **Escolher e documentar** *uma*: (a) `POST /api/flowboard/github/invoke` com `op` + args, **ou** (b) rotas REST alinhadas às operações. Implementar o *adapter* no servidor mapeando para `GitHubContentsClient` com `owner`/`repo` **da sessão**.  
   *DoD:* tabela de `op` ↔ método da classe; testes mínimos de autorização (sessão sem repo alheio).

4. **T4 — Cliente browser (Bff / FlowBoardApiClient)**  
   Implementar a mesma *superfície* necessária a `boardRepository` e anexos; `credentials: 'include'`.  
   *DoD:* substitui `createClientFromSession` em um módulo piloto.

5. **T5 — Migração de UI e repos**  
   Trocar todos os usos; remover `pat` de `FlowBoardSession` e `sessionStore`; apagar legado `flowboard.session.v1` após login bem-sucedido.

6. **T6 — DevX, Vercel e proxy**  
   Vite `proxy` + scripts *dev* locais; adicionar **`vercel.json`** + pasta **`api/`** com *handlers* Node alinhados ao núcleo em `server/`; documentar **Root Directory**, `SESSION_SECRET` no painel e *Preview Deploy*; **não** usar Edge para sessão com `iron-session`.

7. **T7 — Testes e E2E**  
   Vitest (integração); ajuste Playwright + documentação de env/arranque BFF.

8. **T8 — Documentação e revisão**  
   README, verificação de ADRs, lint, build.

---

## Gate

- **HITL obrigatório** após revisão de `task.md` e antes do *implementer*, para aprovar o desenho de T3 (contrato) e a estratégia de *deploy* local (T6).

---

*task-breakdown (orquestrador; subagente indisponível).*
