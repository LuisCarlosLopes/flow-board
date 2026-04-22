# Tester report — card-archive

> Data: 2026-04-22 | Agente: tester | Stack: Vitest 4 + Testing Library (happy-dom)

## Stack detectada

| Campo | Valor |
|-------|--------|
| Runner | `pnpm exec vitest run` (apps/flowboard) |
| Estilo | `describe` / `it`, RTL `render` + `userEvent` onde necessário |
| Ficheiros de teste afetados pela feature | `cardArchive.test.ts`, `boardLayout.test.ts`, `timeEngine.test.ts`, `cardSearch.test.ts`, `SearchModal.test.tsx` |

## Evidência de execução (DoD)

- **273 testes passando** em **25 ficheiros** (execução local ~3s de testes).
- Conforme `implementer-feature.md`: regressões gerais do pacote + testes novos/alterados para card-archive; **E2E Playwright não** incluído nesta entrega (DoD marca E2E opcional como adiado).

Evidência alinha o critério **“Testes novos + regressões”** do IPD; a lacuna consciente é **E2E opcional**, não um falhanço de Vitest.

## Mapa: critérios de aceite (§7) → testes existentes

| CA | Resumo (spec §7) | Evidência em testes | Confiança |
|----|------------------|----------------------|-----------|
| **CA01** | Card some de todas as colunas e permanece no quadro (área arquivados) | `activeCardsForLayout` exclui arquivados; `buildKanbanItemsRecord` omite arquivados das colunas; `mergeLayoutCardsWithArchived` preserva arquivados após reordenação de ativos | **Média–alta** (domínio + merge pós-DnD; sem `BoardView` unitário) |
| **CA02** | Restaurar repõe na coluna do `columnId` | **Lacuna** — nenhum teste automático do fluxo restaurar; apenas invariantes de layout genéricas | **Baixa** (aceitação por revisão manual / futuro E2E ou teste de integração) |
| **CA03** | Busca continua a devolver arquivados (título, etc.) | `cardSearch.test.ts` `archived metadata`; critérios gerais de `searchCards` em `cardSearch.test.ts` | **Alta** |
| **CA04** | Timer em in_progress: fechar tempo até o instante de arquivar | `timeEngine.test.ts` `applyArchiveToTimeState` — incl. rótulo CA04, expediente, idempotência de segmento | **Alta** |
| **CA05** | Excluir arquivado remove rasto como exclusão normal | **Lacuna** — sem teste dedicado a exclusão de card arquivado (domínio ou UI) | **Baixa** |
| **CA06** | Operação em card inexistente: seguro / sem corromper JSON | **Lacuna** — não coberto em teste com assert explícito | **Baixa** |
| **CA07** | 409: comportamento existente (retry/recarregar) | **Lacuna** — fluxo de persistência/GH; fora do escopo dos ficheiros de teste card-archive | **N/A (manual/pipeline existente)** |
| **CA08** | Re-arquivar: não duplicar `timeSegments` nem corromper `archivedAt` | `re-aplicar com activeStartMs já limpo não duplica completed`; **parcial** — não assere `archivedAt` inalterado | **Média** (tempo); **gaps** em metadados de arquivo |
| **CA09** | Arquivado fora de listas de coluna e DnD | `buildKanbanItemsRecord` + `reconcileTimeStateWithCardPositions` (arquivado em in_progress limpa `activeStartMs`) | **Alta** (domínio; DnD completo depende de integração) |
| **CA10** | Relatório de horas continua a refletir segmentos históricos | **Lacuna** — nenhum teste em `HoursView` / agregação para card arquivado; domínio preserva `completed` | **Média** (inferido por `timeEngine`, não provado no relatório) |
| **CA11** | Busca → selecionar arquivado → modal coerente (ações restaurar/excluir/editar conforme UX) | **Lacuna principal** — `SearchModal.test.tsx` cobre **badge** e `onSelectResult` para card **ativo**; **não** há teste do modal de tarefa aberto a partir de hit arquivado nem de botões restaurar/excluir | **Baixa** — candidato a **E2E** ou teste de integração Board + modal |
| **CA12** | Restaurar card não arquivado é no-op | **Lacuna** | **Baixa** |
| **CA13** | JSON legado sem `archived` / `archivedAt`: todos não arquivados | `cardArchive.test.ts` “treats legacy without archived as not archived” | **Alta** |

**R-UX01** (contagens por coluna excluem arquivados no editor): implementado em `ColumnEditorModal.tsx` com `!isCardArchived(c)`; **sem teste automático** dedicado.

## Lacunas resumidas

1. **CA11** — fluxo ponta a ponta busca → seleção → `CreateTaskModal` / ações de arquivado: não coberto por Vitest.
2. **CA02, CA05, CA06, CA12** — restaurar, excluir arquivado, no-op, card inexistente: sem prova automatizada explícita.
3. **CA10** — camada de relatório de horas: não testada para arquivados.
4. **CA07** — conflito 409: assume comportamento global do app, não revalidado aqui.
5. **E2E (§7.3 e DoD “E2E opcional”)** — não existem `*.spec.ts` para card-archive em `apps/flowboard/tests/e2e/` (há e2e para outras features).

## Recomendação: smoke Playwright (opcional)

- **Uma** spec enxuta (`card-archive.spec.ts` ou cenário em ficheiro existente) com: abrir quadro (ou fixture), arquivar card, verificar desaparece da coluna, abrir “Arquivados”, restaurar, opcionalmente busca + abrir a partir do resultado. Priorizar **seleção a partir da busca com card arquivado (CA11)** se o time quiser fechar a lacuna de maior risco de regressão.
- Manter o smoke **curto** (happy path) para não duplicar cobertura já forte em domínio + `SearchModal` RTL.

## Testes adicionais criados por este passo

- **Nenhum** — lacunas documentadas; nenhum gap considerado “crítico bloqueador” dado o DoD e a cobertura de domínio.

## Ficheiros de evidência (card-archive)

| Ficheiro | Papel |
|----------|--------|
| `domain/cardArchive.test.ts` | CA01 (parcial), CA13, ordenação arquivados |
| `domain/boardLayout.test.ts` | CA01/CA09 — Kanban sem arquivados |
| `domain/timeEngine.test.ts` | CA04, CA08 (parcial), CA09 (reconciliação) |
| `domain/cardSearch.test.ts` | CA03, R-SEARCH01 (metadado) |
| `features/app/SearchModal.test.tsx` | CA3/R-SEARCH01 badge; não CA11 completo |

---

**Síntese para orquestrador:** cobertura **forte** em domínio (layout, tempo, busca, legado) e **RTL parcial** em busca; **lacunas** em fluxo UI completo (CA11), restaurar/excluir (CA02/05/12), relatório (CA10) e E2E. Vitest alinha o DoD de regressões; E2E opcional permanece documentado como adiado.
