# FlowBoard (MVP)

Kanban pessoal com rastreamento de tempo. Os dados ficam em arquivos JSON no repositório GitHub que você indicar (API Contents + PAT). Desktop-first, single-user.

## Requisitos

- Node.js compatível com Vite 8 / TypeScript 6
- Conta GitHub e repositório (público ou privado) para armazenar `flowboard/`
- Personal Access Token com permissão de leitura/escrita no conteúdo do repositório (tipicamente escopo `repo` em repos privados)

## Desenvolvimento

O app é uma SPA (Vite) e um **BFF** na mesma origem (`/api/...`). Em local, o Vite faz *proxy* de `/api` para o servidor Node (porta `BFF_PORT`, predefinido `8787`).

```bash
cd apps/flowboard
npm install
# Recomendado: SESSION_SECRET com ≥32 caracteres (obrigatório fora de NODE_ENV=development)
export SESSION_SECRET="dev-local-secret-at-least-32-chars!!"
npm run dev
```

`npm run dev` inicia o BFF e o Vite em paralelo. Só o front: `npm run dev:vite`. Só o BFF: `npm run dev:server` (define `NODE_ENV=development` para o iron-session em local). **Após alterar o BFF ou `sessionOptions`, reinicia** o `npm run dev` para o processo Node apanhar o código e o ambiente certos.

Testes e build:

```bash
npm test
npm run build
npm run typecheck:server
```

### E2E (Playwright)

O `playwright.config.ts` só considera o ambiente pronto quando `http://localhost:5173/api/flowboard/health` responde (Vite + proxy + BFF). Pare processos que ocupem as portas 5173/8787 antes de `npm run test:e2e` com servidor novo, ou use `reuseExistingServer` em local com `npm run dev` já a correr.

Requer `FLOWBOARD_E2E_REPO_URL` e `FLOWBOARD_E2E_PAT` em `apps/flowboard/.env` (não comitar). Erros de login mostram a mensagem devolvida pelo BFF (ou o código HTTP), para facilitar diagnóstico.

Variáveis úteis (ficheiro `.env` local, não comitar):

| Variável | Onde | Descrição |
|----------|------|-----------|
| `SESSION_SECRET` | BFF | Palavra-passe de cifra do cookie de sessão (≥32 chars em produção). Em dev local, se `NODE_ENV` não estiver definido, usa-se fallback interno; em `NODE_ENV=production` é obrigatório. |
| `BFF_PORT` | Dev | Porta do BFF (predefinido 8787; o proxy do Vite aponta para aqui) |

URL do repositório e o PAT são enviados no **login** para `POST /api/flowboard/session`; o PAT fica no cookie de sessão **HttpOnly** (iron-session) e **não** em `localStorage` / `sessionStorage`. O cliente obtém `owner`/`repo`/URLs via `GET /api/flowboard/session` com `credentials: 'include'`. Chamadas de dados vão a `POST /api/flowboard/github/invoke`.

## Segurança (RF14)

- Use um **Personal Access Token** com o **menor escopo** necessário para o seu caso.
- **Não** commite o PAT; não grave o token nos arquivos JSON sob `flowboard/`.
- Revogue tokens antigos periodicamente.
- O PAT não fica acessível a JavaScript de página: após o login, só o servidor (BFF) usa o token contra `api.github.com`, transportado no cookie cifrado.
- Em produção (ex.: Vercel), defina `SESSION_SECRET` nas variáveis de ambiente do projeto; o *runtime* das funções em `/api` deve ser **Node.js** (não Edge) por causa de `iron-session`.

## Troca de repositório (RF04)

Trocar o repositório de dados equivale a **encerrar a sessão** e fazer login de novo com a nova URL (não há dois repositórios ativos na mesma sessão).

## Layout dos dados no GitHub

- `flowboard/catalog.json` — índice de quadros
- `flowboard/boards/<boardId>.json` — documento por quadro (colunas, cards, segmentos de tempo)

Detalhes: `.memory-bank/adrs/002-flowboard-json-repository-layout.md` (no repositório CodeSteer).

## Escopo excluído do MVP (IPD §3)

Não há, nesta versão:

- Busca global na barra superior funcional
- Notificações in-app
- Favoritos
- Sistema de labels/tags persistido

A barra superior contém apenas identidade **FlowBoard**, contexto do repositório e **Sair**. A navegação Kanban/Horas é local ao app (sem React Router na entrega atual).

## Matriz RF × evidência de teste / código

Referência: PRD/TSD em `.memory-bank/specs/personal-kanban/`. Testes com **Vitest** em `src/**/*.test.ts`.

| RF | Descrição (resumo) | Evidência |
|----|--------------------|-----------|
| RF01 | Nome FlowBoard na UI | `index.html` (`<title>`), `AppShell` / login marca "FlowBoard" |
| RF02 | Login repo + PAT + validação API | `LoginView.tsx`, `POST /api/flowboard/session` (BFF: `server/app.ts`, `verifyRepositoryAccess` + bootstrap no servidor) |
| RF03 | Sessão + logout | `sessionApi.ts`, iron-session, `GET/POST /api/flowboard/session`, `AppShell` |
| RF04 | Troca de repo | Documentado acima; fluxo = logout + novo login |
| RF05 | Múltiplos quadros | `BoardListView.tsx`, `boardRepository.ts` |
| RF06 | Colunas + preset + edição válida | `ColumnEditorModal.tsx`, `boardRules.ts`, `boardRules.test.ts` |
| RF07 | CRUD de cards | `BoardView.tsx` |
| RF08 | Movimentação / DnD | `BoardView.tsx` + `@dnd-kit` |
| RF09 | Segmentos de tempo | `timeEngine.ts`, `timeEngine.test.ts`, persistência em `BoardDocumentJson.timeSegments` |
| RF10 | Totais por atividade | `totalCompletedMs` no card em `BoardView.tsx` |
| RF11 | Monitoramento período | `HoursView.tsx`, `hoursProjection.ts`, `hoursAggregation.ts` |
| RF12 | Escopo quadro / todos | `HoursView.tsx` (chips "Quadro atual" / "Todos os quadros") |
| RF13 | Persistência GitHub + SHA | `bffClient.ts` / `client.ts` (servidor), `boardRepository.ts`, `putJsonWithRetry` / 409 em testes |
| RF14 | Documentação segurança in-app | `LoginView` (texto PAT), esta secção no README |

### Casos de borda (planner §3.1)

| Caso | Onde está coberto |
|------|-------------------|
| R03 — sair de Em progresso sem Done | `timeEngine.test.ts` |
| R04 — Backlog → Done direto | `timeEngine.test.ts` |
| R06 — reordenar só dentro de Em progresso | `timeEngine.test.ts` |
| 409 / retry | `client.test.ts` (`putJsonWithRetry`) |
| R09 — conclusão do segmento no período | `hoursProjection.test.ts`, `hoursAggregation.test.ts` |

## Definition of Done (IPD §3)

- [x] Login valida PAT contra API; erros 401/403/404 com mensagens claras
- [x] Logout destrói a sessão no servidor (cookie) e o estado em memória (volta à tela de login)
- [x] Catálogo e quadros atualizados com SHA; 409/429 tratados no cliente (`GitHubHttpError`, retry em 409 para `putJsonWithRetry`)
- [x] Colunas respeitam P01–P02; edição inválida rejeitada (`validateColumnLayout`)
- [x] Movimento de card aplica regras de tempo; total de horas no card (segmentos concluídos)
- [x] Tela horas: dia / semana / mês + escopo quadro atual e todos os quadros
- [x] Não há busca topbar, notificações, favoritos ou labels persistidos no MVP
- [x] Matriz RF×teste (esta tabela) e README preenchidos
- [x] README com PAT, escopos e aviso de segurança

## Deploy (Vercel)

Definir **Settings → General → Root Directory = `apps/flowboard`**. O repositório `flow-board` tem a app nessa subpasta; o BFF fica em `api/flowboard/*.ts` (rotas **explícitas** — o Vite não aplica o mesmo catch-all que o Next; ver `api/flowboard/_bff.ts`).

Variáveis: `SESSION_SECRET` (≥32 caracteres) e, em produção, o iron-session ajusta cookies `secure` com `VERCEL=1` quando aplicável.

## Licença

Conforme o repositório pai do projeto.
