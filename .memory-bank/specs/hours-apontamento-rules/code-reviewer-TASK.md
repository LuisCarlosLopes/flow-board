# Code Review — TASK — hours-apontamento-rules

**Data:** 2026-04-20  
**Escopo:** alterações em `apps/flowboard` para regras de tempo (domínio + `BoardView` + `ColumnEditorModal` + testes).

## Veredicto

**🟢 APROVADO COM RESSALVAS** — **Score: 82/100**

Nenhum achado **critical** ou **high** que bloqueie merge no track TASK. Ressalvas são operacionais (persistência concorrente), cobertura de ramos em `workingHours.ts` e comparação de estado na UI.

---

## Achados por severidade

### Medium

| ID | Área | Descrição | Evidência / sugestão |
|----|------|-----------|----------------------|
| M1 | `BoardView.tsx` | Reconciliação periódica + `saveDocument` pode competir com drag/save manual do usuário (IPD §7). Não há debounce único nem fila de escrita. | Mitigar em iteração: flag “persistindo”, debounce do tick, ou ignorar tick enquanto `saving`. |
| M2 | `BoardView.tsx` | Igualdade de `TimeBoardState` via `JSON.stringify` é frágil (ordem de chaves, objetos equivalentes) e pode mascarar diferenças sutis. | Extrair `timeStateEqual(a,b)` determinístico ou comparar por cardId + campos relevantes. |

### Low

| ID | Área | Descrição |
|----|------|-----------|
| L1 | `workingHours.ts` | `firstWorkingWindowStartMs` usa dia civil + `86_400_000` ms; transições DST podem gerar bordas fora do esperado (aceito no MVP pelo IPD). |
| L2 | Persistência | `workingHours` não é validado em `parseBoard` (JSON malicioso/manual pode ter `startMinute >= endMinute`). UI valida; repositório não. Aceitável para MVP; considerar normalização no load. |
| L3 | Performance | `JSON.stringify` do estado de tempo a cada 60s pode crescer com muitos cards; provavelmente irrelevante no MVP. |

### Security

- Sem novas superfícies de injeção: expediente vem de `<input type="time">` e tipos numéricos. **Sem achados security.**

---

## Pontos positivos

- Regras de negócio concentradas em domínio puro (`workingHours.ts`, `timeEngine.ts`), alinhado à Constitution I.
- Pipeline **dia civil → janela** explícito e testado em parte.
- `appendNewSegments` preserva um UUID por segmento; teste cobre `n - p > 1`.
- Tipagem de `BoardWorkingHours` e campo opcional no documento sem `schemaVersion` desnecessário.

## Recomendação de merge

**Aprovar merge** para a branch de integração, com **follow-up opcional** para M1/M2 se houver incidentes de conflito 409 ou drift de estado.

---

```json
{
  "agent": "code-reviewer",
  "track": "TASK",
  "verdict": "approved_with_reservations",
  "score": 82,
  "critical_count": 0,
  "high_count": 0
}
```
