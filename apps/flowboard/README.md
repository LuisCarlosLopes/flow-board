# FlowBoard (MVP)

Kanban pessoal com rastreamento de tempo. Os dados ficam em arquivos JSON no repositório GitHub que você indicar (API Contents + PAT). Desktop-first, single-user.

## Requisitos

- Node.js compatível com Vite 8 / TypeScript 6
- Conta GitHub e repositório (público ou privado) para armazenar `flowboard/`
- Personal Access Token com permissão de leitura/escrita no conteúdo do repositório (tipicamente escopo `repo` em repos privados)

## Desenvolvimento

```bash
cd apps/flowboard
npm install
npm run dev
npm test
npm run build
```

Não é obrigatório arquivo `.env` para usar o app localmente: URL do repositório e PAT são informados na tela de login, o PAT é validado server-side e fica apenas em cookie `httpOnly` criptografado (nunca vai para os JSON do repositório nem para `localStorage`).

Se quiser manter as sessões válidas após reiniciar o servidor local, defina `FLOWBOARD_SESSION_SECRET` no ambiente do processo Vite/preview; sem ela o app usa um segredo efêmero e invalida as sessões no restart.

## Segurança (RF14)

- Use um **Personal Access Token** com o **menor escopo** necessário para o seu caso.
- **Não** commite o PAT; não grave o token nos arquivos JSON sob `flowboard/`.
- Revogue tokens antigos periodicamente.
- O app exibe aviso mínimo na tela de login sobre o risco do PAT.

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
| RF02 | Login repo + PAT + validação API | `LoginView.tsx`, `GitHubContentsClient.verifyRepositoryAccess` |
| RF03 | Sessão + logout | `sessionStore.ts`, `sessionStore.test.ts`, botão Sair em `AppShell` |
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

- [x] Login valida PAT contra API; erros 401/403/404 com mensagens claras
- [x] Logout invalida o cookie `httpOnly` da sessão e limpa o estado local do app (volta à tela de login)
- [x] Catálogo e quadros atualizados com SHA; 409/429 tratados no cliente (`GitHubHttpError`, retry em 409 para `putJsonWithRetry`)
- [x] Colunas respeitam P01–P02; edição inválida rejeitada (`validateColumnLayout`)
- [x] Movimento de card aplica regras de tempo; total de horas no card (segmentos concluídos)
- [x] Tela horas: dia / semana / mês + escopo quadro atual e todos os quadros
- [x] Não há busca topbar, notificações, favoritos ou labels persistidos no MVP
- [x] Matriz RF×teste (esta tabela) e README preenchidos
- [x] README com PAT, escopos e aviso de segurança

## Licença

Conforme o repositório pai do projeto.
