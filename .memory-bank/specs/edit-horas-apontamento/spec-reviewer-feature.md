# spec-reviewer — `edit-horas-apontamento`

| Campo | Valor |
|--------|--------|
| Artefato revisto | `spec-feature.md` |
| Data | 2026-04-22 |
| Veredicto | **AMARELO** |
| Score | **78 / 100** |

**Nota de processo:** subagente `spec-reviewer` indisponível (limite API). Esta revisão foi feita no modo adversarial manual, seguindo os gates de `references/quality-gates.md` (análogo).

## 1. Estrutura e completude

| Critério | Status |
|----------|--------|
| Visão, glossário, RF, regras, casos de borda | OK |
| Contrato de persistência e sincronia `timeSegments` × `cardTimeState` | OK — ponto crítico bem declarado (RNB-02) |
| Riscos e verificabilidade (testes) | OK |
| O QUÊ vs COMO | OK — §6 ainda “sugere” proporcional; aceitável como critério de saída se o IPD fechar uma função única |

## 2. Problemas e lacunas (severidade)

### M1 — Média: lacuna **§6 × workingHours / split** (TSD admite)
- A spec declara corretamente que redistribuição proporcional pode conflitar com expediente e meia-noite. **Ação:** fase **architect** ou refinamento do IPD com decisão fechada **antes** do implementer. Não bloqueia veredicto verde, mas **bloqueia implementação** sem essa decisão.
- **Rastreio:** `spec-feature.md` §6 parágrafo final.

### M2 — Baixa: “máximo razoável” (RNB-03)
- TSD empurra teto para o IPD; OK para spec. Garantir que o planner traga número ou regra (ex. cap por período).

### M3 — Baixa: conflito SHA (RNB-05)
- Mencionado; planner deve amarrar UX (retry) — já sugerido na spec.

## 3. Rastreio ao código (spot-check)

- `HoursView` + `aggregateTaskHoursForPeriod` + R09: alinhado ao TSD.
- `appendNewSegments` + `timeBridge`: suporta a exigência de manter `completed` e `timeSegments` coerentes após qualquer ajuste manual.

## 4. Conclusão e gates

- **Aprovado com ressalvas** (AMARELO / 78): nenhum gap que invalide a spec; a ressalva M1 exige **decisão arquitetural/plano** explícita.
- **Recomendação de pipeline:** executar **architect** (ou planner com ADR curto se time quiser pular architect formal) **antes** de `planner` fechar o mapa de alterações.

## 5. Próxima fase

- **Solicitar** `architect` com foco: função de domínio de redistribuição de duração em `timeSegments` + atualização de `cardTimeState[cardId].completed` com invariantes de `timeEngine` e `BoardWorkingHours`.
- Se architect concluir que é só ajuste local sem ADR, registrar em `state.yaml` em `decisions`.
