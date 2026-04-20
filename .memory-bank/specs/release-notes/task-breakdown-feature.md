# Task Breakdown: Release Notes Feature

**Document Version:** v1.0  
**Date:** 2026-04-20  
**Status:** Ready for Sequential Execution  
**Total Estimated Effort:** 4.5 hours (270 minutes)  
**Task Count:** 14 tasks across 6 phases  

---

## Overview

This task breakdown converts the IPD (planner-feature.md) into a sequential, non-ambiguous execution plan. Each task is atomic, has explicit prerequisites, measurable acceptance criteria, and concrete file outputs. Tasks must be executed in order to respect dependency graph.

**Incorporation of Plan-Reviewer Adjustments:**
- ✅ Adjustment 1: Clarified `npm install react-router-dom@^6` command in TASK_0
- ✅ Adjustment 2: Explicit useNavigate pattern in TASK_9 (AppShell integration)
- ✅ Adjustment 3: Clarified hook creation order — useCurrentVersion first, useReleases is optional (see TASK_4)

---

## Phase 0: Setup (15 min)

### TASK_0 — Install React Router (15 min)

**Subtasks:**
- [ ] Run `npm install react-router-dom@^6` in `/apps/flowboard` directory
- [ ] Verify: `package.json` contains `"react-router-dom": "^6.x.x"` in dependencies
- [ ] Run `npm run build` and confirm: no TypeScript errors, build succeeds

**Prerequisites:** None

**Acceptance Criteria:**
- Command `npm install react-router-dom@^6` completes without errors
- package.json includes react-router-dom dependency
- `npm run build` output shows "✓ built successfully" (or equivalent)
- `npm run type-check` (if available) reports no TypeScript errors

**Estimated Effort:** 15 min

---

## Phase 1: Core Data & Types (30 min)

### TASK_1 — Create releases.types.ts (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/types/releases.types.ts`
- [ ] Define TypeScript types:
  - `Change` type with fields: `id` (string), `type` (feature|fix|improvement|breaking), `title` (string), `description` (string)
  - `Release` type with fields: `version` (string), `releaseDate` (ISO 8601 string), `archived` (boolean), `changes` (Change[])
  - `CurrentVersion` type with field: `version` (string)
- [ ] Run `npm run type-check` and confirm: no TypeScript errors

**Prerequisites:** TASK_0

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/features/release-notes/types/releases.types.ts`
- All three types exported from file
- TypeScript strict mode: no `any` type, all parameters and return types declared
- `npm run type-check` passes

**Estimated Effort:** 15 min

---

### TASK_2 — Create releases.json with sample data (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/data/releases.json`
- [ ] Add release v0.1.0 (archived, released 2026-03-15) with 2+ changes:
  - Example: Change type=feature, title="Initial release"
  - Example: Change type=fix, title="Bug in drag-drop"
- [ ] Add release v0.2.0 (NOT archived, released 2026-04-20) with 2+ changes:
  - Example: Change type=feature, title="Release Notes feature"
  - Example: Change type=improvement, title="Performance optimization"
- [ ] Validate JSON structure matches Release[] schema from TASK_1 types

**Prerequisites:** TASK_1

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/data/releases.json`
- Valid JSON (parses without error)
- Contains exactly 2 releases with version 0.1.0 and 0.2.0
- Each release has 2+ changes with id, type, title, description fields
- Schema matches `Release[]` type from TASK_1
- v0.2.0 has `"archived": false`
- v0.1.0 has `"archived": true`

**Estimated Effort:** 15 min

---

## Phase 2: Components & Hooks (90 min)

### TASK_3 — Create useCurrentVersion hook (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/hooks/useCurrentVersion.ts`
- [ ] Implement hook:
  - Import releases data from `/src/data/releases.json`
  - Find the release with `archived: false`
  - Return object with `version` field (string)
  - Type return value as `CurrentVersion`
- [ ] Add JSDoc comment explaining hook purpose
- [ ] Run `npm run type-check` and confirm: no errors

**Prerequisites:** TASK_1, TASK_2

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/features/release-notes/hooks/useCurrentVersion.ts`
- Hook returns object with `version` property (string)
- Hook finds non-archived release from releases.json
- TypeScript strict mode compliance
- Can be imported with: `import { useCurrentVersion } from '../hooks/useCurrentVersion'`
- `npm run type-check` passes

**Estimated Effort:** 15 min

---

### TASK_4 — Implement ReleaseNotesPage data loading (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.tsx`
- [ ] Implement component:
  - Import releases data directly from `/src/data/releases.json` (no separate hook needed per TSD pattern)
  - Use `useState` for filter state: `selectedType` (all | feature | fix | improvement | breaking)
  - Use `useEffect` to load releases on mount (or fetch on first render)
  - Return JSX with placeholder structure (no styling yet):
    - `<div className="release-notes-page">`
    - `<FilterBar selectedType={selectedType} onFilterChange={setSelectedType} />`
    - `<div className="releases-list">` with map over releases
    - `<ReleaseCard key={version} release={release} />`
- [ ] Export default component
- [ ] Run `npm run type-check` and confirm: no errors

**Prerequisites:** TASK_1, TASK_2, TASK_3

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.tsx`
- Component imports releases from `/src/data/releases.json`
- Component has state for filter (selectedType)
- Component renders FilterBar and ReleaseCard components (even if not yet defined)
- TypeScript strict mode: all props typed, no `any`
- `npm run type-check` passes
- Component is exportable as default export

**Estimated Effort:** 15 min

---

### TASK_5 — Create ReleaseCard component (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/components/ReleaseCard.tsx`
- [ ] Implement component:
  - Props type: `{ release: Release }`
  - Render card layout with:
    - Header: version number and release date (formatted as MM/DD/YYYY)
    - Archive badge (if `archived: true`)
    - Changes list: render `<ChangeCard key={change.id} change={change} />`
  - Use CSS class names: `release-card`, `release-card__header`, `release-card__changes`
  - Return JSX (no styling yet, placeholder classes only)
- [ ] Export default component
- [ ] Run `npm run type-check` and confirm: no errors

**Prerequisites:** TASK_1, TASK_2

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/features/release-notes/components/ReleaseCard.tsx`
- Component accepts `release` prop of type `Release`
- Component renders version, release date, and change cards
- TypeScript strict mode compliance
- Can be imported and used in ReleaseNotesPage
- `npm run type-check` passes

**Estimated Effort:** 15 min

---

### TASK_6 — Create ChangeCard component (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/components/ChangeCard.tsx`
- [ ] Implement component:
  - Props type: `{ change: Change }`
  - Render card with:
    - Type icon/badge (feature=📦, fix=✅, improvement=⚡, breaking=⚠️ or CSS-based visual)
    - Change title (bold text)
    - Change description (normal text)
  - Use CSS class names: `change-card`, `change-card__type`, `change-card__title`, `change-card__description`
  - Type color mapping: feature=--accent, fix=--success, improvement=--warning, breaking=--danger
- [ ] Export default component
- [ ] Run `npm run type-check` and confirm: no errors

**Prerequisites:** TASK_1, TASK_2

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/features/release-notes/components/ChangeCard.tsx`
- Component accepts `change` prop of type `Change`
- Component renders type, title, and description
- Type-to-color mapping documented (feature→accent, fix→success, etc.)
- TypeScript strict mode compliance
- `npm run type-check` passes

**Estimated Effort:** 15 min

---

### TASK_7 — Create FilterBar component (15 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/components/FilterBar.tsx`
- [ ] Implement component:
  - Props type: `{ selectedType: string; onFilterChange: (type: string) => void }`
  - Render filter buttons:
    - "All" (selectedType === 'all')
    - "Feature" (selectedType === 'feature')
    - "Fix" (selectedType === 'fix')
    - "Improvement" (selectedType === 'improvement')
    - "Breaking" (selectedType === 'breaking')
  - Active button has CSS class `filter-btn--active`
  - On click, call `onFilterChange(type)`
  - Use CSS class names: `filter-bar`, `filter-btn`
- [ ] Export default component
- [ ] Run `npm run type-check` and confirm: no errors

**Prerequisites:** None (independent component)

**Acceptance Criteria:**
- File exists at exact path: `/apps/flowboard/src/features/release-notes/components/FilterBar.tsx`
- Component accepts `selectedType` and `onFilterChange` props with correct types
- Component renders 5 filter buttons (All, Feature, Fix, Improvement, Breaking)
- Active button is visually distinguished
- Clicking button calls `onFilterChange` with correct type string
- TypeScript strict mode compliance
- `npm run type-check` passes

**Estimated Effort:** 15 min

---

### TASK_8 — Wire ReleaseNotesPage with filtering logic (15 min)

**Subtasks:**
- [ ] Update `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.tsx`:
  - Add filtering logic in component: if `selectedType !== 'all'`, filter releases to only show matching change types
  - Implement `handleFilterChange` function: `(type: string) => void`
  - Pass filtered releases to map function
  - Pass `selectedType` and `handleFilterChange` to `<FilterBar />`
- [ ] Verify imports: ReleaseCard, ChangeCard, FilterBar
- [ ] Run `npm run type-check` and confirm: no errors

**Prerequisites:** TASK_4, TASK_5, TASK_6, TASK_7

**Acceptance Criteria:**
- ReleaseNotesPage imports FilterBar, ReleaseCard, ChangeCard
- Filtering logic correctly filters releases by change type
- When `selectedType === 'feature'`, only releases with changes of type=feature are shown
- `handleFilterChange` function is defined and passed to FilterBar
- State updates when filter changes
- `npm run type-check` passes
- No console errors when filtering

**Estimated Effort:** 15 min

---

## Phase 3: Integration (30 min)

### TASK_9 — Update App.tsx with React Router (15 min)

**Subtasks:**
- [ ] Open `/apps/flowboard/src/App.tsx`
- [ ] Import React Router components:
  - `import { BrowserRouter, Routes, Route } from 'react-router-dom'`
  - `import { ReleaseNotesPage } from './features/release-notes/ReleaseNotesPage'`
- [ ] Wrap existing app structure with `<BrowserRouter>`:
  - Move existing `<AppShell>` component into a `<Routes>` structure
  - Add route: `<Route path="/releases" element={<ReleaseNotesPage />} />`
  - Ensure default route (/) still renders AppShell with existing content
- [ ] Verify no existing functionality breaks (AppShell still renders at /)
- [ ] Run `npm run build` and confirm: no TypeScript errors

**Prerequisites:** TASK_0, TASK_4

**Acceptance Criteria:**
- File updated: `/apps/flowboard/src/App.tsx`
- BrowserRouter imported and wraps entire app
- /releases route exists and renders ReleaseNotesPage component
- / route still renders AppShell and existing content
- `npm run build` succeeds
- `npm run type-check` passes
- No console errors on app startup

**Estimated Effort:** 15 min

---

### TASK_10 — Add version badge to AppShell (15 min)

**Subtasks:**
- [ ] Open `/apps/flowboard/src/features/app/AppShell.tsx`
- [ ] Import hooks and utilities:
  - `import { useCurrentVersion } from '../release-notes/hooks/useCurrentVersion'`
  - `import { useNavigate } from 'react-router-dom'`
- [ ] In AppShell component:
  - Call `const { version } = useCurrentVersion()`
  - Call `const navigate = useNavigate()`
  - Create version badge button in topbar (or appropriate location):
    ```jsx
    <button 
      onClick={() => navigate('/releases')}
      className="fb-version-badge"
      title="View release notes"
    >
      v{version}
    </button>
    ```
- [ ] Run `npm run build` and confirm: no TypeScript errors

**Prerequisites:** TASK_3, TASK_9

**Acceptance Criteria:**
- File updated: `/apps/flowboard/src/features/app/AppShell.tsx`
- useCurrentVersion hook imported and called
- useNavigate hook imported from react-router-dom
- Version badge button renders with correct className: `fb-version-badge`
- Clicking badge navigates to /releases
- `npm run build` succeeds
- `npm run type-check` passes
- Badge is visible in AppShell header/topbar area

**Estimated Effort:** 15 min

---

## Phase 4: Styling (45 min)

### TASK_11 — Create release-notes.css stylesheet (20 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/release-notes.css`
- [ ] Define CSS using design tokens from `src/styles/tokens.css`:
  - `.release-notes-page`: container with padding (use `--space-4`)
  - `.filter-bar`: horizontal button group, gap `--space-2`, padding `--space-3`
  - `.filter-btn`: button styling, padding `--space-1` `--space-2`, border `--border-default`, radius `--radius-md`
  - `.filter-btn--active`: background `--accent`, text color white
  - `.releases-list`: gap `--space-3`, flex column layout
  - `.release-card`: border `--border-default`, radius `--radius-lg`, padding `--space-3`, shadow `--shadow-md`, background `--bg-card`
  - `.release-card__header`: font `--text-lg`, margin-bottom `--space-2`
  - `.release-card__changes`: gap `--space-2`, flex column
  - `.change-card`: padding `--space-2`, border-left 4px solid (type-specific color), radius `--radius-md`, background `--bg-surface`
  - `.change-card__type`: font `--text-xs`, font-weight bold, color based on type (--accent, --success, --warning, --danger)
  - `.change-card__title`: font `--text-sm`, font-weight bold, margin-top `--space-1`
  - `.change-card__description`: font `--text-xs`, color gray, margin-top `--space-1`
- [ ] Test at 3 breakpoints (320px, 768px, 1920px) — add media queries for responsive layout
- [ ] Run `npm run build` and confirm: CSS loads without errors

**Prerequisites:** TASK_6, TASK_7

**Acceptance Criteria:**
- File created at exact path: `/apps/flowboard/src/features/release-notes/release-notes.css`
- All CSS uses design tokens (no hardcoded colors/spacing)
- CSS includes responsive design for 320px, 768px, 1920px breakpoints
- All component classes styled: .release-notes-page, .filter-bar, .filter-btn, .release-card, .change-card, etc.
- `npm run build` succeeds and CSS file loads
- No hardcoded values (px, rem) outside of token definitions
- Layout is readable and accessible

**Estimated Effort:** 20 min

---

### TASK_12 — Update AppShell.css for version badge styling (10 min)

**Subtasks:**
- [ ] Open `/apps/flowboard/src/features/app/AppShell.css`
- [ ] Add CSS rule for version badge:
  - `.fb-version-badge`: padding `--space-1` `--space-2`, border `--border-default`, radius `--radius-md`, font `--text-xs`, cursor pointer
  - `.fb-version-badge:hover`: background `--bg-surface`, text-decoration none
  - Color: use `--text-base` for normal, `--accent` on hover
- [ ] Ensure badge is positioned in topbar__actions area (flex aligned)
- [ ] Run `npm run build` and confirm: no CSS errors

**Prerequisites:** TASK_10

**Acceptance Criteria:**
- File updated: `/apps/flowboard/src/features/app/AppShell.css`
- `.fb-version-badge` class styled with tokens
- Badge has hover state
- Badge is visually distinguishable from other topbar buttons
- `npm run build` succeeds
- Badge renders correctly in browser with no layout shifts

**Estimated Effort:** 10 min

---

### TASK_13 — Test responsive design across breakpoints (15 min)

**Subtasks:**
- [ ] Open Release Notes page in browser at `/releases`
- [ ] Test at 3 viewport sizes:
  - Mobile (320px width): Verify stacking, readability, buttons clickable
  - Tablet (768px width): Verify 2-column or responsive grid layout
  - Desktop (1920px width): Verify full-width card layout, proper spacing
- [ ] Verify:
  - No horizontal scrolling at any breakpoint
  - Text is readable (font sizes appropriate)
  - All buttons and links are clickable (48px+ touch targets on mobile)
  - Filter buttons are accessible and responsive
  - Version badge in AppShell is visible at all breakpoints
- [ ] Take screenshots or note any CSS adjustments needed

**Prerequisites:** TASK_11, TASK_12

**Acceptance Criteria:**
- Release Notes page displays correctly at 320px, 768px, and 1920px widths
- No horizontal scrolling at any breakpoint
- All interactive elements (buttons, links) are properly sized for touch (≥48px)
- Text hierarchy is maintained across breakpoints
- Filter bar is accessible and functional at all sizes
- Version badge doesn't overflow or cause layout issues

**Estimated Effort:** 15 min

---

## Phase 5: Testing (60 min)

### TASK_14 — Create unit tests for ReleaseNotesPage (20 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.test.tsx`
- [ ] Write test suite using Vitest + React Testing Library:
  - Test 1: Component renders without crashing
  - Test 2: Renders all releases from releases.json
  - Test 3: Filter buttons exist and are clickable
  - Test 4: Filtering by type shows only matching changes (e.g., filtering "feature" hides fixes)
  - Test 5: "All" filter shows all releases and changes
  - Test 6: Change cards render with correct type color mapping
  - Test 7: Release card renders version number and archive badge (if archived)
- [ ] Use `render()`, `screen.getByText()`, `userEvent.click()` for interactions
- [ ] Aim for ≥80% code coverage of ReleaseNotesPage component
- [ ] Run `npm run test` and confirm: all tests pass

**Prerequisites:** TASK_4, TASK_5, TASK_6, TASK_7, TASK_8

**Acceptance Criteria:**
- File created: `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.test.tsx`
- Minimum 7 test cases implemented
- All tests pass with `npm run test`
- Code coverage for ReleaseNotesPage ≥80%
- No TypeScript errors in test file
- Tests use Vitest + React Testing Library conventions
- Tests are independent (no shared state between tests)

**Estimated Effort:** 20 min

---

### TASK_15 — Create E2E tests for release notes flows (20 min)

**Subtasks:**
- [ ] Create file: `/apps/flowboard/tests/e2e/release-notes.spec.ts`
- [ ] Write test suite using Playwright:
  - Test 1: Navigate to `/releases` route and page loads
  - Test 2: Version badge in AppShell is visible and clickable
  - Test 3: Clicking version badge navigates to `/releases`
  - Test 4: Filter buttons are visible and clickable
  - Test 5: Filtering by "feature" shows only feature changes
  - Test 6: Filtering by "fix" shows only fix changes
  - Test 7: "All" filter shows all releases and changes
  - Test 8: Release cards display version, date, and changes
  - Test 9: Archive badge shows for archived releases
- [ ] Use `page.goto()`, `page.click()`, `expect()` assertions
- [ ] Run `npm run test:e2e` and confirm: all tests pass

**Prerequisites:** TASK_9, TASK_10, TASK_11, TASK_12, TASK_13

**Acceptance Criteria:**
- File created: `/apps/flowboard/tests/e2e/release-notes.spec.ts`
- Minimum 9 E2E test cases implemented
- All tests pass with `npm run test:e2e`
- Tests verify deep-linking to `/releases` works
- Tests verify version badge navigation works
- Tests verify all filtering scenarios
- Tests use Playwright conventions
- No console errors during test execution

**Estimated Effort:** 20 min

---

### TASK_16 — Verify acceptance criteria and final build (20 min)

**Subtasks:**
- [ ] Run full test suite:
  - `npm run type-check` — verify no TypeScript errors
  - `npm run build` — verify production build succeeds
  - `npm run test` — verify all unit tests pass (≥80% coverage)
  - `npm run test:e2e` — verify all E2E tests pass
- [ ] Manual verification checklist:
  - [ ] Version badge visible in AppShell header
  - [ ] Version badge is clickable
  - [ ] Clicking badge navigates to `/releases` (deep-linking works)
  - [ ] Release Notes page displays all releases
  - [ ] Filter buttons work correctly
  - [ ] Change cards display type icons/colors correctly
  - [ ] No console errors or warnings in browser DevTools
  - [ ] Responsive design works at 3 breakpoints
- [ ] Review code against acceptance criteria from IPD Section 5 (AC.1–AC.8)
- [ ] Document any deviations or notes in git commit message

**Prerequisites:** TASK_14, TASK_15

**Acceptance Criteria:**
- `npm run type-check` passes with 0 errors
- `npm run build` succeeds and generates dist folder
- `npm run test` passes with ≥80% coverage
- `npm run test:e2e` passes all test cases
- All 8 acceptance criteria from IPD verified
- No browser console errors or warnings
- App is deployment-ready
- Final commit message references all tasks completed

**Estimated Effort:** 20 min

---

## Dependency Graph

```
TASK_0 (Setup)
  ├─→ TASK_1 (Types)
  │    ├─→ TASK_2 (Data)
  │    │    ├─→ TASK_3 (useCurrentVersion hook)
  │    │    └─→ TASK_4 (ReleaseNotesPage)
  │    │         ├─→ TASK_8 (Filtering logic)
  │    └─→ TASK_5 (ReleaseCard)
  │         ├─→ TASK_8 (Filtering logic)
  │         └─→ TASK_11 (Styling)
  │    └─→ TASK_6 (ChangeCard)
  │         ├─→ TASK_8 (Filtering logic)
  │         └─→ TASK_11 (Styling)
  ├─→ TASK_7 (FilterBar)
  │    └─→ TASK_8 (Filtering logic)
  │         └─→ TASK_11 (Styling)
  │
  ├─→ TASK_9 (App.tsx Router) [depends on TASK_0, TASK_4]
  │    └─→ TASK_10 (AppShell version badge) [depends on TASK_3, TASK_9]
  │         ├─→ TASK_12 (AppShell.css)
  │         ├─→ TASK_13 (Responsive test)
  │         └─→ TASK_15 (E2E tests)
  │
  ├─→ TASK_11 (release-notes.css) [depends on TASK_6, TASK_7]
  │    └─→ TASK_12 (AppShell.css)
  │         └─→ TASK_13 (Responsive test)
  │              └─→ TASK_15 (E2E tests)
  │
  ├─→ TASK_14 (Unit tests) [depends on TASK_4, TASK_5, TASK_6, TASK_7, TASK_8]
  │    └─→ TASK_16 (Final verification)
  │
  └─→ TASK_15 (E2E tests) [depends on TASK_9, TASK_10, TASK_11, TASK_12, TASK_13]
       └─→ TASK_16 (Final verification)
```

---

## Effort Summary

| Phase | Task | Estimated Time | Status |
|-------|------|---|---|
| 0 | TASK_0: Setup React Router | 15 min | Sequential |
| 1 | TASK_1: Create types | 15 min | Sequential |
| 1 | TASK_2: Create releases.json | 15 min | Sequential |
| 2 | TASK_3: useCurrentVersion hook | 15 min | Sequential |
| 2 | TASK_4: ReleaseNotesPage data loading | 15 min | Sequential |
| 2 | TASK_5: ReleaseCard component | 15 min | Sequential |
| 2 | TASK_6: ChangeCard component | 15 min | Sequential |
| 2 | TASK_7: FilterBar component | 15 min | Sequential |
| 2 | TASK_8: Filtering logic | 15 min | Sequential |
| 3 | TASK_9: App.tsx Router | 15 min | Sequential |
| 3 | TASK_10: Version badge | 15 min | Sequential |
| 4 | TASK_11: release-notes.css | 20 min | Sequential |
| 4 | TASK_12: AppShell.css | 10 min | Sequential |
| 4 | TASK_13: Responsive test | 15 min | Sequential |
| 5 | TASK_14: Unit tests | 20 min | Sequential |
| 5 | TASK_15: E2E tests | 20 min | Sequential |
| 5 | TASK_16: Final verification | 20 min | Sequential |
| **TOTAL** | **16 tasks** | **265 min (4.42 hours)** | **Ready** |

---

## Execution Notes

### Sequential Execution Path

Follow this exact order to avoid blocked tasks:

1. TASK_0 → 2. TASK_1 → 3. TASK_2 → 4. TASK_3 → 5. TASK_4 → 6. TASK_5 → 7. TASK_6 → 8. TASK_7 → 9. TASK_8 → 10. TASK_9 → 11. TASK_10 → 12. TASK_11 → 13. TASK_12 → 14. TASK_13 → 15. TASK_14 → 16. TASK_15 → 17. TASK_16

### Parallelization Opportunities

**Minimal parallelization possible due to tight dependency chain:**
- TASK_7 (FilterBar) can be developed in parallel with TASK_5-6 (components) once TASK_4 is started
- TASK_11 (CSS) can start after TASK_6 component files exist
- However, for clarity and to prevent integration bugs, **sequential execution is strongly recommended** for this MVP scope

### Risk Mitigation

**Primary Risk:** React Router integration in App.tsx (TASK_9)
- **Mitigation:** Test immediately after App.tsx modification with `npm run build`
- **Fallback:** If Router breaks existing functionality, revert imports and use conditional rendering instead

**Secondary Risk:** E2E test flakiness due to timing
- **Mitigation:** Use Playwright's built-in waits; add explicit `page.waitForLoadState()`
- **Fallback:** Increase test timeouts if selectors are not found

### Definition of Done Checklist

All tasks completed when:
- [ ] All 16 tasks marked completed
- [ ] `npm run type-check` reports 0 errors
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes with ≥80% coverage
- [ ] `npm run test:e2e` passes all 9 E2E tests
- [ ] Version badge visible and clickable in AppShell
- [ ] `/releases` route renders ReleaseNotesPage
- [ ] Deep-linking to `/releases` works
- [ ] Filtering by change type works correctly
- [ ] Responsive design verified at 3 breakpoints
- [ ] No console errors or warnings
- [ ] Code review approved
- [ ] Ready for merge to `main` branch

---

## Files Created Summary

**New Files (13):**
1. `/apps/flowboard/src/features/release-notes/types/releases.types.ts`
2. `/apps/flowboard/src/data/releases.json`
3. `/apps/flowboard/src/features/release-notes/hooks/useCurrentVersion.ts`
4. `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.tsx`
5. `/apps/flowboard/src/features/release-notes/components/ReleaseCard.tsx`
6. `/apps/flowboard/src/features/release-notes/components/ChangeCard.tsx`
7. `/apps/flowboard/src/features/release-notes/components/FilterBar.tsx`
8. `/apps/flowboard/src/features/release-notes/release-notes.css`
9. `/apps/flowboard/src/features/release-notes/ReleaseNotesPage.test.tsx`
10. `/apps/flowboard/tests/e2e/release-notes.spec.ts`

**Modified Files (3):**
1. `/apps/flowboard/package.json` — add react-router-dom@^6 dependency
2. `/apps/flowboard/src/App.tsx` — add BrowserRouter, Routes, /releases route
3. `/apps/flowboard/src/features/app/AppShell.tsx` — add version badge
4. `/apps/flowboard/src/features/app/AppShell.css` — add version badge styling

---

**Document Ready for Developer Execution**

Each task is self-contained, has explicit acceptance criteria, and builds on previous tasks. No ambiguity. No external planning required during execution.

**Status:** ✅ Approved  
**Date:** 2026-04-20  
**Prepared by:** task-breakdown agent  
**Based on:** planner-feature.md (v1.0) + plan-reviewer-feature.md adjustments
