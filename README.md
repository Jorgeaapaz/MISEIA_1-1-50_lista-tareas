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
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ globals.css                  â€” Tailwind CSS v4 global styles
â”‚   â”œâ”€â”€ layout.tsx                   â€” Root layout with HTML shell
â”‚   â”œâ”€â”€ page.tsx                     â€” Entry page; renders <ListaTareas />
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â””â”€â”€ tareas/
â”‚   â”‚       â”œâ”€â”€ route.ts             â€” GET (list) and POST (create) handlers
â”‚   â”‚       â””â”€â”€ [id]/
â”‚   â”‚           â””â”€â”€ route.ts         â€” PUT (update) and DELETE handlers
â”‚   â””â”€â”€ components/
â”‚       â””â”€â”€ ListaTareas.tsx          â€” Client component with full CRUD UI
â”œâ”€â”€ lib/
â”‚   â””â”€â”€ mongodb.ts                   â€” Singleton MongoDB connection helper
â”œâ”€â”€ next.config.ts                   â€” Next.js configuration
â”œâ”€â”€ tsconfig.json                    â€” TypeScript compiler options
â””â”€â”€ package.json                     â€” Dependencies and npm scripts
```

---

## Design Patterns / Architecture

**Singleton (Connection Pool)** â€” `lib/mongodb.ts` maintains a single `MongoClient` instance across hot-reloads in development by attaching it to `global._mongoClient`, preventing connection exhaustion during HMR cycles. In production a fresh client is created per cold start.

**API Route Handler pattern** â€” Each resource segment (`/api/tareas`, `/api/tareas/[id]`) exports named async functions (`GET`, `POST`, `PUT`, `DELETE`) that map directly to HTTP methods, following Next.js App Router conventions.

**Optimistic UI** â€” `ListaTareas.tsx` updates local React state immediately on toggle and delete actions, providing instant feedback without waiting for the server round-trip to complete.

---

## How It Works

On first render the client component fetches `GET /api/tareas`, which queries the MongoDB `tareas` collection and returns tasks sorted by creation date. Mutations (create, update, delete) call the corresponding REST endpoints, which validate input, interact with MongoDB via the shared `getDb()` helper, and return a JSON response. The client then updates its local state to reflect the change â€” either by refetching (create) or by applying a targeted state patch (toggle, edit, delete).

```typescript
// Toggling a task â€” optimistic update + API call
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

**GET /api/tareas** â€” returns the task list:

```json
[
  { "_id": "6650a1b2c3d4e5f6a7b8c9d0", "titulo": "Comprar leche", "completada": false, "creadoEn": "2026-05-20T10:00:00.000Z" },
  { "_id": "6650a1b2c3d4e5f6a7b8c9d1", "titulo": "Llamar al mÃ©dico", "completada": true,  "creadoEn": "2026-05-19T08:30:00.000Z" }
]
```

**POST /api/tareas** â€” success (201):

```json
{ "_id": "6650a1b2c3d4e5f6a7b8c9d2", "titulo": "Hacer ejercicio", "completada": false }
```

**POST /api/tareas** â€” validation failure (400):

```json
{ "error": "El tÃ­tulo es requerido" }
```

**DELETE /api/tareas/:id** â€” ID not found (404):

```json
{ "error": "Tarea no encontrada" }
```
