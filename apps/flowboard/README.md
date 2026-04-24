# FlowBoard (MVP)

Kanban pessoal com rastreamento de tempo. Os dados continuam em arquivos JSON no repositório GitHub que você indicar, mas a autenticação agora passa por uma fronteira same-origin (`/api/*`) com sessão por cookie `HttpOnly`. Desktop-first, single-user.

## Requisitos

- Node.js compatível com Vite 8 / TypeScript 6
- Conta GitHub e repositório (público ou privado) para armazenar `flowboard/`
- Personal Access Token com permissão de leitura/escrita no conteúdo do repositório (tipicamente escopo `repo` em repos privados)
- Runtime same-origin do FlowBoard ativo para fluxos autenticados (`npm run dev` e `npm run preview` já expõem a API local do app)

## Desenvolvimento

```bash
cd apps/flowboard
npm install
npm run dev
npm test
npm run build
```

Não é obrigatório arquivo `.env` para o uso diário: URL do repositório e PAT são informados na tela de login. O PAT é enviado apenas no estabelecimento da sessão e fica retido no runtime server-side; o browser persiste só metadados públicos da sessão em `localStorage`.

Configuração opcional somente do runtime server-side:

- `FLOWBOARD_SESSION_TTL_SECONDS` — TTL da sessão segura em segundos
- `FLOWBOARD_COOKIE_SECURE` — força cookie `Secure` (`true`/`false`)
- `PORT` — porta do runtime same-origin

## Segurança (RF14)

- Use um **Personal Access Token** com o **menor escopo** necessário para o seu caso.
- **Não** commite o PAT; não grave o token nos arquivos JSON sob `flowboard/`.
- Revogue tokens antigos periodicamente.
- O browser não persiste `pat`, `Authorization` nem `apiBase`; chamadas autenticadas da SPA usam apenas `/api/auth/session` e `/api/flowboard/contents`.
- O risco residual continua na digitação inicial do PAT na tela de login. XSS no origin durante esse momento ainda é capaz de observar a credencial antes de ela entrar no vault server-side.

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
| RF02 | Login repo + PAT + validação API | `LoginView.tsx`, `authGateway.ts`, `server/app.ts` |
| RF03 | Sessão + logout | `sessionStore.ts`, `server/sessions.ts`, botão Sair em `AppShell` |
| RF04 | Troca de repo | Documentado acima; fluxo = logout + novo login |
| RF05 | Múltiplos quadros | `BoardListView.tsx`, `boardRepository.ts` |
| RF06 | Colunas + preset + edição válida | `ColumnEditorModal.tsx`, `boardRules.ts`, `boardRules.test.ts` |
| RF07 | CRUD de cards | `BoardView.tsx` |
| RF08 | Movimentação / DnD | `BoardView.tsx` + `@dnd-kit` |
| RF09 | Segmentos de tempo | `timeEngine.ts`, `timeEngine.test.ts`, persistência em `BoardDocumentJson.timeSegments` |
| RF10 | Totais por atividade | `totalCompletedMs` no card em `BoardView.tsx` |
| RF11 | Monitoramento período | `HoursView.tsx`, `hoursProjection.ts`, `hoursAggregation.ts` |
| RF12 | Escopo quadro / todos | `HoursView.tsx` (chips "Quadro atual" / "Todos os quadros") |
| RF13 | Persistência GitHub + SHA | `client.ts`, `boardRepository.ts`, `putJsonWithRetry` / 409 em testes |
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

- [x] Login valida PAT contra API; erros 401/403/404 com mensagens claras e sem expor o segredo ao browser após a autenticação
- [x] Logout revoga a sessão no BFF, limpa `localStorage` público e estado em memória (volta à tela de login)
- [x] Catálogo e quadros atualizados com SHA; 409/429 tratados no cliente (`GitHubHttpError`, retry em 409 para `putJsonWithRetry`)
- [x] Colunas respeitam P01–P02; edição inválida rejeitada (`validateColumnLayout`)
- [x] Movimento de card aplica regras de tempo; total de horas no card (segmentos concluídos)
- [x] Tela horas: dia / semana / mês + escopo quadro atual e todos os quadros
- [x] Não há busca topbar, notificações, favoritos ou labels persistidos no MVP
- [x] Matriz RF×teste (esta tabela) e README preenchidos
- [x] README com PAT, escopos, runtime same-origin e aviso de segurança

## Licença

Conforme o repositório pai do projeto.
