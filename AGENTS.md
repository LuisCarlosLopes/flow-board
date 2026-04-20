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

Não há `.env.example` obrigatório para o MVP: URL do repositório e PAT entram na UI e ficam em `sessionStorage`. Se existir `.env` local, está no `.gitignore` — **nunca commite**.

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

Não há script `npm` para E2E; use o CLI. `playwright.config.ts` usa `testDir: ./tests/e2e`, sobe `npm run dev` e `baseURL` `http://localhost:5173`. Com `CI` definido: `retries: 2`, `workers: 1`, `forbidOnly: true`.

```bash
cd apps/flowboard
npx playwright test
```

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
| — | — | MVP não exige `.env` para rodar. `CI` afeta Playwright (retries/workers/forbidOnly). |

---

## Limites e permissões

### Pode sem perguntar

- Ler qualquer arquivo do repositório.
- Rodar `npm run lint`, `npm test`, `npx vitest run <arquivo>`, `npm run build` em `apps/flowboard`.
- Editar `apps/flowboard/src/`, testes em `src/**/*.test.*` e `tests/e2e/`.

### Perguntar antes

- Instalar dependências npm novas ou subir versão major de React/Vite/TS.
- Rodar suíte E2E completa (`npx playwright test`) se custo/tempo for relevante.
- `git push`, abrir PR ou alterar política de branch.

### Nunca

- Commitar tokens, PATs, `.env` ou conteúdo de `.playwright-cli/` com dados sensíveis.
- Apagar `.memory-bank/` ou specs sem confirmação explícita.
- Escrever segredos em issues, commits ou documentação no repositório.

---

## Contexto arquitetural (parece “sem backend”, é intencional)

Os dados vivem em **arquivos JSON no repositório GitHub** escolhido pelo usuário, via **GitHub Contents API** e **SHA** para concorrência; sessão e PAT em **`sessionStorage`** (não nos arquivos de dados). Detalhes: `.memory-bank/adrs/002-flowboard-json-repository-layout.md` e `005-flowboard-github-concurrency.md`.
