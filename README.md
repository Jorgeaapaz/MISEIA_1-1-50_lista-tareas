# Lista de Tareas

A **Next.js 16 / React 19 / TypeScript** full-stack web application that lets users create, complete, edit, and delete tasks, persisting all data in MongoDB.

---

## Features Implemented

### Create Tasks
Add a new task by typing in the input field and submitting the form. The title is validated server-side; empty strings are rejected with a `400` response. Tasks are stored with a `creadoEn` timestamp and returned in descending creation order.

### Toggle Completion
Click the checkbox next to any task to toggle its `completada` flag. The update is applied optimistically on the client and persisted via a `PUT /api/tareas/[id]` call. No full list reload is required.

### Edit Task Title
Click the edit button on any task to switch it into an inline edit mode. Saving sends a `PUT` request with the updated `titulo`. An empty title is rejected client-side before any network request is made.

### Delete Tasks
Click the delete button to remove a task permanently. The item is removed from local state immediately and deleted from MongoDB via `DELETE /api/tareas/[id]`.

---

## Project Structure

```
lista-tareas/
├── app/
│   ├── globals.css                  — Tailwind CSS v4 global styles
│   ├── layout.tsx                   — Root layout with HTML shell
│   ├── page.tsx                     — Entry page; renders <ListaTareas />
│   ├── api/
│   │   └── tareas/
│   │       ├── route.ts             — GET (list) and POST (create) handlers
│   │       └── [id]/
│   │           └── route.ts         — PUT (update) and DELETE handlers
│   └── components/
│       └── ListaTareas.tsx          — Client component with full CRUD UI
├── lib/
│   └── mongodb.ts                   — Singleton MongoDB connection helper
├── next.config.ts                   — Next.js configuration
├── tsconfig.json                    — TypeScript compiler options
└── package.json                     — Dependencies and npm scripts
```

---

## Design Patterns / Architecture

**Singleton (Connection Pool)** — `lib/mongodb.ts` maintains a single `MongoClient` instance across hot-reloads in development by attaching it to `global._mongoClient`, preventing connection exhaustion during HMR cycles. In production a fresh client is created per cold start.

**API Route Handler pattern** — Each resource segment (`/api/tareas`, `/api/tareas/[id]`) exports named async functions (`GET`, `POST`, `PUT`, `DELETE`) that map directly to HTTP methods, following Next.js App Router conventions.

**Optimistic UI** — `ListaTareas.tsx` updates local React state immediately on toggle and delete actions, providing instant feedback without waiting for the server round-trip to complete.

---

## How It Works

On first render the client component fetches `GET /api/tareas`, which queries the MongoDB `tareas` collection and returns tasks sorted by creation date. Mutations (create, update, delete) call the corresponding REST endpoints, which validate input, interact with MongoDB via the shared `getDb()` helper, and return a JSON response. The client then updates its local state to reflect the change — either by refetching (create) or by applying a targeted state patch (toggle, edit, delete).

```typescript
// Toggling a task — optimistic update + API call
async function toggleCompletada(tarea: Tarea) {
  await fetch(`/api/tareas/${tarea._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completada: !tarea.completada }),
  })
  setTareas((prev) =>
    prev.map((t) =>
      t._id === tarea._id ? { ...t, completada: !t.completada } : t
    )
  )
}
```

---

## Getting Started

### Prerequisites
- **Node.js** 20 or later
- **MongoDB** instance (local or Atlas) with a connection URI
- A `.env.local` file with the following variables:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=lista_tareas
```

### Installation

```bash
git clone https://github.com/Jorgeaapaz/MISEIA_1-1-50_lista-tareas.git
cd MISEIA_1-1-50_lista-tareas/lista-tareas
npm install
```

### Run in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Example Output

**GET /api/tareas** — returns the task list:

```json
[
  { "_id": "6650a1b2c3d4e5f6a7b8c9d0", "titulo": "Comprar leche", "completada": false, "creadoEn": "2026-05-20T10:00:00.000Z" },
  { "_id": "6650a1b2c3d4e5f6a7b8c9d1", "titulo": "Llamar al médico", "completada": true,  "creadoEn": "2026-05-19T08:30:00.000Z" }
]
```

**POST /api/tareas** — success (201):

```json
{ "_id": "6650a1b2c3d4e5f6a7b8c9d2", "titulo": "Hacer ejercicio", "completada": false }
```

**POST /api/tareas** — validation failure (400):

```json
{ "error": "El título es requerido" }
```

**DELETE /api/tareas/:id** — ID not found (404):

```json
{ "error": "Tarea no encontrada" }
```

---

## Updates — 2026-06-24

### New Feature: Search Functionality

- **Search panel** added to the main UI — users can filter the task list by `titulo` (partial, case-insensitive text match) and/or `completada` status (`Todas` / `Pendientes` / `Completadas`).
- **"Buscar" button** applies the filter; a **"Limpiar" button** resets it and restores the full list.
- **Result counter** appears below the search panel once a search is active (e.g. *"1 resultado encontrado"*).
- **No-results modal** (`role="dialog"`) is shown when the filter yields 0 results. It includes the exact search terms used so the user knows what was looked for.

### New File: `lib/filtrarTareas.ts`

Pure utility that encapsulates all filtering logic. Exported as a generic function `filtrarTareas<T extends TareaBase>()` so it can be unit-tested independently of the component.

### Test Infrastructure Added

| Tool | Config file | Test files |
|------|-------------|-----------|
| Jest + React Testing Library | `jest.config.ts`, `jest.setup.ts` | `__tests__/filtrarTareas.test.ts`, `__tests__/ListaTareas.test.tsx` |
| Playwright (Chromium) | `playwright.config.ts` | `e2e/search.spec.ts` |

**Test counts:** 12 unit tests · 9 component tests · 9 E2E tests — **30 total, all passing.**

### New npm Scripts

| Script | Command |
|--------|---------|
| `npm test` | Run Jest unit + component tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |

### Updated Project Structure

```
lista-tareas/
├── __tests__/
│   ├── filtrarTareas.test.ts        — Unit tests for the filter utility
│   └── ListaTareas.test.tsx         — Component tests (search, modal, clear)
├── e2e/
│   └── search.spec.ts               — Playwright E2E tests with mocked API
├── lib/
│   ├── filtrarTareas.ts             — NEW: pure search/filter utility
│   └── mongodb.ts                   — Singleton MongoDB connection helper
├── jest.config.ts                   — Jest configuration (next/jest transformer)
├── jest.setup.ts                    — @testing-library/jest-dom setup
└── playwright.config.ts             — Playwright config (Chromium, webServer)
```

---

## Updates — 2026-06-24 (paging)

### New Feature: Pagination

- Task list is now paginated at **5 items per page** (`ITEMS_POR_PAGINA = 5`).
- **Anterior / Siguiente** navigation buttons appear below the list whenever there is more than one page.
- A **"Página X de Y"** indicator is shown between the nav buttons.
- Page resets to 1 automatically when a search is applied or cleared.
- Page clamps to the last valid page when tasks are deleted and the current page becomes empty.

### Updated Behavior: Conditional Search Visibility

- The search panel is now **hidden** when the task list has **0 or 1 task** — there is nothing to filter.
- The search panel is **shown** when there are **2 or more tasks**.

### New File: `scripts/seed.js`

Node.js script that populates the `tareas` collection with **27 sample tasks** (15 pending, 12 completed). Skips seeding if the collection already has ≥ 25 documents to prevent duplicates on repeated runs.

```bash
npm run seed
```

### Updated Test Counts

| Suite | Before | After |
|-------|--------|-------|
| Jest unit tests (`filtrarTareas`) | 12 | 12 |
| Jest component tests (`ListaTareas`) | 9 | 21 |
| Playwright E2E tests | 9 | 19 |
| **Total** | **30** | **52** |

All 52 tests pass.
