# TBRD v1.0 — Task Breakdown & Rollout Document
## Board Search Feature Implementation

**Date:** 19 de abril de 2026  
**Source:** IPD v1.0 (95/100) + TSD v1.0 (87/100)  
**Prepared by:** Task-Breakdown Agent  
**Target:** Implementer Squad (React, TypeScript, Vitest, Playwright)  
**Status:** 🟢 Ready for Implementation

---

## 1. Visão Geral (Overview)

### Objetivo da Feature

Implementar componente de **busca modal de cards** que permite usuários localizarem rapidamente cards por título/descrição no board ativo, com atalho de teclado `/` (global) e navegação visual (scroll + highlight).

**Impacto Esperado:**
- Antes: ~30s de busca manual (scrolling colunas)
- Depois: <1s com busca indexada + navegação direta

### Stack & Dependências

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | ^19.2.4 | SPA components + hooks |
| TypeScript | ~6.0.2 | Type safety (strict mode) |
| Vitest | ^4.1.4 | Unit tests (domínio + componentes) |
| Playwright | ^1.57.0 | E2E tests (fluxo completo) |
| happy-dom | (Vitest) | DOM rendering em testes |
| ESLint | ^9.39.4 | Code quality (flat config) |
| Vite | ^8.0.4 | Build + dev server |

### Arquivos Afetados (Summary)

**Criar (8 novos):**
- `src/domain/cardSearch.ts` — Lógica pura de busca + score
- `src/domain/cardSearch.test.ts` — 80+ testes unitários
- `src/features/app/SearchModal.tsx` — Componente UI modal
- `src/features/app/SearchModal.css` — Estilos BEM
- `src/features/app/SearchModal.test.tsx` — Testes componente
- `src/hooks/useSearchHotkey.ts` — Hook atalho `/` global
- `src/hooks/useSearchHotkey.test.ts` — Testes hook
- `tests/e2e/board-search.spec.ts` — 8 cenários E2E (Playwright)

**Modificar (1 arquivo):**
- `src/features/app/AppShell.tsx` — Integração state + renderização modal

**Confirmar (0 mudanças obrigatórias):**
- `src/domain/types.ts` — `Card.description?: string` já existe ✅

### Estimativa Total

| Fase | Tasks | Tempo | Slack |
|------|-------|-------|-------|
| Domínio Puro | 1-2 | 2.5h | — |
| UI Base | 3-5 | 5.5h | — |
| Hook + Integração | 6-8 | 4h | — |
| E2E + Polish | 9-10 | 3.5h | — |
| **Total Bruto** | 10 | **15.5h** | — |
| **Com Slack (10%)** | — | — | **~17.5h** |

**Distribuição:** ~2-2.5 dias implementação pura, ou 3-4 dias com interrupções/revisões.

---

## 2. Glossário de Termos

| Termo | Definição |
|-------|-----------|
| **SearchModal** | Componente React que renderiza overlay modal com input busca + lista resultados. Reutilizável, controlado por estado `isOpen` em AppShell. |
| **cardSearch()** | Função pura domínio que filtra cards por query + retorna array `CardSearchResult[]` ordenado por score. |
| **CardSearchResult** | Type: `{ cardId, title, description?, columnId, score, columnLabel }` — resultado de uma busca. |
| **scoreCard()** | Função pura que calcula score 0-100 de um card vs query usando fórmula: title=100, description=50, date=10, hours=5. |
| **useSearchHotkey()** | Hook React que registra listener global `window.addEventListener('keydown')` para `/` e chama callback `onOpenSearch()`. Lida com guardas (inputs, modais abertos). |
| **AppShell** | Container React principal. Gerencia estado global `isSearchOpen`, `selectedBoardId`, renderiza topbar + BoardView. Integra SearchModal + hook. |
| **Board Ativo (selectedBoardId)** | ID do quadro kanban selecionado. Busca filtra somente cards deste board. |
| **BEM Naming** | CSS convention: `.fb-sm-*` (fb=FlowBoard, sm=SearchModal) para evitar conflitos. Ex: `.fb-sm-modal`, `.fb-sm-input`, `.fb-sm-results`. |
| **Acceptance Criteria (AC)** | Condição verificável que prova uma task concluída com sucesso. Deve ser específica, testável, não genérica. |
| **DoD (Definition of Done)** | Checklist squad de conclusão: build passa, tests ≥80%, lint 0 CRITICAL, sem memory leaks, E2E passa, documentação atualizada. |

---

## 3. Tasks Sequenciadas

### ⚠️ Dependência Gráfico

```
┌─ Task 1: cardSearch.ts ──┬─ Task 2: cardSearch.test.ts ──┐
│                           │                                │
├─────────────────────────────┬─ Task 3a: SearchModal        │
│                             │  (estrutura + input)         │
│                             ├─ Task 3b: SearchModal        │
│                             │  (resultados + nav)          │
│                             └──────────┬─ Task 4: CSS      │
│                                        └──────────┬─ Task 5: Modal Tests
│                             
├─ Task 6: useSearchHotkey.ts ── Task 7: Hook Tests ────┐
│                                                         │
└─────────────────────────┬─ Task 8: Integração AppShell ──┤
                          │                                │
                          └─ Task 9: E2E board-search ────┘
                                     │
                                     └─ Task 10: Code Review + Merge
```

---

### Task 1: cardSearch.ts — Função Pura de Busca

**Descrição:**
Implementar função pura `searchCards()` que filtra cards por query e retorna `CardSearchResult[]` ordenada por score. Nenhuma dependência de React, estado global ou side effects. Função base do domínio que todas outras camadas (UI, E2E) vão usar.

**Arquivos Envolvidos:**
- **Criar:** `src/domain/cardSearch.ts` (~80 linhas)
- **Referência:** `src/domain/types.ts` (Card type, já existe)

**Requisitos Técnicos:**
1. Exportar `searchCards(query: string, cards: Card[], boardId: string, maxResults?: number): CardSearchResult[]`
   - `query`: entrada usuário (pode conter espaços, caracteres especiais)
   - `cards`: array de cards para filtrar
   - `boardId`: para logging/debug (não afeta resultado)
   - `maxResults`: limite (default 100)
   
2. Exportar `scoreCard(card: Card, query: string): number`
   - Retorna score 0-100
   - Fórmula: `title match: +100, desc match: +50, date match: +10, hours match: +5`
   - Máximo: 100 (capped)
   - Case-insensitive: `.toLowerCase()` antes de comparação

3. Exportar type `CardSearchResult`
   ```typescript
   type CardSearchResult = {
     cardId: string
     title: string
     description?: string
     columnId: string
     score: number
     columnLabel?: string  // será preenchido em SearchModal (opcional aqui)
   }
   ```

4. Algoritmo:
   ```typescript
   // Pseudocode
   const query = input.toLowerCase().trim()
   if (query.length === 0) return []
   
   let results: CardSearchResult[] = []
   for (const card of cards) {
     const score = scoreCard(card, query)
     if (score > 0) {
       results.push({ cardId, title, description, columnId, score })
     }
   }
   
   // Sort by score DESC, then createdAt DESC, then cardId ASC
   results.sort((a, b) => {
     if (b.score !== a.score) return b.score - a.score
     if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt
     return a.cardId.localeCompare(b.cardId)
   })
   
   // Limit maxResults
   return results.slice(0, maxResults)
   ```

5. Validações:
   - Query vazio → retorna `[]`
   - Cards vazio → retorna `[]`
   - Card sem title → skip (title é obrigatório no type)
   - Card sem description → ok (opcional, score 0 para desc match)
   - Score overflow (múltiplos matches) → capped em 100

**Acceptance Criteria:**
1. ✅ Função `searchCards()` exportada, recebe `(query, cards, boardId?, maxResults?)` e retorna `CardSearchResult[]`
2. ✅ Função `scoreCard()` implementada com fórmula exata: title=100, desc=50, date=10, hours=5 (cap 100)
3. ✅ Type `CardSearchResult` definido com campos: cardId, title, description?, columnId, score
4. ✅ Case-insensitive: "TODO" e "todo" produzem mesmo resultado
5. ✅ Ordering: score DESC → createdAt DESC → cardId ASC (determinístico)
6. ✅ Limite 100 resultados respeitado; query vazio retorna `[]`
7. ✅ Zero console.logs, zero `any` types, TypeScript strict mode OK
8. ✅ Arquivo compila (`npx tsc -b`)

**Tempo Estimado:** 1h  
**Bloqueadores:** Nenhum  
**Responsável:** Implementer

---

### Task 2: cardSearch.test.ts — Testes Unitários (Vitest)

**Descrição:**
Implementar suite de testes Vitest com 80+ testes que validam `searchCards()` e `scoreCard()` em todos cenários: happy path, edge cases, validações, ordering, limit.

**Arquivos Envolvidos:**
- **Criar:** `src/domain/cardSearch.test.ts` (~150 linhas)
- **Dependência:** Task 1 (`cardSearch.ts`)

**Requisitos Técnicos:**
1. Framework: Vitest com `describe()`, `it()`, `expect()`
2. Mocks: Cards array com dados variados (título, desc, date, hours)
3. Cobertura ≥95% (domínio puro = fácil atingir)

**Test Suites:**

| Suite | Testes | Descrição |
|-------|--------|-----------|
| `scoreCard()` | 12+ | Happy path (title, desc, date, hours), case-insensitive, normalizações |
| `searchCards()` filtering | 15+ | Query match em title vs desc, combinações, case-insensitive, múltiplos matches |
| `searchCards()` ordering | 8+ | Score DESC, createdAt DESC, cardId ASC; tie-breaking |
| `searchCards()` edge cases | 20+ | Query vazio, cards vazio, sem description, sem createdAt, special chars, unicode |
| `searchCards()` limits | 8+ | Limite 100 resultados, >100 cards input, limit param override |
| Integration | 10+ | Full flow: dados reais → busca → esperado resultado |

**Exemplo Teste:**
```typescript
describe('scoreCard', () => {
  it('should score title match as 100', () => {
    const card: Card = { cardId: '1', title: 'Auth Module', columnId: 'col1' }
    const score = scoreCard(card, 'auth')
    expect(score).toBe(100)
  })
  
  it('should be case-insensitive', () => {
    const card: Card = { cardId: '1', title: 'TODO', columnId: 'col1' }
    expect(scoreCard(card, 'todo')).toBe(100)
    expect(scoreCard(card, 'TODO')).toBe(100)
    expect(scoreCard(card, 'ToDo')).toBe(100)
  })
  
  it('should cap score at 100 for multiple matches', () => {
    const card: Card = { 
      cardId: '1', 
      title: 'auth', 
      description: 'auth integration',
      columnId: 'col1'
    }
    const score = scoreCard(card, 'auth')
    expect(score).toBe(100)  // capped, not 150
  })
})

describe('searchCards', () => {
  it('should return empty for empty query', () => {
    const result = searchCards('', [mockCard])
    expect(result).toEqual([])
  })
  
  it('should filter by title match', () => {
    const cards = [
      { cardId: '1', title: 'Auth', columnId: 'col1' },
      { cardId: '2', title: 'Database', columnId: 'col1' }
    ]
    const result = searchCards('auth', cards)
    expect(result).toHaveLength(1)
    expect(result[0].cardId).toBe('1')
  })
})
```

**Acceptance Criteria:**
1. ✅ Suite tem ≥80 testes executados
2. ✅ Coverage `searchCards()` ≥95%, `scoreCard()` ≥95%
3. ✅ Todos testes passam (`npm test src/domain/cardSearch.test.ts`)
4. ✅ Testes cobrem: happy path, edge cases, case-insensitive, ordering, limits
5. ✅ Nenhum skip/todo tests; nenhum flaky test
6. ✅ Lint clean (ESLint rules aplicadas)
7. ✅ Assertion messages são claras e descritivas

**Tempo Estimado:** 1.5h  
**Bloqueadores:** Task 1  
**Responsável:** Implementer

---

### Task 3a: SearchModal.tsx — Component Structure & Input Handling

**Descrição:**
Implementar componente React `SearchModal` Part 1: estrutura base do modal (overlay, backdrop, input field), gerenciamento de input state, debounce da busca, e integração com `cardSearch()`. Parte 1 prepara ground para Task 3b (rendering results).

**Arquivos Envolvidos:**
- **Criar:** `src/features/app/SearchModal.tsx` (~120 linhas, Part 1 de 2)
- **Dependência:** Task 1 (`cardSearch.ts`), `src/domain/types.ts`

**Requisitos Técnicos:**

1. **Props (tipadas):**
   ```typescript
   interface SearchModalProps {
     isOpen: boolean
     onClose: () => void
     boardId: string
     board: BoardDocumentJson
     onSelectResult: (cardId: string) => void
   }
   ```

2. **Component Structure:**
   - Renderizar overlay (backdrop) com onClick → `onClose()`
   - Renderizar modal box (não dismissible por click interno)
   - Input field focado automaticamente quando `isOpen === true`
   - Input onChange → atualizar state `query`
   - Input onKeyDown:
     - `Escape` → chamar `onClose()`
     - `Enter` → (future keyboard navigation; MVP não tem)

3. **State Management:**
   - `query: string` — entrada usuário
   - `results: CardSearchResult[]` — resultado da busca
   - `selectedIndex: number` — prep para keyboard nav (future; não renderizar por enquanto)

4. **Busca em Tempo Real:**
   - Sem debounce prejudicial: React effect que chama `searchCards(query, board.cards)` diretamente
   - Se board vazio ou `selectedBoardId === null`: mostrar mensagem "Selecione um quadro para buscar"
   - Atualizar `results` conforme `query` muda

5. **Acessibilidade:**
   - Modal tem `role="dialog"`, `aria-modal="true"`, `aria-labelledby="search-modal-title"`
   - Input tem `aria-label="Buscar no quadro"`, `autoFocus` quando `isOpen`
   - Overlay tem `role="presentation"`

6. **Estilos (CSS classes, sem inline styles):**
   - `.fb-sm-backdrop` — overlay escuro, pointer-events, onClick → close
   - `.fb-sm-modal` — box modal (posicionamento, shadows)
   - `.fb-sm-input` — input field (width 100%, focus state)
   - `.fb-sm-results` — container para lista (scrollable, max-height 400px)

**Acceptance Criteria:**
1. ✅ Component renderiza modal + overlay quando `isOpen === true`
2. ✅ Overlay click → `onClose()` disparado
3. ✅ Escape key → `onClose()` disparado
4. ✅ Input autofocus quando modal abre
5. ✅ Input onChange → state `query` atualiza → `searchCards()` é chamado
6. ✅ `results` atualiza em tempo real conforme digita (sem debounce excessivo)
7. ✅ Se board vazio: mostra mensagem "Selecione um quadro"
8. ✅ Modal não tem nenhum resultado renderizado nesta parte (Task 3b)
9. ✅ ARIA labels + `aria-modal` presentes, ESLint clean
10. ✅ TypeScript strict mode OK, zero `any`

**Tempo Estimado:** 1.5h  
**Bloqueadores:** Task 1  
**Responsável:** Implementer

---

### Task 3b: SearchModal.tsx — Results Rendering & Navigation

**Descrição:**
Implementar SearchModal Part 2: renderização da lista de resultados, item rendering (título + snippet + coluna + metadados), clique em resultado (chama callback), highlight visual, e truncagem de descrição.

**Arquivos Envolvidos:**
- **Modificar:** `src/features/app/SearchModal.tsx` (adicionar ~80 linhas)
- **Dependência:** Task 3a (SearchModal estrutura)

**Requisitos Técnicos:**

1. **Resultados Rendering:**
   - Se `results.length === 0` e query não vazio: renderizar mensagem "Nenhum resultado encontrado"
   - Se `results.length === 0` e query vazio: renderizar hint "Digite para buscar"
   - Se `results.length > 0`: renderizar lista `.fb-sm-results-list`

2. **Item Rendering (cada resultado):**
   ```typescript
   // Exemplo
   <div className="fb-sm-result-item" onClick={() => handleSelectResult(result.cardId)}>
     <h3 className="fb-sm-result-title">{result.title}</h3>
     {result.description && (
       <p className="fb-sm-result-snippet">{truncateString(result.description, 100)}</p>
     )}
     <div className="fb-sm-result-meta">
       <span className="fb-sm-meta-column">{result.columnLabel}</span>
       {result.plannedDate && <span className="fb-sm-meta-date">{result.plannedDate}</span>}
       {result.plannedHours && <span className="fb-sm-meta-hours">{result.plannedHours}h</span>}
     </div>
   </div>
   ```

3. **Descrição Snippet:**
   - Truncar em 100 chars
   - Adicionar "…" se truncado
   - Fallback: "(sem descrição)" se não existir

4. **Metadados Rendering:**
   - Coluna: label da coluna (buscar em `board.columns` por `columnId`)
   - Data: `plannedDate` (ISO format, sem parsing; mostrar como "2026-04-25")
   - Horas: `plannedHours` (mostrar como "5h")
   - Mostrar apenas se existir

5. **Hover + Click:**
   - Hover `.fb-sm-result-item` → background color muda (highlight)
   - Click → chamar `handleSelectResult(cardId)`:
     - Chamar `onSelectResult(cardId)` (callback parent)
     - NÃO fechar modal aqui (deixar AppShell fazer)

6. **Limite Visual:**
   - Se `results.length > 100`: não renderizar >100, mas mostrar hint `(…e mais ${excess} resultados)`
   - Max height `.fb-sm-results` ≈400px com scroll interno

7. **Acessibilidade:**
   - Lista tem `role="listbox"`
   - Cada item tem `role="option"`
   - Keyboard nav (future): Arrow Up/Down para selected, Enter para selecionar
   - Para MVP: apenas click (não há keyboard nav obrigatório)

**Acceptance Criteria:**
1. ✅ Resultados renderizam com título + snippet + coluna + metadados
2. ✅ Descrição truncada em 100 chars com "…"
3. ✅ Hover state visualmente distinto (background color)
4. ✅ Click em resultado → `onSelectResult()` disparado com cardId correto
5. ✅ Mensagem "Nenhum resultado" mostrada quando results vazio + query não vazio
6. ✅ Hint "Digite para buscar" mostrado quando results vazio + query vazio
7. ✅ Metadados (coluna, data, horas) renderizam corretamente se existem
8. ✅ Limite 100 resultados respeitado; hint "(…e mais X)" se >100
9. ✅ ARIA roles (listbox, option) presentes, semantic HTML
10. ✅ ESLint clean, TypeScript strict OK

**Tempo Estimado:** 1h  
**Bloqueadores:** Task 3a, Task 1  
**Responsável:** Implementer

---

### Task 4: SearchModal.css — Estilos BEM & Responsividade

**Descrição:**
Implementar stylesheet para SearchModal com BEM naming, CSS variables, dark mode support, e responsividade mobile-first. Garantir contraste WCAG 4.5:1, tamanho touch targets ≥44px, e sem conflitos com topbar.

**Arquivos Envolvidos:**
- **Criar:** `src/features/app/SearchModal.css` (~120 linhas)
- **Dependência:** Task 3a + 3b (componente decidido)

**Requisitos Técnicos:**

1. **BEM Naming Convention:**
   - Bloco: `.fb-sm-*` (FlowBoard, SearchModal)
   - Classes principais:
     - `.fb-sm-backdrop` — overlay
     - `.fb-sm-modal` — caixa modal
     - `.fb-sm-input` — input field
     - `.fb-sm-results` — container resultados
     - `.fb-sm-result-item` — cada resultado
     - `.fb-sm-result-title` — título do card
     - `.fb-sm-result-snippet` — descrição truncada
     - `.fb-sm-result-meta` — metadados row
     - `.fb-sm-meta-*` — individual metadata (coluna, data, horas)

2. **Cores & Contrast (WCAG 2.1 AA):**
   - Usar CSS variables existentes do projeto (ler `src/index.css`)
   - Backdrop: `rgba(0, 0, 0, 0.5)` (transparência escura)
   - Modal bg: `--color-bg-primary` ou similar
   - Text: `--color-text-primary` (contrast ≥4.5:1)
   - Hover/focus: `--color-focus-ring` ou similar
   - Dark mode: inherit from `:root` vars

3. **Layout:**
   - Modal centered no viewport (fixed position, z-index alto)
   - Responsividade:
     - Mobile (320px): modal width ~90vw, max-width 500px
     - Tablet (768px): modal width ~80vw, max-width 600px
     - Desktop (1024px+): modal width ~50vw, max-width 800px
   - Input height ≥44px (touch target)
   - Results scrollable: max-height 400px, overflow-y auto

4. **Animações (opcional, nice-to-have):**
   - Modal fade-in: opacity 0 → 1 em 200ms (smooth)
   - Backdrop fade-in: similar
   - No-animation preference respected (prefers-reduced-motion)

5. **Estado Visual:**
   - Input focus: border color, outline, shadow (`:focus` ou `:focus-visible`)
   - Result hover: background color lightened, cursor pointer
   - Result selected (future): border left ou similar

**Acceptance Criteria:**
1. ✅ Classes BEM naming `.fb-sm-*` implementadas, sem conflitos com topbar
2. ✅ Cores: backdrop, modal bg, text usando CSS variables
3. ✅ Contrast: text color vs background ≥4.5:1 (verificar com Lighthouse)
4. ✅ Touch targets: input + result items ≥44px height
5. ✅ Responsive: 320px (mobile) até 1920px (desktop) sem quebra
6. ✅ Modal centered, fixed position com z-index suficiente
7. ✅ Results scrollable (max-height 400px)
8. ✅ Hover states visíveis (background color change, cursor pointer)
9. ✅ Dark mode support (if project uses dark mode variables)
10. ✅ ESLint clean (CSS linter, se houver)

**Tempo Estimado:** 1.5h  
**Bloqueadores:** Task 3a + 3b (UI decidido)  
**Responsável:** Implementer (front-end specialist)

---

### Task 5: SearchModal.test.tsx — Component Tests (Vitest + RTL)

**Descrição:**
Implementar suite de testes Vitest para componente SearchModal usando React Testing Library (happy-dom). Testar renderização, interações (input, click, escape), mock dependencies, callback calls.

**Arquivos Envolvidos:**
- **Criar:** `src/features/app/SearchModal.test.tsx` (~100 linhas)
- **Dependência:** Task 3a + 3b (SearchModal completo)

**Requisitos Técnicos:**

1. **Framework & Tools:**
   - Vitest + `@testing-library/react`
   - Mocks: `src/domain/cardSearch` (mock `searchCards()`)
   - Mock data: Board + Cards samples

2. **Test Suites:**

| Suite | Testes | Descrição |
|-------|--------|-----------|
| Renderização | 5+ | Modal visível quando `isOpen=true`, hidden quando `isOpen=false`, input focado |
| Input | 5+ | onChange atualiza query, clearing input, special chars |
| Busca | 5+ | searchCards chamado com query correto, results renderizam |
| Interação | 8+ | Click resultado → callback, hover state, Escape closes |
| Edge Cases | 5+ | Board vazio, sem results, >100 results hint |
| Acessibilidade | 3+ | ARIA labels presentes, role="dialog", semantic |

3. **Example Tests:**
```typescript
describe('<SearchModal />', () => {
  const mockOnClose = vi.fn()
  const mockOnSelectResult = vi.fn()
  const mockBoard: BoardDocumentJson = {
    boardId: 'board1',
    cards: [
      { cardId: 'c1', title: 'Auth', columnId: 'col1' },
      { cardId: 'c2', title: 'Database', columnId: 'col1' }
    ],
    // ...
  }
  
  it('should render modal when isOpen=true', () => {
    const { getByRole } = render(
      <SearchModal
        isOpen={true}
        onClose={mockOnClose}
        boardId="board1"
        board={mockBoard}
        onSelectResult={mockOnSelectResult}
      />
    )
    expect(getByRole('dialog')).toBeInTheDocument()
  })
  
  it('should focus input on open', () => {
    const { getByPlaceholderText } = render(
      <SearchModal
        isOpen={true}
        onClose={mockOnClose}
        boardId="board1"
        board={mockBoard}
        onSelectResult={mockOnSelectResult}
      />
    )
    const input = getByPlaceholderText(/buscar/i)
    expect(input).toHaveFocus()
  })
  
  it('should call onSelectResult when clicking result', async () => {
    vi.mocked(searchCards).mockReturnValue([
      { cardId: 'c1', title: 'Auth', columnId: 'col1', score: 100 }
    ])
    
    const { getByText } = render(
      <SearchModal
        isOpen={true}
        onClose={mockOnClose}
        boardId="board1"
        board={mockBoard}
        onSelectResult={mockOnSelectResult}
      />
    )
    
    const resultItem = getByText('Auth')
    fireEvent.click(resultItem)
    expect(mockOnSelectResult).toHaveBeenCalledWith('c1')
  })
  
  it('should close on Escape key', () => {
    const { getByPlaceholderText } = render(
      <SearchModal
        isOpen={true}
        onClose={mockOnClose}
        boardId="board1"
        board={mockBoard}
        onSelectResult={mockOnSelectResult}
      />
    )
    fireEvent.keyDown(getByPlaceholderText(/buscar/i), { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalled()
  })
})
```

**Acceptance Criteria:**
1. ✅ Suite tem ≥25 testes, todos passam (`npm test src/features/app/SearchModal.test.tsx`)
2. ✅ Coverage `SearchModal` ≥80%
3. ✅ Testes cobrem: renderização, input, busca, interações, edge cases
4. ✅ Mocks corretos: `cardSearch()` mockada, Board data tipada
5. ✅ Callbacks (`onClose`, `onSelectResult`) verificados com `toHaveBeenCalledWith()`
6. ✅ Nenhum skip/todo; nenhum flaky test
7. ✅ Assertion messages claras
8. ✅ ESLint clean

**Tempo Estimado:** 1.5h  
**Bloqueadores:** Task 3a + 3b  
**Responsável:** Implementer

---

### Task 6: useSearchHotkey.ts — Hook para Atalho `/` Global

**Descrição:**
Implementar hook React `useSearchHotkey()` que registra listener global `window.addEventListener('keydown')` para capturar tecla `/` e abrir busca. Incluir guardas para não disparar dentro de inputs, textareas, ou quando SearchModal/edit modals já estão abertos.

**Arquivos Envolvidos:**
- **Criar:** `src/hooks/useSearchHotkey.ts` (~50 linhas)
- **Dependência:** Nenhuma (hook puro, sem dependência de SearchModal)

**Requisitos Técnicos:**

1. **Hook Signature:**
   ```typescript
   export function useSearchHotkey(onOpenSearch: () => void): void
   ```

2. **Listener Registration:**
   - `useEffect` que registra `window.addEventListener('keydown', handler)`
   - Cleanup: `removeEventListener` retorno do effect
   - Dependency array: `[onOpenSearch]` (se onOpenSearch muda, re-setup listener)

3. **Guardas (Não Disparar Se):**
   - `document.activeElement` é `HTMLInputElement` ou `HTMLTextAreaElement`
   - SearchModal já `isOpen` (problema: hook não tem acesso a state SearchModal… solução: check `data-modal="search"` attribute?)
   - Modal de edição aberto (check atributo `data-modal="edit"` ou class `is-modal-open`)
   - User é um bot/accessibility tool (problematic para testar; skip check)

4. **Implementação Detalhada:**
   ```typescript
   export function useSearchHotkey(onOpenSearch: () => void): void {
     useEffect(() => {
       const handleKeyDown = (event: KeyboardEvent) => {
         // Check for "/"
         if (event.key !== '/') return
         
         // Guard: input ou textarea focused
         const activeElement = document.activeElement
         if (activeElement instanceof HTMLInputElement || 
             activeElement instanceof HTMLTextAreaElement) {
           return
         }
         
         // Guard: SearchModal já aberto (check attribute)
         const searchModalOpen = document.querySelector('[data-modal="search"]')?.getAttribute('data-open') === 'true'
         if (searchModalOpen) return
         
         // Guard: Edit modal aberto
         const editModalOpen = document.querySelector('[data-modal="edit"]')?.getAttribute('data-open') === 'true'
         if (editModalOpen) return
         
         // Prevent default "/" if any (unlikely, but safe)
         // event.preventDefault()  // optional
         
         // Dispatch callback
         onOpenSearch()
       }
       
       window.addEventListener('keydown', handleKeyDown)
       
       // Cleanup
       return () => {
         window.removeEventListener('keydown', handleKeyDown)
       }
     }, [onOpenSearch])
   }
   ```

5. **Acessibilidade:**
   - Hook não interfere com screen readers ou accessibility tools
   - "/" é caractere comum em inputs; guardas devem ser robustos

**Acceptance Criteria:**
1. ✅ Hook exportado como `useSearchHotkey(onOpenSearch: () => void): void`
2. ✅ Listener registra em `window` para "/" keydown
3. ✅ Callback `onOpenSearch()` disparado quando "/" pressionado fora de input
4. ✅ Guarda: NÃO dispara se dentro de input/textarea
5. ✅ Guarda: NÃO dispara se SearchModal já aberto
6. ✅ Guarda: NÃO dispara se edit modal aberto
7. ✅ Cleanup: `removeEventListener` em return de effect (Chrome DevTools Memory verify)
8. ✅ Zero `any` types, TypeScript strict OK
9. ✅ ESLint clean
10. ✅ Arquivo compila

**Tempo Estimado:** 1h  
**Bloqueadores:** Nenhum  
**Responsável:** Implementer

---

### Task 7: useSearchHotkey.test.ts — Hook Tests (Vitest)

**Descrição:**
Implementar suite de testes Vitest para hook `useSearchHotkey()`. Testar listener registration, callback dispatch, guardas, e cleanup sem memory leaks.

**Arquivos Envolvidos:**
- **Criar:** `src/hooks/useSearchHotkey.test.ts` (~80 linhas)
- **Dependência:** Task 6 (`useSearchHotkey.ts`)

**Requisitos Técnicos:**

1. **Framework:**
   - Vitest + `@testing-library/react` (renderHook)
   - Mock: `window.addEventListener`, `window.removeEventListener`
   - Mock: `document.activeElement`

2. **Test Suites:**

| Suite | Testes | Descrição |
|-------|--------|-----------|
| Registration | 3+ | Listener registered on mount, removed on unmount |
| Dispatch | 5+ | "/" key → callback called, other keys ignored |
| Guardas | 8+ | Input focused → no dispatch, SearchModal open → no dispatch, etc. |
| Cleanup | 3+ | removeEventListener called, no memory leaks |

3. **Example Tests:**
```typescript
describe('useSearchHotkey', () => {
  it('should register listener on mount', () => {
    const spy = vi.spyOn(window, 'addEventListener')
    const mockCallback = vi.fn()
    
    renderHook(() => useSearchHotkey(mockCallback))
    
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
  
  it('should remove listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener')
    const mockCallback = vi.fn()
    
    const { unmount } = renderHook(() => useSearchHotkey(mockCallback))
    unmount()
    
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
  
  it('should call callback when "/" is pressed', () => {
    const mockCallback = vi.fn()
    renderHook(() => useSearchHotkey(mockCallback))
    
    const event = new KeyboardEvent('keydown', { key: '/' })
    window.dispatchEvent(event)
    
    expect(mockCallback).toHaveBeenCalled()
  })
  
  it('should NOT call callback if input focused', () => {
    const mockCallback = vi.fn()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    
    renderHook(() => useSearchHotkey(mockCallback))
    
    const event = new KeyboardEvent('keydown', { key: '/' })
    window.dispatchEvent(event)
    
    expect(mockCallback).not.toHaveBeenCalled()
    
    document.body.removeChild(input)
  })
})
```

**Acceptance Criteria:**
1. ✅ Suite tem ≥15 testes, todos passam
2. ✅ Coverage `useSearchHotkey` ≥80%
3. ✅ Testes cobrem: registration, dispatch, guardas, cleanup
4. ✅ Callback verificado com `toHaveBeenCalled()`
5. ✅ Guard tests: input focused, textarea focused, modals open
6. ✅ Listener removed on unmount (removeEventListener spy)
7. ✅ Nenhum flaky test
8. ✅ ESLint clean

**Tempo Estimado:** 1h  
**Bloqueadores:** Task 6  
**Responsável:** Implementer

---

### Task 8: Integração em AppShell.tsx

**Descrição:**
Integrar SearchModal + useSearchHotkey hook em AppShell.tsx: adicionar state `isSearchOpen`, chamar hook, renderizar componente, implementar callback `handleSelectResult()` que fecha modal e navega para card (scroll + highlight).

**Arquivos Envolvidos:**
- **Modificar:** `src/features/app/AppShell.tsx` (~30 linhas adicionadas)
- **Dependência:** Task 3a + 3b (SearchModal), Task 6 (hook)

**Requisitos Técnicos:**

1. **State Adicionado:**
   ```typescript
   const [isSearchOpen, setIsSearchOpen] = useState(false)
   ```

2. **Hook Chamado:**
   ```typescript
   useSearchHotkey(() => setIsSearchOpen(true))
   ```

3. **Componente Renderizado:**
   ```typescript
   <SearchModal
     isOpen={isSearchOpen}
     onClose={() => setIsSearchOpen(false)}
     boardId={selectedBoardId}
     board={currentBoard}
     onSelectResult={handleSelectResult}
   />
   ```

4. **Callback `handleSelectResult(cardId: string)`:**
   - Fechar modal: `setIsSearchOpen(false)`
   - Encontrar card na view kanban (ref ou scroll ID)
   - Scroll para card:
     - Opção A: `element.scrollIntoView({ behavior: 'smooth' })`
     - Opção B: Usar ref kanban + manual scroll
     - **Adotado:** Opção A (simples, nativa)
   - Highlight card por ~3s:
     - Adicionar class `.is-highlighted` ou similar
     - setTimeout cleanup em 3000ms
   - Implementação:
     ```typescript
     const handleSelectResult = (cardId: string) => {
       setIsSearchOpen(false)
       
       // Find card DOM element (usar data-testid ou similar)
       const cardElement = document.querySelector(`[data-card-id="${cardId}"]`)
       if (cardElement) {
         // Scroll
         cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
         
         // Highlight
         cardElement.classList.add('is-highlighted')
         setTimeout(() => {
           cardElement.classList.remove('is-highlighted')
         }, 3000)
       }
     }
     ```

5. **Placeholder em Topbar (Opcional):**
   - Se projeto tem `.fb-topbar__search` placeholder, fazer clickable:
     ```typescript
     <button
       onClick={() => setIsSearchOpen(true)}
       className="fb-topbar__search"
       aria-label="Abrir busca (tecle / em qualquer lugar)"
     >
       Buscar…
     </button>
     ```

6. **Guardas de Estado:**
   - Se `selectedBoardId === null`: SearchModal renderiza "Selecione um quadro"
   - Se `currentBoard` undefined: SearchModal renderiza vazio

**Acceptance Criteria:**
1. ✅ State `isSearchOpen` adicionado e tipado
2. ✅ Hook `useSearchHotkey` chamado com callback correto
3. ✅ SearchModal renderizado com props corretos
4. ✅ `handleSelectResult()` implementado: fecha modal + scroll + highlight
5. ✅ Scroll smooth e centra card (`scrollIntoView`)
6. ✅ Highlight visual por 3s (class `.is-highlighted`)
7. ✅ Guarda: Se `selectedBoardId === null`, SearchModal vazio
8. ✅ ESLint clean, TypeScript strict OK
9. ✅ Build passa (`npm run build`)
10. ✅ Sem regressão em estado AppShell (outras features funcionam)

**Tempo Estimado:** 1h  
**Bloqueadores:** Task 3a + 3b, Task 6  
**Responsável:** Implementer

---

### Task 9: E2E Tests — board-search.spec.ts (Playwright)

**Descrição:**
Implementar suite E2E Playwright com 8 cenários que validam fluxo completo: atalho "/" abre busca → digita query → resultados aparecem → clica resultado → navega para card → fecha busca com Escape.

**Arquivos Envolvidos:**
- **Criar:** `tests/e2e/board-search.spec.ts` (~200 linhas)
- **Dependência:** Tasks 1-8 (todas features integradas)

**Requisitos Técnicos:**

1. **Setup Playwright:**
   - Use `playwright.config.ts` (já existe): `testDir: ./tests/e2e`, `baseURL: http://localhost:5173`
   - Antes de tests: `npm run dev` deve estar rodando (verificar em beforeAll)
   - Ou usar `webServer` config

2. **Test Scenarios (8 cenários):**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Board Search (Keyboard + UI)', () => {
  test('Cenário 1: Atalho "/" abre SearchModal', async ({ page }) => {
    // Setup: Navigate to board view com cards loaded
    // Action: Press "/"
    // Assert: SearchModal visible, input focused
  })
  
  test('Cenário 2: Digita query "auth" → resultados filtram', async ({ page }) => {
    // Setup: Modal aberto (press "/")
    // Action: Type "auth"
    // Assert: Resultados mostram cards com "auth" em título/descrição
  })
  
  test('Cenário 3: Busca case-insensitive: "TODO" vs "todo"', async ({ page }) => {
    // Setup: Modal aberto
    // Action: Type "TODO"
    // Assert: Encontra cards com "todo", "Todo", "TODO"
  })
  
  test('Cenário 4: Descrição snippets truncados (~100 chars)', async ({ page }) => {
    // Setup: Modal aberto com resultados longos
    // Action: Observe descrição renderizada
    // Assert: Truncado com "…" se >100 chars
  })
  
  test('Cenário 5: Click resultado navega → scroll + highlight', async ({ page }) => {
    // Setup: Modal aberto com resultados
    // Action: Click resultado
    // Assert: Modal fecha, kanban scroll para card, card highlighted
  })
  
  test('Cenário 6: Escape fecha modal', async ({ page }) => {
    // Setup: Modal aberto
    // Action: Press Escape
    // Assert: Modal fechado, pode reabrir com "/"
  })
  
  test('Cenário 7: Click overlay fecha modal', async ({ page }) => {
    // Setup: Modal aberto
    // Action: Click overlay (fora modal)
    // Assert: Modal fechado
  })
  
  test('Cenário 8: "/" não abre se dentro de input', async ({ page }) => {
    // Setup: Focar em um input (ex: create card modal)
    // Action: Press "/"
    // Assert: SearchModal NOT aberto (input recebe "/")
  })
})
```

3. **Page Object Pattern (Optional, Recomendado):**
   ```typescript
   class SearchModalPage {
     constructor(page: Page) {
       this.page = page
     }
     
     async openModal() {
       await this.page.keyboard.press('/')
       await this.page.locator('[data-modal="search"]').waitFor({ state: 'visible' })
     }
     
     async search(query: string) {
       await this.page.locator('[data-testid="search-input"]').fill(query)
     }
     
     async getResultCount() {
       const results = await this.page.locator('[data-testid="search-result"]').count()
       return results
     }
     
     async clickResult(title: string) {
       await this.page.locator(`text=${title}`).click()
     }
   }
   ```

4. **Assertions:**
   - `.toBeVisible()` — modal visible
   - `.toBeFocused()` — input focused
   - `.toContainText()` — resultado mostra titulo
   - `.toHaveCount()` — número de resultados
   - `.toHaveClass()` — card highlighted
   - `.not.toBeVisible()` — modal closed

**Acceptance Criteria:**
1. ✅ Suite tem 8 cenários E2E, todos passam (`npx playwright test tests/e2e/board-search.spec.ts`)
2. ✅ Cenários cobrem: atalho, busca, case-insensitive, truncagem, navegação, close, guards
3. ✅ Baseado em dados reais (cards loaded, board ativo)
4. ✅ Assertions claras, não flaky
5. ✅ Playwright report gera sem erros
6. ✅ Nenhum timeout excessivo (>5s por test)
7. ✅ Page locators estáveis (usar `data-testid` ou semantic selectors)
8. ✅ ESLint clean (Playwright plugin, se houver)

**Tempo Estimado:** 2h  
**Bloqueadores:** Tasks 1-8 (tudo integrado)  
**Responsável:** Implementer (QA/E2E specialist)

---

### Task 10: Code Review & Merge

**Descrição:**
Revisão final do código: lint check, type check, testes passam, performance OK, sem console.logs, commits semânticos, e aprovação para merge em main.

**Arquivos Envolvidos:**
- **Revisar:** Todos 8 arquivos novos + 1 modificado
- **Dependência:** Tasks 1-9 concluídos

**Requisitos Técnicos:**

1. **Build & Type Check:**
   ```bash
   npm run build  # tsc -b + vite build
   npm run lint   # ESLint
   npm test       # Vitest (unit)
   npx playwright test tests/e2e/board-search.spec.ts  # E2E
   ```

2. **Code Review Checklist:**
   - [ ] Zero `any` types, TypeScript strict mode OK
   - [ ] ESLint: zero CRITICAL/ERROR findings
   - [ ] Coverage: cardSearch ≥95%, SearchModal ≥80%, useSearchHotkey ≥80%
   - [ ] No console.logs, debuggers, comments TODO/FIXME
   - [ ] Memory profiling: Chrome DevTools (abrir/fechar SearchModal 10x, heap não cresce)
   - [ ] Performance: `searchCards()` <100ms com 500 cards
   - [ ] Commits: semânticos (`feat:`, `test:`, `style:`)
   - [ ] Documentation: JSDoc comments em exports principais
   - [ ] Sem regressão: E2E existentes (drag-drop, etc.) passam
   - [ ] PR description: links TSD/IPD, overview mudanças

3. **Documentação:**
   - Adicionar JSDoc em `cardSearch()` explicando score algorithm
   - Adicionar comentário em `useSearchHotkey()` explicando guardas
   - README.md: adicionar seção "Search" (feature overview)
   - Se houver CHANGELOG: adicionar entrada v1.0

4. **Commits Semânticos:**
   ```
   feat: implement board-search modal with keyboard shortcut
   feat: add cardSearch domain logic with scoring algorithm
   test: add 80+ unit tests for cardSearch function
   test: add component tests for SearchModal
   test: add E2E tests for board-search feature
   style: add SearchModal.css with BEM naming
   docs: update README with search feature documentation
   ```

**Acceptance Criteria:**
1. ✅ `npm run build` passa sem erros (tsc OK, Vite OK)
2. ✅ `npm run lint` passa: zero CRITICAL/ERROR findings
3. ✅ `npm test` passa: cardSearch ≥95%, SearchModal ≥80%, useSearchHotkey ≥80%
4. ✅ `npx playwright test tests/e2e/board-search.spec.ts` passa: todos 8 cenários
5. ✅ Nenhum console.log, debugger, ou comment TODO em código produção
6. ✅ Memory profiling OK (Chrome DevTools, sem memory leaks)
7. ✅ Performance: searchCards <100ms com 500 cards (benchmark teste)
8. ✅ Commits semânticos, PR description completa
9. ✅ JSDoc comments em exports (score algorithm, guardas)
10. ✅ README.md atualizado com seção Search (feature overview)
11. ✅ Zero regressão: drag-drop E2E, outros features passam
12. ✅ Code review aprovado (lead review ou team approval)

**Tempo Estimado:** 1.5h  
**Bloqueadores:** Tasks 1-9  
**Responsável:** Implementer (com lead review)

---

## 4. Matriz de Riscos & Mitigação

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | Memory leak em listener global `/` | 🟡 Médio (30%) | 🔴 Alto (heap cresce) | Task 7: testar cleanup com Memory DevTools; verifier roda profiler antes merge. |
| R2 | Performance <100ms com 1000+ cards | 🟡 Médio (25%) | 🟡 Médio (UX slow) | Task 1: benchmark <100ms obrigatório; se falhar, considerar indexação (future). |
| R3 | Conflito keyboard "/" com inputs | 🟠 Baixo (15%) | 🟡 Médio (usuário perde "/") | Task 6: guardas robustos; Task 8: teste com modais abertos; Task 9 cenário 8. |
| R4 | CSS conflict com topbar existente | 🟠 Baixo (10%) | 🟢 Baixo (visual ruim) | Task 4: BEM naming `.fb-sm-*`; visual test na topbar antes merge. |
| R5 | Regressão em drag-and-drop | 🟠 Baixo (10%) | 🟡 Médio (feature quebra) | Task 9: E2E drag-drop rodado como sanity check. |
| R6 | Acessibilidade deficiente (contrast <4.5:1) | 🟠 Baixo (10%) | 🟡 Médio (WCAG fail) | Task 4: contrast check; Task 10: Lighthouse audit. |
| R7 | Input focus stealing (SearchModal grabs focus inapropriately) | 🟠 Baixo (8%) | 🟢 Baixo (UX quirk) | Task 3a: only autofocus when `isOpen` changes; test in Task 5. |
| R8 | Descrição com HTML/Markdown renderizado (XSS?) | 🟠 Baixo (5%) | 🔴 Alto (security) | Dados vindos de GitHub API (trusted); snippet é plain text (não renderizado); no risk. |

**Ação Preventiva Principal:** Task 7 (hook cleanup tests) + Task 10 (memory profiling) são gate-keepers.

---

## 5. Pre-Implementation Checklist

Verificar antes de começar Tasks 1-10:

- [ ] **Repositório Local:**
  - [ ] `cd apps/flowboard && git status` — branch clean (nenhuma mudança unstaged)
  - [ ] `git pull origin main` — atualizado com latest changes
  - [ ] `git checkout -b feature/board-search-v1.0` — criar feature branch

- [ ] **Ambiente Setup:**
  - [ ] `npm install` — dependências atualizadas
  - [ ] `npm run dev` — dev server roda em http://localhost:5173
  - [ ] `npm test` — baseline tests passam (zero failures)
  - [ ] `npm run build` — build limpo (zero errors)
  - [ ] `npx playwright install` — browsers instalados

- [ ] **Documentação Lida:**
  - [ ] TSD v1.0 (87/100) entendido completamente
  - [ ] IPD v1.0 (95/100) revisado
  - [ ] Este TBRD v1.0 revisado
  - [ ] AGENTS.md (stack, comandos) conhecido
  - [ ] README.md `/apps/flowboard/` lido

- [ ] **Contexto Técnico:**
  - [ ] `src/domain/types.ts` explorado (Card type confirmado)
  - [ ] `src/features/app/AppShell.tsx` explorado (estrutura entendida)
  - [ ] `src/features/app/SearchModal.tsx` já existe? (não, será criado)
  - [ ] `tests/e2e/` estrutura explorada (playwright.config.ts lido)
  - [ ] Padrões de código do projeto: componentes, hooks, testes (exemplos identificados)

- [ ] **Dependências Externas:**
  - [ ] Nenhuma dependência npm nova precisa ser instalada (React, Vitest, Playwright já presentes)
  - [ ] GitHub API: PAT já em sessionStorage (não afeta busca, só leitura de dados já carregados)
  - [ ] Nenhum bloqueador conhecido

- [ ] **Aprovações:**
  - [ ] Arquiteto aprovou design (modal + scroll + highlight)
  - [ ] PM aprovou escopo (board ativo, sem multi-search)
  - [ ] Lead dev marcou OK para começar

- [ ] **Performance Baseline:**
  - [ ] Com 100 cards: busca rápida (subjective)
  - [ ] Sem lag visual ao digitar (subjective, será quantificado em Task 1)

---

## 6. Definition of Done (DoD) — Squad Standard

Todos estes critérios devem ser satisfeitos antes de "pronto para merge em main":

### ✅ Código

- [ ] Todos 8 arquivos novos criados (listados em Seção 1)
- [ ] 1 arquivo modificado (AppShell.tsx)
- [ ] Zero TypeScript errors: `npm run build` passa
- [ ] Zero ESLint errors/warnings (CRITICAL/ERROR level):
  ```bash
  npm run lint  # ou npx eslint src/features/app/SearchModal.tsx (escopado)
  ```
- [ ] TypeScript Strict Mode respected:
  - [ ] Zero `any` types (exceto com `// @ts-ignore` justificado)
  - [ ] Todos types explícitos (props, returns, state)
  - [ ] Type guards implementados onde necessário

### ✅ Testes — Coverage ≥80% por arquivo

- [ ] **Unit Tests (Vitest):**
  ```bash
  npm test  # Vitest
  ```
  - [ ] `src/domain/cardSearch.test.ts` — ≥95% coverage (domínio puro)
  - [ ] `src/features/app/SearchModal.test.tsx` — ≥80% coverage
  - [ ] `src/hooks/useSearchHotkey.test.ts` — ≥80% coverage
  - [ ] Todos testes PASSAM (0 failures)
  - [ ] Nenhum skip/todo tests deixados

- [ ] **E2E Tests (Playwright):**
  ```bash
  npx playwright test tests/e2e/board-search.spec.ts
  ```
  - [ ] 8 cenários definidos em Task 9 TODOS PASSAM
  - [ ] Nenhum timeout (>5s indica problema)
  - [ ] Playwright report gera sem errors

- [ ] **Coverage Report:**
  ```bash
  npx vitest run --coverage  # opcional, se script existir
  ```
  - [ ] Summary mostra ≥80% coverage no geral

### ✅ Performance

- [ ] **Benchmark searchCards():**
  - [ ] Com 500 cards, query simples (<5 chars): **<100ms**
  - [ ] Com 1000 cards: **<150ms** (stretch goal)
  - [ ] Verificar: rodar teste no Task 2, imprimir timing

- [ ] **Memory Profile (Chrome DevTools):**
  - [ ] Abrir/fechar SearchModal 10x
  - [ ] Heap snapshot: before/after comparado
  - [ ] **Zero memory leak** (heap não cresce indefinidamente)

- [ ] **Renderização (Lighthouse/DevTools):**
  - [ ] 100 resultados renderizam sem jank (<60fps)
  - [ ] Modal opens/closes smooth (sem stuttering)

### ✅ Qualidade & Segurança

- [ ] **Code Quality:**
  - [ ] Zero `console.log()`, `debugger`, `comment TODO/FIXME` em produção
  - [ ] JSDoc comments em exports (funções públicas)
  - [ ] Sem unused imports, variables, parameters

- [ ] **Security:**
  - [ ] Nenhum input do usuário é renderizado como HTML (description é text-only)
  - [ ] Sem PAT/secrets em código ou logs
  - [ ] Dados lidos via CardSearchResult (tipado, safe)

- [ ] **Acessibilidade (WCAG 2.1 AA):**
  - [ ] ARIA labels: `aria-label`, `role`, `aria-modal`
  - [ ] Color contrast: ≥4.5:1 para text
  - [ ] Keyboard navigation: Tab, Escape, "/" funcionam
  - [ ] Lighthouse audit: zero Accessibility violations

### ✅ Documentação

- [ ] **JSDoc Comments:**
  - [ ] `searchCards()` — explica fórmula score
  - [ ] `scoreCard()` — detalha cada fator
  - [ ] `useSearchHotkey()` — explica guardas

- [ ] **README.md:**
  - [ ] Seção "Search" adicionada (ou atualizada)
  - [ ] Atalho "/" documentado
  - [ ] Escopo MVP clarificado (board ativo apenas)

- [ ] **Commits:**
  - [ ] Semânticos: `feat:`, `test:`, `style:`, `docs:`
  - [ ] Mensagens descritivas (não genéricas tipo "fix stuff")
  - [ ] Por arquivo lógico (não misturar feature + unrelated refactor)

### ✅ Integração & Regressão

- [ ] **Build & Dependencies:**
  - [ ] `npm run build` — zero errors, bundle size OK
  - [ ] Nenhuma dependência npm nova (ou justificada)
  - [ ] package.json não alterado sem necessidade

- [ ] **Regressão:**
  - [ ] Drag-and-drop kanban funciona (E2E sanity)
  - [ ] Create/edit card modal funciona (modais não quebram)
  - [ ] Logout/login flow OK (estado SearchModal não persiste)
  - [ ] Nenhuma regressão visual em topbar

- [ ] **Compatibilidade:**
  - [ ] Testar em: Chrome, Firefox (se possível)
  - [ ] Mobile responsividade: 320px (iPhone), 768px (iPad)

### ✅ Code Review & Approval

- [ ] **Team Review:**
  - [ ] Lead dev revisou código
  - [ ] Nenhum blocker findings
  - [ ] Menor findings resolvidos ou documentados

- [ ] **PR Check:**
  - [ ] PR descrição completa (links TSD/IPD, overview mudanças)
  - [ ] GitHub checks passam (CI pipeline)
  - [ ] Nenhuma merge conflict

- [ ] **Final Gate:**
  - [ ] Verifier agent assinou off (Task 10 completo)
  - [ ] Pronto para merge em `main`

---

## 7. Handoff para Implementer

### Contexto Resumido

**O que precisa ser feito:**
- Implementar componente SearchModal (React) + hook useSearchHotkey + função domínio cardSearch
- Integrar em AppShell com atalho "/" e navegação para card
- 80+ testes Vitest (domínio + componente + hook) + 8 cenários E2E Playwright
- Total ~15-17.5 horas de implementação

**Por que é importante:**
- Usuários podem buscar rapidamente por cards sem scrollar manualmente (30s → <1s)
- Feature está no MVP, escopo aprovado, sem ambiguidades
- Testes obrigatórios garantem qualidade (80%+ coverage)

**Restrições Críticas:**
1. Busca é **board ativo apenas** (não multi-board no MVP)
2. **Sem fuzzy matching** (apenas substring, case-insensitive)
3. **Sem histórico persistido** (ephemeral, sessão-only)
4. **Type safe** — TypeScript strict mode obrigatório
5. **Memory leak proof** — Chrome DevTools testing obrigatório

**Bloqueadores Conhecidos:**
- Nenhum

**Dependências Externas:**
- Nenhuma (todas dependências npm já instaladas)

---

## 8. Próximas Fases (Roadmap Future)

Após v1.0 aprovado e mergeado:

| Fase | Feature | Prioridade | Estimativa |
|------|---------|-----------|------------|
| v1.1 | Typo-tolerance (Levenshtein) | 🟡 Médio | 8-10h |
| v1.2 | Global multi-board search (remover `boardId` filter) | 🟡 Médio | 5-8h |
| v1.3 | Search history (localStorage, recent searches) | 🟢 Baixo | 4-6h |
| v1.4 | Advanced filters (date range, hours >N) | 🟢 Baixo | 10-12h |
| v1.5 | Labels/tags search (quando modelo suportar) | 🟢 Baixo | TBD |

---

## 9. Recursos & Referências

### Documentos Relacionados

- [TSD v1.0 — Board Search](./board-search-v1.0.tsd.md) (87/100, aprovado)
- [IPD v1.0 — Implementation Plan](./board-search-v1.0.ipd.md) (95/100, aprovado)
- [ADR-003 — Domain-Pure Architecture](../../adrs/003-*) (ver `.memory-bank/adrs/`)
- [AGENTS.md](../../../../AGENTS.md) — Stack, comandos, padrões

### Tecnologias

- [React 19 Docs](https://react.dev) — Hooks, components
- [TypeScript Handbook](https://www.typescriptlang.org) — Strict mode, types
- [Vitest Docs](https://vitest.dev) — Unit testing, coverage
- [React Testing Library](https://testing-library.com/react) — Component tests
- [Playwright Docs](https://playwright.dev) — E2E testing

### Padrões do Projeto

- **BEM CSS:** `.block-element__modifier` (ex: `.fb-sm-result-item`)
- **Component Structure:** `Component.tsx`, `Component.css`, `Component.test.tsx`
- **Hook Pattern:** Exported from `src/hooks/`, named `use*`
- **Domain Logic:** Pure functions in `src/domain/`, testable in isolation
- **Type-Safety:** TypeScript strict mode, zero `any`

---

## 10. Comunicação & Escalação

### Pontos de Contato

- **Arquiteto:** Se UI shape ou navegação mudar (ex: scroll vs modal detalhes)
- **PM:** Se escopo desviar (ex: multi-board, histórico persistido)
- **UX:** Se design não agradar ou acessibilidade falhar
- **DevOps:** Se CI/CD bloqueador (improvável)

### Escalação

Se durante implementação surgir:
- **Ambiguidade em spec:** Consultar TSD; se ainda incerto, escalate para Arquiteto
- **Performance issue:** Benchmark <100ms; se falhar, considerar indexação ou escalate
- **Memory leak:** Chrome DevTools Memory Profile; if confirmed, escalate para Lead Dev
- **Coverage fall:** Se teste não bate 80%, adicionar testes (não reduzir cobertura)

---

## Checklist Final — Ready to Implement

- [x] TBRD v1.0 completo com 6 seções
- [x] 10 tasks sequenciadas com dependências claras
- [x] Cada task com AC específica (não genérica)
- [x] Tempo total ≥ IPD baseline (~17.5h com slack)
- [x] Zero placeholders
- [x] DoD squad definido
- [x] Matriz riscos documentada
- [x] Handoff para implementer pronto
- [x] Arquivo salvo: `.memory-bank/specs/board-search/board-search-v1.0.tbrd.md`

✅ **Status: 🟢 Ready for Implementation**

---

**Documento preparado:** 19 de abril de 2026  
**Versão:** 1.0  
**Fonte:** IPD v1.0 (95/100) + TSD v1.0 (87/100)  
**Próximo passo:** Implementer inicia Task 1 (cardSearch.ts)
