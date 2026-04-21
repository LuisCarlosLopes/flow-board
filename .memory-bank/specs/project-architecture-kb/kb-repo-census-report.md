# kb-repo-census-agent — inventário factual

**Repositório:** flow-board  
**HEAD:** `f453e28`  
**App principal:** `apps/flowboard/`

## Convenções de nomenclatura

| Fato | Evidência | Confiança |
|------|-----------|-----------|
| Componentes React em PascalCase (`AppShell.tsx`, `BoardView.tsx`) | `apps/flowboard/src/features/**/*.tsx` | alta |
| Testes colocalizados `*.test.ts` / `*.test.tsx` | `vite.config.ts` (`include`), múltiplos arquivos em `src/` | alta |
| Pastas de feature por domínio (`features/board`, `features/auth`) | `apps/flowboard/src/features/` | alta |
| Domínio puro em `src/domain/*.ts` sem JSX | `apps/flowboard/src/domain/` | alta |
| Infraestrutura em `src/infrastructure/` | `apps/flowboard/src/infrastructure/` | alta |

## Stack e versões

| Fato | Evidência | Confiança |
|------|-----------|-----------|
| React 19 + Vite 8 + TypeScript 6 | `apps/flowboard/package.json` | alta |
| Vitest 4 + happy-dom | `apps/flowboard/vite.config.ts`, `package.json` | alta |
| ESLint 9 flat config | `apps/flowboard/eslint.config.js` | alta |
| Playwright E2E | `apps/flowboard/playwright.config.ts`, `tests/e2e/` | alta |
| `@dnd-kit/*`, `react-router-dom`, `@tanstack/react-virtual` | `apps/flowboard/package.json` | alta |

## Estrutura de pastas

| Área | Papel observável | Evidência |
|------|------------------|-----------|
| `src/domain/` | Regras e tipos puros | `boardRules.ts`, `timeEngine.ts`, testes espelhados |
| `src/features/` | UI por feature (app shell, board, auth, hours, release-notes) | estrutura de diretórios |
| `src/infrastructure/` | GitHub API, persistência, sessão | `github/client.ts`, `persistence/boardRepository.ts`, `session/sessionStore.ts` |
| `src/hooks/` | Hooks compartilhados | `useSearchHotkey.ts` |
| `tests/e2e/` | Playwright | `playwright.config.ts` `testDir` |

## Entrypoints

| Fato | Evidência | Confiança |
|------|-----------|-----------|
| Bootstrap SPA: `main.tsx` → `App.tsx` | `apps/flowboard/src/main.tsx`, `App.tsx` | alta |
| Rotas: `/releases` + catch-all para login/AppShell | `apps/flowboard/src/App.tsx` | alta |

## Evidência de UI

| Tipo | Fato | Evidência |
|------|------|-----------|
| Abas locais | Estado `mainView: 'kanban' \| 'hours'` com `role="tab"` | `AppShell.tsx` |
| Roteamento | `BrowserRouter`, `Routes`, `Route` | `App.tsx` |
| Modal / busca | `SearchModal`, atalho `/` | `AppShell.tsx`, `useSearchHotkey.ts` |
| Kanban DnD | `@dnd-kit` | `package.json`, `BoardView.tsx` (não detalhado neste relatório) |

## Regras implícitas (código)

| Fato | Evidência | Confiança |
|------|-----------|-----------|
| Cliente GitHub usa `fetch` ligado a `globalThis` | `GitHubContentsClient` em `infrastructure/github/client.ts` | alta |
| Sessão + PAT em `sessionStorage`, chave versionada | `infrastructure/session/sessionStore.ts` | alta |
| Repositório de quadros via factory `createBoardRepository(client)` | `infrastructure/persistence/boardRepository.ts` | alta |

## Lacunas observadas

- Não há servidor de aplicação nem API própria no repositório; persistência é GitHub Contents API no cliente.
- Não há pacote de design system externo além de CSS próprio (`tokens.css`, `index.css`).
