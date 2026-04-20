# Technical Specification: Release Notes Page with Versioning System

**Document Version:** v1.0  
**Date:** 2026-04-20  
**Status:** Ready for Implementation  
**Confidence Score:** 95%  

---

## 1. Objective & Goals

### Problem Statement
FlowBoard currently has no visible versioning system or release history. Users cannot see:
- What version of the app they are running
- What features, fixes, or improvements were included in releases
- When releases occurred
- What changed between versions

### Goals
1. **Visibility**: Display current app version prominently in the UI
2. **History**: Provide a dedicated page showing past and current releases with structured changelog
3. **Simplicity**: Use JSON-based data (no external versioning libraries or markdown parsing)
4. **Maintainability**: Single source of truth for versioning in `releases.json`
5. **Scalability**: Support semantic versioning and future API integration without changing component contracts

### Why Now
This feature completes the MVP user experience by providing release transparency and prepares the codebase for production deployments where version visibility is required.

---

## 2. Core Entities & Schema

### 2.1 Release Entity

A **Release** represents a shipped version of FlowBoard with its metadata and changelog.

```typescript
type Release = {
  version: string;           // Semantic version: "0.1.0", "0.2.0", etc.
  date: string;              // ISO 8601 date: "2026-04-20"
  status: 'current' | 'archived';  // Status in release lifecycle
  description?: string;      // Optional summary of release (max 200 chars)
  changes: Change[];         // Array of individual changes in this release
}
```

**Field Rules:**
- `version`: Must follow semantic versioning (`MAJOR.MINOR.PATCH`). No "v" prefix.
- `date`: ISO 8601 format (`YYYY-MM-DD`). Must be a valid date.
- `status`: Only **one** Release may have `status: 'current'` at any time (enforced by data contract, not validation logic).
- `description`: Optional. If present, max 200 characters. Used as release tagline.
- `changes`: Must not be empty. Minimum one change per release.

### 2.2 Change Entity

A **Change** represents a single item in a release's changelog.

```typescript
type Change = {
  type: 'feature' | 'fix' | 'improvement' | 'breaking';  // Semantic category
  title: string;            // Human-readable title (max 100 chars)
  description: string;      // Detailed explanation (max 300 chars)
}
```

**Field Rules:**
- `type`: One of four values. Determines visual icon and grouping.
  - `feature`: New capability or user-facing addition
  - `fix`: Bug resolution or error correction
  - `improvement`: Enhancement to existing feature (UX, performance, clarity)
  - `breaking`: Backward-incompatible change or removal
- `title`: Required, non-empty. Max 100 characters. Sentence case preferred.
- `description`: Required, non-empty. Max 300 characters. Explains scope and benefit.

### 2.3 Version Entity

**Current Version** is derived from the Release with `status: 'current'` in the releases array.

```typescript
type CurrentVersion = {
  version: string;    // e.g., "0.2.0"
  date: string;       // ISO date of current release
  status: 'current';  // Always literal 'current'
}
```

**Semantic Versioning Rules:**
- MAJOR: Breaking changes, major feature overhauls
- MINOR: New features, new capabilities (backward compatible)
- PATCH: Bug fixes, improvements (backward compatible)

**Detection Rule:** The last Release in `releases.json` array with `status: 'current'` is the current version.

---

## 3. API / Data Contract

### 3.1 releases.json Schema

**File Path:** `src/data/releases.json`

**Structure:**

```json
{
  "releases": [
    {
      "version": "0.1.0",
      "date": "2026-03-15",
      "status": "archived",
      "description": "Initial MVP release with personal kanban board",
      "changes": [
        {
          "type": "feature",
          "title": "Personal Kanban Board",
          "description": "Create and manage tasks in drag-and-drop columns (todo, doing, done)"
        },
        {
          "type": "feature",
          "title": "GitHub Auth Integration",
          "description": "Authenticate via GitHub PAT for secure session management"
        },
        {
          "type": "feature",
          "title": "Time Tracking",
          "description": "Log hours worked per task with monthly summary view"
        }
      ]
    },
    {
      "version": "0.2.0",
      "date": "2026-04-20",
      "status": "current",
      "description": "Enhanced UI, card redesign, and release notes",
      "changes": [
        {
          "type": "feature",
          "title": "Release Notes Page",
          "description": "View complete version history and changelog in dedicated /releases route"
        },
        {
          "type": "improvement",
          "title": "Kanban Card Redesign",
          "description": "Updated card layout with planned date, status icons, and improved typography"
        },
        {
          "type": "improvement",
          "title": "Done Column Virtualization",
          "description": "Optimized rendering for large task lists with 500+ archived items"
        },
        {
          "type": "fix",
          "title": "Board Selection Persistence",
          "description": "Selected board now persists across session restarts"
        }
      ]
    }
  ]
}
```

**Validation Rules (Data Contract):**
1. `releases` array must contain at least 1 Release
2. Exactly one Release must have `status: 'current'`
3. All `version` values must be unique within the array
4. All `version` values must be valid semantic versions
5. All `date` values must be valid ISO 8601 dates
6. Each Release's `changes` array must have ≥ 1 item
7. All `type` values in changes must be one of the four allowed types
8. No field may contain undefined/null (optional fields omitted entirely)

**Load Contract:** On app boot, if `releases.json` is:
- **Missing**: Log warning to console. Assume `version: "0.0.0"`, `date: unknown`. Release notes page shows empty state.
- **Malformed JSON**: Log error. Assume `version: "0.0.0"`. Page shows error message (not a crash).
- **Valid but no `current` Release**: Warn. Use first Release as fallback for display.
- **Valid and well-formed**: Load and proceed normally.

---

### 3.2 useCurrentVersion() Hook Signature

**Purpose:** Provide current version info to any component that needs it.

```typescript
/**
 * Custom React hook that returns the current app version.
 * 
 * Returns the Release object with status: 'current' from releases.json
 * Memoized; does not refetch on every render.
 * 
 * @returns {CurrentVersion | null} 
 *   - CurrentVersion object if found: { version, date, status: 'current' }
 *   - null if no current release exists or releases.json is unavailable
 * 
 * @example
 *   const version = useCurrentVersion();
 *   if (version) {
 *     console.log(`Running FlowBoard ${version.version}`);
 *   }
 */
export function useCurrentVersion(): CurrentVersion | null
```

**Behavior:**
- Reads from memoized releases data (loaded once per app lifecycle)
- Returns `null` if releases.json cannot be loaded or contains no `current` Release
- Does not subscribe to external updates; version is static per session
- Error handling: Catches JSON parse errors silently, returns null

**Usage Location:** App Shell topbar/footer for version badge display

---

### 3.3 ReleaseNotesPage Props & State Shape

**Component Contract:**

```typescript
/**
 * ReleaseNotesPage: Full-page display of all releases and changelog
 * 
 * Props: (none — data sourced from releases.json and hooks)
 * 
 * State:
 *   - releases: Release[] — all releases from releases.json
 *   - selectedType: string | null — active filter by change type (feature|fix|improvement|breaking|null)
 *   - isLoading: boolean — true while releases.json is being fetched
 *   - error: Error | null — if releases.json failed to load
 */

type ReleaseNotesPageState = {
  releases: Release[];
  selectedType: Change['type'] | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Behavior Contract:**
1. On mount: Fetch `src/data/releases.json`, parse it, store in state
2. Display all releases in reverse chronological order (newest first)
3. Highlight current release visually (border, badge, background)
4. Support optional filter buttons: "All", "Features", "Fixes", "Improvements", "Breaking"
5. When filter selected: Display only changes of that type in all releases
6. If no releases: Show empty state message
7. If error loading: Show error UI with retry option (manual page reload)

---

## 4. UI Requirements

### 4.1 Release Notes Page Layout

**Route:** `/releases`  
**Accessibility:** Full page route with semantic structure

**Visual Hierarchy:**
```
┌─────────────────────────────────────────┐
│  Page Header                            │
│  "Release Notes"                        │
│  Subheading: "Version history..."       │
├─────────────────────────────────────────┤
│  Filter Bar (horizontal)                │
│  [All] [Features] [Fixes] [Impr.] [Brk]│
├─────────────────────────────────────────┤
│  Release Card (current release first)   │
│  ┌───────────────────────────────────┐  │
│  │ v0.2.0 • 2026-04-20 [Current]     │  │
│  │ Enhanced UI and release notes      │  │
│  │                                   │  │
│  │ [🔧 Feature] Rel. Notes Page     │  │
│  │ [↑ Improve]  Card Redesign        │  │
│  │ [⚡ Fix]     Persistence Bug      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Release Card (archived)                │
│  ┌───────────────────────────────────┐  │
│  │ v0.1.0 • 2026-03-15               │  │
│  │ Initial MVP release                │  │
│  │                                   │  │
│  │ [🔧 Feature] Kanban Board         │  │
│  │ [🔧 Feature] GitHub Auth          │  │
│  │ [🔧 Feature] Time Tracking        │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 Release Card Component

**Container:** Card with border and subtle background  
**Content Sections:**
1. **Header:**
   - Version badge (semantic: "v0.2.0")
   - Release date (ISO format)
   - Status label: "Current" or "(Archived)" if not current
   - Optional description text below (if provided)

2. **Filter Tags (optional):**
   - Horizontal flex row of change type tags
   - Only show types that exist in this release's changes

3. **Change List:**
   - For each Change in filtered view:
     - Type icon (before title)
     - Title (bold)
     - Description (secondary text, wrapped)
     - Border-left accent color by type

### 4.3 Change Type Visual Indicators

**Icons & Colors (from tokens.css):**

| Type       | Icon | CSS Class/Token       | Color (var) |
|------------|------|----------------------|-------------|
| feature    | 🔧   | `--accent`           | `#6366f1` (indigo) |
| fix        | ✅   | `--success`          | `#10b981` (emerald) |
| improvement| ↑    | `--warning`          | `#f59e0b` (amber) |
| breaking   | ⚠️   | `--danger`           | `#ef4444` (red) |

**Styling Rules:**
- Icon: 16px, placed before title
- Color applied to: left border or icon, not text
- Background: transparent (no colored backgrounds)
- Border width: 2–3px left border per change item

### 4.4 Version Display in App Shell

**Location:** Top-right corner of header (next to existing logout button) or footer  
**Format:** Badge with current version  
**Design:**
- Compact badge: "v0.2.0"
- Subtle background color (from `--accent-dim`)
- Clickable to navigate to `/releases`
- Tooltip on hover: "View release notes"
- Responsive: Hide text on small screens, show icon only if space limited

---

## 5. Acceptance Criteria (Detailed)

### AC.1 Current Version Visible in UI
- [ ] App Shell renders version badge in header or footer
- [ ] Badge displays current version from `useCurrentVersion()` hook (e.g., "v0.2.0")
- [ ] Badge is clickable and navigates to `/releases` route
- [ ] Version is readable and accessible (color contrast ≥ 4.5:1)
- [ ] Responsive design: Text hides, icon remains visible on mobile (<512px width)

**Test Method:** E2E: Load app → verify version visible → click badge → verify navigation to `/releases`

---

### AC.2 Release Notes Page Route Exists
- [ ] Route `/releases` is registered in app router
- [ ] Page loads without errors when navigated to directly
- [ ] Page is accessible via version badge click
- [ ] Breadcrumb or back button available to return to main app
- [ ] URL is browser-navigable (deep linking works)

**Test Method:** E2E: `page.goto('/releases')` → expect page to load → verify no console errors

---

### AC.3 releases.json Has Valid Structure with 2+ Versions
- [ ] File `src/data/releases.json` exists
- [ ] Contains at least 2 releases: `0.1.0` (archived) and `0.2.0` (current)
- [ ] All versions follow semantic versioning (MAJOR.MINOR.PATCH)
- [ ] All releases have `status: 'archived' | 'current'`
- [ ] Exactly one release has `status: 'current'`
- [ ] Each release has ≥ 1 change
- [ ] All changes have `type` ∈ {feature, fix, improvement, breaking}
- [ ] All dates are ISO 8601 format (YYYY-MM-DD)
- [ ] JSON parses without syntax errors

**Test Method:** Unit test: Load and parse `releases.json` → validate schema against TypeScript types

---

### AC.4 Change Cards Display Type Icons, Titles, Descriptions
- [ ] Each change renders with type icon (feature, fix, improvement, breaking)
- [ ] Icon is visually distinct (color or symbol per type)
- [ ] Title is displayed in bold, readable text
- [ ] Description is displayed below title, wrapped at 80 chars on desktop
- [ ] Changes are grouped by release, not flattened
- [ ] Type icon is semantically meaningful (alt-text or aria-label if icon-only)

**Test Method:** E2E: Navigate to `/releases` → screenshot and verify change cards display correctly

---

### AC.5 Page Is Responsive and Uses Existing Design Tokens
- [ ] Page layout adapts to mobile (< 512px), tablet (512–1024px), desktop (> 1024px)
- [ ] No horizontal scrolling on any breakpoint
- [ ] All colors, fonts, spacing come from `src/styles/tokens.css`
- [ ] No inline styles or new CSS files created (only tokens)
- [ ] Cards are flexbox or grid (no floats)
- [ ] Text sizes use token scale: `--text-xs`, `--text-sm`, `--text-base`, etc.
- [ ] Spacing uses `--space-*` tokens (2, 3, 4, 5, etc.)
- [ ] Borders use `--border-*` tokens
- [ ] Shadows use `--shadow-*` tokens
- [ ] Border radius uses `--radius-*` tokens

**Test Method:** 
- Visual inspection at 320px, 768px, 1920px viewports
- CSS audit: No `color: #hex`, `padding: 10px`, etc. (all from tokens)

---

### AC.6 Version Single Source of Truth
- [ ] `releases.json` is the sole place where version is defined
- [ ] `package.json` version is NOT used for app version display (decoupled)
- [ ] App version is derived from `releases.json[].find(r => r.status === 'current')`
- [ ] Updating `releases.json` immediately reflects in UI on page reload
- [ ] No hardcoded version strings in code

**Test Method:** 
- Unit test: Verify `useCurrentVersion()` reads from releases data only
- Integration test: Update `releases.json`, reload, verify version changes

---

### AC.7 E2E Test: Release Notes Page Loads and Displays Content
- [ ] Test file: `tests/e2e/release-notes.spec.ts`
- [ ] Test 1: Navigate to `/releases` → expect page to load (no 404, no crash)
- [ ] Test 2: Verify heading "Release Notes" is visible
- [ ] Test 3: Verify at least one release card is rendered
- [ ] Test 4: Verify current release has "Current" badge
- [ ] Test 5: Verify changes are displayed with icons and text
- [ ] Test 6: Filter by type → expect only that type's changes to show
- [ ] Test 7: Click version badge in header → navigate to `/releases`

**Test Method:** Playwright test with `expect()` assertions on DOM elements

---

### AC.8 Unit Tests for Components and Hooks
- [ ] Test file: `src/features/release-notes/*.test.ts`
- [ ] Test: `useCurrentVersion()` returns correct Release object
- [ ] Test: `useCurrentVersion()` returns null if releases.json missing
- [ ] Test: `useCurrentVersion()` returns null if no `current` release
- [ ] Test: ReleaseNotesPage renders releases in reverse chronological order
- [ ] Test: ReleaseNotesPage filters changes by type correctly
- [ ] Test: Empty state message displays if no releases
- [ ] Test: Error state message displays if releases.json fails to load
- [ ] All tests pass with Vitest (`npm test`)

**Test Method:** Vitest unit tests with `renderHook`, `render`, `expect` assertions

---

## 6. Edge Cases & Rules

### E.1 releases.json Is Missing or Empty

**Behavior:**
- App does not crash
- `useCurrentVersion()` returns `null`
- Version badge in header displays: "v?.?.?" or hidden
- Release Notes page shows empty state message: "No releases available. Check back soon."
- Console warning logged: "releases.json not found or invalid"

**Prevention:** Include a default empty releases.json in the repo with warning comments

---

### E.2 releases.json Is Malformed JSON

**Behavior:**
- JSON parse fails
- `useCurrentVersion()` catches error, logs to console, returns `null`
- App does not crash (try/catch in loader)
- Release Notes page shows error message: "Unable to load releases. Please refresh the page."
- User can click "Retry" to reload page

**Prevention:** Validate JSON before committing (use `npm test` to catch schema mismatches)

---

### E.3 Multiple Releases Have `status: 'current'`

**Behavior (Data Contract Violation):**
- Schema validation catches this during load
- First Release with `status: 'current'` is used (deterministic)
- Warning logged: "Multiple releases marked as current; using first match"
- Page still renders (graceful degradation)

**Prevention:** Enforce in reviews; document that only one can be current at a time

---

### E.4 Release Has No Changes

**Behavior (Data Contract Violation):**
- Schema validation catches this
- Release renders but with: "No changes recorded for this release" message
- Does not break page or filtering

**Prevention:** Enforce in releases.json schema; minimum 1 change per release

---

### E.5 Change Type Value Is Unrecognized

**Behavior:**
- Type is not one of {feature, fix, improvement, breaking}
- Schema validation catches this
- Icon defaults to neutral symbol (e.g., "•")
- Type is displayed as-is (literal string) for debugging
- No style applied (defaults to text-secondary color)

**Prevention:** Enforce strict enum in TypeScript type

---

### E.6 Version String Is Not Semantic

**Example:** `"1.2"` or `"v1.2.3"` or `"latest"`

**Behavior:**
- Validation rejects
- Release filtered out (not displayed)
- Warning logged: "Invalid version format: ${version}"
- Remaining valid releases still display

**Prevention:** Validate with regex: `/^\d+\.\d+\.\d+$/`

---

### E.7 Version Already Exists in Array

**Example:** Two releases with `"version": "0.2.0"`

**Behavior:**
- Validation rejects
- Both releases filtered out
- Error logged: "Duplicate version in releases.json: 0.2.0"
- Remaining unique versions display

**Prevention:** Enforce uniqueness in schema validation

---

### E.8 Date Is Invalid ISO Format

**Example:** `"2026/04/20"` or `"April 20, 2026"`

**Behavior:**
- Validation rejects or coerces
- If rejects: Release filtered out, warning logged
- If coerces: Attempt `new Date(dateString)`; if invalid, treat as "unknown date"
- UI displays: "Released on [Invalid Date]" or omits date

**Prevention:** Enforce ISO 8601 format in data entry; use date picker if future UI allows

---

### E.9 Detecting Current Version Programmatically

**Rule:** Current version is the **last Release in the array with `status: 'current'`**.

**Algorithm:**
```typescript
const currentRelease = releases
  .filter(r => r.status === 'current')
  .pop() ?? null;
```

**Rationale:** Simplicity; array order indicates release order; last ensures determinism if multiple marked current (edge case E.3).

---

### E.10 Backward Compatibility: Schema Evolution

**Scenario:** Future version needs new fields in Release or Change entities.

**Rule:** New fields must be **optional** (not required) for backward compatibility.

**Example:** If future release needs `notes: string`:
```typescript
type Release = {
  // ... existing fields
  notes?: string; // NEW: optional field
};
```

**Implication:** Older releases.json with missing `notes` must still load and parse without error.

**Prevention:** Document schema versioning in a separate ADR if major breaking changes planned.

---

## 7. Tech Constraints

### C.1 Styling
- **Only tokens.css**: All colors, fonts, spacing, shadows, radii come from `src/styles/tokens.css`
- **No Tailwind**: No class utilities like `flex`, `p-4`, `bg-blue-500`
- **No new CSS files**: No `.module.css`, no `<style>` tags, no inline styles
- **CSS pattern**: Feature-based `.css` file per component (existing pattern in codebase)
- **Custom properties**: Use `var(--token-name)` in CSS rules

**Verification:** CSS audit: `grep -r "color:\|padding:\|margin:" src/features/release-notes/ --include="*.css"` returns nothing

---

### C.2 No External Dependencies
- **No version libraries**: `semver`, `node-semver`, etc. not imported
- **No markdown parsing**: `marked`, `react-markdown` not used
- **No HTTP clients**: Releases.json is a static asset, not fetched from API
- **React only**: Use React 19 hooks for state, no global state libraries beyond what app already has
- **TypeScript strict mode**: No `any`, no implicit types, all types explicit

**Verification:** `grep -r "import.*from.*semver\|from.*marked" src/` returns nothing

---

### C.3 React Component Patterns
- **Feature-based structure**: `src/features/release-notes/` contains all components, hooks, tests
- **Custom hooks**: `useCurrentVersion()` is the primary hook for version data
- **Functional components**: Only function components, no class components
- **Props typing**: All component props explicitly typed with TypeScript interfaces
- **Testing**: Vitest for unit tests, Playwright for E2E (existing test stack)

**Folder Example:**
```
src/features/release-notes/
├── ReleaseNotesPage.tsx      (main page component)
├── ReleaseCard.tsx           (release card component)
├── ChangeCard.tsx            (change item component)
├── FilterBar.tsx             (filter button bar)
├── useCurrentVersion.ts      (custom hook)
├── releases.types.ts         (TypeScript type definitions)
├── ReleaseNotesPage.test.ts  (unit tests)
└── release-notes.css         (styling, all from tokens)
```

---

### C.4 TypeScript Strict Mode
- **strict: true** in tsconfig.json (enforced by project)
- **No `any` type**: All types must be explicit or inferred
- **No implicit `any`**: Function params and return types always declared
- **Null/undefined safety**: Must handle both explicitly
- **Type guards**: Use `if (variable) {}` or `typeof` checks for narrowing

**Example:**
```typescript
// ✅ GOOD
function getVersion(releases: Release[]): CurrentVersion | null {
  const current = releases.find(r => r.status === 'current');
  return current ?? null;
}

// ❌ BAD
function getVersion(releases: any): any {
  return releases.find((r: any) => r.status === 'current');
}
```

---

### C.5 Data Loading Pattern
- **Static import**: `import releases from '../../data/releases.json'`
- **Or: Fetch + parse**: If `fetch()` used, handle errors with try/catch
- **Memoization**: Cache loaded releases in a module-level variable or hook
- **No re-parsing on every render**: Load once per app lifecycle

**Pattern:**
```typescript
let cachedReleases: Release[] | null = null;

export function getReleases(): Release[] {
  if (cachedReleases) return cachedReleases;
  try {
    cachedReleases = import('../../data/releases.json').then(m => m.default.releases);
    return cachedReleases;
  } catch {
    return [];
  }
}
```

---

## 8. Acceptance Criteria Mapping to Implementation

| AC ID | Requirement | Component(s) | Hook(s) | Tests |
|-------|-------------|--------------|---------|-------|
| AC.1  | Version badge in header | AppShell, version badge component | useCurrentVersion | E2E: header visible |
| AC.2  | `/releases` route | Router config (App.tsx or routing wrapper) | — | E2E: route loads |
| AC.3  | releases.json valid | Data file | — | Unit: JSON schema |
| AC.4  | Change cards with icons | ReleaseCard, ChangeCard | — | E2E: screenshot |
| AC.5  | Responsive design | All components + CSS | — | E2E: 3 breakpoints |
| AC.6  | Single source of truth | useCurrentVersion, releases.json | useCurrentVersion | Unit: reads from releases only |
| AC.7  | E2E test suite | — | — | E2E: `release-notes.spec.ts` |
| AC.8  | Unit test suite | — | useCurrentVersion, ReleaseNotesPage | Unit: `.test.ts` files |

---

## 9. Non-Functional Requirements

### Performance
- **releases.json load time**: < 100ms (static file, no network latency on local dev)
- **Page render time**: < 200ms even with 50+ releases (no virtualization needed; releases are typically < 20)
- **Memory**: Releases cached once; no re-parsing on navigation back to page
- **CSS**: No excessive reflows; layout shift < 100px (CLS < 0.1)

### Accessibility
- **WCAG 2.1 AA minimum**: Color contrast, keyboard navigation, screen reader support
- **Semantic HTML**: Use `<header>`, `<main>`, `<article>`, `<time>` where appropriate
- **ARIA labels**: Type icons have `aria-label` if purely decorative
- **Focus management**: Release cards and filter buttons are focusable (tabindex)
- **Color is not sole information**: Type is indicated by icon + text, not color alone

### Browser Support
- **Modern browsers**: Chrome, Firefox, Safari (Edge) — React 19 standards
- **Mobile**: iOS Safari, Chrome on Android
- **No IE11 support** (React 19 minimum)

### Security
- **No injection vectors**: releases.json is trusted data; no `dangerouslySetInnerHTML`
- **No secrets in releases.json**: Version strings and change text only; no API keys or credentials
- **CSP compliant**: All styles from tokens.css; no `<style>` tags

---

## 10. Open Questions & Resolutions

| # | Question | Status | Resolution |
|---|----------|--------|-----------|
| Q1 | Should version appear in browser tab title? | Resolved | No; out of scope for MVP. Future: can update `<title>` tag in head if needed. |
| Q2 | Should release notes be generated from git tags? | Resolved | No; JSON-based per user decision. Git integration is future scope. |
| Q3 | Can users create custom releases.json? | Resolved | No; releases.json is curated by maintainers only. Future: could expose via GitHub issue template. |
| Q4 | What happens if navigating to /releases while loading data? | Resolved | Show loading spinner; fallback to empty state if data fails. |
| Q5 | Should filter state persist across navigation? | Resolved | No; filter resets to "All" on page refresh. State is local (not persisted). |
| Q6 | Should releases.json support multiple languages? | Resolved | No; English only for MVP. i18n is future scope. |

---

## 11. Handoff to Planner

### Tasks to Schedule

**Phase: Feature Development**

**Task Group 1: Setup**
- [ ] Create `src/data/releases.json` with schema (2 versions: 0.1.0, 0.2.0)
- [ ] Create `src/features/release-notes/` folder structure
- [ ] Define TypeScript types in `releases.types.ts`

**Task Group 2: Core Components**
- [ ] Implement `useCurrentVersion()` hook
- [ ] Implement `ReleaseNotesPage` component
- [ ] Implement `ReleaseCard` component
- [ ] Implement `ChangeCard` component
- [ ] Implement `FilterBar` component
- [ ] Create `release-notes.css` using tokens.css

**Task Group 3: Integration**
- [ ] Add `/releases` route to app router (App.tsx)
- [ ] Add version badge to App Shell header
- [ ] Wire badge click to navigate to `/releases`

**Task Group 4: Testing**
- [ ] Write unit tests for `useCurrentVersion()`
- [ ] Write unit tests for `ReleaseNotesPage`
- [ ] Write E2E test: `tests/e2e/release-notes.spec.ts`
- [ ] All tests pass with Vitest (`npm test`)

**Task Group 5: Verification**
- [ ] Visual regression: Test at 320px, 768px, 1920px
- [ ] Accessibility audit: Color contrast, keyboard navigation
- [ ] CSS audit: No inline styles, all from tokens
- [ ] Code review: TypeScript strict, no `any`, no external deps
- [ ] Merge to `feature/timesheet` branch

---

### Dependencies & Blockers

**No blocking dependencies:** This feature is isolated from other features.

**Suggested prerequisite:** Ensure App.tsx routing is set up to support route parameters (already appears to be the case from code review).

---

### Artifact Reuse

**None.** This is a greenfield feature. No existing components or types reused.

---

### Success Criteria for Planner

1. ✅ All AC met (see Section 5)
2. ✅ All tests passing locally (`npm test && npm run preview`)
3. ✅ E2E tests in Playwright pass (`npm run test -- tests/e2e/release-notes.spec.ts`)
4. ✅ No TypeScript errors (`npm run build`)
5. ✅ No console warnings related to releases feature
6. ✅ Version badge visible and clickable in header
7. ✅ Release Notes page loads at `/releases`
8. ✅ CSS uses only tokens (no custom colors, spacing)
9. ✅ Responsive design tested at 3 breakpoints
10. ✅ Code review approved with spec reference

---

## Document History

| Version | Date | Status | Author | Notes |
|---------|------|--------|--------|-------|
| v1.0    | 2026-04-20 | Ready for Implementation | Spec Agent | Initial TSD. High confidence; no blocking decisions. |

---

## Summary

This Technical Specification defines a **Release Notes feature** for FlowBoard that:

1. **Displays current app version** in the App Shell header
2. **Provides a dedicated `/releases` page** showing structured changelog
3. **Uses JSON static data** (releases.json) as single source of truth
4. **Supports semantic versioning** and multiple release types (feature, fix, improvement, breaking)
5. **Adheres to design tokens** with no external dependencies or custom styling
6. **Includes responsive design, accessibility, and comprehensive testing** (unit + E2E)

All acceptance criteria are testable, non-functional requirements are explicit, and edge cases are handled gracefully. The feature is ready for planner task breakdown and implementation.

**Decision Status:** All consequential decisions resolved. Zero blocking decisions remaining.

**Confidence:** 95% (high)
