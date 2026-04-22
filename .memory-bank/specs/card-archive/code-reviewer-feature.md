# Code Review Report — card-archive (feature)

**Data:** 2026-04-22  
**Agente:** code-reviewer  
**Módulos aplicados:** qualidade e corretude (primário), desempenho (notas), segurança (perimetro inalterado)  
**Rastreabilidade:** TSD `spec-feature.md` §4–7, IPD `planner-feature.md` §4.3; código em `domain/*`, `BoardView.tsx`, `CreateTaskModal.tsx`, `ColumnEditorModal.tsx`, `SearchModal.tsx`  

**Contexto:** TypeScript / React, cliente FlowBoard, persistência JSON + GitHub (mesmo modelo de confiança já existente).

---

## Veredito

**Aprovado para merge (0 achados críticos).** A implementação cobre o happy path do TSD: flags em `Card`, `mergeLayoutCardsWithArchived` pós-DnD, `applyArchiveToTimeState` alinhado a `in_progress` → conclusão com `materializeCountableIntervals`, busca com `archived` no resultado, badge e secção de Arquivados, R-UX01 no editor de colunas.

Há **1 achado maior** (integridade de tempo em dado/estado anómalo) e alguns **médios/baixos**; nada bloqueia merge sob política “zero críticos”.

**Score:** 84 / 100  

---

## Achados por severidade

### Crítico

*Nenhum.*

---

### Maior (Major)

**[M1] [Corretude / tempo] `applyArchiveToTimeState` no-op se coluna for desconhecida, com arquivamento a prosseguir**

**LOCALIZAÇÃO:** `timeEngine.ts` — `applyArchiveToTimeState` (retorno antecipado se `!role`); `BoardView.tsx` — `handleArchiveCard` (sempre grava `archived` após chamar a função).

**PROBLEMA:** Se `cardColumnId` não existir em `columns` (`roleOf` → `undefined`), a função devolve o estado inalterado. O handler continua, marca o card arquivado e chama `appendNewSegments` / `writeTimeBoardStateToDoc`. Um segmento aberto (`activeStartMs`) nunca é materializado em `completed`. De seguida, `reconcileTimeStateWithCardPositions` limpa `activeStartMs` para cards arquivados **sem** acrescentar segmentos, o que viola a intenção de §4.2/CA04 se existir trabalho contável em aberto nesse estado (ex.: `columnId` órfão por JSON corrompido ou edição manual).

**EVIDÊNCIA:**

```83:86:apps/flowboard/src/domain/timeEngine.ts
  const role = roleOf(columns, cardColumnId)
  if (!role) {
    return { ...state }
  }
```

```115:120:apps/flowboard/src/domain/timeEngine.ts
    if (isCardArchived(card)) {
      const c = ensureCard(next, card.cardId)
      if (c.activeStartMs !== undefined) {
        c.activeStartMs = undefined
```

**CORREÇÃO (defensiva, uma das):** (a) se `!role` e existir `state[cardId].activeStartMs`, aplicar a mesma materialização que no ramo `in_progress` (reutilizando `materializeCountableIntervals` + `nowMs`/`wh`); ou (b) recusar arquivar na UI/validar `columnId` contra `doc.columns` e mostrar erro; ou (c) mapear coluna inexistente para o papel de reconciliação segura antes de arquivar.

**JUSTIFICATIVA:** TSD §4.2 exige fecho contável ao arquivar com timer em `in_progress`; a combinação “sem papel resolvido + segmento aberto” não pode descartar tempo silenciosamente.

---

### Médio

**[E1] [UX / consistência] Cache da busca pode desfasar o badge "Arquivado"**

**LOCALIZAÇÃO:** `SearchModal.tsx` — `boardCache` (TTL 1h).

**PROBLEMA:** Após arquivar no quadro, o modal de busca pode ainda servir o documento em cache e não refletir `archived`/`archivedAt` nem o badge, enfraquecendo R-SEARCH01 até reabrir fora de TTL ou invalidar cache.

**CORREÇÃO:** Invalidar `boardCache` para a chave do quadro ao concluir operações de arquivar/desarquivar (callback global ou `clearSearchModalBoardCache` a partir do shell), ou reduzir TTL para eventos conhecidos.

**JUSTIFICATIVA:** Resultado de busca deve ser coerente com o documento ativo do utilizador após ações de arquivo.

**[E2] [Código] `commitAfterDrag` usa `timeState` do fecho em vez de ref**

**LOCALIZAÇÃO:** `BoardView.tsx` — `commitAfterDrag` (`let nextTime = applyCardMove(timeState, …)`).

**PROBLEMA:** Há `timeStateRef` noutros fluxos; o drag lê o estado de render, que em teoria pode ficar ligeiramente desfasado de refinamentos de tempo assíncronos. Risco baixo, mas a inconsistência de padrão pode causar aresta em carga/intervalos de reconciliação.

**CORREÇÃO:** Usar `timeStateRef.current` como origem (e opcionalmente alinhar após com `reconcile` se necessário), ou documentar a decisão de escopo mínimo.

**JUSTIFICATIVA:** Mesma fonte de verdade que `handleDeleteCard` / IIFE de persistência.

---

### Menor

**[B1] [Testes] Idempotência de “arquivar de novo” na UI** — coberto por early-return em `handleArchiveCard` e por teste de `applyArchiveToTimeState` re-aplicado; não se viu teste de integração explícito de “duplo clique/dupla submissão” com `archived` já `true` além do domínio.

**[B2] [Acessibilidade] Resultado de busca** — badge e metadados estão alinhados a R-SEARCH01; a linha ainda depende de emojis discretos na meta (já padrão do ficheiro), sem regressão desta feature.

---

### Segurança

*Sem achados novos.* PAT/sessão e GitHub: mesmo modelo; sem novas superfícies de injeção; Markdown em `CreateTaskModal` continua com `safeMarkdownUrlTransform` (http(s)/fragment).

---

### Desempenho

*Sem problemas além do esperado.* `searchCards` e filtros de cartões permanecem O(n) sobre `cards[]`; arquivados no mesmo array (TSD §6.2) evitam segunda ida à rede, coerente com NFR 9.1.

---

## Resumo

| Campo | Valor |
|--------|--------|
| Total de achados (acionáveis) | 4 |
| Críticos | 0 |
| Maiores | 1 |
| Médios | 2 |
| Menores / info | 2 |
| **Recomendação** | **APROVAR** (0 críticos; tratar M1 em follow-up P1 se dados anómalos forem plausíveis) |
| Correção prioritária | Endurecer `applyArchiveToTimeState` (ou validação de `columnId`) quando `activeStartMs` existir e `role` for indeterminado |

---

## Metadados (JSON)

```json
{
  "agent": "code-reviewer",
  "status": "complete",
  "modules_loaded": ["quality", "performance", "security"],
  "findings_total": 4,
  "findings_critical": 0,
  "findings_high": 1,
  "findings_medium": 2,
  "findings_low": 2,
  "recommendation": "APROVAR",
  "priority_fix": "applyArchiveToTimeState + columnId desconhecido: não perder segmento aberto (materializar ou bloquear arquivo)",
  "report_path": ".memory-bank/specs/card-archive/code-reviewer-feature.md"
}
```
