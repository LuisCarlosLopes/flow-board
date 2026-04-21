# knowledge-update — relatório de curadoria

**Data:** 2026-04-21  
**Escopo:** Bootstrap da base global `.knowledge/` a partir do estado atual do repositório (código + testes), complementando o snapshot factual em `architecture-knowledge.json` (project-architecture-kb).

## Itens promovidos

| Categoria | Slug | Caminho |
|-----------|------|---------|
| patterns | domain-features-infrastructure-layout | `.knowledge/patterns/domain-features-infrastructure-layout/` |
| test-strategies | vitest-happy-dom-colocated-tests | `.knowledge/test-strategies/vitest-happy-dom-colocated-tests/` |

## Evidência usada

- `apps/flowboard/src/domain/*.ts`
- `apps/flowboard/src/features/**`
- `apps/flowboard/src/infrastructure/**`
- `apps/flowboard/vite.config.ts`
- `AGENTS.md` (como referência operacional alinhada ao código)

## Candidatos descartados

| Candidato | Motivo |
|-----------|--------|
| Duplicar o JSON inteiro de arquitetura em `.knowledge/` | Proibido pelo contrato do agente: snapshot factual pertence a project-architecture-kb |
| “Pattern CRUD” genérico | Sem evidência de CRUD HTTP clássico; persistência é GitHub Contents |
| Vários itens de UI (forms/tables) | Evidência isolada; não generalizável sem repetição nomeada |

## Pendências

- Revisar promoção de item sobre **modal/form** se surgir terceiro fluxo semelhante com testes.
- Se um backend próprio for adicionado, criar item em `decisions` ou ADR — não antecipar em `.knowledge/`.

## Mudanças em `.knowledge/index.md`

Criado índice inicial com os dois itens promovidos e links relativos para `artefato.md`.
