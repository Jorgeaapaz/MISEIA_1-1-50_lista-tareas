# Session Retrospective — 2026-06-24
### Lista de Tareas — Features 3, 4 & 5: PDF Report, GCI MongoDB, and CI/CD Pipeline

---

## 1. Session Overview

This session continued from a previous context where the CRUD application and search/filter/paging features (Features 1 & 2) were already complete. Three major features were implemented end-to-end in this session, following a strict discipline: new git branch per feature → implementation → unit tests → E2E tests → commit → PR → merge → validate.

| Feature | Branch | PR | Tests | Status |
|---|---|---|---|---|
| 3 — PDF Report | `feature/pdf-report` | Merged | 46 unit + 29 E2E | Complete |
| 4 — GCI MongoDB Connection | `feature/gci-mongodb` | Merged | 46 unit + 29 E2E | Complete |
| 5 — CI/CD Pipeline | `feature/cicd-pipeline` | PR #5 merged | 46 unit (CI) | Complete |

---

## 2. Feature 3 — PDF Report

### What Was Built

A "Reporte" button that generates and downloads a PDF of the currently visible (filtered) task list. The PDF includes a title, generation date, active filter context, a formatted table of tasks (number, title, status), and totals of completed vs pending.

### Key Technical Problem: SSR Failure with jsPDF

**The problem:** Adding a static top-level import `import JsPDF from 'jspdf'` caused a build failure:
```
Module not found: Can't resolve '../internals/iterators'
```

**Why it happened:** jsPDF imports `canvg`, which imports `core-js`, which references Node.js internals that don't exist in the Next.js bundler. This fails even with the `'use client'` directive because Next.js pre-renders client components on the server to generate the initial HTML shell.

**The fix:** Move the imports inside the click handler using dynamic `import()`:
```typescript
async function generarReporte(): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  // ...
}
```

This guarantees jsPDF only loads in the browser, when the user clicks the button. As a bonus, it lazy-loads the ~500 KB bundle only on demand.

**Secondary benefit:** The button `onClick` had to be updated from `onClick={generarReporte}` to `onClick={() => { void generarReporte() }}` since TypeScript requires explicit `void` for discarded async Promises in JSX event handlers.

### Test Adjustments

Since `generarReporte()` is now async (due to dynamic imports), the `doc.save()` assertion in unit tests required wrapping in `waitFor`:
```typescript
await waitFor(() => expect(mockSave).toHaveBeenCalledWith('reporte-tareas.pdf'))
```

The `mockFetch` helper in tests was updated to return a `headers` object with a `.get()` method (anticipating Feature 4):
```typescript
function mockFetch(data, { dbStatus = 'connected', ok = true, status = 200 } = {}) {
  const headersMap = { 'x-db-status': dbStatus }
  return Promise.resolve({
    ok, status,
    json: () => Promise.resolve(data),
    headers: { get: (key) => headersMap[key.toLowerCase()] ?? null },
  } as unknown as globalThis.Response)
}
```

---

## 3. Feature 4 — GCI MongoDB with Offline Fallback

### What Was Built

- Changed `MONGODB_URI` in `.env.local` to point to a real MongoDB 7.0 instance on a Google Cloud Infrastructure VM (`34.174.56.186:27020`)
- Expanded the seed script to 30 tasks with mixed completion statuses
- Added offline resilience: 3 mock records when DB is unreachable, orange banner, green/red status icon, and a "Reconnect" button

### Architecture Decision: How to Signal DB State to the Client

**The problem:** The client component needs to know whether it's showing real data or fallback mock data. Several approaches were considered:

| Approach | Problem |
|---|---|
| Add `{ data, dbStatus }` wrapper in JSON body | Changes the API contract — breaks existing clients |
| Return HTTP 206 Partial Content on fallback | Semantically wrong; HTTP status codes describe the HTTP response, not the DB state |
| Separate `/api/health` endpoint | Requires an extra fetch on every load |
| HTTP response header `X-DB-Status` | **Clean, backward compatible, one line to read** |

**The solution:** Every `GET /api/tareas` response includes `X-DB-Status: connected` or `X-DB-Status: disconnected`. The client reads it with `res.headers.get('x-db-status')`. The JSON body never changes shape.

### The Reconnection Problem: Singleton Cache

**The problem:** The `MongoClient` singleton caches the connection. When the connection fails, the cache holds a reference to the broken client. Clicking "Reconnect" would call `cargarTareas()` again, but `connectToDatabase()` would return the cached broken client immediately — never retrying the real connection.

**The fix:** Add `resetConnection()` to `lib/mongodb.ts`:
```typescript
export function resetConnection(): void {
  if (process.env.NODE_ENV === 'development') {
    global._mongoClient = undefined
    global._mongoDb = undefined
  } else {
    prodClient = null
    prodDb = null
  }
}
```

Every API route's `catch` block calls `resetConnection()`. The next invocation of `connectToDatabase()` starts fresh with a new `MongoClient`.

### The Singleton in Development

Next.js hot-reload destroys and re-creates module-level variables on every file save. Without special handling, a new `MongoClient` would be created on every hot-reload, exhausting the connection pool quickly. The solution uses a `global` namespace variable that survives hot-reload:

```typescript
// Only the global namespace survives Next.js hot-reload
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri, CLIENT_OPTIONS)
    await global._mongoClient.connect()
  }
  global._mongoDb = global._mongoClient.db(dbName)
}
```

In production, no hot-reload occurs, so module-level `prodClient`/`prodDb` variables work fine.

### UI Implementation Details

```
Fixed bottom-right corner:
  ● green  → DB connected
  ● red    → DB disconnected (position moves up when banner is visible)

Fixed bottom banner (orange, only when disconnected):
  "You are not connected to the Database, Click on Reconnect"  [Reconnect]

The banner has role="status" aria-live="polite" for screen reader accessibility.
The icon has aria-label and title attributes for accessibility and Playwright selectors.
```

---

## 4. Feature 5 — CI/CD Pipeline

### VM Environment Discovery

Before writing any code, the VM environment was inspected via SSH:

```
VM: Ubuntu 24.04, Google Cloud, Docker 28.5.2
No Node.js, no PM2, no Traefik on host
Running containers: MongoDB, Redis, PostgreSQL, Mailhog, RustFS, Traefik, Whoami
All on: miseia-net (Docker bridge network)
Traefik: v3.3 with --providers.docker --providers.docker.network=miseia-net
Cert resolver: cloudflare (Cloudflare DNS challenge, wildcard *.deviaaps.com)
```

The `whoami` container's Docker labels revealed the exact label format Traefik expected:
```json
"traefik.enable": "true",
"traefik.http.routers.whoami.rule": "Host(`whoami.deviaaps.com`)",
"traefik.http.routers.whoami.entrypoints": "websecure",
"traefik.http.routers.whoami.tls": "true",
"traefik.http.routers.whoami.tls.certresolver": "cloudflare"
```

This pattern was replicated for the app container.

### Deployment Architecture

```
Developer machine
     │ git push origin master
     ▼
GitHub Actions (ubuntu-latest)
     │
     ├── Job: test (npm test --forceExit)
     │
     ├── Job: build-and-push
     │   ├── docker/setup-buildx-action (BuildKit + GHA cache)
     │   ├── docker/login-action (GHCR with GITHUB_TOKEN)
     │   ├── docker/metadata-action (tags: sha-short + latest)
     │   └── docker/build-push-action (multi-stage Dockerfile)
     │       ↓ push to ghcr.io/jorgeaapaz/miseia_1-1-50_lista-tareas:latest
     │
     └── Job: deploy (SSH to VM)
         ├── ssh-keyscan → known_hosts
         ├── mkdir ~/MISEIA1150_lista-tareas
         ├── scp docker-compose.yml
         ├── printf MONGODB_URI / MONGODB_DB → .env (via scp, no heredoc issues)
         ├── echo GITHUB_TOKEN | docker login ghcr.io --password-stdin
         └── docker compose pull → docker compose up -d --force-recreate
              ↓
         Container: miseia1150-listatareas on miseia-net
         Traefik: routes miseia1150_listatareas.deviaaps.com → container:30001
```

### The Standalone Output Decision

Adding `output: "standalone"` to `next.config.ts` changes the build output from requiring `node_modules/` at runtime to a self-contained `server.js` file:

```
Without standalone: Dockerfile needs npm ci --omit=dev on VM (slow, ~400MB)
With standalone:    Dockerfile copies .next/standalone/ only (~50MB runtime)
```

The `server.js` in standalone mode reads `process.env.PORT` and `process.env.HOSTNAME` — set to `30001` and `0.0.0.0` respectively in the Dockerfile.

### Why Not PM2 on the Host?

During the session, the user asked whether the app could run outside Docker connected to Traefik. The answer was yes — but the recommendation was to keep Docker. The core argument:

**Every other service on the VM runs in Docker. Making one service "special" doesn't simplify the system — it creates two operational models to maintain.** The Traefik file provider modification required to route to a host process would touch the shared Traefik configuration (a brief downtime risk for ALL services). PM2 on the host also introduces host-level state (Node.js version, PM2 installation, ecosystem config) that Docker containers deliberately avoid.

The 2-minute faster deployment time of PM2 does not justify breaking the architectural consistency of a Docker-native VM.

### Secret Management

All 5 secrets were set via `gh secret set` — never hardcoded:
```bash
gh secret set DEPLOY_SSH_KEY < C:/ubuntuiso/.ssh/vboxuser
gh secret set DEPLOY_HOST    --body "34.174.56.186"
gh secret set DEPLOY_USER    --body "gcvmuser"
gh secret set MONGODB_URI    --body "mongodb://admin:pass@host:27020/?authSource=admin"
gh secret set MONGODB_DB     --body "lista_tareas"
```

The `.env` file on the VM is created during deployment from the secrets — it never appears in the repository.

### Verification

After the PR merged and the pipeline ran, both the container status and the domain were verified:
```
Container: Up 27 seconds (docker ps on VM)
HTTPS:     HTTP 200 from https://miseia1150_listatareas.deviaaps.com
```

---

## 5. Process and Discipline

### Git Workflow Followed

```
master → feature/pdf-report → commit → PR → merge
master → feature/gci-mongodb → commit → PR → merge
master → feature/cicd-pipeline → commit → PR #5 → merge
```

Every PR was created with `gh pr create`, merged with `gh pr merge --merge`, and validated afterward. No force-pushes, no `--no-verify` skips.

### Test-First Commitment

No feature was committed without passing tests. The test count evolved:
- Before Feature 3: baseline (existing tests)
- After Feature 3: added 6 PDF tests + 5 DB E2E tests
- After Feature 4: added 7 DB unit tests + 5 DB E2E tests
- **Final count: 46 unit tests + 29 E2E tests**

### AGENTS.md Instruction

The project includes `AGENTS.md` with a critical instruction:
> "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

This was followed: Next.js 16 docs were read before implementing the standalone Dockerfile, confirming that `output: "standalone"` generates `server.js` as the entry point (not `next start`).

---

## 6. Errors and How They Were Resolved

### Error 1: jsPDF SSR Compilation Failure

```
Module not found: Can't resolve '../internals/iterators'
Import chain: ListaTareas.tsx → jspdf (static) → canvg → core-js → Node.js internals
```

**Root cause:** `'use client'` components are still pre-rendered on the server. Static imports run at module evaluation time (during SSR), not at handler invocation time (browser-only).

**Fix:** Dynamic `import()` inside the async click handler. The import is deferred until after hydration, when the code runs in the browser.

**Lesson:** SSR-incompatible libraries (those that reference browser APIs or Node.js-exclusive module internals) must always be imported dynamically in Next.js, regardless of the `'use client'` directive.

---

### Error 2: Stale Dev Server Port Conflict

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

**Root cause:** A previous `npm run dev` process was still running on port 3000 (PID 58500) when Playwright tried to start a new dev server.

**Fix:** `taskkill /PID 58500 /F` to kill the existing process before re-running Playwright.

**Lesson:** Always check for running dev servers before running E2E tests. Playwright's `webServer` config in `playwright.config.ts` starts its own instance — it will fail if the port is already occupied.

---

### Error 3: PowerShell Heredoc Limitation

```
El operador '<' está reservado para uso futuro.
```

**Root cause:** PowerShell (Windows) does not support bash-style heredoc (`<<`) or stdin redirection (`< file`).

**Fix:** Use the Git Bash tool (not PowerShell) for commands that require Unix-style stdin redirection:
```bash
# In Git Bash (not PowerShell):
gh secret set DEPLOY_SSH_KEY < "C:/ubuntuiso/.ssh/vboxuser"
```

**Lesson:** Always use the Bash tool for Unix-specific shell operations when running on Windows. PowerShell and Bash are not interchangeable for file redirection.

---

## 7. Architectural Recommendations

### Recommendation 1: Keep the Test Infrastructure Healthy

The `mockFetch` helper in `__tests__/ListaTareas.test.tsx` now carries significant logic (dbStatus, ok, status, headers). As more API behavior is added, consider extracting it to a `__tests__/helpers/mockFetch.ts` file shared between test suites.

### Recommendation 2: Add E2E Tests to CI

Currently E2E tests run only locally. The GitHub Actions pipeline only runs unit tests. Adding a separate CI job for E2E would catch regressions earlier:
```yaml
  e2e:
    name: E2E Tests
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npm run test:e2e
```

### Recommendation 3: MongoDB Backup Automation

The MongoDB instance on the VM has no automated backups. A cron job should be added:
```bash
# Add to VM crontab (crontab -e):
0 2 * * * docker exec mongodb mongodump --out /backup/$(date +%Y%m%d) --gzip
find /backup -mtime +7 -exec rm -rf {} +
```

### Recommendation 4: Use Node.js 24 in GitHub Actions

GitHub Actions flagged Node.js 20 as deprecated in the annotations:
```
Node.js 20 is deprecated. Actions are being forced to run on Node.js 24.
```
Update the workflow's `node-version: "20"` to `node-version: "24"` and the Dockerfile's `FROM node:20-alpine` to `FROM node:24-alpine` in the next sprint to align with the current LTS.

### Recommendation 5: Consider Authentication Before Adding More Features

The current application has no authentication. Anyone with the URL can modify all tasks. Before adding features that increase data sensitivity (due dates, priorities, user-specific lists), implement authentication via NextAuth.js or a similar solution. Without auth, every CRUD operation is a public API.

---

## 8. Summary of What Was Delivered

| Item | Description |
|---|---|
| **Feature 3 — PDF** | Button generates PDF of filtered list, dynamic import avoids SSR crash, disabled when list is empty |
| **Feature 4 — GCI MongoDB** | Real MongoDB on VM, 30 seeded tasks, X-DB-Status header, 3 mock fallback records, orange banner, Reconnect button, green/red status icon |
| **Feature 5 — CI/CD** | GitHub Actions 3-job pipeline, multi-stage Docker with standalone output, GHCR registry, SSH deploy, Traefik routing, app live at HTTPS domain |
| **Architecture analysis** | Detailed Docker vs PM2 comparison with recommendation to keep Docker |
| **README.md** | Full Spanish documentation: 12 sections including FR, NFR, regulatory, ADRs, BDD, specs, invariants |
| **Retrospective** | This document |
| **Tests** | 46 unit tests + 29 E2E tests passing throughout all features |
| **URL** | `https://miseia1150_listatareas.deviaaps.com` — HTTP 200 verified |
