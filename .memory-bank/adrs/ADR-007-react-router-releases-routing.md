# ADR-007: React Router Integration for Release Notes Feature

**Status:** Accepted  
**Decision Date:** 2026-04-20  
**Architect:** Claude Code  
**Affects:** App.tsx, Release Notes feature  

---

## Context

FlowBoard currently uses a **state-based tab navigation pattern** in AppShell where the visible view is controlled by `mainView` state (`'kanban'` | `'hours'`). The browser URL remains `/` regardless of which tab is active.

The Release Notes feature requires a new page (`/releases`) that must be:
1. **Deep-linkable** — `page.goto('/releases')` must work (E2E test requirement)
2. **Bookmarkable** — users can share links to the release notes
3. **Browser-navigable** — back/forward buttons work correctly

The current state-based approach **cannot support deep links** because:
- URL is always `/`, not synchronized with view state
- Page refresh from `/releases` would lose the view state
- Implementing URL ↔ state sync would add complexity to AppShell

---

## Decision

**Introduce React Router at the App.tsx boundary.**

Route structure:
```
/                    → LoginView (no session) or AppShell (with session)
/releases            → ReleaseNotesPage (NEW)
```

**Rationale:**
- React Router is the **standard SPA routing solution** for React apps
- Setup is **minimal and contained** to App.tsx only
- AppShell **remains unchanged** — keeps its existing state-based tabs
- **No breaking changes** to current navigation patterns
- **Extensible** for future pages (settings, calendar, etc.)

---

## Alternatives Considered

### Option A: Third Tab in AppShell

Add `'releases'` to mainView state:
```typescript
type mainView = 'kanban' | 'hours' | 'releases'
```

**Rejected because:**
- URL stays `/` — E2E test fails (`page.goto('/releases')` doesn't work)
- Cannot deep-link or bookmark
- No URL persistence across refresh
- Browser back button doesn't behave correctly
- Violates semantic URL expectation (URL should reflect page state)

### Option B: Modal Overlay (Accepted: React Router)

Render ReleaseNotesPage as a modal dialog from the header.

**Rejected because:**
- Not deep-linkable — E2E test fails
- Not bookmarkable
- Browser history doesn't track modal state
- Semantically incorrect (should be a full page, not modal)
- Accessibility issues for screen reader users

---

## Consequences

### Positive

1. **E2E test passes** — `page.goto('/releases')` works as required
2. **User-friendly** — bookmarkable, shareable links to release notes
3. **Semantic URLs** — URL reflects actual page state
4. **Browser history** — back/forward buttons work naturally
5. **Future-proof** — routing infrastructure supports new pages without refactoring
6. **Minimal scope** — only App.tsx changes; AppShell untouched

### Negative

1. **New dependency** — React Router adds ~10KB to bundle (acceptable for routing)
2. **App.tsx changes** — requires wrapping existing components in `<BrowserRouter>` and `<Routes>`
3. **Routing conventions** — team must follow React Router patterns for future pages
4. **Build configuration** — no changes needed (Vite handles routing automatically in SPA mode)

### Neutral

1. **AppShell state-based tabs remain** — internal navigation still uses useState (no refactor)
2. **No database or API changes** — release data remains static JSON
3. **No impact on domain logic** — business rules unaffected

---

## Implementation Constraints

### GA-01: Single Router Root
```typescript
// App.tsx ONLY location for <BrowserRouter>
<BrowserRouter>
  <Routes>
    {/* all routes here */}
  </Routes>
</BrowserRouter>
```
No nested routers or duplicate BrowserRouter instances.

### GA-02: useNavigate() for Programmatic Navigation
```typescript
// Inside components (not App.tsx)
const navigate = useNavigate()
navigate('/releases')
```
Never mutate `window.location` directly; always use useNavigate hook.

### GA-03: AppShell Navigation Tab States Unchanged
```typescript
// AppShell internal state management remains
const [mainView, setMainView] = useState<'kanban' | 'hours'>('kanban')
// Still navigated via button click, NOT route change
```
Tab navigation stays state-driven; doesn't change to route-driven.

### GA-04: ReleaseNotesPage Is Route Component
```typescript
// In App.tsx Routes
<Route path="/releases" element={<ReleaseNotesPage />} />
```
ReleaseNotesPage receives no props; all data via hooks (useCurrentVersion, local state).

---

## Trade-offs

| Aspect | State-Based Tab | **React Router** | Modal |
|--------|-----------------|---------|-------|
| Deep-linkable URL | ❌ | ✅ | ❌ |
| Bundle size impact | - | +10KB | - |
| Code changes | Minimal | Minimal (App.tsx) | Minimal |
| Semantic correctness | ❌ | ✅ | ❌ |
| Future route support | ⚠️ Requires refactor | ✅ Built-in | ❌ Not applicable |

**Winner:** React Router — meets all non-functional requirements with acceptable trade-offs.

---

## Related Decisions

- **ADR-003** — Domain and UI Architecture: Feature-based component structure, applies to ReleaseNotesPage folder layout
- **ADR-001** — FlowBoard SPA + GitHub Persistence: Confirms SPA architecture; routing layer complements session management

---

## Verification Checklist

- [ ] React Router dependency added to package.json
- [ ] App.tsx wrapped in `<BrowserRouter>` and `<Routes>`
- [ ] `/` route renders LoginView or AppShell (conditional)
- [ ] `/releases` route renders ReleaseNotesPage
- [ ] E2E test passes: `page.goto('/releases')` loads without error
- [ ] Version badge in AppShell header uses `useNavigate()` to go to `/releases`
- [ ] AppShell tab navigation still works (no regression)
- [ ] No TypeScript errors
- [ ] All unit tests pass
- [ ] CSS audit confirms no inline styles (all from tokens.css)

---

## Migration Path (If Needed)

If a future feature requires migrating AppShell tabs from state-based to route-based:

```typescript
// FUTURE (not now):
// Route /kanban → <BoardView>
// Route /hours → <HoursView>
// Remove mainView state from AppShell
```

This decision **does not preclude** that migration; it just defers it. Currently AppShell keeps its state pattern for isolation.

---

## Conclusion

React Router provides the **cleanest, most maintainable solution** for supporting deep-linkable routes in FlowBoard. It requires minimal changes (App.tsx only), doesn't break existing patterns, and sets up the routing infrastructure for future growth.

**Accepted as the architectural decision for Release Notes feature and future SPA routing needs.**
