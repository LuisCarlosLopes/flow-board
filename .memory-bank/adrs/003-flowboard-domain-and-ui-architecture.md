# ADR-003: FlowBoard — Camada de domínio pura + shell de UI (feature-based)

**Status:** Aceito  
**Data:** 2026-04-19  
**Feature de origem:** personal-kanban  
**Autores:** architect (EPIC)

---

## Contexto

As regras de tempo (segmentos, papéis de coluna, invariantes P01–R14) são centrais e devem ser testáveis sem acoplar a React/DOM. O protótipo HTML (`prototypes/index.html`) define hierarquia visual (login, board, horas) mas inclui elementos **não-MVP** (busca global, notificações, favoritos, labels) conforme `spec-reviewer-epic.md`.

## Decisão

Decidimos organizar o front em:

- **`domain/`** (ou equivalente) — funções puras e tipos para: validação de quadro/colunas, transições de card, cálculo de totais e projeção de relatório por período, conforme TSD.
- **`features/`** — `auth`, `board`, `hours` com componentes de rota/view.
- **`infrastructure/github/`** — cliente HTTP + adaptador que mapeia entidades de domínio ↔ JSON dos arquivos (ADR-002).

A UI segue **fluxo e hierarquia do protótipo** para telas MVP (login, tabs Quadro/Horas, filtros); **não** implementar busca, notificações, favoritos ou sistema de labels até decisão de produto explícita.

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|-------------|-------------------------|
| Lógica só em hooks/componentes | Dificulta testes e duplica regras críticas de tempo |
| Clean Architecture completa com ports em excesso | Overhead para time mínimo; domínio puro + adaptador GitHub é suficiente no MVP |

## Consequências

**Positivas:**
- ✅ Testes unitários pesados no domínio sem mock de UI
- ✅ Protótipo como referência visual sem absorver escopo extra

**Trade-offs aceitos:**
- ⚠️ Fronteira `features` ↔ `domain` deve ser mantida disciplinada no IPD

## Guardrails derivados desta decisão

- **G5:** Nenhuma regra P01–R14 implementada apenas na camada de UI; deve haver função de domínio ou serviço que a encapse.
- **G6:** Elementos visuais do protótipo fora do PRD MVP não recebem rotas nem estado persistente sem novo PRD/ADR.

## Status de vigência

- **Aceito** — em vigor desde 2026-04-19.
