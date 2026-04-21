# Item de Conhecimento

## Título

Vitest + happy-dom com testes colocalizados

## Categoria

test-strategies

## Contexto

O app usa Vite e precisa de testes rápidos no mesmo repositório que o código, cobrindo domínio puro e componentes React sem subir navegador real para a maior parte dos casos.

## Diretriz

- Configurar Vitest no `vite.config.ts` com `environment: 'happy-dom'` e `include` apontando para `src/**/*.test.ts` e `src/**/*.test.tsx`.
- Manter **arquivo de teste ao lado** do módulo (`*.test.ts` / `*.test.tsx`).
- Usar `src/vitest.setup.ts` para matchers globais (ex.: `@testing-library/jest-dom`) quando necessário.

Antes de concluir mudanças em lógica de domínio ou fluxos críticos, rodar `npm test` em `apps/flowboard` e, quando o escopo exigir, cobertura conforme política do projeto.

## Evidência

- `apps/flowboard/vite.config.ts` — `test.environment`, `include`, `setupFiles`.
- `apps/flowboard/src/vitest.setup.ts`
- Exemplos: `apps/flowboard/src/domain/boardRules.test.ts`, `apps/flowboard/src/features/auth/OnboardingPage.test.tsx`

## Aplicabilidade

Novos módulos em `domain/`, `hooks/`, `infrastructure/` e componentes em `features/`; refatorações que não alterem apenas estilo visual puro.

## Limites

Fluxos que dependem de múltiplas telas, rede real ou políticas de CI de browser devem usar Playwright (`tests/e2e/`), não Vitest isolado.
