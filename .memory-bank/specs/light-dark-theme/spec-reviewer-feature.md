# Relatório de revisão da spec: Tema light/dark

**Agente:** spec-reviewer  
**Data:** 2026-04-22  
**Spec:** spec-feature.md v1.0  
**Escopo:** revisão em 3 camadas (estrutura, consistência, rastreabilidade)

---

## Veredito

**Status:** Aprovada (verde) — pronta para planejamento  
**Score:** 78/100  
**Confiança:** Alta

**Nota:** Score abaixo de 80 por ausência explícita de contrato de **nome exato** da chave e de **política de migração** se a chave mudar no futuro; não bloqueia MVP se o planner fixar constante única e testes de regressão.

---

## Camada 1 — Estrutura

| Seção | OK |
|-------|-----|
| Objetivo / problema / escopo negativo | Sim |
| Entidades (`ThemeMode`, storage, DOM) | Sim |
| Regras numeradas (R1–R5) | Sim |
| UI + a11y | Sim |
| Critérios de aceite tabulares | Sim |
| Riscos | Sim |

**Lacuna menor:** não especifica se o controle é ícone-only ou texto; aceitável como decisão de UI no IPD desde que `aria-label` esteja garantido (AC implícito).

---

## Camada 2 — Consistência interna

- `data-theme` + tokens por seletor está alinhado com R5 (eliminar `prefers-color-scheme` órfão).
- Fallback dark consistente com produto atual dark-first.
- Script inline + React: requer **mesma constante de chave** em dois lugares — risco de drift; o plano deve extrair chave para um único lugar documentado ou gerar com comentário “keep in sync” mínimo (trade-off aceito para FOUC).

---

## Camada 3 — Rastreabilidade

- Cada AC mapeia para regra ou UI.
- Constitution: não viola persistência GitHub-only (preferência UI é cache local permitido).

---

## Findings

| Severidade | Item |
|------------|------|
| Medium | Fixar `THEME_STORAGE_KEY` em um módulo TS e duplicar apenas string literal no inline script com comentário de sincronização, ou injetar via build (fora de escopo) — planner deve escolher uma abordagem explícita. |
| Low | Opcional: após valor inválido, regravar `dark` evita estado “silenciosamente inconsistente” entre sessões. |

**Críticos:** nenhum.

---

## Architect

**Necessário:** Não. Decisão de tema via CSS variables + `data-theme` é padrão e não exige ADR dedicado; se surgir terceiro tema ou design tokens externos, reavaliar.
