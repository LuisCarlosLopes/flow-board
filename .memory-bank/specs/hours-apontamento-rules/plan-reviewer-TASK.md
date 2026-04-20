# IPD Review Report — Regras de soma de horas, apontamento por dia e janela de trabalho

> **Data:** 2026-04-20 | **Revisor:** plan-reviewer (2ª rodada) | **IPD:** `planner-TASK.md` (revisão D5–D6)  
> **Repositório:** `_test-cursor-codesteer` — **Camada 3 executada**

---

## Veredicto: 🟡 APROVADO COM RESSALVAS

Nenhum **🔴 crítico**. O IPD está **coerente com o código atual** (`BoardDocumentJson` sem `workingHours` hoje; `timeEngine` / `appendNewSegments` como descrito) e o escopo D1–D6 é **implementável**. Restam **lacunas de decisão** (D6 A vs B) e **alinhamento fino D4 × D5** no timer ativo após meia-noite — devem ser fechadas no `task.md` ou HITL curto antes do `implementer`.

---

## Sumário

| Categoria              | Qtd          |
| ---------------------- | ------------ |
| 🔴 Críticos             | 0            |
| 🟡 Avisos               | 4            |
| 🔵 Sugestões            | 3            |
| ✅ Auto-correções       | 0            |
| **Score de qualidade** | **80** / 100 |

```json
{
  "agent": "plan-reviewer",
  "status": "approved_with_caveats",
  "score": 80,
  "criticals": 0,
  "warnings": 4,
  "suggestions": 3,
  "auto_corrections": 0,
  "layer3_executed": true,
  "review_report": ".memory-bank/specs/hours-apontamento-rules/plan-reviewer-TASK.md",
  "round": 2
}
```

---

## Pré-análise

| Campo               | Valor                                                   |
| ------------------- | ------------------------------------------------------- |
| Objetivos           | 3 (in_progress only; split por dia; janela de trabalho) |
| Decisões D1–D6      | Presentes; D5/D6 adicionam persistência + clip          |
| Mapa                | Paths completos `apps/flowboard/src/...`                |
| DoD                 | 6 itens; cobre regressão sem `workingHours`             |
| Confiança declarada | *Ausente* (herança do template plan-reviewer)           |

---

## Camada 3 — Acurácia vs repositório

| Verificação                              | Status     | Evidência                                                                                                                                               |
| ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BoardDocumentJson` sem campo de jornada | **PASSOU** | `types.ts` L4–L19: só `schemaVersion`, colunas, cards, `timeSegments`, `cardTimeState`                                                                  |
| `workingHours` ainda não existe          | **PASSOU** | Extensão planejada é greenfield no tipo                                                                                                                 |
| Arquivos do mapa existem                 | **PASSOU** | `boardFactory.ts`, `BoardView.tsx`, `timeBridge.ts`, `timeEngine.ts`, `hoursProjection.ts`, `ColumnEditorModal.tsx` presentes sob `apps/flowboard/src/` |
| `timeSegments.ts` (opcional)             | **N/A**    | Ainda não criado — alinhado ao IPD                                                                                                                      |
| Stack                                    | **PASSOU** | `apps/flowboard/package.json`: TS, React, Vite, Vitest                                                                                                  |

---

## Problemas

### 🔴 CRÍTICOS

*Nenhum.*

### 🟡 AVISOS

**[A1] D4 × D5 — `activeStartMs` à meia-noite vs janela de expediente**

- **Evidência:** D4.3 fixa novo `activeStartMs` = **00:00:00** do dia civil atual após virada. D5 exige que só conte tempo **dentro** da janela (ex. 09:00–18:00).
- **Risco:** Entre 00:00 e o início da janela, o card segue com segmento **aberto**; se algum caminho usar `now - activeStartMs` para exibir ou projetar tempo antes da reconciliação D6, pode **contar minutos fora** do expediente até o próximo tick.
- **Ação:** No `task-breakdown`, unificar: após pipeline (dia + janela), o próximo `activeStartMs` contábil deve ser **`max(início do dia civil, início da janela)`** quando `workingHours` estiver ativo, **ou** rodar reconciliação D6 **no mesmo passo** que D4. Atualizar texto do IPD na próxima revisão do planner se o implementer seguir só o doc literal.

**[A2] Decisão de produto D6 — Opção A vs B ainda aberta**

- **Evidência:** §7 e §9 pedem confirmação; ambas coexistem no IPD.
- **Risco:** Dois implementadores podem escolher comportamentos incompatíveis.
- **Ação:** Registrar **uma** opção no `state.yaml` → `decisions` (ou checklist HITL) **antes** do `implementer`. O IPD já recomenda A para MVP.

**[A3] Ordem “dia → janela” em sessões longas inativas**

- **Evidência:** §4 último parágrafo D6; mesma recomendação da 1ª review para **multi-dia** com aba fechada.
- **Risco:** Loop deve aplicar **todas** as fronteiras (meia-noite **e** borda de janela **por dia**) até alinhar `activeStartMs` com `now`.
- **Ação:** Uma função domínio `reconcileActiveSegment(...)` com loop explícito documentada no `task.md`.

**[A4] Checklist canônico do `plan-reviewer.agent.md`**

- **Evidência:** IPD não segue as 9 seções formais (Missão, Guardrails dedicados, matriz de testes).
- **Risco:** Baixo para execução; burocracia em auditoria externa.
- **Ação:** Opcional para TASK; manter DoD §6 como fonte de verdade.

### 🔵 SUGESTÕES

**[S1]** Incluir no `task.md` nota sobre **fins de semana**: MVP assume mesma janela **todos** os dias civis; se no futuro “só dias úteis”, é nova regra.

**[S2]** Campo opcional `workingHours` provavelmente **não exige** bump de `schemaVersion` se loaders usarem `undefined`; se algum validador JSON rejeitar campos extras, validar contra o loader real do board.

**[S3]** Atualizar §8 do IPD após esta rodada: remover “recomenda-se nova passada do plan-reviewer” ou substituir por “plan-reviewer 2026-04-20 ok” para evitar drift documental.

---

## Checklist resumido (C1–C3)

| Área                                           | Resultado                |
| ---------------------------------------------- | ------------------------ |
| Completude para execução (mapa + DoD + riscos) | ✅                        |
| Consistência interna D1–D6                     | 🟡 ver [A1][A2]           |
| Acurácia repo                                  | ✅                        |
| Testes declarados vs DoD                       | ✅ (Vitest; E2E opcional) |

---

## Comparativo com 1ª revisão (77 → 80)

- **Melhorou:** mapa com paths absolutos; escopo de persistência e UI explícito; D5/D6 e DoD alinhados ao `state.yaml`; contrato `BoardDocumentJson` citado corretamente.
- **Persiste:** tensão a resolver entre meia-noite e janela ([A1]); template formal opcional ([A4]).

---

## Próximo passo

**task-breakdown** → `task.md` com: (1) fechamento explícito A vs B; (2) especificação do `activeStartMs` pós–virada de dia **com** `workingHours`; (3) loop de reconciliação multi-dia/multi-borda.

---

## Auto-correções / IPD corrigido

*Não aplicadas ao `planner-TASK.md` nesta rodada (somente relatório).*
