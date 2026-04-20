# Plan Review: Release Notes Feature IPD

**Review Date:** 2026-04-20  
**Reviewer:** Claude Code (plan-reviewer agent)  
**IPD Reviewed:** planner-feature.md (v1.0)  
**Status:** ⚠️ **APPROVED WITH ADJUSTMENTS**  
**Risk Level:** MODERATE  
**Confidence:** 88/100

---

## Executive Summary

The IPD demonstrates **strong structural completeness and strategic alignment** with TSD/ARD. However, **three specific adjustments are required** before handoff to pre-implementer HITL:

1. **React Router dependency missing from package.json changes** (IPD lists file, not dependency install)
2. **AppShell.tsx integration detail** — useNavigate hook import clarity needed
3. **Hook creation order in Phase 2** — useReleases vs single-fetch pattern needs clarification

These are **non-blocking** but must be clarified to prevent developer friction during execution.

---

## Layer 1: Structural Completeness Review ✅

### 1.1 Required Sections Audit

| Section | Present | Status | Notes |
|---------|---------|--------|-------|
| Overview (1.1-1.3) | ✅ | COMPLETE | Clear objective, scope, effort recap |
| Implementation Phases (2) | ✅ | COMPLETE | 5 phases + execution flow; clear sequencing |
| Execution Flow (3) | ✅ | COMPLETE | 12-step ordered walkthrough |
| File Structure (4) | ✅ | COMPLETE | Detailed tree diagram; accurate paths |
| AC Mapping (5) | ✅ | COMPLETE | All 8 AC → Tasks mapped 1:1 |
| Risk Assessment (6) | ✅ | COMPLETE | Primary + secondary risks identified; mitigations provided |
| Definition of Done (7) | ✅ | COMPLETE | 9 DoD items with checkbox format |
| Dependencies & Ordering (8) | ✅ | COMPLETE | Critical path explicit; parallelization noted |
| Effort Summary (9) | ✅ | COMPLETE | 4.5 hours total; phase breakdown provided |

**Verdict:** ✅ All sections present and well-structured.

---

### 1.2 Task Specificity Audit

**Phase 0: Setup (15 min)**
- ✅ Install `react-router-dom@^6.x` — actionable, specific version
- ✅ Update App.tsx imports — clear scope
- ⚠️ **MINOR:** "Verify no TypeScript errors" is outcome, not task; assume npm build

**Phase 1: Core Data & Types (30 min)**
- ✅ Create types file — specific path, file name
- ✅ Create releases.json — specific path, validation mentioned
- ✅ Validate JSON structure — explicit

**Phase 2: Components & Hooks (90 min)**
- ✅ 7 distinct create/implement tasks
- ✅ "Wire components with state management" is vague but acceptable given 90min budget
- ✅ All file paths explicit

**Phase 3: Integration (30 min)**
- ✅ 3 clear integration tasks; App.tsx and AppShell targeted
- ✅ Deep-linking test mentioned

**Phase 4: Styling (45 min)**
- ✅ Explicit CSS file creation; token usage stated
- ✅ Responsive breakpoints specified (320px, 768px, 1920px)

**Phase 5: Testing (60 min)**
- ✅ Unit tests, E2E tests, coverage target (≥80%) specified

**Verdict:** ✅ Tasks are specific and actionable. No vague goals.

---

### 1.3 Dependencies & Ordering Audit

**Critical Path Stated:**
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
```

**Verification Against Task Definitions:**

| Dependency | Stated | Explicit | Status |
|------------|--------|----------|--------|
| Phase 0 → Phase 1 | Implicit (setup prerequisite) | Yes | ✅ React Router required before other imports |
| Phase 1 → Phase 2 | Implicit (types needed for components) | Yes | ✅ Types block component development |
| Phase 2 → Phase 3 | Implicit (components needed for integration) | Yes | ✅ Components must exist before routing wiring |
| Phase 3 → Phase 4 | Implicit (styling can start after Phase 2) | ⚠️ | Stated as parallelizable after Phase 2; OK for expert dev |
| Phase 4 → Phase 5 | Implicit (code must exist before testing) | Yes | ✅ Clear dependency |

**Parallelizable Work:** Phase 4 (Styling) explicitly noted as parallelizable after Phase 2 components exist. ✅ Realistic.

**Verdict:** ✅ Dependencies clear and realistic. Critical path is linear for MVP scope.

---

## Layer 2: Consistency with TSD & ARD Review ✅

### 2.1 AC Satisfaction Mapping

**IPD Claims:** "All 8 acceptance criteria pass" (Section 7, DoD)

**Verification Against TSD Section 5 (AC.1 through AC.8):**

| AC ID | TSD Requirement | IPD Coverage | Implementation Plan | Status |
|-------|-----------------|--------------|-------------------|--------|
| AC.1 | Version badge in header, clickable | Phase 3 integration + Phase 2 useCurrentVersion hook | ✅ Explicit: "Add version badge to AppShell.tsx" | ✅ SATISFIED |
| AC.2 | Route `/releases` exists, deep-linkable | Phase 3: "Add BrowserRouter + /releases route to App.tsx" | ✅ Explicit routing setup | ✅ SATISFIED |
| AC.3 | releases.json with 2+ versions, valid structure | Phase 1: "Create releases.json with 2 sample versions" | ✅ Explicit data creation | ✅ SATISFIED |
| AC.4 | Change cards with icons, titles, descriptions | Phase 2: "Create ChangeCard.tsx + ReleaseCard.tsx" | ✅ Components specified | ✅ SATISFIED |
| AC.5 | Responsive design, tokens.css usage | Phase 4: "Create release-notes.css using tokens" | ✅ CSS strategy clear; tokens mentioned | ✅ SATISFIED |
| AC.6 | Single source of truth (releases.json) | Phase 2: "useCurrentVersion reads from releases.json" | ✅ Hook design specified | ✅ SATISFIED |
| AC.7 | E2E tests | Phase 5: "Create release-notes.spec.ts" | ✅ E2E test file created | ✅ SATISFIED |
| AC.8 | Unit tests | Phase 5: "Create ReleaseNotesPage.test.tsx" | ✅ Unit test file created | ✅ SATISFIED |

**Verdict:** ✅ All 8 AC are addressed in IPD phases. No gaps.

---

### 2.2 React Router Architecture Decision Alignment (ARD Compliance)

**ARD Decision:** "Option B — React Router Integration" (Section 2)

**IPD Implementation of ARD-007:**

| ARD Requirement | IPD Implementation | Status |
|-----------------|-------------------|--------|
| BrowserRouter at App.tsx boundary | Phase 3: "Update App.tsx: Add BrowserRouter, Routes, /releases route" | ✅ MATCHES |
| ReleaseNotesPage as standalone route | Phase 2: "Create ReleaseNotesPage.tsx" (no props) | ✅ MATCHES |
| AppShell remains state-based tabs | Phase 3: "Update AppShell.tsx: Add version badge" (no tab refactor) | ✅ MATCHES |
| useNavigate for navigation | Phase 3: "version badge click → navigate to /releases" | ✅ IMPLIED |
| No refactoring of BoardView/HoursView | Not mentioned (correct; out of scope) | ✅ SCOPE RESPECTED |

**Verdict:** ✅ IPD fully respects ARD-007 constraints. No scope creep.

---

### 2.3 Design Tokens Compliance

**TSD Constraint (C.1):** "All colors, fonts, spacing, shadows, radii come from tokens.css only"

**IPD Implementation:**
- Phase 4: "Create release-notes.css using tokens"
- Phase 4: "Update AppShell.css for version badge"
- AC.5 Mapping: "All colors, fonts, spacing come from src/styles/tokens.css"

**Codebase Verification:**
- tokens.css confirmed present at `/src/styles/tokens.css`
- Contains: `--text-xs`, `--text-sm`, `--text-base`, `--space-1` through `--space-6`, `--accent`, `--success`, `--warning`, `--danger`, `--radius-*`, `--shadow-*`

**Verdict:** ✅ IPD appropriately constrains styling. Tokens confirmed available.

---

### 2.4 Scope Respect Check

**TSD Out-of-Scope Items (Section 7, Q1-Q6):**
- Browser tab title version → IPD does not include this ✅
- Git tag integration → IPD does not include this ✅
- Custom releases.json upload → IPD does not include this ✅
- i18n support → IPD does not include this ✅

**ARD Out-of-Scope:**
- Refactoring tab-based navigation → IPD does not include ✅
- Virtualization of release list → IPD does not include ✅

**Verdict:** ✅ IPD respects scope boundaries from TSD & ARD.

---

## Layer 3: Accuracy Against Codebase ⚠️ ADJUSTMENTS REQUIRED

### 3.1 File Path Verification

**IPD Claims vs Actual Codebase:**

| File | IPD Path | Actual Location | Status |
|------|----------|-----------------|--------|
| App.tsx | `src/App.tsx` | ✅ `/apps/flowboard/src/App.tsx` | ✅ CORRECT |
| AppShell.tsx | `src/features/app/AppShell.tsx` | ✅ `/apps/flowboard/src/features/app/AppShell.tsx` | ✅ CORRECT |
| tokens.css | `src/styles/tokens.css` | ✅ `/apps/flowboard/src/styles/tokens.css` | ✅ CORRECT |
| package.json | `apps/flowboard/package.json` | ✅ Present | ✅ CORRECT |
| data folder | `src/data/` | ✅ Created & empty | ✅ CORRECT |
| release-notes folder | `src/features/release-notes/` | ✅ Created & empty | ✅ CORRECT |
| E2E tests | `tests/e2e/release-notes.spec.ts` | ✅ `/apps/flowboard/tests/e2e/` exists | ✅ CORRECT |

**Verdict:** ✅ All file paths are accurate for the `apps/flowboard` structure.

---

### 3.2 Import Patterns Verification

**IPD Specified Imports:**

| Component | IPD Import Statement | Availability in Codebase | Status |
|-----------|----------------------|--------------------------|--------|
| react-router-dom (BrowserRouter, Routes, Route) | `import { BrowserRouter, Routes, Route } from 'react-router-dom'` | ⚠️ NOT INSTALLED YET (See 3.4) | ⚠️ ADJUSTMENT NEEDED |
| React hooks (useState, useEffect) | `import { useState, useEffect } from 'react'` | ✅ React 19.2.4 present | ✅ AVAILABLE |
| AppShell | `import { AppShell } from './features/app/AppShell'` | ✅ Present at correct path | ✅ AVAILABLE |
| tokens.css | `import './styles/tokens.css'` (in main.tsx) | ✅ Present & imported | ✅ AVAILABLE |
| Vitest | `import { render, expect } from 'vitest'` | ✅ Vitest 4.1.4 installed | ✅ AVAILABLE |
| Playwright | Test framework for E2E | ✅ @playwright/test 1.57.0 installed | ✅ AVAILABLE |

**Verdict:** ⚠️ React Router is the **only missing dependency**. All other patterns are available.

---

### 3.3 Design Token Availability

**TSD Specifies These Tokens (Section 4.3):**

| Token | Type | Usage | Available in tokens.css | Status |
|-------|------|-------|-------------------------|--------|
| `--accent` | color | feature type (indigo) | ✅ `oklch(62% 0.2 264)` | ✅ |
| `--success` | color | fix type (emerald) | ✅ `oklch(60% 0.18 145)` | ✅ |
| `--warning` | color | improvement type (amber) | ✅ `oklch(72% 0.18 75)` | ✅ |
| `--danger` | color | breaking type (red) | ✅ `oklch(58% 0.22 25)` | ✅ |
| `--text-xs` through `--text-2xl` | text scale | typography | ✅ All present (0.72rem–1.35rem) | ✅ |
| `--space-1` through `--space-6` | spacing | layout | ✅ All present (0.25rem–2.5rem) | ✅ |
| `--radius-sm`, `--radius-md`, `--radius-lg` | radius | card borders | ✅ All present (6–14px) | ✅ |
| `--shadow-sm`, `--shadow-md`, `--shadow-lg` | shadow | card elevation | ✅ All present | ✅ |
| `--bg-surface`, `--bg-card` | background | card backgrounds | ✅ Both present | ✅ |
| `--border-default` | border | card borders | ✅ Present | ✅ |

**Verdict:** ✅ All required tokens are available and properly defined.

---

### 3.4 Package.json React Router Dependency ⚠️ ADJUSTMENT REQUIRED

**Current package.json (Actual):**
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@tanstack/react-virtual": "^3.13.24",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  }
}
```

**Status:** ⚠️ `react-router-dom` is **NOT listed**

**IPD Claim (Section 2, Phase 0, Task 1):**
```
1. Install `react-router-dom@^6.x`
```

**IPD Files to Modify (Section 1.2):**
```
- apps/flowboard/package.json — Add react-router-dom dependency
```

**Issue:** IPD lists package.json as modified file but does not specify the exact version constraint or dependency entry in the modification table.

**Required Adjustment:**
- Phase 0 Task 1 should state: `npm install react-router-dom@^6` (or add to package.json: `"react-router-dom": "^6"`)
- This is **not a blocker** but clarification is needed to prevent developer confusion

**Verdict:** ⚠️ **ADJUSTMENT NEEDED** — Clarify react-router-dom version in Phase 0 setup

---

### 3.5 Test Pattern Alignment

**Existing E2E Test Pattern (create-task.spec.ts):**
```typescript
import { test, expect } from '@playwright/test'
```

**IPD E2E Test Plan:**
```
E2E tests: Create release-notes.spec.ts
Test methods: Playwright with expect() assertions
```

**Verification:** ✅ IPD correctly specifies Playwright as the E2E framework. Matches existing pattern.

**Existing Unit Test Pattern:**
```
Vitest 4.1.4 installed
Testing library: @testing-library/react (confirmed in package.json)
```

**IPD Unit Test Plan:**
```
Test: Vitest unit tests with renderHook, render, expect assertions
```

**Verification:** ✅ IPD correctly specifies Vitest. Matches project stack.

**Verdict:** ✅ Test patterns align with project conventions.

---

### 3.6 TypeScript Strict Mode

**Project Configuration:** TypeScript 6.0.2 with strict mode implied (based on ARD mentioning strict type checking)

**IPD TypeScript Guidance (TSD Section C.4):**
```
- strict: true enforced
- No any type
- Function params and return types always declared
- Null/undefined safety required
```

**Codebase Evidence:** AppShell.tsx uses explicit typing:
```typescript
type Props = {
  session: FlowBoardSession
  onLogout: () => void
}
```

**Verdict:** ✅ IPD's TypeScript constraints match project practice.

---

## Specific Adjustments Required ⚠️

### Adjustment 1: Clarify React Router Setup in Phase 0

**Current (Section 2, Phase 0, Task 1):**
```
1. Install `react-router-dom@^6.x`
2. Update App.tsx imports (BrowserRouter, Routes, Route)
3. Verify no TypeScript errors
```

**Recommended Revision:**
```
1. Add `react-router-dom@^6` to package.json dependencies and run `npm install`
   (Command: npm install react-router-dom@^6)
2. Update App.tsx imports: import { BrowserRouter, Routes, Route } from 'react-router-dom'
3. Verify no TypeScript errors: npm run build should succeed
```

**Rationale:** Specifies exact npm command and success criteria.

---

### Adjustment 2: Clarify useNavigate Hook Integration in AppShell

**Current (Section 3, Phase 3, Integration):**
```
Update AppShell.tsx: Add version badge
```

**ARD Specifies (Section 3.4):**
```typescript
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate('/releases')
```

**Recommended Addition to Phase 3:**
```
Task 2b: Update AppShell.tsx to add version badge:
  - Import useNavigate from 'react-router-dom'
  - Import useCurrentVersion hook from '../release-notes/useCurrentVersion'
  - Add version badge button in topbar__actions: 
    <button onClick={() => navigate('/releases')} ...>v{version.version}</button>
  - Add CSS class fb-version-badge with styling from tokens.css
```

**Rationale:** ARD provides explicit code pattern; IPD should reference it clearly to prevent import errors.

---

### Adjustment 3: Clarify Hook Creation Order in Phase 2

**Current (Section 3, Execution Flow, Step 4):**
```
Step 4: Create hooks: useCurrentVersion.ts, useReleases.ts
```

**Issue:** IPD lists `useReleases()` hook but TSD only specifies `useCurrentVersion()` hook. 

**Recommended Revision:**
```
Step 4: Create hooks: 
  - useCurrentVersion.ts (loads releases.json via fetch, returns current release only)
  - OPTIONAL: useReleases.ts only if ReleaseNotesPage.tsx needs separate data fetching
  
Decision Point: Determine if ReleaseNotesPage.tsx should:
  a) Use fetch directly in useEffect (simpler, follows TSD pattern)
  b) Create useReleases.ts hook (more testable, reusable)
  
Recommend (a) per TSD Section 3.2 "Data Loading Pattern"
```

**Rationale:** Clarifies dependency order and optional hooks to prevent scope creep.

---

## Risk Assessment Deep-Dive

### Residual Risks After Adjustments

| Risk | Original Likelihood | Mitigation (IPD) | Residual Risk | Acceptance |
|------|------------------|-----------------|---------------|-----------|
| React Router compatibility with React 19 | Low | "Use ^6.x latest stable" in Phase 0 | LOW | ✅ ACCEPTABLE |
| App.tsx refactoring introduces bugs | Low | "Router change is isolated" + DoD testing | LOW | ✅ ACCEPTABLE |
| TypeScript errors from new imports | Low | "npm run build succeeds" in DoD | LOW | ✅ ACCEPTABLE |
| E2E test fails: page.goto('/releases') | Low | ARD explicitly mandates this test; critical path | VERY LOW | ✅ ACCEPTABLE |
| releases.json missing at runtime | Medium | "Show empty state; log warning" (TSD) | MEDIUM | ✅ MITIGATED |
| Styling breaks responsive at 320px | Low | "Test at 3 breakpoints" in Phase 4 DoD | LOW | ✅ ACCEPTABLE |

**Verdict:** ✅ All residual risks are acceptable for MVP. No surprises.

---

## Confidence Scoring

| Criterion | Score | Evidence |
|-----------|-------|----------|
| TSD understood completely | 20/20 | All 11 sections reviewed; AC fully mapped; constraints verified |
| ARD constraints respected | 18/20 | React Router architecture perfect; useNavigate pattern needs clarity |
| File paths accurate | 19/20 | All paths correct; data folder exists; release-notes folder created |
| Effort realistic | 18/20 | 4.5 hours reasonable for MVP; Phase 2 (90min) is longest, well-justified |
| Task specificity | 19/20 | 12 steps clear; "wire components" is expected implementation detail |
| DoD measurable | 18/20 | All DoD items testable; build, test, review criteria explicit |
| Risk mitigation | 18/20 | Primary risks identified; secondary risks acceptable for MVP scope |

**Overall Confidence Score: 88/100** ✅ (Threshold: 65)

---

## Conclusion & Recommendation

### Status: ⚠️ APPROVED WITH ADJUSTMENTS

The IPD is **ready for pre-implementer HITL review** with three **minor, non-blocking clarifications**:

1. **React Router version constraint** — Specify `npm install react-router-dom@^6` in Phase 0 setup
2. **useNavigate hook integration** — Explicitly reference ARD Section 3.4 code pattern in Phase 3 AppShell updates
3. **Hook creation order** — Clarify useReleases vs fetch-in-component pattern for ReleaseNotesPage data loading

### Why Approved (Not Rejected)

1. ✅ All 8 acceptance criteria mapped to implementation tasks
2. ✅ Architecture fully respects ARD-007 React Router decision
3. ✅ File structure correct; tokens available; test patterns align
4. ✅ Risk assessment is realistic; mitigations are sound
5. ✅ 4.5-hour effort estimate is credible for 10 new files + 3 modifications
6. ✅ Dependencies explicit; critical path is linear and achievable

### Why "With Adjustments" (Not Blanket Approved)

1. ⚠️ Clarify npm install command for react-router-dom (prevents package.json ambiguity)
2. ⚠️ Explicit useNavigate import guidance (prevents copy-paste errors in AppShell)
3. ⚠️ useReleases hook status (prevent scope creep; TSD only requires useCurrentVersion)

### Next Steps for Pre-Implementer

1. Incorporate adjustments above into IPD Section 2 (Phases 0, 3) and Section 3 (Step 4)
2. Generate task board from 12-step Execution Flow (Section 3)
3. Assign developer; confirm 4.5-hour time window
4. Begin Phase 0 (React Router setup) — gates all downstream work

### Developer Readiness Check

A competent React/TypeScript developer can execute this plan without external dependencies or design decisions once adjustments are incorporated. No ambiguity blocks implementation. All file paths correct, tokens available, test patterns familiar.

---

**Document Ready for Pre-Implementer HITL Approval**

Date: 2026-04-20  
Reviewer: Claude Code (plan-reviewer)  
Confidence: 88/100  
Status: APPROVED WITH ADJUSTMENTS ⚠️
