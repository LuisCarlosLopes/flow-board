# ADR-002: FlowBoard — Layout de arquivos JSON no repositório (catálogo + um blob por quadro)

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)

---

## Contexto

O TSD fixa particionamento preferencial **índice + documento por quadro** para reduzir conflitos entre alterações (D8, R14). É necessário padronizar caminhos e conteúdo mínimo para o planner e para implementações idempotentes com SHA.

## Decisão

Decidimos persistir:

1. **`flowboard/catalog.json`** — catálogo global: `schemaVersion`, lista de `{ boardId, title, dataPath, archived? }`.
2. **`flowboard/boards/<boardId>.json`** — snapshot do quadro: colunas, cards, segmentos de tempo e metadados exigidos pelo TSD §5.3.

Branch padrão de leitura/escrita: **`main`** (override opcional em configurações avançadas, D11).

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|-------------|-------------------------|
| Monólito único `data.json` | Maximiza conflitos em multi-dispositivo e invalida isolamento por quadro |
| Um arquivo por card | Explosão de commits e custo de API; desnecessário para centenas de cards no MVP |
| GraphQL-only | REST Contents API é suficiente e amplamente documentada para blobs |

## Consequências

**Positivas:**
- ✅ Conflitos tipicamente limitados a um quadro ativo
- ✅ Leitura parcial possível (carregar só `catalog` + board atual)

**Trade-offs aceitos:**
- ⚠️ Consistência entre `catalog.json` e arquivos em `boards/` exige transações lógicas (atualizar catálogo e board com estratégia definida no IPD)
- ⚠️ Renomear `boardId` ou paths é migração explícita

## Guardrails derivados desta decisão

- **G3:** Todo conteúdo versionado em `flowboard/**` deve ser JSON UTF-8 válido; nunca incluir PAT ou segredos.
- **G4:** Escritas em qualquer um desses arquivos devem usar **SHA** atual do blob (ADR-005).

## Status de vigência

- **Aceito** — em vigor desde 2026-04-19.
