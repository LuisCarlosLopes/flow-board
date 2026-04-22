# IPD: Arquivar card — área de arquivados e busca — v1.0

> Confiança: 88/100 | Complexidade: M | Data: 2026-04-22  
> Track da Squad: FEATURE | Slug: card-archive | Subtask ID: null  
> Artefato Canônico: `.memory-bank/specs/card-archive/planner-feature.md`

---

## 1. MISSÃO

**Objetivo:**  
Implementar arquivamento de cards (flags e timestamps no modelo, operação de domínio com fechamento de tempo alinhado a §4.2 do TSD), filtrar arquivados do Kanban e do DnD, área de Arquivados com restaurar e excluir, busca existente incluindo arquivados com indicação visual, e testes de domínio (e E2E seletivo) — **sem** alterar o contrato de persistência além de campos opcionais em `Card`, conforme TSD v1.0 e ADR-002/008.

**Contexto de Negócio:**  
Reduzir ruído no quadro sem perder histórico nem rastreio de horas: cards arquivados saem da vista Kanban mas permanecem no JSON, na busca e no relatório de horas; o utilizador recupera ou apaga a partir de Arquivados com as mesmas garantias de higiene que a exclusão atual.

---

## 2. ESTADO ATUAL DO SISTEMA

### 2.1 Estrutura de Arquivos Relevante

```
apps/flowboard/
├── src/
│   ├── domain/                    ← ZONA DE TRABALHO (modelo, layout, busca, tempo)
│   │   ├── types.ts
│   │   ├── boardLayout.ts
│   │   ├── cardSearch.ts
│   │   ├── timeEngine.ts
│   │   └── workingHours.ts      ← usado indiretamente (materialize intervals)
│   ├── features/
│   │   ├── app/
│   │   │   ├── AppShell.tsx      ← orquestra BoardView + SearchModal (revisar só se necessário)
│   │   │   ├── SearchModal.tsx
│   │   │   └── SearchModal.css
│   │   └── board/
│   │       ├── BoardView.tsx
│   │       ├── BoardView.css
│   │       ├── CreateTaskModal.tsx
│   │       ├── ColumnEditorModal.tsx
│   │       └── timeBridge.ts     ← appendNewSegments, writeTimeBoardStateToDoc
│   └── infrastructure/persistence/
│       ├── types.ts
│       └── boardRepository.ts   ← parse tolerante; sem mudança obrigatória de parse
```

### 2.2 Stack e Convenções Detectadas

| Dimensão | Valor Detectado |
|---|---|
| Linguagem/Versão | TypeScript ~6.0, `strict` implícito no ecossistema Vite |
| Framework | React 19, Vite 8 |
| UI / lista | @dnd-kit, @tanstack/react-virtual em `BoardView` |
| Padrão de Teste | Vitest + Testing Library (`*.test.ts` / `*.test.tsx`); E2E Playwright em `apps/flowboard/tests/e2e/` |
| Erro / persistência | `GitHubHttpError` 409 + reload em `saveDocument`; mensagens em PT na UI |
| Padrão de Naming | `camelCase` funções, `PascalCase` componentes, tipos em `types.ts` |

### 2.3 Contratos que NÃO Podem Quebrar

- `BoardDocumentJson` permanece com `schemaVersion: 1`, `cards: Card[]` no mesmo array; `CatalogEntryJson.archived` continua a significar **quadro** no catálogo, nunca card.
- `parseBoard` em `boardRepository.ts` não exige campos por card além do que o JSON já carrega; novos campos em `Card` são opcionais.
- `scoreCard` / ordenação de `searchCardsWithTotal` (score, `createdAt`, `cardId`) — apenas **estender** o mapeamento para `CardSearchResult` com `archived?: boolean`, sem alterar a fórmula de pontuação (TSD §5.2, RF04).
- Fluxo 409 e reload após conflito em `saveDocument` (CA07) — manter; não introduzir tipo de falha HTTP novo.
- Exclusão de card: hoje remove card de `cards`, limpa `timeState[cardId]` e `cardTimeState[cardId]`, anexos via `deleteRepoPathIfExists` — a exclusão de arquivado deve reutilizar a mesma sequência lógica (RF09, CA05).

```typescript
// Padrão observado (BoardView) — exclusão, preservar intenção de higiene
nextDoc.cards = nextDoc.cards.filter((c) => c.cardId !== id)
delete nextTime[id]
delete nextDoc.cardTimeState[id]
writeTimeBoardStateToDoc(nextDoc, nextTime)
// + appendNewSegments quando transitório de tempo fechado, etc.
```

- `applyCardMove` (in_progress → done) já encerra segmento aberto com `materializeCountableIntervals` — a lógica de arquivar com timer aberto deve ser **equivalente** a esta transição (TSD §4.2, CA04), não reimplementar fórmulas soltas fora de `timeEngine` / `workingHours`.

### 2.4 Módulo de Referência

- **Movimentação e tempo:** `apps/flowboard/src/domain/timeEngine.ts` + `timeEngine.test.ts` — padrão para fechar trabalho contável.
- **Layout e ordem por coluna:** `apps/flowboard/src/domain/boardLayout.ts` + `boardLayout.test.ts`.
- **Busca:** `apps/flowboard/src/domain/cardSearch.ts` + `cardSearch.test.ts` e `SearchModal.test.tsx`.

---

## 3. DEFINIÇÃO DE PRONTO (DoD)

A feature está **COMPLETA** apenas quando:

- [ ] **Funcional:** RFs e CAs do TSD v1.0 (§3, §7) verificáveis: arquivar, ocultar de Kanban/DnD, Arquivados com restaurar e excluir, busca com arquivados e indicação visual, tempo ao arquivar com segmentos coerentes, legado sem `archived` tratado como não arquivado.
- [ ] **Compilação:** `pnpm exec` / `npm run build` no pacote `flowboard` sem erro de tipo.
- [ ] **Testes existentes:** suites atuais não quebram.
- [ ] **Novos testes:** cobertura acordada na Seção 6 (domínio obrigatório; E2E conforme risco).
- [ ] **Lint:** `npm run lint` (ou script do pacote) sem novos problemas no escopo alterado.
- [ ] **Edge cases (TSD §7.3):** idempotência de arquivar/restaurar; nenhum card arquivado “sumir” de `doc.cards` após drag; conflito 409 inalterado; card inexistente sem corrupção (CA06).

---

## 4. ESPECIFICAÇÃO DE IMPLEMENTAÇÃO

### 4.1 Contrato da Feature

Não há API REST nova. O contrato é **documento JSON + funções de domínio** e extensão opcional de resultado de busca.

```
INPUT (operações de domínio puras, a serem invocadas a partir de BoardView / modais):
  archiveCard:
    documento: BoardDocumentJson, cardId, nowMs, columns, timeState, workingHours
    pré: card existe, não arquivado (ou idempotente se já arquivado — V01, CA08)
    efeito: set archived / archivedAt; fechar timer se in_progress + activeStartMs (§4.2); materializar segmentos + append em timeSegments via fluxo existente (appendNewSegments)
  unarchiveCard:
    limpar flags de arquivamento; preservar columnId; reconciliar tempo com reconcileBoardTimeState após gravação em memória
  listArchivedCards / ordenação:
    default §10 Q1: archivedAt desc; fallback createdAt / cardId

INPUT (UI):
  Ação explícita "Arquivar" no contexto do quadro (cartão) e, por default TSD Q2, no modal de edição quando o mesmo fluxo de domínio for chamado.
  Restaurar / Excluir na área Arquivados.

OUTPUT:
  BoardDocumentJson + TimeBoardState atualizados, persistidos com saveBoard existente.
  CardSearchResult pode incluir archived?: boolean para [R-SEARCH01].
```

### 4.2 Fluxo de Execução

```
1. Estender tipos: Card com archived?: boolean, archivedAt?: string (ISO 8601) — TSD §6.2
2. Dominio: isCardArchived(card) — tratar ausente/false como ativo
3. layout Kanban: buildItemsRecord(columns, filter(cards, não arquivado)) CUIDADO: ver passo 6
4. Arquivar: validar V01; fechar tempo como in_progress→done se aplicável; set flags e timestamps; writeTimeBoardStateToDoc; appendNewSegments; persistir
5. Qualquer path que chame itemsRecordToCards: reconstruir doc.cards = cards ordenados do layout + manter entradas arquivadas (merge estável) — nunca descartar arquivados
6. Drag end: partindo do mapa só com ativos, após itemsRecordToCards fazer merge com lista de arquivados do passo anterior
7. Unarchive: limpar flags; persistir; opcionalmente reconcile board time
8. Excluir arquivado: mesmo pipeline que handleDeleteCard hoje
9. Busca: manter iteração sobre doc.cards completo; mapear archived no resultado; UI: badge
10. ColumnEditorModal: contagem por coluna exclui arquivados (R-UX01)
```

### 4.3 Mapa de Alterações

| Ação | Arquivo | O que muda | Motivo |
|------|---------|------------|--------|
| MODIFICAR | `apps/flowboard/src/domain/types.ts` | Acrescentar `archived?`, `archivedAt?` em `Card` | TSD §6.2, RF06 |
| CRIAR | `apps/flowboard/src/domain/cardArchive.ts` | Helpers: `isCardArchived`, `activeCardsForLayout`, `sortArchivedByDefault`, e **função de merge** `mergeLayoutCardsWithArchived` (ou nome equivalente) que combina o resultado de `itemsRecordToCards` com os cards cujo `archived` é verdadeiro, preservando ordem estável dos arquivados | Regra de agregação em módulo de domínio testável; evita perder arquivados no drag (descoberta crítica no repo) |
| CRIAR | `apps/flowboard/src/domain/cardArchive.test.ts` | Testes: merge, idempotência de flags, ordenação default | CA08, CA12, Q1 |
| MODIFICAR | `apps/flowboard/src/domain/timeEngine.ts` | Nova função exportada, p.ex. `applyArchiveToTimeState`, reutilizando a mesma lógica de fechamento que `in_progress` → `done` (`materializeCountableIntervals`, clear `activeStartMs`) quando aplicável; documentar ligação a §4.2 | RF07, CA04; sem duplicar fórmulas em UI |
| MODIFICAR | `apps/flowboard/src/domain/timeEngine.test.ts` | Casos: arquivar com segmento aberto; arquivar sem; idempotência | TSD §4.2, CA08 |
| MODIFICAR | `apps/flowboard/src/domain/boardLayout.ts` | Opcional: função delgada p.ex. `buildKanbanItemsRecord` que delega a `buildItemsRecord` com `activeCardsForLayout` **ou** manter `buildItemsRecord` inalterada e filtrar só nas chamadas — preferir **uma** abordagem documentada e testada | RF02, CA01, CA09 |
| MODIFICAR | `apps/flowboard/src/domain/boardLayout.test.ts` | Cenário com mix ativo/arquivado no `itemsMap` (se exposto) e/ou testes de integração com helpers de `cardArchive` | Regressão de layout |
| MODIFICAR | `apps/flowboard/src/domain/cardSearch.ts` | `CardSearchResult` com `archived?: boolean`; preencher a partir de `card.archived` no loop de `searchCardsWithTotal` | RF04, R-SEARCH01, §5.2 |
| MODIFICAR | `apps/flowboard/src/domain/cardSearch.test.ts` | Resultado com `archived: true` para cards arquivados; score inalterado | CA03 |
| MODIFICAR | `apps/flowboard/src/infrastructure/persistence/types.ts` | Nenhuma alteração estrutural obrigatória de `BoardDocumentJson` (cards já `Card[]`); confirmar re-export se o projeto reexporta tipos | Compilação; Card já vem de domain |
| MODIFICAR | `apps/flowboard/src/features/board/BoardView.tsx` | `itemsMap` a partir de cards não arquivados; `commitAfterDrag` e qualquer caminho que reconstrói `nextDoc.cards` **usa merge** de arquivados; handlers `handleArchive`, `handleUnarchive` (e exclusão reutilizando padrão de `handleDeleteCard` para arquivado); secção/toggle UI "Arquivados" (ordenação Q1); garantir DnD só sobre ids ativos; alinhar `reconcile`/`appendNewSegments` no fluxo de arquivar | RF01–RF03, RF07, CA01, CA04, CA09 |
| MODIFICAR | `apps/flowboard/src/features/board/BoardView.css` | Estilos mínimos da área Arquivados e, se necessário, botão Arquivar no cartão | Acessibilidade visual consistente com o board |
| MODIFICAR | `apps/flowboard/src/features/board/CreateTaskModal.tsx` | Ação "Arquivar" no modo edição (default Q2) chamando o mesmo contrato de domínio do pai; quando `editingCard` arquivado, fluxo coerente com RF05 (restaurar/excluir acessíveis conforme TSD) | RF01, RF05, Q2–Q3 |
| MODIFICAR | `apps/flowboard/src/features/board/CreateTaskModal.css` | Estilo do botão/ação de arquivar, se necessário | Consistência UI |
| MODIFICAR | `apps/flowboard/src/features/board/ColumnEditorModal.tsx` | Contagem `cards.filter(...)` na remoção de coluna **excluir** `isCardArchived` (R-UX01) | R-UX01 |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.tsx` | Badge ou texto "Arquivado" nos resultados quando `result.archived` | R-SEARCH01 |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.css` | Estilo do badge | UX |
| MODIFICAR | `apps/flowboard/src/features/app/SearchModal.test.tsx` | Ajuste/assercões para flag `archived` se visível no DOM (data-testid se o projeto adotar) | Regressão |
| NÃO TOCAR | `apps/flowboard/src/infrastructure/persistence/boardRepository.ts` | `parseBoard` continua a aceitar o documento; sem validação rígida por campo de card | TSD: defaults de leitura; ADR-008 |
| NÃO TOCAR | `apps/flowboard/src/features/hours/HoursView.tsx` | Relatório já usa `timeSegments` / agregados; histórico de arquivados permanece (CA10) — a menos que contagem de cards por coluna apareça aqui (verificar; se sim, alinhar exclusão) | TSD 2.3 — só revisar se evidência de bug |
| CRIAR (opcional) | `apps/flowboard/tests/e2e/card-archive.spec.ts` | Smoke: arquivar → não aparece na coluna; aparece em Arquivos; busca encontra; restaurar | Quando o executor avaliar risco; não obrigatório para fechar se Vitest cobrir o núcleo |

> ⚠️ Arquivos fora desta tabela **não** devem ser alterados, salvo **correção** se `HoursView` (ou outro consumidor) contar `cards` por coluna com a mesma lógica desatualizada — aí: uma linha adicional e justificativa no relatório do executor.

### 4.4 Dependências

```json
{
  "novas_libs": [],
  "libs_existentes_usadas": [
    "react@^19",
    "@dnd-kit/core@^6",
    "@dnd-kit/sortable@^10",
    "vitest@^4"
  ],
  "migrations_necessarias": false,
  "nota_migração": "Migração lógica: campos opcionais em JSON; sem script ETL (TSD §6.3).",
  "variaveis_de_ambiente_novas": []
}
```

---

## 5. GUARDRAILS DE IMPLEMENTAÇÃO

- ❌ Confundir `CatalogEntryJson.archived` (quadro) com `Card.archived`.
- ❌ Filtrar arquivados do array passado a `searchCards` — a busca deve ver **todos** os cards (RF04).
- ❌ Chamar `itemsRecordToCards` e atribuir a `nextDoc.cards` **sem** reanexar cards arquivados.
- ❌ Duplicar lógica de `materializeCountableIntervals` fora de `timeEngine` / `workingHours` para o caso de arquivar.
- ❌ Introduzir `any` em novos contratos; manter `Card` e `CardSearchResult` tipados.
- ❌ Instalar dependências ou alterar `package.json` sem aprovação fora do escopo.
- ❌ Expandir o escopo a FE01–FE05 (TSD §8).
- ❌ Modificar fórmula de `scoreCard` (apenas metadado `archived` no resultado).

---

## 6. TESTES A IMPLEMENTAR

**Domínio (Vitest) — prioridade 1**

```
describe('cardArchive', () => {
  it('trata legado sem archived como não arquivado')
  it('mergeLayoutCardsWithArchived preserva todos os arquivados após reordenação do layout ativo')
  it('ordena arquivados por archivedAt desc com fallback (Q1)')
})
describe('timeEngine / applyArchiveToTimeState', () => {
  it('in_progress com activeStartMs: materializa completed e zera activeStartMs (CA04)')
  it('não in_progress: não inventa segmentos; só limpa activeStartMs se houver')
  it('re-arquivar (idempotente) não duplica completed (CA8)')
})
describe('cardSearch', () => {
  it('inclui card arquivado no resultado com archived: true e score inalterado')
})
describe('boardLayout (+ cardArchive integrado)', () => {
  it('mapa de items só contém actives; doc.cards completo mantém arquivados')
})
```

**UI (Testing Library) — ajuste de `SearchModal.test.tsx` e, se o executor adicionar, testes mínimos de `CreateTaskModal` para ação de arquivar (mocks de `onSubmit` / handlers).

**E2E (Playwright) — opcional** linha no mapa 4.3: um fluxo feliz de arquivar e buscar.

---

## 7. RISCOS, ASSUNÇÕES E PONTOS DE ATENÇÃO

### 7.1 Riscos e Pontos de Atenção

- **Inconsistência de `doc.cards` após drag (perda de arquivados)** — impacto: corrupção funcional grave — mitigação: função de merge no domínio, teste dedicado, revisão de todos os atribulamentos a `nextDoc.cards` em `BoardView`.
- **Divergência de fechamento de tempo vs. mover para "Concluído"** — impacto: horas erradas no relatório — mitigação: reutilizar o mesmo caminho algorítmico que `applyCardMove` para in_progress → done; testes de `timeEngine` com `timeSegments` / `appendNewSegments` em memória.
- **Flicker de estado 409** — já existente; não alterar sem necessidade (CA07).

### 7.2 Assunções Não-Bloqueantes (TSD §10)

| # | Assunção residual | Default adotado | Impacto se estiver errada |
|---|------------------|-----------------|---------------------------|
| A1 | Ordenação na lista Arquivados | `archivedAt` desc, fallback `createdAt` / `cardId` (Q1) | Reorganizar UI |
| A2 | Onde colocar ações Arquivar / Restaurar | Cartão + modal de edição (Q2–Q3) | Remover duplicata de um dos lados |
| A3 | E2E | Opcional se Vitest for suficiente | Complementar com Playwright depois |

**Decisões bloqueantes em aberto:** 0 (alinhado ao TSD e ao spec-reviewer).

---

## 8. PROTOCOLO DE AUTO-CORREÇÃO

```
VERIFICAÇÃO 1 — Compilação: build e tipos do pacote flowboard
VERIFICAÇÃO 2 — Contratos: scoreCard inalterada; 409 inalterado; parseBoard aceita documento
VERIFICAÇÃO 3 — Escopo: apenas arquivos do mapa; HoursView tocado só com evidência
VERIFICAÇÃO 4 — DoD: RFs, merge drag, testes de domínio passando
```

---

## 9. FORMATO DE ENTREGA DO EXECUTOR

O executor finaliza com o bloco exigido pelo template `planner` (arquivos tocados, decisões, fora de escopo, checklist DoD).

---

## 10. METADADOS

| Campo | Valor |
|---|---|
| Confiança do Plano | 88/100 |
| Track da Squad | FEATURE |
| Slug | card-archive |
| Artefato Canônico | `.memory-bank/specs/card-archive/planner-feature.md` |
| Complexidade Estimada | M |
| Módulo de Referência | `timeEngine.ts`, `boardLayout.ts`, `cardSearch.ts` |
| Total de Arquivos Impactados (criar+modificar, faixa) | 15–18 |
| Requer Migration de Banco | Não (JSON + defaults de leitura) |
| Decisões Bloqueantes em Aberto | 0 |
| Assunções Não-Bloqueantes Documentadas | 3 (Q1–Q3) |
| Versão do IPD | v1.0 |
| Autor | planner (subagent) |

**Decision Register (resumo):** ambiguidades de produto fechadas no TSD; decisão de implementação crítica **merge pós-`itemsRecordToCards`** resolvida no plano com módulo `cardArchive` e teste explícito; nenhum bloqueio remanescente.

**Próximos passos sugeridos:** `plan-reviewer` → `task-breakdown` / implementer.

**Sugestões fora de escopo (não implementar agora):** arquivamento em massa, filtros avançados em Arquivados, notificações (TSD §8).

---

## Contagem do mapa de alterações (Seção 4.3)

- **Linhas de dados na tabela** (excl. cabeçalho e notas de rodapé): **21**
