'use client'

import { useState, useEffect, useTransition } from 'react'

interface Tarea {
  _id: string
  titulo: string
  completada: boolean
}

export default function ListaTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [input, setInput] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoTexto, setEditandoTexto] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    cargarTareas()
  }, [])

  async function cargarTareas() {
    const res = await fetch('/api/tareas')
    const data = await res.json()
    setTareas(data)
  }

  async function agregarTarea(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    startTransition(async () => {
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: input }),
      })
      setInput('')
      await cargarTareas()
    })
  }

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

  function iniciarEdicion(tarea: Tarea) {
    setEditandoId(tarea._id)
    setEditandoTexto(tarea.titulo)
  }

  async function guardarEdicion(id: string) {
    if (!editandoTexto.trim()) return
    await fetch(`/api/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: editandoTexto }),
    })
    setTareas((prev) =>
      prev.map((t) => (t._id === id ? { ...t, titulo: editandoTexto.trim() } : t))
    )
    setEditandoId(null)
  }

  async function eliminarTarea(id: string) {
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    setTareas((prev) => prev.filter((t) => t._id !== id))
  }

  const pendientes = tareas.filter((t) => !t.completada).length

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Lista de Tareas
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          {pendientes} tarea{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''}
        </p>

        <form onSubmit={agregarTarea} className="flex gap-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nueva tarea..."
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            Agregar
          </button>
        </form>

        <ul className="space-y-2">
          {tareas.map((tarea) => (
            <li
              key={tarea._id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3"
            >
              <input
                type="checkbox"
                checked={tarea.completada}
                onChange={() => toggleCompletada(tarea)}
                className="h-4 w-4 cursor-pointer accent-zinc-900 dark:accent-zinc-50"
              />

              {editandoId === tarea._id ? (
                <input
                  type="text"
                  value={editandoTexto}
                  onChange={(e) => setEditandoTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarEdicion(tarea._id)
                    if (e.key === 'Escape') setEditandoId(null)
                  }}
                  autoFocus
                  className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-transparent px-2 py-0.5 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                />
              ) : (
                <span
                  className={`flex-1 text-sm ${
                    tarea.completada
                      ? 'line-through text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-900 dark:text-zinc-50'
                  }`}
                >
                  {tarea.titulo}
                </span>
              )}

              {editandoId === tarea._id ? (
                <button
                  onClick={() => guardarEdicion(tarea._id)}
                  className="text-xs font-medium text-green-600 hover:text-green-700"
                >
                  Guardar
                </button>
              ) : (
                <button
                  onClick={() => iniciarEdicion(tarea)}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Editar
                </button>
              )}

              <button
                onClick={() => eliminarTarea(tarea._id)}
                className="text-xs font-medium text-red-400 hover:text-red-600"
              >
                Eliminar
              </button>
            </li>
          ))}
          {tareas.length === 0 && (
            <li className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-sm">
              No hay tareas. ¡Agrega una!
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
