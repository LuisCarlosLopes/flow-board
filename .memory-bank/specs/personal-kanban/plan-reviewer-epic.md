# IPD Review Report — FlowBoard MVP

> **Data:** 2026-04-19 | **Revisor:** plan-reviewer (EPIC) | **IPD:** `planner-epic.md` v1.0  
> **Repositório:** `_test-cursor-codesteer` (verificação em árvore real)

---

## Veredicto: 🟡 APROVADO COM RESSALVAS

Nenhum **🔴 crítico**. O IPD é executável. **Camada 3 (acurácia vs repo):** greenfield — paths em `apps/flowboard/` são **criações planejadas**, não divergência factual.

---

## Sumário

| Categoria | Qtd |
|-----------|-----|
| 🔴 Críticos | 0 |
| 🟡 Avisos | 4 |
| 🔵 Sugestões | 3 |
| Score de qualidade | **81** / 100 |

---

## Avisos

**[PA1]** Monorepo vs pacote isolado: o IPD menciona workspace opcional na raiz; ainda **não existe** `package.json` na raiz — ao implementar, **ou** adicionar `package.json` workspace na raiz **ou** manter apenas `apps/flowboard/` sem workspace (escolher uma e remover ambiguidade na primeira PR).

**[PA2]** Ordem catalog vs board na criação do primeiro quadro: IPD cita risco em §7; exigir subtarefa explícita “primeiro push bootstrap” com ordem documentada.

**[PA3]** RF12 “Todos os quadros” permanece condicional ao TSD — confirmar corte no DoD se escopo estourar.

**[PA4]** Playwright marcado opcional — aceitável para MVP se Vitest + manual cobrirem matriz RF.

## Sugestões

**[PS1]** Adicionar `.nvmrc` ou `engines` em `apps/flowboard/package.json` para Node LTS.

**[PS2]** Stub visual para busca na topbar: `disabled` + tooltip “Em breve” em vez de remover (paridade protótipo sem escopo).

**[PS3]** Issue tracking: referenciar IDs de RF na primeira suite E2E manual (checklist).

---

## Checklist (resumo)

| Check | Resultado |
|-------|-----------|
| Missão e DoD mensuráveis | ✅ |
| Mapa de alterações coerente com fluxo | ✅ |
| Guardrails alinhados ADRs | ✅ |
| Testes cruzam DoD edge cases | 🟡 [PA4] |
| Camada 3 arquivo existe | N/A greenfield — **PASSOU** com nota |

---

## Próximo passo

**task-breakdown** → `task.md` / `task-breakdown-epic.md` → **HITL** obrigatório do EPIC antes de `implementer`.

```json
{
  "agent": "plan-reviewer",
  "verdict": "approved_with_reservations",
  "score": 81
}
```
