# Operational Memory

## Regras de Curadoria
- Repriorize a cada leitura.
- Guarde apenas lições recorrentes e de alto valor.
- Máximo de 10 itens por categoria.
- Toda entrada precisa ter data, `Erro:` e `Faça em vez disso:`.
- Isto é uma memória operacional curada, não um log cronológico.

## Execução e Validação
1. **[2026-04-21] `storageState` do Playwright não restaura `sessionStorage`**
   Erro: setup grava `.auth/user.json` mas os testes seguintes continuam na tela de login.
   Faça em vez disso: confirmar no código onde a sessão é guardada; para reutilizar `storageState`, a chave precisa estar em **localStorage** ou **cookies** (ou hidratar `sessionStorage` por outro meio).

2. **[2026-04-21] Paralelismo em E2E (backend único ou janela visível)**
   Erro: vários workers/browsers escrevendo no mesmo repositório remoto, ou `--headed`/`--ui` com várias janelas e testes que usam clipboard — corrida, timeouts e asserts instáveis.
   Faça em vez disso: serializar mutações (`test.describe.serial`), limitar escrita pesada a um browser/projeto, e **1 worker** em modos interativos (ver `apps/flowboard/playwright.config.ts`).

3. **[2026-04-20] Validar antes de concluir**
   Erro: encerrar trabalho sem checar o resultado real da mudança.
   Faça em vez disso: execute a validação mínima aplicável antes de declarar sucesso.

## Suposições e Descoberta
1. **[2026-04-20] Não inferir sem abrir o arquivo**
   Erro: assumir estrutura, contrato ou comportamento sem ler a fonte real.
   Faça em vez disso: abra o arquivo crítico e confirme o contrato antes de editar ou responder.

## Ferramentas e Comandos
1. **[2026-04-21] E2E do Flowboard: diretório e entrada oficial**
   Erro: rodar Playwright na raiz do monorepo ou `npx playwright test` sem `tests/e2e/.auth/user.json` após clone — paths, `.env` ou `ENOENT` no `storageState`.
   Faça em vez disso: `cd apps/flowboard && npm run test:e2e` (script garante projeto `setup` se o ficheiro de sessão não existir); use `npm run test:e2e:raw` só quando a sessão já estiver criada e souber o que está a fazer.

2. **[2026-04-20] Preferir ferramentas de busca rápidas**
   Erro: gastar tempo com comandos lentos ou busca ampla demais.
   Faça em vez disso: use busca direcionada no diretório correto e refine antes de expandir o escopo.

## Preferências do Usuário
1. **[2026-04-20] Registrar correções repetidas do usuário**
   Erro: receber a mesma correção em múltiplas sessões e tratá-la como pontual.
   Faça em vez disso: transforme a correção em regra persistente na primeira recorrência.

2. **[2026-04-20] Manter idioma híbrido (EN/PT)**
   Erro: criar documentação, comentários ou planos em Inglês.
   Faça em vez disso: escreva código em Inglês, mas comentários, documentação e planos de implementação SEMPRE em Português.

## Guardrails de Domínio
1. **[2026-04-20] Preservar o fluxo do projeto**
   Erro: agir fora do processo esperado do repositório por pressa.
   Faça em vez disso: releia os guardrails locais antes de escolher a próxima ação.
