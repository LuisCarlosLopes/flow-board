# AGENTS.md

> Instruções operacionais para agentes de codificação AI.  
> Leia antes de qualquer modificação no código.

O código da aplicação **FlowBoard** vive em `apps/flowboard/`. Na raiz há `.memory-bank/` (specs, ADRs), `.cursor/skills/` e `_codesteer/` (templates de agentes; a pasta `_codesteer/` está no `.gitignore` — mantenha-a só localmente; clones não trazem esse conteúdo).

## Comandos essenciais

Execute sempre a partir de `apps/flowboard/`:

### Instalação e setup

```bash
cd apps/flowboard
npm install
```

Para o app no dia a dia não é obrigatório `.env`: URL do repositório e PAT entram na UI e ficam em `sessionStorage`. **Testes E2E** exigem `apps/flowboard/.env` com credenciais de um repositório de dados de teste (ver secção E2E e tabela de variáveis). Qualquer `.env` está no `.gitignore` — **nunca commite**.

### Desenvolvimento e build

```bash
cd apps/flowboard
npm run dev
npm run build
npm run preview
```

### Testes (Vitest)

```bash
cd apps/flowboard
npm test
npm run test:watch
```

Testes unitários: `src/**/*.test.ts` e `src/**/*.test.tsx` (happy-dom). Para um arquivo:

```bash
cd apps/flowboard
npx vitest run src/caminho/para/arquivo.test.ts
```

Cobertura (`@vitest/coverage-v8` está instalado; não há script npm dedicado). **Meta obrigatória:** cobertura de testes unitários (linhas) **> 80%** no conjunto relevante ao que foi alterado; antes de concluir mudanças em lógica de domínio, rode `npx vitest run --coverage` e confira o relatório.

```bash
cd apps/flowboard
npx vitest run --coverage
```

### E2E (Playwright)

**Pré-requisito:** em `apps/flowboard/.env`, defina `FLOWBOARD_E2E_REPO_URL` (HTTPS do repo de dados) e `FLOWBOARD_E2E_PAT` (token com permissão de conteúdo nesse repo). O `playwright.config.ts` carrega o `.env` via `vite` `loadEnv`. Testes que autenticam usam `tests/e2e/helpers/e2e-env.ts` — sem essas variáveis, o setup e specs que conectam ao GitHub falham com erro explícito.

**Fluxo de sessão:** `scripts/ensure-e2e-auth.mjs` (usado pelos scripts `npm` abaixo) verifica `tests/e2e/.auth/user.json`. Se não existir, roda só o projeto Playwright `setup` (`auth.setup.ts`: login na UI e grava `storageState`). Esse diretório `.auth/` é **gitignored** — não commite.

**Comandos (preferir o wrapper — repassa argumentos ao CLI):**

```bash
cd apps/flowboard
# Suíte completa (garante auth + playwright; sobe o dev server via webServer do config)
npm run test:e2e

# Mesmo fluxo com browser visível ou Playwright UI mode (workers forçados a 1 no config)
npm run test:e2e:headed
npm run test:e2e:ui

# Playwright direto, sem rodar o ensure (útil se .auth/user.json já existe e você sabe o que faz)
npm run test:e2e:raw
```

**Escopo (economiza tempo):** repasse caminho ou grep ao wrapper, por exemplo:

```bash
cd apps/flowboard
npm run test:e2e -- tests/e2e/release-notes.spec.ts
npm run test:e2e -- --grep @login
```

**Só regenerar a sessão salva:**

```bash
cd apps/flowboard
npx playwright test --project=setup
```

**Base URL:** opcional `FLOWBOARD_E2E_BASE_URL` (default `http://localhost:5173`). O config sobe `npm run dev` em `webServer` e reutiliza servidor local fora de CI (`reuseExistingServer`).

**Projetos e paralelismo (comportamento intencional):** há `setup`, depois `chromium` / `firefox` / `webkit` com `storageState` compartilhado. `create-task.spec.ts` roda **apenas em Chromium**; em Firefox/WebKit o ficheiro está em `testIgnore` para não escrever no mesmo repo GitHub em paralelo. `login.spec.ts` fica no projeto `chromium-login`, sem `storageState` persistido. Com `--headed`, `--debug` ou `--ui`, `workers` vira `1` (clipboard e foco). Com `CI` definido: `retries: 2`, `workers: 1`, `forbidOnly: true`.

**Relatório:** reporter HTML padrão; `trace: on-first-retry`, `screenshot: only-on-failure`.

**Instalação de browsers (máquina nova):** `npx playwright install` (ou o subconjunto que o time usar).

### Qualidade

```bash
cd apps/flowboard
npm run lint
```

Lint escopado (preferir em mudanças pequenas):

```bash
cd apps/flowboard
npx eslint src/caminho/para/arquivo.tsx
```

`npm run build` já roda `tsc -b` antes do `vite build`. Não há script de format no `package.json`; use o que o editor aplicar, alinhado ao `eslint.config.js`.

---

## Estrutura (o que não é só “pasta de app”)

| Caminho | Propósito |
|--------|-----------|
| `apps/flowboard/src/` | SPA FlowBoard (`index.html` → `main.tsx` → `App.tsx`) |
| `apps/flowboard/tests/e2e/` | E2E Playwright |
| `.memory-bank/adrs/` | Decisões (persistência GitHub, layout JSON, sessão/PAT) |
| `.memory-bank/specs/` | PRDs, tasks e protótipos do épico |

Matriz RF × testes e escopo excluído do MVP: `apps/flowboard/README.md`.

---

## Stack e versões

Valores de `apps/flowboard/package.json` (ajuste se bump): **React ^19.2.4**, **Vite ^8.0.4**, **TypeScript ~6.0.2**, **Vitest ^4.1.4**, **ESLint ^9.39.4** (flat config), **Playwright ^1.57.0**.

---

## Convenções

### Sempre

- Alterar comportamento de domínio/persistência com testes Vitest nas áreas tocadas (`boardRules`, `timeEngine`, cliente GitHub, etc., conforme README do app).
- Manter **cobertura de testes unitários (Vitest) acima de 80%** nas linhas cobertas pelo escopo da mudança (ou no projeto, quando a alteração for ampla); não entregar código novo ou refatoração de domínio sem testes que preservem ou elevem essa barra.
- Respeitar o MVP: sem busca global na topbar, notificações, favoritos ou labels persistidos, salvo mudança explícita de spec.

### Nunca

- Persistir PAT ou segredos nos JSON `flowboard/` do repositório de dados nem no código versionado.
- Assumir OAuth GitHub no MVP: o fluxo é **URL do repo + PAT** (ver ADR em `.memory-bank/adrs/001-flowboard-spa-github-persistence.md`).

### Release notes — incluir um novo release

A lista pública de versões e o **badge de versão** no shell leem só de **`apps/flowboard/src/data/releases.json`**. A UI ordena por **data decrescente** (`releaseDate`), depois **semver decrescente**; a **ordem dos objetos no JSON não importa**.

Ao publicar uma versão nova, siga estes passos:

1. **Uma versão “ativa” por ficheiro** — deve existir **exatamente um** release com `"archived": false`. Esse é o que o hook `useCurrentVersion` usa no badge. Todas as versões anteriores devem ter `"archived": true`.
2. **Adicionar o novo bloco** no array (ou editar o último, se for correção do mesmo número) com:
   - `version`: semver `major.minor.patch` (ex.: `0.3.0`).
   - `releaseDate`: **ISO 8601 em UTC** (ex.: `"2026-05-01T00:00:00.000Z"`).
   - `archived`: `false` para o release atual; passar o release que era atual para `true`.
   - `changes`: lista de objetos com `id` (único no ficheiro), `type` ∈ `feature` | `fix` | `improvement` | `breaking`, `title`, `description` (texto do changelog em **inglês**, alinhado ao MVP da página `/releases`).
3. **Validar** com `npm test` em `apps/flowboard` (há testes em `src/features/release-notes/*.test.*`). Se alterar só dados, `npx vitest run src/features/release-notes/` costuma bastar.

Não introduzir API dinâmica nem outro ficheiro como fonte da versão sem spec/ADR; o contrato atual é JSON estático + tipos em `src/features/release-notes/types/releases.types.ts`.

---

## Variáveis de ambiente

| Variável | Obrigatória | Nota |
|----------|-------------|------|
| `FLOWBOARD_E2E_REPO_URL` | Sim para E2E com GitHub | URL HTTPS do repositório de dados usado nos testes. |
| `FLOWBOARD_E2E_PAT` | Sim para E2E com GitHub | PAT com escopo suficiente para ler/escrever conteúdo nesse repo. **Nunca** documentar o valor real no repositório. |
| `FLOWBOARD_E2E_BASE_URL` | Não | Base da app nos testes (default `http://localhost:5173`). |
| `CI` | Não | Quando definido, Playwright usa `retries: 2`, `workers: 1`, `forbidOnly: true`. |

---

## Limites e permissões

### Pode sem perguntar

- Ler qualquer arquivo do repositório.
- Rodar `npm run lint`, `npm test`, `npx vitest run <arquivo>`, `npm run build` em `apps/flowboard`.
- Rodar E2E escopado: `npm run test:e2e -- <caminho-do-spec>` ou `npx playwright test <arquivo>` quando `.auth` já existir e não precisar do wrapper.
- Editar `apps/flowboard/src/`, testes em `src/**/*.test.*` e `tests/e2e/`.

### Perguntar antes

- Instalar dependências npm novas ou subir versão major de React/Vite/TS.
- Rodar suíte E2E **completa** (todos os projetos/browsers: `npm run test:e2e` sem filtro) se tempo/custo de execução ou uso do repo de dados de teste for sensível.
- `git push`, abrir PR ou alterar política de branch.

### Nunca

- Commitar tokens, PATs, `.env`, `tests/e2e/.auth/` ou conteúdo de `.playwright-cli/` com dados sensíveis.
- Apagar `.memory-bank/` ou specs sem confirmação explícita.
- Escrever segredos em issues, commits ou documentação no repositório.

---

## Contexto arquitetural (parece “sem backend”, é intencional)

Os dados vivem em **arquivos JSON no repositório GitHub** escolhido pelo usuário, via **GitHub Contents API** e **SHA** para concorrência; sessão e PAT em **`sessionStorage`** (não nos arquivos de dados). Detalhes: `.memory-bank/adrs/002-flowboard-json-repository-layout.md` e `005-flowboard-github-concurrency.md`.
