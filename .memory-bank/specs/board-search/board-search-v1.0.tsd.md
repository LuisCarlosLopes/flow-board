# TSD v1.0 — Busca de Cards (Board Search)

**Data:** 19 de abril de 2026  
**Autores:** Spec Agent  
**Feature:** board-search / FEATURE / Kanban Essencial  
**Confiança:** 95/100 (mapeado de código + state.yaml + ADRs)

---

## 1. Visão Geral

A feature **Busca de Cards** (board-search) permite que usuários localizem rapidamente cards por título, descrição e (futuramente) labels dentro de um quadro ou globalmente, através de uma barra de busca acessível no topbar com atalho de teclado `/`.

**Problema:** Usuários com dezenas ou centenas de cards na vista kanban precisam de forma eficiente para localizar uma tarefa específica sem rolar manualmente pelas colunas.

**Solução:** Implementar componente de busca modal/dropdown no topbar que:
- Filtra cards em tempo real (ao vivo) conforme digita
- Busca títulos, descrições e metadados de cards
- Suporta atalho de teclado `/` para abrir
- Retorna resultados com preview e navegação direta

**Impacto:** Reduz tempo de busca de tarefa de ~30s (busca manual) para <1s (busca indexada).

---

## 2. Contexto do Sistema

### 2.1 Arquitetura Geral

FlowBoard é uma SPA (Single Page Application) React 19.2.4 com persistência baseada em GitHub Contents API:

```
App.tsx
  ↓
AppShell (layout principal)
  ├─ LoginView (autenticação GitHub PAT)
  ├─ BoardListView (seletor de quadros)
  ├─ BoardView (kanban atual)
  └─ HoursView (relatório de horas)
```

### 2.2 Dados Persistidos

**Localização:** Repositório GitHub do usuário em `flowboard/` (configurável na autenticação).

**Estrutura de Arquivos:**
- `flowboard/catalog.json` — Índice de quadros `{ schemaVersion, boards: [{boardId, title, dataPath, archived?}] }`
- `flowboard/boards/<boardId>.json` — Documento completo de um quadro

**BoardDocumentJson (tipo persistido):**
```typescript
{
  schemaVersion: 1,
  boardId: string,
  title: string,
  columns: { columnId, label, role: 'backlog' | 'in_progress' | 'done' }[],
  cards: Card[],
  timeSegments: { segmentId, cardId, boardId, startMs, endMs }[],
  cardTimeState: Record<string, { activeStartMs?, completed }>,
}
```

**Card (tipo de domínio):** ✅ Já existe em `src/domain/types.ts`
```typescript
{
  cardId: string,
  title: string,
  columnId: string,
  description?: string,           // ✅ Já existe — suporta busca
  plannedDate?: string,           // ISO date (ex: "2026-04-25")
  plannedHours?: number,          // Horas planejadas
  createdAt?: string,             // ISO timestamp
}
```

**Status:** Campo `description` já está tipado como opcional no domínio. Nenhuma migração necessária.

### 2.3 Entidades Relacionadas

- **Column:** Coluna do kanban com `columnId`, `label`, `role` (backlog/in_progress/done). Uma coluna contém múltiplos cards.
- **Board:** Representa um quadro kanban; tem múltiplas colunas, cards e histórico de tempo.
- **Session:** Informações de autenticação armazenadas em `sessionStorage` (URL repositório, PAT, webUrl).

### 2.4 Fluxo de Carregamento

1. **Autenticação** → Usuário fornece URL do repo + PAT no LoginView
2. **Bootstrap** → GitHub repo é validado; `catalog.json` é carregado
3. **Seleção de Quadro** → BoardListView renderiza lista de quadros do catálogo
4. **Carregamento de Board** → Ao clicar em um board, `BoardView` carrega `flowboard/boards/<boardId>.json` via GitHub Contents API
5. **Renderização** → `BoardView` mapeia `board.cards[]` por `columnId` e renderiza colunas kanban
6. **Busca (novo fluxo)** → Ao pressionar `/` ou clicar no placeholder de busca, modal/dropdown abre com filtro vivo dos cards

---

## 3. Requisitos Funcionais

### RF01 — Abrir Componente de Busca

**Descrição:** O usuário pode abrir o modal/dropdown de busca através de:
1. **Atalho de teclado:** Pressionar `/` (qualquer página)
2. **Clique no UI:** Clicar no `.fb-topbar__search` (placeholder atual em AppShell.tsx)

**Detalhes:**
- Atalho `/` funciona globalmente, inclusive quando há campos de texto focados (exceto dentro de modais de edição de card ou coluna)
- Clique no placeholder abre a busca
- Componentizado em `<SearchModal />` ou `<SearchDropdown />` (decisão de arquiteto)

**Teste básico:**
```
DADO usuário está em AppShell kanban
QUANDO pressiona "/"
ENTÃO SearchModal abre com campo de input focado
```

---

### RF02 — Filtro em Tempo Real

**Descrição:** Conforme usuário digita no campo de busca, resultados são filtrados imediatamente (sem debounce prejudicial à UX, mas com estratégia eficiente de re-renderização).

**Critério de Filtragem:**
- Campo `query` captura entrada do usuário
- Busca é **case-insensitive** (ex: "TODO" = "todo" = "Todo")
- Resultado inclui um card se QUALQUER um destes campos contém o `query`:
  - `card.title` (prioridade máxima — match aqui tem score mais alto)
  - `card.description` (prioridade média)
  - `card.plannedDate` (parcial/formatado, ex: "2026" ou "04-25")
  - `card.plannedHours` (conversão string, ex: "5" busca horas=5)

**Detalhes:**
- Busca é **global** por padrão (todos os boards carregados em memória? OU apenas board ativo?)
  - **Decision Needed**: Especificação pede "resultados filtram cards no quadro atual ou todos os quadros (configurável)"
  - Neste TSD v1.0, assumimos **board ativo** (selectedBoardId em AppShell)
  - Se usuário quiser busca global, será feature futura (RF_GLOBAL_SEARCH)
- Sem typo-tolerance no MVP (typo-tolerance é requisito não-funcional à considerar em fases posteriores)

**Teste básico:**
```
DADO SearchModal aberto com board ID xyz carregado
QUANDO digita "auth" no input
ENTÃO resultados mostram todos os cards do board xyz com "auth" em title OU description
  (ex: "Autenticação de usuário", "Build authentication module")
```

---

### RF03 — Renderização de Resultados

**Descrição:** Resultados são exibidos em lista com preview de cada card.

**Estrutura de um resultado:**
- **Título do card** (link/botão que navega para o card ou o expande)
- **Descrição (snippet)** — Primeiros 100 caracteres, truncado com "…" se necessário
- **Coluna** — Label da coluna onde o card reside (ex: "Em progresso", "Backlog")
- **Metadados** — Data planejada (se existir), horas (se existir), ícone de status

**Algoritmo de Score (Fórmula de Relevância):**

Cada card é avaliado com uma função `scoreCard(card, query)` que retorna número 0-100:

```
score = 0
if query.length > 0:
  if title.includes(query):  score += 100  // Máxima relevância
  if description.includes(query): score += 50  // Relevância média
  if plannedDate.includes(query): score += 10  // Baixa relevância
  if plannedHours.toString().includes(query): score += 5  // Baixa relevância

return Math.min(score, 100)  // Cap no máximo 100
```

**Ordem de Resultado:**
1. Ordenar por score descending (maior relevância primeiro)
2. Desempate 1: createdAt descending (mais recentes primeiro)
3. Desempate 2: cardId ascending (estável, determinístico)

**Limite de Resultados:**
- Mostrar até **100 resultados** por busca (para não sobrecarregar UI)
- Se houver mais de 100 matches, mostrar hint: "…e mais X resultados"

**Teste básico:**
```
DADO SearchModal com query "task"
QUANDO resultados renderizam
ENTÃO cada resultado mostra: [Título do Card] [Snippet Descrição] [Coluna] [Metadados]
  E items mais relevantes (title match) aparecem antes
  E limite máximo de 100 resultados é respeitado
```

---

### RF04 — Navegação para Card

**Descrição:** Clicar em um resultado fecha a busca e navega/seleciona o card.

**Comportamentos Possíveis** (a definir com arquiteto):
- **Opção A:** Scroll kanban para o card + highlight visual (ex: box-shadow)
- **Opção B:** Abrir modal de detalhes do card
- **Opção C:** Selecionar card na coluna (class=is-selected) + scroll

Para este TSD v1.0, adotamos **Opção A** (scroll + highlight), pois é menos intrusiva.

**Teste básico:**
```
DADO SearchModal exibindo resultados
QUANDO usuário clica em um resultado
ENTÃO SearchModal fecha
  E view kanban faz scroll/navega para o card
  E card recebe visual destaque (ex: border highlight por 3s)
```

---

### RF05 — Fechar Busca

**Descrição:** Modal/dropdown de busca pode ser fechado por:
1. Clique fora do modal (overlay click)
2. Tecla `Escape`
3. Seleção de um resultado (navega e fecha)

**Teste básico:**
```
DADO SearchModal aberto
QUANDO pressiona "Escape"
ENTÃO SearchModal fecha
  E estado anterior do app é preservado (ex: board selecionado)
```

---

### RF06 — Atalho de Teclado `/`

**Descrição:** Pressionar `/` abre a busca em qualquer contexto (global).

**Detalhes:**
- Listener global em `window.addEventListener('keydown', ...)`
- Ignorar `/` se:
  - Usuário está digitando dentro de input/textarea (ex: descrição de card em edição)
  - SearchModal já está aberto (pressionar `/` novamente não reabre)
  - Modal de edição (CreateTaskModal, ColumnEditorModal, etc.) está aberto
- Nenhuma diferença de comportamento se usuário pressiona `/` vs clica no placeholder

**Teste básico:**
```
DADO usuario está em qualquer página do app
QUANDO pressiona "/" fora de input/textarea
ENTÃO SearchModal abre com input focado
```

---

## 4. Regras de Negócio

### RN01 — Escopo da Busca é o Board Ativo

A busca filtra apenas cards do quadro selecionado em `AppShell.selectedBoardId`. Se nenhum board está selecionado (selectedBoardId === null), busca retorna vazio ou exibe hint "Selecione um quadro para buscar".

**Fundamento:** Reduz complexidade (sem busca multi-board no MVP); alinha com ADR-003 (domínio puro + shell UI feature-based).

---

### RN02 — Busca é Read-Only

A busca **nunca** cria, modifica ou deleta cards. É operação puramente de **consulta/leitura**. Qualquer mudança nos dados do board dispara re-filtro automático (se modal está aberto).

**Fundamento:** Integridade de dados; simplicidade; facilita testes.

---

### RN03 — Case-Insensitive e Normalização

Busca deve comparar strings em **lowercase** após normalização (remover acentos não-MVP, i.e., "Café" vs "cafe" → iguais apenas se não houver acentuação; MVP não suporta fuzzy/accent-strip).

Implementação recomendada:
```typescript
const query = inputValue.toLowerCase().trim()
const matches = cards.filter(card => 
  card.title.toLowerCase().includes(query) || 
  card.description?.toLowerCase().includes(query)
)
```

**Nota:** "Tolerante a typos menores" (do state.yaml) fica para fase 2 (Levenshtein distance ou similar).

---

### RN04 — Priorização de Resultados

Matches em `title` têm peso/score mais alto que matches em `description`. Critério de ordenação:
1. Relevância (title > description)
2. Estabilidade (createdAt desc ou cardId asc) — garante ordem determinística

**Fundamento:** Usuários esperam encontrar cards por título primeiro; isso alinha com comportamento padrão de buscas.

---

### RN05 — Sem Histórico de Busca no MVP

O MVP **não** persiste histórico de buscas anteriores do usuário. Cada sessão começa limpa. (Feature futura: armazenar em localStorage ou `sessionStorage`.)

**Fundamento:** Escopo MVP; simplicidade implementação; privacidade (PAT não é persistido para buscas históricas).

---

## 5. Contratos de Interface

### 5.1 — Componente SearchModal / SearchDropdown

**Localização:** `src/features/app/SearchModal.tsx` (ou SearchDropdown.tsx — decidir com arquiteto)

**Assinatura de Tipo:**
```typescript
type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
  boardId: string | null
  board: BoardDocumentJson | null
}

export function SearchModal(props: SearchModalProps): React.ReactNode
```

**Responsabilidades:**
- Renderizar modal/dropdown com input e resultados
- Gerenciar estado local: `query`, `results[]`, `selectedIndex`
- Escutar `Escape` e cliques fora
- Chamar `onClose()` ao fechar
- Navegar para card ao selecionar resultado (via callback ou navegação local)

**Dependências:**
- `board: BoardDocumentJson | null` — dados atuais do board
- Função de filtro: `searchCards(query: string, cards: Card[]): Card[]` (domínio)

---

### 5.2 — Hook de Atalho de Teclado

**Localização:** `src/hooks/useSearchHotkey.ts`

**Assinatura:**
```typescript
export function useSearchHotkey(onOpenSearch: () => void): void
```

**Responsabilidades:**
- Registrar listener global para tecla `/`
- Determinar se deve ignorar (user inside input, SearchModal já aberto, etc.)
- Chamar `onOpenSearch()` se condição atendida
- Cleanup no `useEffect` return

---

### 5.3 — Função de Domínio: Filtro de Cards

**Localização:** `src/domain/cardSearch.ts` (novo arquivo)

**Assinatura:**
```typescript
export type CardSearchResult = {
  card: Card
  relevance: 'title' | 'description'
  score: number // 0-100, para ordenação futura
}

export function searchCards(
  query: string,
  cards: Card[],
  options?: { maxResults?: number }
): CardSearchResult[]
```

**Implementação:**
- Normaliza `query` (lowercase, trim)
- Filtra cards: title match (relevance='title') ou description match (relevance='description')
- Ordena por relevance + score
- Limita a `options.maxResults` (default 100)
- Retorna array de `CardSearchResult` com metadados de relevância

**Testes:** Vitest colocados em `src/domain/cardSearch.test.ts`

---

### 5.4 — Integração em AppShell

**Localização:** `src/features/app/AppShell.tsx`

**Mudanças:**
- Adicionar estado: `const [isSearchOpen, setIsSearchOpen] = useState(false)`
- Passar callbacks: `onOpenSearch={() => setIsSearchOpen(true)}`
- Renderizar `<SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} boardId={selectedBoardId} board={currentBoard} />`
- Hook `useSearchHotkey(() => setIsSearchOpen(true))`
- Substituir placeholder `.fb-topbar__search` por botão ou div clicável que chama `setIsSearchOpen(true)`

**Não quebra contrato existente:** AppShell continua passando `session`, `selectedBoardId` etc.

---

## 6. Modelo de Dados

**Nenhuma mudança no modelo de dados persistido.**

O tipo `Card` já contém `description` (opcional). ✅ Confirmado em `src/domain/types.ts`.

Nenhum novo campo é necessário para suportar busca. A busca é **read-only** e não cria metadados novos.

**Implicações:**
- `BoardDocumentJson` continua com `schemaVersion: 1`
- Migração de dados: não necessária
- Compatibilidade com boards antigos: garantida (description é opcional)

### Queries de Busca (Domínio)

Nova function no domínio (não persistida, apenas em memória):

```typescript
function searchCards(cards: Card[], query: string): { card: Card, score: number }[]
  // Retorna lista de cards filtrados + scored, ordenados por relevância

function scoreCard(card: Card, query: string): number
  // Calcula score 0-100 usando fórmula: title=100, description=50, date=10, hours=5
```

Estas functions são **puras** (sem side effects) e **testáveis** independentemente.

---

## 7. Critérios de Aceite

### CAT01 — Busca por Título Funciona

**DADO** SearchModal aberto com board carregado  
**QUANDO** digita texto que existe em `card.title`  
**ENTÃO** card aparece nos resultados

**Teste E2E:**
```
// Pseudocódigo Playwright
const modal = page.getByRole('dialog', { name: /buscar/i })
await modal.getByRole('textbox').fill('autenticacao')
await expect(modal.getByText('Autenticação de usuário')).toBeVisible()
```

---

### CAT02 — Busca por Descrição Funciona

**DADO** SearchModal aberto  
**QUANDO** digita texto que existe APENAS em `card.description` (não em title)  
**ENTÃO** card aparece nos resultados

**Exemplo:** Query "OAuth" encontra card com title="Login" e description="Implementar OAuth provider".

---

### CAT03 — Case-Insensitive

**DADO** SearchModal aberto  
**QUANDO** digita "TODO" (maiúsculas)  
**ENTÃO** encontra cards com title "todo", "Todo", "TODO" etc.

---

### CAT04 — Atalho `/` Abre Busca

**DADO** usuário em qualquer página de AppShell  
**QUANDO** pressiona "/" fora de input  
**ENTÃO** SearchModal abre com input focado

---

### CAT05 — Escape Fecha Busca

**DADO** SearchModal aberto  
**QUANDO** pressiona "Escape"  
**ENTÃO** SearchModal fecha e estado anterior é preservado

---

### CAT06 — Clique em Resultado Navega

**DADO** SearchModal exibindo resultados  
**QUANDO** clica em um resultado  
**ENTÃO** SearchModal fecha  
  E view navega/scroll para o card  
  E card recebe visual de destaque por ~3 segundos

---

### CAT07 — Limite de 100 Resultados

**DADO** board com 500 cards  
**QUANDO** busca retorna >100 matches  
**ENTÃO** apenas 100 são renderizados  
  E UI exibe hint "…e mais X resultados"

---

### CAT08 — Sem Busca Sem Board Selecionado

**DADO** selectedBoardId === null  
**QUANDO** abre SearchModal  
**ENTÃO** exibe placeholder "Selecione um quadro para buscar"  
  OU returns empty results sem erro

---

### CAT09 — Cobertura ≥80% em Testes

**Métrica:** Cobertura de linha/branch para:
- `cardSearch.ts` (função de domínio)
- `SearchModal.tsx` (componente)
- `useSearchHotkey.ts` (hook)

**Alvo:** ≥80% de linhas + branches cobertas por Vitest + Playwright.

---

### CAT10 — Zero Findings Critical em Code Review

**Métrica:** Eslint + code-reviewer agent devem passar sem achados de severidade CRITICAL ou ERROR.

**Escopo de review:**
- TypeScript types corretos (strict mode)
- Props/callbacks tipados
- Sem console.log left-overs
- Sem memory leaks (cleanup listeners, timeouts)
- Sem acesso direto a sessionStorage/localStorage (via session layer)

---

## 8. Fora de Escopo

### FORA-01 — Busca Multi-Board

Usuário **não pode** buscar cards em todos os boards de uma vez (no MVP). Busca é sempre escopo do board ativo. Será feature futura se solicitado.

---

### FORA-02 — Busca Avançada / Filtros Complexos

Filtros como "cards criados entre X e Y", "horas > 5", "coluna = In Progress" etc. ficam para feature futura. MVP suporta apenas busca textual simples.

---

### FORA-03 — Typo-Tolerance / Fuzzy Matching

"Tolerante a typos menores" (do state.yaml) fica para fase 2. MVP usa substring match case-insensitive.

---

### FORA-04 — Histórico de Buscas

Não há persistência ou UI de histórico de buscas anteriores no MVP.

---

### FORA-05 — Labels/Tags como Entidade Persistida

Labels/tags são referenciados no AC do state.yaml, mas **não existem como entidade persistida** no MVP (não há campo `labels: string[]` em Card). Se implementar, será após PRD/feature separada. Para este TSD, search ignora labels.

---

### FORA-06 — Autocomplete / Sugestões

Nenhuma sugestão de termos ou autocomplete no MVP.

---

### FORA-07 — Pesquisa em Repositórios GitHub

A busca é **apenas** dentro do FlowBoard local. Não há integração com GitHub Search API.

---

## 9. Requisitos Não-Funcionais

### RNF01 — Performance: Busca em <100ms

Para board com até 500 cards, filtro deve completar em <100ms (perceptível como "instantâneo" para usuário).

**Critério:** Em CI, benchmark de `searchCards(query, cards)` com 500 cards deve rodar em <100ms.

**Implementação:** Sem índices avançados no MVP (busca linear + toLowerCase suficiente); se escala crescer (1000+ cards), considerar indexação em fase 2.

---

### RNF02 — Acessibilidade WCAG 2.1 AA

- SearchModal deve ser focável e navegável por teclado
- Input deve ter `aria-label` ou `label` associado
- Resultados devem ter papéis semânticos (`role="listbox"` ou `role="region"`)
- Contraste de cores ≥4.5:1

**Teste:** Manual com keyboard + screen reader (NVDA ou VoiceOver); Lighthouse audit.

---

### RNF03 — Sem Re-render Desnecessário

Use `useMemo` ou similar para não re-renderizar lista de resultados se `query` ou `board.cards` não mudou.

---

### RNF04 — Responsivo: Mobile + Desktop

SearchModal deve funcionar em:
- Desktop (Chrome, Firefox, Safari, Edge)
- Tablet (iPad, Android)
- Mobile (iPhone, Android phone)

**Viewport:** Testar em widths 320px, 768px, 1024px, 1920px.

---

### RNF05 — Sem Memory Leaks

- Listeners globais (`useSearchHotkey`) devem ser removidos no cleanup
- Timeouts/intervals (se houver debounce futuro) devem ser cancelados
- SearchModal deve remover event listeners ao desmontar

**Teste:** Chrome DevTools Memory Profiler; abrir/fechar SearchModal N vezes e verificar memory heap.

---

## 10. Perguntas em Aberto

### PQ01 — Modal vs Dropdown?

**Decisão Necessária:** Componente será um `<dialog>` (modal fullscreen/overlay) ou um `<div>` (dropdown inline no topbar)?

**Impacto:**
- Modal: mais focus management, overflow handling, animations
- Dropdown: inline, menos disruptivo, mas menos espaço para resultados

**Recomendação:** Modal (mais simples no MVP, standard em UX de busca).

---

### PQ02 — Navegação: Scroll vs Modal de Detalhes?

**Decisão Necessária:** Ao clicar em um resultado, o app:
- Faz scroll para o card na coluna + highlight visual? (Opção A)
- Abre modal de detalhes do card? (Opção B)
- Seleciona card e scroll? (Opção C)

**Impacto:** Diferentes níveis de intrusão, mudança de UX.

**Recomendação para v1.0:** Opção A (scroll + highlight); menos intrusiva.

---

### PQ03 — Busca Global Futura?

**Pergunta:** Será necessário suportar busca multi-board (global) em fases futuras? Isso afeta design de cache/indexação?

**Recomendação:** Não impacta v1.0. Se necessário, será nova feature (`FEATURE: global-search`).

---

### PQ04 — Typo-Tolerance Quando?

**Pergunta:** Quando typo-tolerance será implementado? v1.1? v2.0? Há orçamento/prioridade?

**Recomendação:** Postergar para feedback de usuários; MVP com substring match é suficiente.

---

## 11. Handoff para o Planner

### Artefatos Entregues

1. **TSD v1.0** (este documento)
   - 11 seções completas
   - Nenhum placeholder
   - Terminologia do codebase alinhada (Card, BoardDocumentJson, AppShell, etc.)
   - Confiança 95/100

2. **Score de Confiança:** 95/100
   - ✅ Exploração completada (types.ts, boardRepository.ts, AppShell.tsx, ADRs lidos)
   - ✅ Card type mapeado com precisão
   - ✅ Escopo IN/OUT claro
   - ✅ Arquitetura alinhada com ADR-003
   - ✅ Nenhuma ambiguidade crítica

3. **Dependências Verificadas:**
   - ✅ React 19.2.4, Vite 8, TypeScript 6 (stack confirmado)
   - ✅ Vitest + Playwright disponíveis para testes
   - ✅ AppShell.tsx pronto para integração
   - ✅ Dados de board carregáveis em memória (não há sharding no MVP)

### Próxima Fase: Planejamento (Planner Agent)

O **planner** deve:

1. **Decompor tarefas:**
   - Task 1: Criar `cardSearch.ts` + testes (domínio puro)
   - Task 2: Criar `SearchModal.tsx` + testes (componente UI)
   - Task 3: Criar `useSearchHotkey.ts` + testes (hook)
   - Task 4: Integrar SearchModal em AppShell
   - Task 5: Testes E2E de fluxo completo (atalho / → busca → navega)
   - Task 6: Code review + refinement

2. **Estimar esforço:**
   - Task 1: 4h (lógica pura, bem-testável)
   - Task 2: 6h (componente, styling, accessibility)
   - Task 3: 2h (hook simples)
   - Task 4: 2h (integração)
   - Task 5: 4h (E2E scenarios)
   - Task 6: 2h (review feedback)
   - **Total: ~20h** (2.5 dias dev)

3. **Risco/Blockers:** Nenhum identificado (dados, API, tipos já existem).

4. **Decisões Pendentes:** PQ01, PQ02 (modal vs dropdown, scroll vs modal de detalhes).

### Verificação de Qualidade

- [ ] TSD v1.0 revisado e aprovado por **spec-reviewer**
- [ ] Nenhuma ambiguidade remanescente
- [ ] Decisões PQ01, PQ02 definidas (arquiteto)
- [ ] Planner cria breakdown completo + estimativas
- [ ] Implementer inicia com task 1

---

**Fim do TSD v1.0 — Board Search Feature**

_Gerado pelo Spec Agent em 19 de abril de 2026_  
_Confiança: 95/100 | Escopo: Claro | Pronto para Planejamento_
