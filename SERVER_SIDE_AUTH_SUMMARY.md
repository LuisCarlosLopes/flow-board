# Server-Side PAT Handling - Architecture Summary

## Current State → Target State

### Before (Pure SPA)
```
┌─────────────────────────────────────────┐
│  Browser (React SPA)                    │
│  ┌────────────────────────────────────┐ │
│  │ localStorage: {                    │ │
│  │   pat: "ghp_xxxxx",  ← EXPOSED!   │ │
│  │   owner: "user",                   │ │
│  │   repo: "data"                     │ │
│  │ }                                  │ │
│  └────────────────────────────────────┘ │
│                 │                        │
│                 │ Authorization: Bearer  │
│                 ▼                        │
│         https://api.github.com           │
└─────────────────────────────────────────┘
```

### After (Hybrid SPA + Backend)
```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                        │
│  • No PAT storage                                           │
│  • Session cookie (httpOnly, encrypted)                     │
│  • All API calls → /api/*                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Node.js/Express Server (NEW)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Session Cookie: {                                     │  │
│  │   pat: "ghp_xxxxx",  ← ENCRYPTED, httpOnly           │  │
│  │   login: "octocat",                                   │  │
│  │   name: "The Octocat",                                │  │
│  │   avatar_url: "...",                                  │  │
│  │   owner: "user",                                      │  │
│  │   repo: "data"                                        │  │
│  │ }                                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                 │                                            │
│                 │ Authorization: Bearer {pat from session}  │
│                 ▼                                            │
│         https://api.github.com                               │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints (NEW)

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/login` | POST | Validate PAT, create session | No |
| `/api/auth/user` | GET | Get user profile (no PAT) | Yes |
| `/api/auth/logout` | POST | Destroy session | Yes |
| `/api/github/*` | ALL | Proxy to GitHub API | Yes |

## Files to Create (13 files)

### Backend Server (8 files)
```
server/
├── index.ts                    # Express app, Vite middleware, port 3000
├── types.ts                    # SessionData type definitions
├── middleware/
│   ├── session.ts             # iron-session config
│   └── auth.ts                # requireAuth middleware
├── routes/
│   ├── auth.ts                # Login, user, logout endpoints
│   ├── auth.test.ts           # Auth route tests
│   ├── github-proxy.ts        # Wildcard GitHub API proxy
│   └── github-proxy.test.ts   # Proxy tests
```

### Other (5 files)
```
.env.example                    # SESSION_SECRET, NODE_ENV, PORT
.memory-bank/adrs/
└── 009-flowboard-server-side-pat-handling.md  # ADR superseding ADR-004
```

## Files to Modify (14 files)

### Critical Changes (6 files)

**1. `apps/flowboard/package.json`**
```json
{
  "dependencies": {
    "express": "^5.1.0",
    "iron-session": "^8.0.5",
    "cookie-parser": "^1.4.8"
  },
  "scripts": {
    "dev": "tsx watch server/index.ts",
    "build": "npm run build:client && npm run build:server"
  }
}
```

**2. `src/infrastructure/session/sessionStore.ts`**
```diff
- export function loadSession(): FlowBoardSession | null {
-   const raw = localStorage.getItem(STORAGE_KEY)
-   return raw ? JSON.parse(raw) : null
- }
+ export async function checkSession(): Promise<FlowBoardSession | null> {
+   const res = await fetch('/api/auth/user', { credentials: 'include' })
+   if (!res.ok) return null
+   return await res.json()
+ }

- export function saveSession(session: FlowBoardSession): void {
-   localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
- }
+ export async function login(repoUrl: string, pat: string): Promise<FlowBoardSession> {
+   const res = await fetch('/api/auth/login', {
+     method: 'POST',
+     headers: { 'Content-Type': 'application/json' },
+     credentials: 'include',
+     body: JSON.stringify({ repoUrl, pat })
+   })
+   if (!res.ok) throw new Error(await res.text())
+   return await res.json()
+ }

- export function clearSession(): void {
-   localStorage.removeItem(STORAGE_KEY)
- }
+ export async function logout(): Promise<void> {
+   await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
+ }
```

**3. `src/infrastructure/github/client.ts`**
```diff
  private url(path: string): string {
-   return `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${encoded}`
+   return `/api/github/repos/${this.owner}/${this.repo}/contents/${encoded}`
  }
  
  private headers(): HeadersInit {
    return {
-     Authorization: `Bearer ${this.token}`,  // Remove: server adds this
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }
```

**4. `src/features/auth/LoginView.tsx`**
```diff
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
-     const client = new GitHubContentsClient({ token: pat, owner, repo })
-     await client.verifyRepositoryAccess()
-     const session = createSession(pat, repoUrl, parsed)
-     saveSession(session)
+     const session = await login(repoUrl.trim(), pat.trim())
      onConnected(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
```

**5. `src/App.tsx`**
```diff
  export default function App() {
-   const [session, setSession] = useState<FlowBoardSession | null>(() => loadSession())
+   const [session, setSession] = useState<FlowBoardSession | null>(null)
+
+   useEffect(() => {
+     checkSession().then(setSession)
+   }, [])
```

**6. `src/features/app/AppShell.tsx`**
```diff
- function logout() {
+ async function handleLogout() {
    clearActiveBoardId(session)
-   clearSession()
+   await logout()
    onLogout()
  }
```

### Configuration (3 files)

**7. `tsconfig.node.json`**
```diff
  {
    "include": [
      "vite.config.ts",
+     "server/**/*"
    ]
  }
```

**8. `vite.config.ts`**
```diff
  const content = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
-   "connect-src 'self' https://api.github.com",
+   "connect-src 'self'",  // Now calls /api/* instead
    "img-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
```

**9. `README.md`**
- Update "Development" section with `npm run dev` command
- Update "Security" section to describe server-side PAT handling
- Add "Production Deployment" section with env vars

### Tests (3 files)

**10. `src/infrastructure/session/sessionStore.test.ts`**
- Mock fetch API instead of localStorage
- Test login(), checkSession(), logout() functions

**11. `tests/e2e/auth.setup.ts`** (if exists)
- Update to call `/api/auth/login` instead of setting localStorage

**12. `scripts/ensure-e2e-auth.mjs`**
- Ensure cookie storage in `.auth/user.json`

### Documentation (2 files)

**13. `.memory-bank/adrs/004-flowboard-session-and-pat-storage.md`**
- Add note: "Superseded by ADR-009"

**14. `.memory-bank/adrs/009-flowboard-server-side-pat-handling.md`** (new)
- Document decision to move PAT server-side

## Smallest Viable Implementation

**Minimum to prove concept (~4 days):**

1. Create `server/index.ts` with Express + iron-session (150 lines)
2. Create `server/routes/auth.ts` with login + user endpoints (80 lines)
3. Create `server/routes/github-proxy.ts` with wildcard proxy (40 lines)
4. Modify `package.json` to add deps + dev script
5. Modify `LoginView.tsx` to POST to `/api/auth/login`
6. Modify `client.ts` to call `/api/github/*`
7. Modify `sessionStore.ts` to use fetch API

**Total MVP: 7 files, ~370 lines changed**

## Security Improvements

| Before | After |
|--------|-------|
| PAT in plaintext localStorage | PAT in encrypted session cookie |
| XSS can steal PAT | XSS cannot access httpOnly cookie |
| PAT visible in DevTools | PAT never sent to client |
| Direct GitHub API calls expose PAT | Server proxies all calls |

## Development Workflow

**Before:**
```bash
npm run dev  # Vite dev server only
```

**After:**
```bash
npm run dev  # Express server + Vite middleware (single process)
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session library | `iron-session` | Simpler than express-session, no store needed |
| API proxy strategy | Generic `/api/github/*` | Simplest MVP, evolve to specific endpoints later |
| Dev server mode | Vite SSR middleware | Single process, preserves HMR |
| Cookie attributes | httpOnly, secure (prod), sameSite: lax | Industry best practices |
| Session expiry | 7 days | Matches previous localStorage persistence |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dev workflow regression | Use Vite middleware mode, preserve HMR |
| GitHub proxy bugs | Start with GET only, add methods incrementally |
| Session encryption failure | Use battle-tested iron-session library |
| E2E test breakage | Update tests incrementally, run after each phase |

## Success Criteria

✅ PAT never appears in client code, localStorage, or network responses  
✅ Session persists across page reloads for 7 days  
✅ All GitHub API calls proxied through server  
✅ All existing features work (boards, cards, hours)  
✅ Dev workflow: single command starts full stack  
✅ All tests pass (unit, integration, e2e)  

---

**See full plan:** `SERVER_SIDE_AUTH_IPD.md`  
**Date:** 2026-04-23  
**Estimate:** 7-12 days (4 days for MVP)
