# task.md — Create Task Modal (TASK track, score 4)

> **Status:** Ready for Implementation  
> **Agent:** task-breakdown  
> **Track:** TASK  
> **Created:** 2026-04-19  
> **Total Tasks:** 6  
> **Total Estimated Effort:** 7 hours  
> **Complexity:** M  

---

## Subtasks

### T1: Extend Domain Types

**Title:** Add optional fields to Card type for task metadata

**Objective:**  
Extend `src/domain/types.ts` to include optional fields (description, plannedDate, plannedHours, createdAt) on the Card type, maintaining backward compatibility with existing saved boards that lack these fields.

**Rationale (from IPD):**  
IPD Section 3.3 (Mapa de Alterações), 2.3 (Contratos), 9 (Sequência de Implementação, Task 1).  
Must be done first because all downstream components depend on the schema.

**Impacted Files/Areas:**
- `src/domain/types.ts` — Card type interface

**Dependencies:**
- None (foundational task)

**Deliverable:**
- Card type extended with optional fields: `description?`, `plannedDate?`, `plannedHours?`, `createdAt?`
- Backward compatibility verified (old cards without fields still valid)
- No TypeScript compilation errors

**Definition of Done (Checklist):**
- [ ] Type compiles without errors
- [ ] Old cards (without new fields) are still valid when loaded
- [ ] New Card instances can be created with all fields or subset of fields
- [ ] No breaking changes to existing Card usage in the codebase
- [ ] ESLint passes on types.ts

**Risks:**
- None identified; foundational task with minimal risk

**Time Estimate:** 0.5 hours

---

### T2: Build useClipboard Custom Hook

**Title:** Create reusable clipboard hook with feedback state

**Objective:**  
Implement `src/hooks/useClipboard.ts` — a custom React hook that wraps `navigator.clipboard.writeText()` with feedback state and error handling, used by the copy button in the modal.

**Rationale (from IPD):**  
IPD Section 3.1 (Contrato de API — copy feature), 3.4 (D2 — Toast/feedback decision).  
Extracted as a reusable hook for testability and isolation.

**Impacted Files/Areas:**
- `src/hooks/useClipboard.ts` — new file

**Dependencies:**
- T1 (indirectly — assumes Card type exists, though hook is type-agnostic)

**Deliverable:**
- Hook exports `copy(text: string)` and `isCopied` boolean state
- Copy feedback visible for ≥1.5s after successful copy
- Errors caught and logged gracefully (no throw)
- Clipboard API unavailability handled with fallback (console error, user can retry)

**Definition of Done (Checklist):**
- [ ] Hook exported from src/hooks/useClipboard.ts
- [ ] `copy()` function accepts string and calls navigator.clipboard.writeText()
- [ ] `isCopied` state automatically resets after 1.5s
- [ ] Errors logged to console (not thrown)
- [ ] Unit test written with mocked navigator.clipboard
- [ ] ESLint passes

**Risks:**
- Clipboard API unavailable in some browsers — mitigated by fallback logging

**Time Estimate:** 0.75 hours

---

### T3: Build CreateTaskModal Component with Styling & Tests

**Title:** Implement modal component with form, validation, copy button, and unit tests

**Objective:**  
Create a comprehensive modal component (`src/components/CreateTaskModal.tsx`) with inline CSS (`CreateTaskModal.css`), including:
- Form fields (title, description, planned date, planned hours, created at read-only)
- Inline validation with error display
- Copy button integrated with useClipboard hook
- Unit test coverage ≥80%

This is the core deliverable of the feature.

**Rationale (from IPD):**  
IPD Sections 3.2 (Fluxo de Execução), 3.4 (Design Decisions D1–D5), 9 (Task 3).  
Modal is the main UI; contains all business logic for form validation and Card creation.

**Impacted Files/Areas:**
- `src/components/CreateTaskModal.tsx` — new component
- `src/components/CreateTaskModal.css` — new styles
- `src/components/CreateTaskModal.test.tsx` — new unit tests

**Dependencies:**
- T1 (Card type needed)
- T2 (useClipboard hook needed)

**Deliverable:**
- Modal component with:
  - 5 input fields: title, description, plannedDate, plannedHours, createdAt (read-only)
  - Labels and ARIA attributes (role="dialog", aria-modal="true")
  - Inline validation errors
  - Copy button with feedback from useClipboard
  - Cancel and Create buttons
  - Escape key support (optional but nice-to-have)
- CSS matching ColumnEditorModal.css pattern (no Tailwind, plain CSS)
- Unit tests covering:
  - Rendering (fields, labels, buttons present)
  - Validation (errors shown for invalid input)
  - Interactions (copy, cancel, create, keyboard)
  - Edge cases (very long title, clipboard unavailable)
- Test coverage ≥80%

**Definition of Done (Checklist):**
- [ ] Component renders with all 5 fields
- [ ] Each field has label + ARIA attribute
- [ ] Title field max 200 chars enforced
- [ ] Planned Hours validates ≥0 (rejects negative)
- [ ] Created At shows current date/time read-only
- [ ] Copy button calls useClipboard and shows feedback
- [ ] Validation function returns error message or null
- [ ] Create button validates + builds Card object + calls onCreate prop with card and updated doc
- [ ] Cancel button calls onClose prop
- [ ] Escape key closes modal (if implemented)
- [ ] CSS styles applied (overlay, form, buttons, spacing)
- [ ] No CSS conflicts with existing styles
- [ ] ESLint passes (no critical errors)
- [ ] Unit test coverage ≥80% (npm test -- CreateTaskModal)
- [ ] All tests pass
- [ ] No console warnings/errors in component

**Risks:**
- High complexity; break into rendering, validation, interactions in tests
- Clipboard API unavailability — handled by fallback in useClipboard

**Time Estimate:** 2.5 hours

---

### T4: Integrate Modal in BoardView

**Title:** Wire up modal trigger button and state management in BoardView

**Objective:**  
Modify `src/features/board/BoardView.tsx` to:
- Add state for modal visibility (`showCreateModal`)
- Wire "Nova tarefa" button to open modal
- Mount `<CreateTaskModal>` with correct props
- Handle modal.onCreate() callback to update board state

**Rationale (from IPD):**  
IPD Section 9 (Task 4 — Integração), 3.2 (Fluxo de Execução step 1–2).  
Connects modal to board; enables user to trigger creation flow.

**Impacted Files/Areas:**
- `src/features/board/BoardView.tsx` — add state, button handler, modal mounting

**Dependencies:**
- T3 (CreateTaskModal component must exist)
- T1 (Card type)

**Deliverable:**
- State variable for modal visibility added to BoardView
- "Nova tarefa" button handler updated to set `showCreateModal = true`
- Modal conditionally rendered when state is true
- Modal receives props: `boardDoc`, `defaultColumnId` (backlog), `onClose`, `onCreate`
- onCreate callback updates board doc and sha, closes modal
- No TypeScript errors
- Existing drag-drop and other features still functional

**Definition of Done (Checklist):**
- [ ] `createTaskModal` state variable added to BoardView
- [ ] "Nova tarefa" button onClick handler opens modal (sets state to true)
- [ ] Modal JSX conditionally rendered when `createTaskModal === true`
- [ ] Modal receives all 4 required props (boardDoc, defaultColumnId, onClose, onCreate)
- [ ] onCreate callback updates doc state and sha
- [ ] onClose callback closes modal and clears state
- [ ] TypeScript compiles without errors
- [ ] Existing board features (drag-drop, columns, etc.) still work
- [ ] No ESLint errors on modified file

**Risks:**
- Could interfere with existing board state; test drag-drop after integration

**Time Estimate:** 0.5 hours

---

### T5: Write Unit Tests for CreateTaskModal

**Title:** Achieve ≥80% unit test coverage for modal component

**Objective:**  
Create comprehensive unit test suite in `src/components/CreateTaskModal.test.tsx` covering rendering, validation, interactions, edge cases, and accessibility with Vitest + happy-dom.

**Rationale (from IPD):**  
IPD Section 6 (Testes — Unit Tests), DoD (non-functional requirements — coverage ≥80%).  
Separate test task to ensure thorough coverage and maintainability.

**Impacted Files/Areas:**
- `src/components/CreateTaskModal.test.tsx` — new test file

**Dependencies:**
- T3 (CreateTaskModal component must exist and be testable)
- T2 (useClipboard hook must exist and be mockable)

**Deliverable:**
- Unit test suite with ≥80% coverage including:
  - **Rendering tests:** Modal, all 5 fields, labels, buttons present
  - **Validation tests:** Error messages for empty title, empty description, negative hours, missing date
  - **Interaction tests:** Copy button with mocked clipboard, cancel button, create button behavior
  - **Edge cases:** Very long title, very long description, clipboard API unavailable
  - **Accessibility:** ARIA attributes (role, aria-modal, aria-labelledby) present
  - **State tests:** Form state updates on input change, errors cleared after fix
- Mocks for:
  - `navigator.clipboard.writeText`
  - `crypto.randomUUID`
  - `repo.saveBoard` (success, conflict 409, error)
  - `new Date()` (predictable timestamps)
- Coverage report showing ≥80% for CreateTaskModal component
- All tests passing

**Definition of Done (Checklist):**
- [ ] Test file src/components/CreateTaskModal.test.tsx exists
- [ ] Vitest configured and tests run with `npm test`
- [ ] Rendering tests pass (fields, labels visible)
- [ ] Validation error tests pass (all 4 error cases covered)
- [ ] Interaction tests pass (copy, cancel, create)
- [ ] Edge case tests pass (long input, clipboard unavailable)
- [ ] Accessibility tests pass (ARIA attributes verified)
- [ ] Coverage report ≥80%
- [ ] No failing tests
- [ ] Mocks properly cleaned up between tests

**Risks:**
- Mock setup complexity; use `vi.mock()` pattern from project codebase
- Clipboard mock may require careful stubbing

**Time Estimate:** 1.5 hours

---

### T6: Write E2E Tests with Playwright

**Title:** Validate end-to-end task creation flows with Playwright

**Objective:**  
Create E2E test suite in `tests/e2e/create-task.spec.ts` covering 5 scenarios:
1. Happy path (fill form → create → verify in board)
2. Validation error (empty title → error shown)
3. Cancel flow (discard without saving)
4. Keyboard escape (close modal with Escape key)
5. Copy button feedback (verify "Copiado!" visible)

**Rationale (from IPD):**  
IPD Section 6 (E2E Tests), DoD (acceptance criteria validation).  
Validates full user flow from UI through persistence; critical for feature confidence.

**Impacted Files/Areas:**
- `tests/e2e/create-task.spec.ts` — new E2E test file

**Dependencies:**
- T3 (Modal component must be running)
- T4 (Modal must be integrated in BoardView)

**Deliverable:**
- 5 test scenarios in Playwright spec:
  - **Happy Path:** Navigate to board → click "Nova tarefa" → fill all fields → click copy → verify feedback → click "Criar" → verify modal closes → verify new card appears in board with all fields
  - **Validation:** Open modal → leave title empty → click "Criar" → verify error message shown → fill title → click "Criar" → verify success
  - **Cancel:** Open modal → fill partial form → click "Cancelar" → verify modal closes → open modal again → verify form empty
  - **Keyboard Escape:** Open modal → press Escape → verify modal closes
  - **Copy Feedback:** Open modal → click copy button → verify "Copiado!" or feedback visible for ≥1s
- All scenarios using stable selectors (data-testid or semantic HTML)
- No flaky waits; use proper Playwright waits
- Clear assertions on each step

**Definition of Done (Checklist):**
- [ ] Test file tests/e2e/create-task.spec.ts exists
- [ ] Playwright configured and tests run with `npm run test:e2e` (or project equivalent)
- [ ] Happy path scenario passes (all 8 steps)
- [ ] Validation scenario passes (error → fix → success)
- [ ] Cancel scenario passes (close → reopen → fresh state)
- [ ] Escape scenario passes (keyboard closes modal)
- [ ] Copy scenario passes (feedback visible)
- [ ] All selectors stable (no flaky element finds)
- [ ] No hardcoded waits (use waitFor, locator.isVisible(), etc.)
- [ ] All assertions clear and meaningful
- [ ] Tests pass consistently (no flakiness)

**Risks:**
- Playwright timing and flaky selectors — use page.waitForSelector() and stable data-testid
- GitHub API delay in persistence — use adequate timeout in assertions

**Time Estimate:** 1.5 hours

---

## Dependency Graph

```
T1 (Extend Types)
├── T2 (useClipboard hook) ← depends on T1
├── T3 (Modal component) ← depends on T1 + T2
│   ├── T5 (Unit tests) ← depends on T3
│   └── T6 (E2E tests) ← depends on T3 + T4
├── T4 (Integrate in BoardView) ← depends on T3
```

**Parallelism:**
- T2 and T3 can start after T1
- T5 can start after T3
- T4 can start after T3
- T6 must wait for both T3 and T4

**Critical Path:** T1 → T3 → T4 → T6 (4 dependencies, ~6.75 hours)

---

## Execution Order

**Recommended sequence for implementer:**

1. **T1** (0.5h) — types.ts extended
2. **T2** (0.75h) → **T3** (2.5h) in parallel or T2 first (sequential safer)
3. **T4** (0.5h) — integration after T3
4. **T5** (1.5h) — unit tests after T3
5. **T6** (1.5h) — E2E tests after T4

**Parallelism Opportunity:** Start T2 and T3 as soon as T1 is done; T5 and T6 can run in parallel after their dependencies are met.

---

## Quality Checks (Global)

**For each task completion:**
- [ ] Code compiles (TypeScript strict mode)
- [ ] ESLint passes (no critical errors)
- [ ] Tests run and pass (where applicable)
- [ ] No console warnings in browser
- [ ] Backward compatibility maintained (Card type, old boards)
- [ ] ARIA/accessibility verified (modal only)

**Before declaring feature ready:**
- [ ] All 6 tasks completed
- [ ] Unit test coverage ≥80%
- [ ] E2E test coverage = 5 scenarios
- [ ] No TypeScript errors
- [ ] No ESLint critical errors
- [ ] Drag-drop and existing features still work
- [ ] Modal isolates form state (no pollution of board state)
- [ ] GitHub API integration tested (409 conflict, auth errors handled)

---

## Rastreabilidade — Matriz IPD ↔ Tasks

| Task | IPD Sections | Files Touched | DoD/Test Related |
|------|--------------|---------------|----|
| T1 | 2.3, 3.3, 9 Seq.1 | src/domain/types.ts | Type compiles, backward compat |
| T2 | 3.1, 3.4 D2, 9 Seq.2 | src/hooks/useClipboard.ts | Copy works, feedback 1.5s, errors logged |
| T3 | 3.1, 3.2, 3.4 D1–D5, 9 Seq.3, 6 Unit | src/components/CreateTaskModal.tsx, .css, .test.tsx | All 5 fields, validation, copy, 80% coverage |
| T4 | 9 Seq.4 | src/features/board/BoardView.tsx | Button opens modal, onCreate updates state, no breakage |
| T5 | 6 Unit Tests, 4 DoD (coverage) | src/components/CreateTaskModal.test.tsx | ≥80% coverage, 4 categories (render, validate, interact, edge) |
| T6 | 6 E2E Tests, 1 DoD (E2E), 7 Risks | tests/e2e/create-task.spec.ts | 5 scenarios, stable selectors, no flakiness |

---

## Guardrails Enforced

1. ✅ **No new external dependencies** — only use existing stack (React, TypeScript, Vitest, Playwright)
2. ✅ **Backward compatibility** — Card type extends with optional fields, old boards load correctly
3. ✅ **Accessibility** — Modal has role="dialog", aria-modal, aria-labelledby, semantic HTML
4. ✅ **No Markdown preview** — Decision D3: escape-only, safe text display
5. ✅ **No custom clipboard lib** — Decision D2: useClipboard hook + native API
6. ✅ **CSS pattern matches** — .css co-located, follows ColumnEditorModal.css style
7. ✅ **Validation before persist** — Client-side + server implicit (GitHub schema)
8. ✅ **Error handling** — 409 conflict, auth errors, clipboard unavailability all covered

---

## Notes for Implementer

- **T1** is the gatekeeper; complete first to unblock others
- **T2** and **T3** are the main effort; allocate focus here
- **T3** test coverage (≥80%) is non-negotiable for feature confidence
- **T6** E2E tests validate acceptance criteria; ensure all 5 scenarios are real and flaky-free
- Use existing project patterns: hooks, CSS modules, Vitest mocks, Playwright selectors
- Document edge cases discovered during implementation in the spec review phase

---

## Metadata

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Agent** | task-breakdown |
| **IPD Source** | planner-task.md |
| **Created** | 2026-04-19 |
| **Total Tasks** | 6 |
| **Total Effort** | 7 hours |
| **Complexity** | M |
| **Status** | Ready for implementer |
| **Next Phase** | implementer |

---

**END OF task.md**
