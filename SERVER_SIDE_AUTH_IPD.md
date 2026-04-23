# Implementation Plan Document (IPD)
## Server-Side PAT Handling for FlowBoard

**Status:** Draft  
**Date:** 2026-04-23  
**Agent:** planner  
**Repository:** `/home/runner/work/flow-board/flow-board`  
**App:** `apps/flowboard`

---

## 1. Executive Summary

### 1.1 Objective

Move GitHub Personal Access Token (PAT) handling from client-side localStorage to encrypted server-side session cookies, eliminating XSS token exposure risk while maintaining the same user experience.

### 1.2 Current Architecture

**FlowBoard** is currently a **pure SPA (Single Page Application)** that:
- Runs entirely in the browser (Vite-based React app)
- Stores PAT + session data in `localStorage` (plaintext)
- Makes direct API calls from browser to `api.github.com`
- Has no backend server component

**Current Auth Flow:**
1. User enters repo URL + PAT in `LoginView.tsx`
2. `GitHubContentsClient.verifyRepositoryAccess()` validates PAT via `GET /repos/{owner}/{repo}`
3. `saveSession()` stores PAT + repo metadata in `localStorage` (key: `flowboard.session.v1`)
4. All subsequent GitHub API calls use PAT from localStorage
5. Logout clears localStorage

**Current Files:**
- `src/infrastructure/session/sessionStore.ts` - Session persistence (localStorage)
- `src/infrastructure/github/client.ts` - GitHub API client
- `src/features/auth/LoginView.tsx` - Login UI
- `src/features/app/AppShell.tsx` - Main app shell with logout
- `src/App.tsx` - Root component with session state

### 1.3 Target Architecture

**Hybrid SPA + API Backend:**
- **Client (React SPA)**: Renders UI, manages user interactions, no secrets
- **Server (Express/Vite SSR middleware)**: Handles authentication, session encryption, proxies GitHub API calls
- **Session Storage**: httpOnly encrypted cookie (replaces localStorage)
- **GitHub API**: Accessed only from server-side using session cookie

**Target Auth Flow:**
1. User submits repo URL + PAT to `POST /api/auth/login` (client → server)
2. Server validates PAT via `GET https://api.github.com/user`
3. Server creates encrypted session cookie containing: `{ pat, login, name, avatar_url, owner, repo }`
4. Server returns success + minimal user data (no PAT)
5. Protected routes use session cookie to proxy GitHub API calls
6. `GET /api/auth/user` returns user profile from session (no PAT)
7. `POST /api/auth/logout` destroys session cookie

### 1.4 Key Changes

| Component | Current | Target |
|-----------|---------|--------|
| PAT Storage | `localStorage` (plaintext) | Server session cookie (encrypted) |
| GitHub API Calls | Direct from browser | Proxied through server |
| Session State | Client-managed React state | Server session + client UI state |
| Authentication | Client-side validation | Server-side validation + cookie |

---

## 2. Requirements Analysis

### 2.1 Functional Requirements

**FR1: Server-Side Login**
- `POST /api/auth/login` accepts `{ repoUrl, pat }`
- Validates PAT via `GET https://api.github.com/user`
- Validates repo access via `GET /repos/{owner}/{repo}`
- Creates encrypted httpOnly session cookie on success
- Returns `{ ok: true, user: { login, name, avatar_url } }`

**FR2: Session Cookie Security**
- Cookie name: `flowboard.session`
- Attributes: `httpOnly=true, secure=true (production), sameSite=lax, maxAge=7days`
- Content: encrypted JSON `{ pat, login, name, avatar_url, owner, repo, repoUrl, webUrl, apiBase }`
- Encryption: `express-session` with signed cookies or `iron-session`

**FR3: Protected GitHub API Proxy**
- All GitHub API calls routed through server: `/api/github/*`
- Server reads PAT from session cookie
- Server forwards request to GitHub with `Authorization: Bearer {pat}`
- Server returns GitHub response to client

**FR4: User Profile Endpoint**
- `GET /api/auth/user` returns `{ login, name, avatar_url }` (no PAT)
- Returns 401 if no valid session

**FR5: Logout**
- `POST /api/auth/logout` destroys session cookie
- Returns `{ ok: true }`

**FR6: Re-login Prevention**
- `POST /api/auth/login` returns 400 if already authenticated
- Client checks session before showing login form

### 2.2 Non-Functional Requirements

**NFR1: Security**
- PAT never sent to client after login
- Session cookies encrypted and signed
- CSP policy updated for API calls to server
- HTTPS enforced in production

**NFR2: Compatibility**
- Existing UI/UX unchanged
- No breaking changes to domain logic
- Playwright e2e tests must pass with minimal updates

**NFR3: Development Experience**
- Dev server runs backend + frontend concurrently
- Hot reload preserved for UI development
- Simple dependency addition (Express + session library)

---

## 3. Confidence Assessment

### 3.1 Exploration Completed

✅ **Repository structure analyzed**
- Pure SPA with no existing backend
- Vite 8 + React 19 + TypeScript 6
- Current auth in `src/features/auth/LoginView.tsx`
- Session management in `src/infrastructure/session/sessionStore.ts`
- GitHub client in `src/infrastructure/github/client.ts`

✅ **Architecture patterns identified**
- ADR-001: SPA + GitHub API direct
- ADR-003: domain/ + features/ + infrastructure/ layout
- ADR-004: Session in localStorage (to be superseded)

✅ **Dependencies reviewed**
- No server-side dependencies currently
- Need to add: `express`, `express-session`, `cookie-parser`
- Vite supports SSR middleware mode

### 3.2 Confidence Score: **85%**

**High Confidence (90%+):**
- ✅ Current architecture is well-documented
- ✅ Vite SSR middleware mode is standard pattern
- ✅ GitHub API contracts are clear

**Medium Confidence (70-89%):**
- ⚠️ Session encryption best practices (express-session vs iron-session)
- ⚠️ Dev workflow for concurrent frontend + backend
- ⚠️ CSP updates needed for `/api/*` calls

**Low Confidence (<70%):**
- None identified

### 3.3 Open Questions (HITL Required)

**Q1: Session Library Choice**
- Option A: `express-session` + `connect-redis` (production) or `session-file-store` (dev)
- Option B: `iron-session` (simpler, no store needed)
- **Recommendation:** `iron-session` for MVP simplicity

**Q2: API Proxy Strategy**
- Option A: Generic `/api/github/*` proxy (forwards everything)
- Option B: Specific endpoints per GitHub API call (more control)
- **Recommendation:** Option A for MVP, migrate to B later

**Q3: Development Server Setup**
- Option A: Single process with Vite middleware (server.js)
- Option B: Separate processes (concurrently)
- **Recommendation:** Option A for simplicity

---

## 4. Architecture Design

### 4.1 File Structure Changes

```
apps/flowboard/
├── server/                          # NEW: Backend server
│   ├── index.ts                    # Express app entry
│   ├── middleware/
│   │   ├── session.ts              # Session configuration
│   │   └── auth.ts                 # Auth middleware
│   ├── routes/
│   │   ├── auth.ts                 # /api/auth/* routes
│   │   └── github-proxy.ts         # /api/github/* proxy
│   └── types.ts                    # Server-side types
├── src/                            # Existing client code
│   ├── infrastructure/
│   │   ├── session/
│   │   │   └── sessionStore.ts     # MODIFY: Remove localStorage, use API
│   │   └── github/
│   │       └── client.ts           # MODIFY: Call /api/github/* instead
│   ├── features/
│   │   ├── auth/
│   │   │   └── LoginView.tsx       # MODIFY: POST to /api/auth/login
│   │   └── app/
│   │       └── AppShell.tsx        # MODIFY: POST to /api/auth/logout
│   └── App.tsx                     # MODIFY: GET /api/auth/user on mount
├── vite.config.ts                  # MODIFY: Add server proxy for dev
├── package.json                    # MODIFY: Add server deps + scripts
└── tsconfig.node.json              # MODIFY: Include server/
```

### 4.2 New Dependencies

```json
{
  "dependencies": {
    "express": "^5.1.0",
    "iron-session": "^8.0.5",
    "cookie-parser": "^1.4.8"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cookie-parser": "^1.4.9",
    "tsx": "^4.19.2"
  }
}
```

### 4.3 API Contract

#### 4.3.1 POST /api/auth/login

**Request:**
```json
{
  "repoUrl": "https://github.com/user/repo",
  "pat": "ghp_..."
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "user": {
    "login": "octocat",
    "name": "The Octocat",
    "avatar_url": "https://github.com/images/error/octocat_happy.gif"
  }
}
```

**Error Responses:**
- 400: Already authenticated or invalid input
- 401: Invalid PAT
- 403: Insufficient permissions
- 404: Repository not found

#### 4.3.2 GET /api/auth/user

**Success Response (200):**
```json
{
  "login": "octocat",
  "name": "The Octocat",
  "avatar_url": "https://github.com/images/error/octocat_happy.gif"
}
```

**Error Response:**
- 401: Not authenticated

#### 4.3.3 POST /api/auth/logout

**Success Response (200):**
```json
{
  "ok": true
}
```

#### 4.3.4 /api/github/* (GitHub API Proxy)

**All methods (GET, POST, PUT, DELETE) supported**

Example: `GET /api/github/repos/user/repo/contents/flowboard/catalog.json`

Server:
1. Reads PAT from session cookie
2. Forwards to `https://api.github.com/repos/user/repo/contents/flowboard/catalog.json`
3. Adds `Authorization: Bearer {pat}` header
4. Returns GitHub response as-is

---

## 5. Implementation Plan

### 5.1 Phase 1: Backend Foundation (High Risk, High Value)

**Objective:** Create Express server with session management

**Files to Create:**

1. **`server/index.ts`**
   - Express app setup
   - Session middleware (iron-session)
   - CORS configuration
   - Static file serving for production
   - Vite middleware integration for dev
   - Listen on port 3000

2. **`server/middleware/session.ts`**
   - `iron-session` configuration
   - Session type definitions
   - Cookie options (httpOnly, secure, sameSite)

3. **`server/middleware/auth.ts`**
   - `requireAuth` middleware
   - Reads session, returns 401 if missing

4. **`server/types.ts`**
   - TypeScript types for session data
   - API request/response types

**Files to Modify:**

5. **`package.json`**
   - Add dependencies: `express`, `iron-session`, `cookie-parser`, `@types/express`, `@types/cookie-parser`, `tsx`
   - Update scripts:
     ```json
     "dev": "tsx watch server/index.ts",
     "build": "npm run build:client && npm run build:server",
     "build:client": "tsc -b && vite build",
     "build:server": "tsc --project tsconfig.node.json",
     "start": "NODE_ENV=production node dist/server/index.js"
     ```

6. **`tsconfig.node.json`**
   - Add `"include": ["server/**/*"]`

**Testing:**
- Server starts and responds to `/api/health` (200 OK)
- Session cookie is set on test route
- Vite dev middleware serves SPA

**DoD:**
- ✅ `npm run dev` starts server with Vite middleware
- ✅ `http://localhost:3000` loads React app
- ✅ Session cookies work (manual test with Postman)

---

### 5.2 Phase 2: Authentication Endpoints (High Risk, High Value)

**Objective:** Implement login, logout, user endpoints

**Files to Create:**

1. **`server/routes/auth.ts`**
   - `POST /api/auth/login`:
     - Parse `{ repoUrl, pat }`
     - Validate PAT via `GET https://api.github.com/user`
     - Extract `{ login, name, avatar_url }`
     - Parse repo URL (reuse `parseRepoUrl` logic)
     - Verify repo access via `GET /repos/{owner}/{repo}`
     - Create session: `{ pat, login, name, avatar_url, owner, repo, repoUrl, webUrl, apiBase }`
     - Return `{ ok: true, user: { login, name, avatar_url } }`
   - `GET /api/auth/user`:
     - Require auth middleware
     - Return `{ login, name, avatar_url }` from session
   - `POST /api/auth/logout`:
     - Destroy session
     - Return `{ ok: true }`

**Files to Modify:**

2. **`server/index.ts`**
   - Mount auth routes: `app.use('/api/auth', authRoutes)`

**Dependencies:**
- Reuse or extract GitHub URL parsing from `src/infrastructure/github/url.ts`
- Use `node-fetch` for GitHub API calls (server-side)

**Testing:**
- Unit tests for auth routes (mock GitHub API)
- Integration test: login → user → logout flow

**DoD:**
- ✅ `POST /api/auth/login` with valid PAT returns user data
- ✅ `GET /api/auth/user` returns data after login, 401 before
- ✅ `POST /api/auth/logout` clears session
- ✅ Invalid PAT returns 401 with clear error message

---

### 5.3 Phase 3: GitHub API Proxy (Medium Risk, High Value)

**Objective:** Proxy all GitHub API calls through server

**Files to Create:**

1. **`server/routes/github-proxy.ts`**
   - Wildcard route: `app.use('/api/github', requireAuth, githubProxyRouter)`
   - Read PAT from session
   - Forward request to `https://api.github.com/{captured-path}`
   - Copy headers: `Accept`, `X-GitHub-Api-Version`, `If-None-Match`
   - Add `Authorization: Bearer {pat}`
   - Stream response back to client (preserve status codes, headers, body)

**Files to Modify:**

2. **`server/index.ts`**
   - Mount proxy: `app.use('/api/github', githubProxyRoutes)`

**Testing:**
- Test GET, POST, PUT, DELETE methods
- Test 401, 403, 404, 409 status code propagation
- Test `Retry-After` header forwarding

**DoD:**
- ✅ `/api/github/repos/user/repo` proxies to GitHub correctly
- ✅ GitHub errors (401, 404, 409) propagate to client
- ✅ All HTTP methods supported

---

### 5.4 Phase 4: Client-Side Refactoring (Medium Risk, High Value)

**Objective:** Update client to use server API instead of localStorage + direct GitHub

**Files to Modify:**

1. **`src/infrastructure/session/sessionStore.ts`**
   - **Remove:** `loadSession`, `saveSession`, `clearSession` localStorage logic
   - **Add:** 
     - `async checkSession(): Promise<FlowBoardSession | null>` → calls `GET /api/auth/user`
     - `async login(repoUrl, pat): Promise<FlowBoardSession>` → calls `POST /api/auth/login`
     - `async logout(): Promise<void>` → calls `POST /api/auth/logout`
   - **Keep:** `FlowBoardSession` type (remove `pat` field)

2. **`src/features/auth/LoginView.tsx`**
   - Replace `saveSession()` with `login()` API call
   - Handle API errors (401, 403, 404)
   - Remove client-side PAT validation logic

3. **`src/features/app/AppShell.tsx`**
   - Replace `clearSession()` with `logout()` API call

4. **`src/App.tsx`**
   - Replace `loadSession()` with `checkSession()` API call on mount

5. **`src/infrastructure/github/client.ts`**
   - **Remove:** `token` parameter from constructor
   - **Modify:** All fetch calls to use `/api/github/*` instead of `https://api.github.com`
   - **Remove:** `Authorization` header logic (server handles it)
   - **Keep:** Error handling, retry logic, response parsing

6. **`src/infrastructure/github/fromSession.ts`**
   - Remove `pat` field from session when creating client

**Testing:**
- Update integration tests to mock `/api/auth/*` and `/api/github/*`
- Update unit tests for sessionStore

**DoD:**
- ✅ Login flow works end-to-end with server API
- ✅ PAT never appears in client code or localStorage
- ✅ All GitHub API calls go through `/api/github/*`
- ✅ Logout clears session and redirects to login

---

### 5.5 Phase 5: Development Workflow (Low Risk, Medium Value)

**Objective:** Smooth dev experience for frontend + backend

**Files to Modify:**

1. **`vite.config.ts`**
   - Add server proxy for dev mode (optional, if using separate processes):
     ```ts
     export default defineConfig({
       server: {
         proxy: {
           '/api': 'http://localhost:3001'
         }
       }
     })
     ```
   - **Note:** If using Vite middleware mode (Phase 1 approach), no proxy needed

2. **`README.md`**
   - Update development instructions:
     ```bash
     npm install
     npm run dev  # Starts Express + Vite SSR
     ```
   - Document environment variables:
     - `SESSION_SECRET` (required for production)
     - `NODE_ENV` (development/production)

**Testing:**
- Verify HMR works for React components
- Verify server restarts on backend changes (tsx watch)

**DoD:**
- ✅ Single command starts full stack
- ✅ HMR works for frontend
- ✅ Backend auto-restarts on changes

---

### 5.6 Phase 6: Security Hardening (Medium Risk, High Value)

**Objective:** Secure session cookies and enforce HTTPS in production

**Files to Modify:**

1. **`server/middleware/session.ts`**
   - Set `secure: true` in production (check `NODE_ENV`)
   - Set strong `SESSION_SECRET` from env variable
   - Validate secret is at least 32 characters

2. **`server/index.ts`**
   - Add helmet middleware for security headers
   - Add rate limiting for `/api/auth/login` (prevent brute force)

3. **`vite.config.ts`**
   - Update CSP to allow `/api/*`:
     ```ts
     "connect-src 'self' /api",
     ```

4. **`.env.example`** (new file)
   ```
   SESSION_SECRET=change-me-to-a-secure-random-string-at-least-32-chars
   NODE_ENV=development
   PORT=3000
   ```

**Dependencies:**
- Add `helmet`, `express-rate-limit`

**Testing:**
- Test HTTPS redirects in production build
- Test session cookies have `secure` flag in production
- Test CSP allows API calls

**DoD:**
- ✅ Session cookies are secure in production
- ✅ CSP policy allows `/api/*` calls
- ✅ Rate limiting active on login endpoint
- ✅ `SESSION_SECRET` required in production

---

### 5.7 Phase 7: E2E Test Updates (Low Risk, Low Value)

**Objective:** Update Playwright tests for new auth flow

**Files to Modify:**

1. **`tests/e2e/auth.setup.ts`** (if exists)
   - Update to call `/api/auth/login` instead of setting localStorage

2. **`scripts/ensure-e2e-auth.mjs`**
   - Update session file path if needed
   - Ensure cookie storage in `.auth/user.json`

**Testing:**
- Run full e2e suite: `npm run test:e2e`

**DoD:**
- ✅ All e2e tests pass
- ✅ Auth setup uses server API

---

### 5.8 Phase 8: Documentation & ADR (Low Risk, Medium Value)

**Objective:** Document architecture changes

**Files to Create:**

1. **`.memory-bank/adrs/009-flowboard-server-side-pat-handling.md`**
   - Context: XSS risk with localStorage
   - Decision: Hybrid SPA + Express backend with session cookies
   - Consequences: Better security, added complexity
   - Supersedes: ADR-004 (localStorage storage)

**Files to Modify:**

2. **`apps/flowboard/README.md`**
   - Update "Security (RF14)" section with new server-side approach
   - Update "Development" section with server commands
   - Add "Production Deployment" section

**DoD:**
- ✅ ADR-009 written and committed
- ✅ README reflects new architecture
- ✅ Security section updated

---

## 6. Risk Analysis

### 6.1 High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Session encryption failure** | PAT leaked in cookie | Use battle-tested `iron-session`, test encryption manually |
| **GitHub API proxy bugs** | App breaks for all GitHub calls | Comprehensive proxy testing, start with GET only |
| **Dev workflow regression** | Slow iteration | Use Vite middleware mode, preserve HMR |
| **CSP breaks API calls** | Runtime errors | Test CSP in dev mode, adjust before production |

### 6.2 Medium Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Session expiry UX** | User loses work unexpectedly | Implement session refresh, show expiry warning |
| **E2E test breakage** | CI/CD blocked | Update tests incrementally, run after each phase |
| **CORS issues in dev** | API calls fail | Configure CORS properly in Express |

### 6.3 Low Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Dependency size increase** | Larger bundle | Server deps don't affect client bundle |
| **Port conflicts** | Dev server won't start | Use configurable PORT env variable |

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Server-Side:**
- `server/routes/auth.test.ts`:
  - Login with valid PAT → 200 + user data
  - Login with invalid PAT → 401
  - Login when already authenticated → 400
  - User endpoint with session → 200
  - User endpoint without session → 401
  - Logout → 200 + cookie cleared

- `server/routes/github-proxy.test.ts`:
  - GET request proxies correctly
  - POST/PUT/DELETE methods work
  - Error status codes propagate
  - Headers forwarded correctly

**Client-Side:**
- `src/infrastructure/session/sessionStore.test.ts`:
  - Update tests to mock fetch API
  - Test login, checkSession, logout functions

### 7.2 Integration Tests

- Full login flow: submit form → API call → session created → user data displayed
- GitHub proxy flow: login → fetch board data → data displays
- Logout flow: click logout → API call → redirect to login

### 7.3 E2E Tests (Playwright)

- Existing tests should pass with minimal updates
- Update auth setup to use API instead of localStorage

### 7.4 Manual Testing Checklist

- [ ] Login with valid PAT → app loads
- [ ] Login with invalid PAT → error message
- [ ] Refresh page → session persists
- [ ] Close tab, reopen → session persists (within 7 days)
- [ ] Logout → redirects to login
- [ ] Try to login while authenticated → error message
- [ ] GitHub API calls work (board list, create card, etc.)
- [ ] Session expires after 7 days
- [ ] Dev mode: HMR works for React components
- [ ] Dev mode: Server restarts on backend changes
- [ ] Production build: HTTPS enforced
- [ ] Production build: Session cookies have `secure` flag

---

## 8. Rollout Plan

### 8.1 Phase 1-3: Backend (3-5 days)
- Implement server foundation, auth routes, GitHub proxy
- Test in isolation (Postman, unit tests)
- No client changes yet

### 8.2 Phase 4: Client Refactoring (2-3 days)
- Update client to use server API
- Run integration tests
- Fix any breaking changes

### 8.3 Phase 5-6: Dev Workflow + Security (1-2 days)
- Optimize dev experience
- Add security hardening
- Test production build

### 8.4 Phase 7-8: Testing + Docs (1-2 days)
- Update e2e tests
- Write ADR-009
- Update README

**Total Estimate: 7-12 days**

---

## 9. Rollback Plan

If issues arise during implementation:

1. **Keep localStorage code**: Don't delete old sessionStore logic until server is fully tested
2. **Feature flag**: Add `USE_SERVER_AUTH` env variable to toggle between old and new
3. **Gradual migration**: Deploy server without forcing client changes initially
4. **Rollback commit**: Tag commit before Phase 4 as rollback point

---

## 10. Definition of Done

### 10.1 Functional DoD

- ✅ User can log in with repo URL + PAT via server API
- ✅ PAT is stored in encrypted httpOnly session cookie
- ✅ Session persists across page reloads for 7 days
- ✅ User can view profile data (login, name, avatar) without PAT
- ✅ User can log out and session is destroyed
- ✅ All GitHub API calls go through `/api/github/*` proxy
- ✅ Attempting to log in while authenticated returns error
- ✅ All existing features work (boards, cards, hours, etc.)

### 10.2 Technical DoD

- ✅ PAT never appears in client code, localStorage, or network responses
- ✅ Session cookies have `httpOnly`, `secure` (prod), `sameSite` attributes
- ✅ CSP policy updated to allow `/api/*` calls
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All e2e tests pass
- ✅ Code coverage maintained (target: >80%)
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Production build succeeds

### 10.3 Documentation DoD

- ✅ ADR-009 written and committed
- ✅ README updated with server setup instructions
- ✅ Security section reflects new architecture
- ✅ `.env.example` created with required variables
- ✅ Inline code comments for complex server logic

### 10.4 Deployment DoD

- ✅ Dev workflow: single command starts full stack
- ✅ Production build includes server + client
- ✅ Environment variables documented
- ✅ `SESSION_SECRET` required in production
- ✅ HTTPS enforced in production

---

## 11. Open Issues & Follow-ups

### 11.1 Immediate Issues (Block Implementation)

None identified. Confidence level is sufficient to proceed.

### 11.2 Future Enhancements (Post-MVP)

1. **Session refresh**: Extend session on activity to prevent mid-work expiration
2. **Multiple PATs**: Support different PATs for different repos
3. **OAuth flow**: Replace manual PAT with GitHub OAuth (better UX)
4. **Session persistence backend**: Move from cookie to Redis for horizontal scaling
5. **Rate limit handling**: Client-side retry logic for 429 responses
6. **Offline mode**: Service Worker cache for read operations

### 11.3 Questions for Code Review

1. Preferred session library: `iron-session` vs `express-session`?
2. Should GitHub proxy be generic (`/api/github/*`) or specific endpoints?
3. Session expiry: 7 days acceptable or needs longer?
4. Rate limiting: Which endpoints need it besides login?

---

## 12. Files Likely to Change

### 12.1 New Files (13 files)

```
server/index.ts
server/middleware/session.ts
server/middleware/auth.ts
server/routes/auth.ts
server/routes/github-proxy.ts
server/types.ts
server/routes/auth.test.ts
server/routes/github-proxy.test.ts
.env.example
.memory-bank/adrs/009-flowboard-server-side-pat-handling.md
```

### 12.2 Modified Files (11 files)

```
apps/flowboard/package.json
apps/flowboard/tsconfig.node.json
apps/flowboard/vite.config.ts
apps/flowboard/README.md
apps/flowboard/src/App.tsx
apps/flowboard/src/features/auth/LoginView.tsx
apps/flowboard/src/features/app/AppShell.tsx
apps/flowboard/src/infrastructure/session/sessionStore.ts
apps/flowboard/src/infrastructure/session/sessionStore.test.ts
apps/flowboard/src/infrastructure/github/client.ts
apps/flowboard/src/infrastructure/github/fromSession.ts
```

### 12.3 Potentially Modified Files (3 files)

```
apps/flowboard/tests/e2e/auth.setup.ts (if exists)
apps/flowboard/scripts/ensure-e2e-auth.mjs
apps/flowboard/.memory-bank/adrs/004-flowboard-session-and-pat-storage.md (superseded note)
```

**Total: 27 files (13 new, 14 modified)**

---

## 13. Smallest Viable Architecture

For an **absolute minimum** proof-of-concept that demonstrates server-side PAT handling:

### MVP Scope (3-4 days)

**Include:**
1. Express server with `iron-session`
2. `/api/auth/login` (validate PAT, create session)
3. `/api/auth/user` (return user data from session)
4. `/api/github/*` proxy (generic wildcard)
5. Update `LoginView.tsx` to use server API
6. Update `client.ts` to proxy through `/api/github/*`
7. Basic security (httpOnly cookies, CSRF protection)

**Exclude (defer to post-MVP):**
- Logout endpoint (can clear cookie client-side for testing)
- Re-login prevention
- Rate limiting
- Helmet security headers
- E2E test updates
- Full documentation
- Production deployment config

**Key Files (MVP):**
```
NEW:     server/index.ts (150 lines)
NEW:     server/routes/auth.ts (80 lines)
NEW:     server/routes/github-proxy.ts (40 lines)
MODIFY:  package.json (add 4 deps)
MODIFY:  src/features/auth/LoginView.tsx (20 lines changed)
MODIFY:  src/infrastructure/github/client.ts (30 lines changed)
MODIFY:  src/infrastructure/session/sessionStore.ts (50 lines changed)
```

**Total MVP: ~7 files, ~370 lines of new/changed code**

---

## 14. Summary

This plan transforms FlowBoard from a pure client-side SPA into a hybrid architecture with server-side session management, eliminating XSS token exposure risk while maintaining existing UX. The implementation is structured in 8 phases over 7-12 days, with clear DoD criteria, comprehensive testing, and a rollback strategy.

**Key Success Metrics:**
- ✅ PAT never exposed to client after login
- ✅ All existing features continue to work
- ✅ Dev experience preserved (HMR, fast iteration)
- ✅ Security hardening complete (httpOnly, secure, CSP)

**Next Steps:**
1. Get approval for session library choice (`iron-session` recommended)
2. Get approval for API proxy strategy (generic `/api/github/*` recommended)
3. Begin Phase 1: Backend Foundation

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-23  
**Approvals Required:** Tech Lead, Security Review  
