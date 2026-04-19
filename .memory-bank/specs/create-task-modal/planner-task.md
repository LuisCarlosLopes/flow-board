# IPD — Create Task Modal (TASK track, score 4) — v1.0

> **Status:** Ready for Task Breakdown  
> **Agent:** planner  
> **Track:** TASK  
> **Created:** 2026-04-19  
> **Confidence:** 100/100  
> **Complexity:** M  
> **Migrations Needed:** No  

---

## 1. MISSÃO

Entregar um modal estruturado para criação de tarefas no FlowBoard com:
- 5 campos obrigatórios: título, descrição (Markdown), data planejada, horas previstas, data de criação (read-only)
- Validação client + feedback visual (toast ou spinner)
- Integração com modelo Task existente em src/domain/types.ts
- Persistência via GitHub API (via BoardRepository)
- Testes unitários (≥80% cobertura) e E2E com Playwright

**Critério de Sucesso (extraído de acceptance_criteria em state.yaml):**
- Modal exibe todos os 5 campos com labels e validação
- Descrição com Markdown renderiza corretamente na visualização
- Data planejada selecionável via HTML5 date input
- Data criação read-only, preenchida automaticamente com now()
- Horas previstas aceita números ≥0; rejeita inválidos com feedback
- Botão copy copia descrição para clipboard com feedback (toast)
- Task criada persiste em GitHub conforme spec-epic D3/D4
- Sem ESLint crítico; cobertura ≥80% em componente modal

---

## 2. ESTADO DO SISTEMA

### 2.1 Stack e Framework

- **Frontend:** React 19 + TypeScript 6.0
- **Styling:** CSS-in-JS (TailwindCSS não aparece em package.json; usar CSS inline ou `.css` modules ao padrão do projeto)
- **Componentes:** Modal pattern: ColumnEditorModal.tsx (referência existente)
- **Testes:** Vitest + happy-dom (unitário); Playwright (E2E — será adicionado)
- **Persistência:** GitHub Contents API via `src/infrastructure/github/client.ts` + `src/infrastructure/persistence/boardRepository.ts`

### 2.2 Zona de Trabalho (Módulos Afetados)

**Criação de arquivos:**
1. `src/components/CreateTaskModal.tsx` — componente modal principal
2. `src/hooks/useClipboard.ts` — hook auxiliar para clipboard com feedback (if needed)
3. `src/components/CreateTaskModal.test.tsx` — testes unitários
4. `tests/e2e/create-task.spec.ts` — testes E2E (Playwright) — **será criado**

**Modificação de arquivos:**
1. `src/features/board/BoardView.tsx` — adicionar state `showCreateModal` e botão trigger
2. `src/domain/types.ts` — estender tipo `Card` para incluir `description`, `plannedDate`, `plannedHours`, `createdAt` (ou criar `Task` type se necessário)

**NÃO tocar:**
- `src/domain/boardLayout.ts`, `boardRules.ts`, `timeEngine.ts` (lógica de reordenação não afetada)
- `src/infrastructure/github/client.ts` (usar API existente)
- `src/infrastructure/persistence/boardRepository.ts` (usar API existente)

### 2.3 Contratos que NÃO Podem Quebrar

1. **Card interface (src/domain/types.ts):**
   ```typescript
   type Card = {
     cardId: string
     title: string
     columnId: string
   }
   ```
   **Ação:** Estender com `description`, `plannedDate`, `plannedHours`, `createdAt` opcionalmente (backward compat: defaults para tarefas antigas).

2. **BoardDocumentJson (src/infrastructure/persistence/types.ts):**
   ```typescript
   type BoardDocumentJson = {
     schemaVersion: 1
     boardId: string
     cards: Card[]
     // ...
   }
   ```
   **Ação:** Sem mudanças de schema; novos campos no Card serão transparentes.

3. **BoardRepository.saveBoard():**
   ```typescript
   async saveBoard(boardId: string, doc: BoardDocumentJson, previousSha: string | null): Promise<void>
   ```
   **Ação:** Sem mudanças; modal chama isso após construir doc com novos campos.

4. **Drag-drop + card rendering em BoardView:**
   - Novos campos não devem quebrar renderização existente (title, hours, actions)
   - Modal fica isolado; não interfere com drag-drop

### 2.4 Padrões Detectados

1. **Modal Structure:** ColumnEditorModal.tsx oferece template:
   - Overlay + Dialog com `role="dialog"` e `aria-modal="true"`
   - Cancel/Apply buttons
   - Local state (draft) + onClose/onApply callback
   - Validação antes de submit + error display

2. **State Management:** React hooks (useState, useCallback) — **sem Redux/Zustand**

3. **Error Handling:** 
   - GitHub errors capturados como `GitHubHttpError` (status 409 → conflito)
   - Feedback via `window.alert()` (simples) ou render de error message (padrão aqui)

4. **Testing Padrão:**
   - Vitest: `describe()`, `it()`, `expect()`
   - Mock de dependências com `vi.mock()`
   - Exemplo: `src/domain/boardRules.test.ts`

5. **CSS Pattern:** `.css` files co-located (ColumnEditorModal.css next to .tsx)

---

## 3. ESPECIFICAÇÃO TÉCNICA

### 3.1 Contrato de API

**Input (Props):**
```typescript
type CreateTaskModalProps = {
  /** Coluna onde tarefa é inserida por padrão */
  defaultColumnId: string
  /** Documento de quadro atual (para leitura) */
  boardDoc: BoardDocumentJson
  /** Callback ao fechar (sem salvar) */
  onClose: () => void
  /** Callback ao criar com sucesso (após persistência) */
  onCreate: (card: Card, updatedDoc: BoardDocumentJson) => void
}
```

**Output (State persisted):**
```typescript
type NewCard = {
  cardId: string          // crypto.randomUUID()
  title: string           // from input
  description: string     // from textarea
  plannedDate: string     // ISO date (e.g. "2026-04-25")
  plannedHours: number    // >= 0
  createdAt: string       // ISO timestamp (new Date().toISOString())
  columnId: string        // defaultColumnId
}
```

### 3.2 Fluxo de Execução

```
1. User clicks "Nova tarefa" button in BoardView
   ↓
2. BoardView sets showCreateModal = true, mounts <CreateTaskModal>
   ↓
3. Modal renders with empty form:
   - Title input (required, max 200 chars)
   - Description textarea (required, Markdown allowed)
   - Planned Date input (type="date", required)
   - Planned Hours input (type="number", min=0, required)
   - Created At (read-only, shows new Date().toLocaleDateString())
   - Copy button (copies description to clipboard)
   ↓
4. User fills fields:
   - On blur/change: validate field individually
   - Display inline errors (e.g. "Horas deve ser ≥ 0")
   ↓
5. User clicks "Copiar" button:
   - Calls navigator.clipboard.writeText(description)
   - Shows toast or spinner for 1s ("Copiado!")
   ↓
6. User clicks "Criar" button:
   - Final validation (all fields)
   - If error: display error message, stay in modal
   - If OK:
     a) Create Card object with all fields
     b) Call repo.saveBoard() with updated BoardDocumentJson
     c) On success: onClose() → unmount modal, trigger reload
     d) On error (409 conflict): show error, allow retry
     e) On other error (401/403): show error, close modal
   ↓
7. User clicks "Cancelar" or clicks overlay background:
   - Call onClose() → unmount modal
   - Discard form data
```

### 3.3 Mapa de Alterações

| File | Action | Rationale |
|------|--------|-----------|
| `src/domain/types.ts` | MODIFY | Extend `Card` type with new fields OR create separate `TaskFields` type; backward compat via optional fields + defaults |
| `src/components/CreateTaskModal.tsx` | CREATE | New component; modal UI + validation + copy button |
| `src/components/CreateTaskModal.css` | CREATE | Styles (overlay, form, buttons) following ColumnEditorModal.css pattern |
| `src/hooks/useClipboard.ts` | CREATE | Custom hook for clipboard + feedback (reusable) |
| `src/components/CreateTaskModal.test.tsx` | CREATE | Unit tests; ≥80% coverage |
| `src/features/board/BoardView.tsx` | MODIFY | Add state `showCreateModal`, wire up "Nova tarefa" button, mount modal |
| `tests/e2e/create-task.spec.ts` | CREATE | Playwright E2E scenarios (happy path + validation) |

### 3.4 Decisões de Design

#### **D1: Date Picker — Native HTML5 vs Shadcn Button + Calendar**

**Decision:** Native HTML5 `<input type="date">`

**Rationale:**
- No shadcn/ui in package.json; would require new dep
- HTML5 date input has good mobile UX + accessibility
- Simple, no extra dependencies
- Matches MVP scope

**Risk:** Desktop/mobile inconsistency — mitigated by clear UX labeling

---

#### **D2: Toast for Feedback — Sonner, Alert, or Custom Spinner**

**Decision:** Custom spinner + text message (no external lib)

**Rationale:**
- Sonner not in package.json
- `window.alert()` used elsewhere (LoginView, BoardView) — but too jarring for copy feedback
- Custom spinner: `<span className="copying">Copiando...</span>` for 1s, then hide
- Keeps dependency footprint low

**Alternative considered:** Add Sonner if user prefers (out of scope for now)

---

#### **D3: Markdown Preview — Full Renderer vs Escape-Only**

**Decision:** Escape-only (safe HTML display, no full Markdown → HTML)

**Rationale:**
- No markdown lib in package.json
- Full preview would require markdown-it or remark (adds complexity)
- MVP: show description as plain text (will render as `<p>{description}</p>`)
- Future: can add markdown preview modal if needed

**Compromise:** Description field shows raw text in read-only section; user sees exactly what will be stored.

---

#### **D4: Validation — Client-only vs Server Echo**

**Decision:** Client-side validation + silent server validation (GitHub persist)

**Rationale:**
- Frontend validates: required fields, plannedHours ≥ 0, date format
- Server validation: implicit in schema (GitHub stores as JSON; no type checking beyond structure)
- If server rejects (409 conflict): show conflict message, allow retry with fresh data
- No explicit validation server-side in scope; rely on client UX

---

#### **D5: Form State — React Hooks vs Reducer**

**Decision:** `useState()` for each field (simple, matches ColumnEditorModal pattern)

**Rationale:**
- ColumnEditorModal uses individual useState for draft
- FlowBoard project pattern: hooks (no Redux)
- 5 fields → manageable with useState
- If future complexity: can refactor to useReducer

---

### 3.5 Dependências

**No new npm packages required** (stays within existing stack).

**Assumptions:**
- `navigator.clipboard` API available (modern browsers)
- `crypto.randomUUID()` available
- `new Date().toISOString()` for timestamp

---

## 4. DEFINITION OF DONE (DoD)

### Functional Requirements

- [ ] Modal component renders with 5 fields: title, description, plannedDate, plannedHours, createdAt
- [ ] Each field has label + required validation
- [ ] Title field: max 200 chars
- [ ] Description field: textarea, any text allowed
- [ ] Planned Date: HTML5 date input, ISO format stored
- [ ] Planned Hours: number input, min 0, rejects negative
- [ ] Created At: read-only, auto-filled with current date/time
- [ ] Copy button copies description to clipboard
- [ ] Toast/spinner shows "Copiado!" after copy
- [ ] Cancel button closes modal without saving
- [ ] Escape key closes modal without saving
- [ ] Click outside modal closes modal without saving (optional but nice)
- [ ] Create button triggers validation
- [ ] On validation error: display error message, stay in modal
- [ ] On success: new Card persisted to GitHub, modal closes, BoardView reloads

### Non-Functional Requirements

- [ ] No ESLint errors (eslint . must pass)
- [ ] Component test coverage ≥80% (`npm test -- CreateTaskModal`)
- [ ] No console warnings/errors in browser
- [ ] Accessibility: ARIA labels, semantic HTML, keyboard navigation
- [ ] Styles consistent with existing modal (ColumnEditorModal.css)
- [ ] Backward compatible: old cards without new fields still render (with defaults)

### Edge Cases & Negative Tests

- [ ] Empty title → error message
- [ ] Empty description → error message
- [ ] Negative hours → error message
- [ ] Future date selection (date picker allows) → accepted (no validation limit)
- [ ] Concurrent writes (user A, user B write same time) → 409 conflict, show message
- [ ] Network error while saving → show error, allow retry
- [ ] Clipboard API unavailable → graceful fallback (inform user)
- [ ] Modal unmounts while request pending → no memory leaks/orphaned requests

### E2E Scenarios (Playwright)

1. **Happy Path:** Open modal → fill form → click copy → verify feedback → create task → verify in board
2. **Validation:** Try to create with empty title → verify error shown
3. **Copy Feedback:** Click copy button → verify toast/spinner visible
4. **Cancel:** Open modal → click cancel → verify modal closes, form data lost
5. **Keyboard:** Open modal → press Escape → verify modal closes

---

## 5. GUARDRAILS

### Prohibited Patterns

1. **Do NOT:**
   - Add new external dependencies (Sonner, markdown libs) without explicit approval
   - Mutate existing Card interface in a way that breaks old saved boards
   - Persist PAT or credentials in form data
   - Use `prompt()` for title (use modal form field)

2. **MUST:**
   - Validate plannedHours ≥ 0 before persistence
   - Call `repo.saveBoard()` with correct SHA (use current doc SHA)
   - Handle GitHub 409 conflict gracefully (reload + retry UI)
   - Escape/sanitize description before rendering (even though it's plain text)

3. **Project-Specific Conventions:**
   - Modal files: `.tsx` + `.css` co-located
   - Tests: `.test.tsx` in same dir
   - No Tailwind (use CSS files like existing project)
   - Error handling: try-catch + explicit error messages
   - Accessibility: `role="dialog"`, `aria-modal="true"`, labels for inputs

---

## 6. TESTES

### Unit Tests (Vitest + happy-dom)

**File:** `src/components/CreateTaskModal.test.tsx`

**Coverage (≥80%):**

1. **Rendering:**
   - [ ] Modal renders with all 5 fields
   - [ ] Fields have correct labels
   - [ ] Created At shows current date (read-only)
   - [ ] Buttons present: Copy, Create, Cancel

2. **Validation:**
   - [ ] Empty title → error shown
   - [ ] Empty description → error shown
   - [ ] Negative hours → error shown
   - [ ] Valid form → no errors
   - [ ] After error fixed → error disappears

3. **Interactions:**
   - [ ] Copy button calls navigator.clipboard.writeText
   - [ ] Copy feedback (spinner/toast) visible ≥1s
   - [ ] Cancel button triggers onClose
   - [ ] Create button validates + calls onCreate if valid
   - [ ] Escape key closes modal (if implemented)

4. **Edge Cases:**
   - [ ] Clipboard API unavailable → graceful fallback
   - [ ] Very long title/description → truncated/scrollable as expected

**Mocking:**
- Mock `navigator.clipboard` with `vi.mock('navigator', { ... })`
- Mock `crypto.randomUUID()` to return predictable ID
- Mock `repo.saveBoard()` success/conflict/error scenarios

---

### E2E Tests (Playwright)

**File:** `tests/e2e/create-task.spec.ts`

**Scenarios:**

1. **Happy Path:**
   ```
   1. Navigate to FlowBoard board
   2. Click "Nova tarefa" button
   3. Fill title, description, select date, enter hours
   4. Click copy button → verify "Copiado!" appears
   5. Click "Criar" button
   6. Verify modal closes
   7. Verify new card appears in backlog column
   8. Verify all fields persisted correctly
   ```

2. **Validation Error:**
   ```
   1. Open modal
   2. Leave title empty
   3. Click "Criar"
   4. Verify error message shown
   5. Fill title
   6. Click "Criar"
   7. Verify task created (now valid)
   ```

3. **Cancel:**
   ```
   1. Open modal
   2. Fill form partially
   3. Click "Cancelar"
   4. Verify modal closes, form data discarded
   5. Open modal again
   6. Verify form is empty (fresh state)
   ```

4. **Keyboard Escape:**
   ```
   1. Open modal
   2. Press Escape
   3. Verify modal closes
   ```

---

## 7. RISCOS E PONTOS DE ATENÇÃO

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| **GitHub 409 conflict** (concurrent writes) | Medium | Task not created, user frustrated | Show clear error + reload + retry UI |
| **Clipboard API unavailable** | Low | Copy fails silently | Feature-detect + fallback (alert or disabled button) |
| **Markdown in description causes issues** | Low | Description looks wrong or breaks display | Decision D3: escape-only for MVP; document for future |
| **Card schema change breaks old boards** | Medium | Old saved cards fail to load | Backward compat: make new fields optional with defaults |
| **Modal stays open after network error** | Low | UX confusion | Always close modal on completion (success or final error) |
| **Accessibility not tested** | Medium | Users with screen readers struggle | Cover ARIA labels + keyboard nav in E2E |

---

## 8. SUGESTÕES FORA DE ESCOPO

1. **Bulk card creation** — not in scope; future feature
2. **Card templates** — not in scope
3. **Markdown live preview** — out of scope; use Decision D3 (escape-only) for MVP
4. **Drag-drop upload for card image** — not in scope
5. **Recurring tasks** — not in scope
6. **Add Toast library** — out of scope; use simple spinner/text
7. **Edit existing tasks** — explicitly out of scope (RF07 in TSD allows title edit only, via prompt)
8. **Multiple boards create in parallel** — future optimization

---

## 9. SEQUÊNCIA DE IMPLEMENTAÇÃO

### Task 1: Extend Domain Types

**Files:** `src/domain/types.ts`

**What:** Add optional fields to Card:
```typescript
type Card = {
  cardId: string
  title: string
  columnId: string
  description?: string
  plannedDate?: string  // ISO date
  plannedHours?: number
  createdAt?: string    // ISO timestamp
}
```

**Why First:** All downstream components need the schema.

**Definition of Done:**
- [ ] Type compiles without errors
- [ ] Old cards (without new fields) still valid
- [ ] Tested in a simple integration (render a card with + without new fields)

---

### Task 2: Build useClipboard Hook

**Files:** `src/hooks/useClipboard.ts`

**What:** Custom hook that wraps `navigator.clipboard.writeText()`:
```typescript
export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false)
  
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback: user.alert? Or leave silent?
    }
  }
  
  return { copy, isCopied }
}
```

**Why:** Reusable, testable, isolates clipboard logic.

**Definition of Done:**
- [ ] Hook exports `copy()` and `isCopied` state
- [ ] Copy feedback visible for ≥1s
- [ ] Errors caught gracefully
- [ ] Unit test with mock navigator.clipboard

---

### Task 3: Create Modal Component

**Files:** 
- `src/components/CreateTaskModal.tsx`
- `src/components/CreateTaskModal.css`
- `src/components/CreateTaskModal.test.tsx`

**What:** React component with form, validation, integration with useClipboard.

**Form Structure:**
```tsx
<div className="fb-ctmod-overlay" role="dialog" aria-modal="true" aria-labelledby="fb-ctmod-title">
  <div className="fb-ctmod">
    <h2 id="fb-ctmod-title">Criar tarefa</h2>
    
    {/* Title */}
    <label>
      Título (obrigatório)
      <input type="text" maxLength={200} />
    </label>
    
    {/* Description */}
    <label>
      Descrição (obrigatório)
      <textarea />
    </label>
    
    {/* Planned Date */}
    <label>
      Data planejada (obrigatório)
      <input type="date" />
    </label>
    
    {/* Planned Hours */}
    <label>
      Horas previstas (obrigatório, ≥0)
      <input type="number" min="0" />
    </label>
    
    {/* Created At (read-only) */}
    <label>
      Criado em (read-only)
      <input type="text" readOnly value={new Date().toLocaleDateString()} />
    </label>
    
    {/* Copy Button */}
    <button onClick={handleCopy}>
      {isCopied ? '✓ Copiado!' : 'Copiar descrição'}
    </button>
    
    {/* Error */}
    {error && <div role="alert" className="error">{error}</div>}
    
    {/* Actions */}
    <button onClick={onClose}>Cancelar</button>
    <button onClick={handleCreate}>Criar</button>
  </div>
</div>
```

**Validation Logic:**
```typescript
function validate(): string | null {
  if (!title.trim()) return 'Título é obrigatório'
  if (!description.trim()) return 'Descrição é obrigatória'
  if (!plannedDate) return 'Data é obrigatória'
  if (plannedHours < 0) return 'Horas deve ser ≥ 0'
  return null
}
```

**Create Logic:**
```typescript
async function handleCreate() {
  const err = validate()
  if (err) {
    setError(err)
    return
  }
  
  const newCard: Card = {
    cardId: crypto.randomUUID(),
    title: title.trim(),
    columnId: defaultColumnId,
    description,
    plannedDate,
    plannedHours,
    createdAt: new Date().toISOString(),
  }
  
  const nextDoc = structuredClone(boardDoc)
  nextDoc.cards = [...nextDoc.cards, newCard]
  
  try {
    await repo.saveBoard(boardId, nextDoc, currentSha)
    onCreate(newCard, nextDoc)
  } catch (e) {
    if (e instanceof GitHubHttpError && e.status === 409) {
      setError('Conflito ao salvar. Recarregando...')
      // Optionally: reload board + retry UI
    } else {
      setError(e instanceof Error ? e.message : 'Erro ao criar tarefa')
    }
  }
}
```

**Definition of Done:**
- [ ] All 5 fields render with labels
- [ ] Validation errors shown inline
- [ ] Copy button works with useClipboard hook
- [ ] Create button validates + persists + calls onCreate
- [ ] Cancel button calls onClose
- [ ] CSS styles (overlay, form, buttons) match ColumnEditorModal.css pattern
- [ ] Unit test coverage ≥80%
- [ ] No ESLint errors

---

### Task 4: Integrate Modal in BoardView

**Files:** `src/features/board/BoardView.tsx`

**What:** Wire up modal trigger + mount component.

**Changes:**
```typescript
// Existing state
const [colModal, setColModal] = useState(false)

// ADD THIS:
const [createTaskModal, setCreateTaskModal] = useState(false)

// Existing handleAddCard logic might change:
// Instead of inline card creation, now opens modal

function handleOpenCreateModal() {
  const firstBacklog = doc?.columns.find((c) => c.role === 'backlog')?.columnId
  if (firstBacklog) {
    setCreateTaskModal(true)
    // Store defaultColumnId in state or pass directly
  }
}

function handleCreateTask(newCard: Card, updatedDoc: BoardDocumentJson) {
  setDoc(updatedDoc)
  setSha(updatedDoc.sha) // Assuming repo response has sha
  setCreateTaskModal(false)
  // Optional: toast "Tarefa criada!"
}

// In JSX, replace old "Nova tarefa" button handler:
// OLD: onClick={handleAddCard}
// NEW: onClick={handleOpenCreateModal}

// Add modal rendering:
{createTaskModal && doc ? (
  <CreateTaskModal
    boardDoc={doc}
    defaultColumnId={firstBacklog}
    onClose={() => setCreateTaskModal(false)}
    onCreate={handleCreateTask}
  />
) : null}
```

**Definition of Done:**
- [ ] "Nova tarefa" button opens modal
- [ ] Modal receives correct props
- [ ] Modal.onCreate() updates BoardView state
- [ ] Modal.onClose() dismisses modal
- [ ] No TypeScript errors
- [ ] Existing drag-drop + other features still work

---

### Task 5: Write Unit Tests

**Files:** `src/components/CreateTaskModal.test.tsx`

**Coverage:**
- [ ] Rendering tests (fields, labels, buttons)
- [ ] Validation tests (error messages)
- [ ] Interaction tests (click, copy, create)
- [ ] Edge cases (clipboard unavailable, network error)
- [ ] Accessibility tests (aria labels, role)

**Minimum coverage ≥80%.**

**Definition of Done:**
- [ ] `npm test -- CreateTaskModal` passes
- [ ] Coverage report shows ≥80%
- [ ] No failing tests

---

### Task 6: Write E2E Tests (Playwright)

**Files:** `tests/e2e/create-task.spec.ts`

**Scenarios:**
1. Happy path (fill form → create → verify in board)
2. Validation errors (empty fields)
3. Cancel flow
4. Keyboard escape
5. Copy button feedback

**Definition of Done:**
- [ ] All 5 scenarios pass
- [ ] `npm run test:e2e` (or equivalent) succeeds
- [ ] No flaky tests

---

## 10. MATRIZ RISCO × TESTE

| Risk | Unit Test | E2E Test | Impact If Missed |
|------|-----------|----------|------------------|
| Validation logic broken | ✅ Mock inputs, verify errors | ✅ Real form input | Task created with invalid data |
| Clipboard fails | ✅ Mock navigator | ⚠ Maybe (browser-dependent) | Copy button broken in deployment |
| Modal doesn't unmount | ✅ Check unmount cleanup | ✅ Navigate away + open again | Memory leaks, state pollution |
| GitHub 409 conflict | ✅ Mock repo.saveBoard error | ✅ Concurrent writes (harder) | Data loss or duplicate cards |
| Accessibility broken | ⚠ Limited in JSDOM | ✅ Screen reader test | Unnavigable for assistive tech |
| Field validation order | ✅ Unit test each field | ✅ E2E fill form sequentially | User confusion on error priority |

---

## 11. SUMÁRIO PARA TASK-BREAKDOWN

### Implementation Order (Recommended)

**Sequence:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

**Why this order:**
- Task 1 (types) must be first (downstream dependency)
- Task 2 (hook) can be parallel to Task 3, but Task 3 depends on it
- Task 3 (component) is main deliverable; Task 4 (integration) depends on it
- Task 5–6 (tests) validate Tasks 1–4

**Estimated effort per task:**
- Task 1: 30 min (type extension, backward compat check)
- Task 2: 45 min (useClipboard + unit test)
- Task 3: 2–2.5 hours (modal form + validation + CSS + tests ≥80%)
- Task 4: 30 min (wire up in BoardView)
- Task 5: 1–1.5 hours (unit test suite)
- Task 6: 1–1.5 hours (E2E scenarios)

**Total:** ~6–7.5 hours

---

### Acceptance Criteria Summary

**For task-breakdown agent to decompose into 6 sub-tasks:**

Each sub-task must have:
1. **Input:** Clear state/props entering the task
2. **Output:** Testable artifact (component, hook, tests, integration)
3. **Definition of Done:** Checklist from sections above
4. **Dependencies:** Task 1 ← Task 2, 3 ← Task 4, 5–6 after 1–4
5. **Guardrails:** No external deps, backward compat, accessibility

---

### Files Created vs Modified

**CREATE (6 files):**
- `src/domain/types.ts` ← extended (not new, but modified significantly)
- `src/components/CreateTaskModal.tsx`
- `src/components/CreateTaskModal.css`
- `src/components/CreateTaskModal.test.tsx`
- `src/hooks/useClipboard.ts`
- `tests/e2e/create-task.spec.ts`

**MODIFY (1 file):**
- `src/features/board/BoardView.tsx` (add state + modal mounting)

**TOTAL TOUCH:** 7 files (6 new, 1 modified)

---

### Key Decisions Logged

| Decision | Chosen | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Date picker | HTML5 native | Shadcn + Calendar | No external deps; good mobile UX |
| Toast lib | Custom spinner | Sonner | Keep deps minimal |
| Markdown preview | Escape-only | Full markdown renderer | MVP simplicity; future enhancement |
| Validation | Client-only | Server echo | Implicit GitHub validation sufficient |
| Form state | useState per field | useReducer | Simpler, matches project pattern |

---

## 12. METADADOS

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Agent** | planner |
| **Created** | 2026-04-19 |
| **Confidence Score** | 100/100 |
| **Complexity** | M |
| **Files to Create** | 5 |
| **Files to Modify** | 2 |
| **Estimated Effort** | 6–7.5 hours |
| **Migrations Needed** | No |
| **Breaking Changes** | No (Card type extended with optional fields) |
| **External Dependencies Added** | None |
| **Next Phase** | task-breakdown |

---

## Apêndices

### A. Backward Compatibility Strategy

Old saved boards have cards without new fields. When loaded:

```typescript
// In repo.loadBoard() or rendering:
const card: Card = { cardId: '...', title: '...', columnId: '...' }
// Fields description, plannedDate, plannedHours, createdAt are undefined

// Safe default behavior:
// - Modal shows empty fields for edit (if edit is added later)
// - Rendering ignores undefined fields
// - No error thrown
```

**Recommendation:** Use nullish coalescing in display:
```tsx
<span>{card.plannedHours ?? '—'}</span>
```

---

### B. GitHub API Error Codes Handled

- **401 Unauthorized:** User PAT expired/invalid → show "Autenticação expirou"
- **403 Forbidden:** User lacks permissions → show "Sem permissão no repositório"
- **409 Conflict:** Another write happened → show "Conflito. Recarregando..." + reload + retry
- **Other 5xx:** Server error → show "Erro no servidor"

---

### C. Clipboard Fallback (Optional)

If `navigator.clipboard` unavailable (older browsers):

```typescript
async function copyWithFallback(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
  } else {
    // Fallback: use old approach or alert
    alert('Copiar não disponível no seu navegador. Use Ctrl+C manualmente.')
  }
}
```

---

**END OF IPD**
