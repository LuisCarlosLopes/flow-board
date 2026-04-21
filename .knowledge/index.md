# Base de conhecimento — FlowBoard

Índice de itens curados (patterns, estratégias de teste, etc.). O **inventário arquitetural factual** em JSON está em [`.memory-bank/specs/project-architecture-kb/architecture-knowledge.json`](../.memory-bank/specs/project-architecture-kb/architecture-knowledge.json).

## patterns

| Título | Slug | Resumo |
|--------|------|--------|
| Layout domain / features / infrastructure | [domain-features-infrastructure-layout](./patterns/domain-features-infrastructure-layout/artefato.md) | Manter regras puras em `domain/`, UI em `features/`, GitHub e sessão em `infrastructure/`. |

## test-strategies

| Título | Slug | Resumo |
|--------|------|--------|
| Vitest + happy-dom com testes colocalizados | [vitest-happy-dom-colocated-tests](./test-strategies/vitest-happy-dom-colocated-tests/artefato.md) | Usar `*.test.ts(x)` ao lado do código e `happy-dom` no Vitest para a SPA. |
