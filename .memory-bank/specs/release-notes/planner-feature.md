# Implementation Plan Document (IPD): Release Notes Feature

**Document Version:** v1.0  
**Date:** 2026-04-20  
**Status:** Ready for Developer Execution  
**Confidence Score:** 92/100  
**Estimated Effort:** 4.5 hours (MVP scope)

---

## 1. Overview

### 1.1 Objective Recap

Implement a versioning system and dedicated Release Notes page for FlowBoard that:
- Displays the current app version visibly in the App Shell (header/footer)
- Provides a deep-linkable `/releases` route with a dedicated Release Notes page
- Stores release data in a JSON-based, single-source-of-truth file (`releases.json`)
- Displays release cards with organized changelog grouped by version
- Provides type-based filtering (feature/fix/improvement/breaking)
- Follows FlowBoard design tokens for consistent UI

### 1.2 Scope of Changes

**Files to Create:** 10
- `src/data/releases.json` — Static release data
- `src/features/release-notes/ReleaseNotesPage.tsx` — Main page component
- `src/features/release-notes/components/ReleaseCard.tsx` — Release card component
- `src/features/release-notes/components/ChangeCard.tsx` — Individual change display
- `src/features/release-notes/components/FilterBar.tsx` — Type filter UI
- `src/features/release-notes/hooks/useCurrentVersion.ts` — Version hook
- `src/features/release-notes/hooks/useReleases.ts` — Load releases hook
- `src/features/release-notes/types/releases.types.ts` — TypeScript types
- `src/features/release-notes/release-notes.css` — Styling
- `tests/e2e/release-notes.spec.ts` — E2E tests

**Files to Modify:** 3
- `src/App.tsx` — Add React Router and /releases route
- `src/features/app/AppShell.tsx` — Add version badge to header
- `apps/flowboard/package.json` — Add react-router-dom dependency

### 1.3 Estimated Effort & Risk Level

**Total Estimated Effort:** 4.5 hours
- Phase 0 (Setup): 15 min
- Phase 1 (Core Data): 30 min
- Phase 2 (Components): 90 min
- Phase 3 (Integration): 30 min
- Phase 4 (Styling): 45 min
- Phase 5 (Testing): 60 min

**Overall Risk Level:** MODERATE
- **Primary Risk:** App.tsx refactoring (adds React Router layer)
- **Mitigation:** Router change is isolated, AppShell remains unchanged

---

## 2. Implementation Phases

### Phase 0: Setup (15 min)
1. Install `react-router-dom@^6.x`
2. Update App.tsx imports (BrowserRouter, Routes, Route)
3. Verify no TypeScript errors

### Phase 1: Core Data & Types (30 min)
1. Create `releases.types.ts` with Release, Change, CurrentVersion types
2. Create `releases.json` with 2 sample versions (0.1.0, 0.2.0)
3. Validate JSON structure matches types

### Phase 2: Components & Hooks (90 min)
1. Create `useCurrentVersion()` hook
2. Create `useReleases()` hook
3. Create `ReleaseNotesPage.tsx`
4. Create `ReleaseCard.tsx`
5. Create `ChangeCard.tsx`
6. Create `FilterBar.tsx`
7. Wire components with state management

### Phase 3: Integration (30 min)
1. Update App.tsx with BrowserRouter and routes
2. Add version badge to AppShell.tsx
3. Test deep-linking works

### Phase 4: Styling (45 min)
1. Create `release-notes.css` using tokens
2. Update `AppShell.css` for version badge
3. Test responsive at 320px, 768px, 1920px

### Phase 5: Testing (60 min)
1. Create unit tests for components and hooks
2. Create E2E tests for routing and flows
3. Achieve ≥80% code coverage

---

## 3. Execution Flow (Step-by-Step)

1. Install React Router: `npm install react-router-dom@^6`
2. Create types file: `src/features/release-notes/types/releases.types.ts`
3. Create data file: `src/data/releases.json`
4. Create hooks: `useCurrentVersion.ts`, `useReleases.ts`
5. Create components: `ReleaseNotesPage.tsx`, `ReleaseCard.tsx`, `ChangeCard.tsx`, `FilterBar.tsx`
6. Update App.tsx: Add BrowserRouter, Routes, /releases route
7. Update AppShell.tsx: Add version badge
8. Create styling: `release-notes.css` + `AppShell.css` updates
9. Create unit tests: `ReleaseNotesPage.test.tsx`
10. Create E2E tests: `release-notes.spec.ts`
11. Run tests and verify all acceptance criteria
12. Code review and final verification

---

## 4. File Structure

```
apps/flowboard/
├── src/
│   ├── App.tsx (modify)
│   ├── data/
│   │   └── releases.json (create)
│   ├── features/
│   │   ├── app/
│   │   │   ├── AppShell.tsx (modify)
│   │   │   └── AppShell.css (modify)
│   │   └── release-notes/ (new)
│   │       ├── ReleaseNotesPage.tsx
│   │       ├── ReleaseNotesPage.test.tsx
│   │       ├── release-notes.css
│   │       ├── components/
│   │       │   ├── ReleaseCard.tsx
│   │       │   ├── ChangeCard.tsx
│   │       │   └── FilterBar.tsx
│   │       ├── hooks/
│   │       │   ├── useCurrentVersion.ts
│   │       │   └── useReleases.ts
│   │       └── types/
│   │           └── releases.types.ts
├── tests/
│   └── e2e/
│       └── release-notes.spec.ts (create)
└── package.json (modify)
```

---

## 5. Acceptance Criteria Mapping

| AC # | Requirement | Task |
|------|-------------|------|
| AC.1 | Version badge in App Shell | Add to AppShell header (Phase 3) |
| AC.2 | /releases route exists | Add routing in App.tsx (Phase 3) |
| AC.3 | releases.json with 2+ versions | Create releases.json (Phase 1) |
| AC.4 | Release cards with type icons | Create components (Phase 2) |
| AC.5 | Responsive design, tokens.css | Create release-notes.css (Phase 4) |
| AC.6 | Single source of truth | useCurrentVersion reads from releases.json (Phase 2) |
| AC.7 | E2E tests | Create release-notes.spec.ts (Phase 5) |
| AC.8 | Unit tests | Create ReleaseNotesPage.test.tsx (Phase 5) |

---

## 6. Risk Assessment

**Primary Risk:** App.tsx refactoring for React Router
- **Mitigation:** Isolated change, test routing early
- **Fallback:** Revert if breaks existing flows

**Secondary Risk:** React Router compatibility with React 19
- **Mitigation:** Use ^6.x latest stable
- **Fallback:** Test compatibility before dev starts

---

## 7. Definition of Done

- [ ] All 8 acceptance criteria pass
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] `npm run test` passes (≥80% coverage)
- [ ] `npm run test:e2e` passes
- [ ] No console errors in browser
- [ ] Responsive at 3 breakpoints
- [ ] Version badge visible and clickable
- [ ] Deep-linking works: `page.goto('/releases')`
- [ ] Code reviewed and approved

---

## 8. Dependencies & Ordering

**Critical Path:**
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

**Parallelizable:** Phase 4 (styling) can start after Phase 2 components are created

---

## 9. Effort Estimation Summary

| Phase | Time | Notes |
|-------|------|-------|
| 0 | 15 min | Setup (prerequisite) |
| 1 | 30 min | Data & types |
| 2 | 90 min | Components (longest) |
| 3 | 30 min | Integration |
| 4 | 45 min | Styling |
| 5 | 60 min | Testing |
| **Total** | **4.5 hours** | MVP scope |

---

**IPD Ready for Pre-Implementer HITL Approval**
