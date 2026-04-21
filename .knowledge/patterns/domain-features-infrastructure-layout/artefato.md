# Item de Conhecimento

## Título

Layout domain / features / infrastructure no FlowBoard

## Categoria

patterns

## Contexto

O FlowBoard é uma SPA que persiste dados via GitHub Contents API e mantém regras de quadro/tempo testáveis. O repositório separa código que não depende de UI ou rede (domínio), telas por área funcional (features) e adaptadores de API/sessão (infrastructure).

## Diretriz

- Colocar **regras invariantes e tipos de domínio** em `src/domain/`, exportando funções puras onde possível.
- Colocar **componentes e fluxos de tela** em `src/features/<área>/`, organizados por feature.
- Colocar **cliente GitHub, repositório de persistência e armazenamento de sessão** em `src/infrastructure/`, consumidos pelas features.

Novas regras de negócio devem primeiro existir ou ser espelhadas em `domain/` com testes Vitest antes de acoplar a React ou ao cliente HTTP.

## Evidência

- `apps/flowboard/src/domain/boardRules.ts` — validação de colunas sem React.
- `apps/flowboard/src/features/app/AppShell.tsx` — composição de shell e abas.
- `apps/flowboard/src/infrastructure/github/client.ts` — HTTP GitHub.
- `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` — factory `createBoardRepository`.

## Aplicabilidade

Mudanças em regras de quadro, tempo, busca de cards ou persistência GitHub; novas features que precisem compartilhar lógica entre telas.

## Limites

Não define contratos JSON nem ADRs; não cobre E2E Playwright nem estilos globais. Não exige backend próprio — o “adaptador” externo é a API GitHub no cliente.
