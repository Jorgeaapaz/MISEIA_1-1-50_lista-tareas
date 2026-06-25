'use client'
import { useState, useEffect, useTransition } from 'react'

export interface Tarea {
  _id: string
  titulo: string
  completada: boolean
}

export function useTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dbConectada, setDbConectada] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoTexto, setEditandoTexto] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    void cargarTareas()
  }, [])

  async function cargarTareas(): Promise<void> {
    setIsLoading(true)
    try {
      const res = await fetch('/api/tareas')
      const data = await res.json()
      const connected = res.headers.get('x-db-status') === 'connected'
      setDbConectada(connected)
      if (Array.isArray(data)) setTareas(data)
    } finally {
      setIsLoading(false)
    }
  }

  function agregarTarea(titulo: string): void {
    startTransition(async () => {
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo }),
      })
      await cargarTareas()
    })
  }

  async function toggleCompletada(tarea: Tarea): Promise<void> {
    await fetch(`/api/tareas/${tarea._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completada: !tarea.completada }),
    })
    setTareas((prev) =>
      prev.map((t) => (t._id === tarea._id ? { ...t, completada: !t.completada } : t)),
    )
  }

  function iniciarEdicion(tarea: Tarea): void {
    setEditandoId(tarea._id)
    setEditandoTexto(tarea.titulo)
  }

  async function guardarEdicion(id: string): Promise<void> {
    if (!editandoTexto.trim()) return
    await fetch(`/api/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: editandoTexto }),
    })
    setTareas((prev) =>
      prev.map((t) => (t._id === id ? { ...t, titulo: editandoTexto.trim() } : t)),
    )
    setEditandoId(null)
  }

  async function eliminarTarea(id: string): Promise<void> {
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' })
    setTareas((prev) => prev.filter((t) => t._id !== id))
  }

  return {
    tareas,
    isLoading,
    dbConectada,
    editandoId,
    editandoTexto,
    setEditandoTexto,
    setEditandoId,
    isPending,
    cargarTareas,
    agregarTarea,
    toggleCompletada,
    iniciarEdicion,
    guardarEdicion,
    eliminarTarea,
  }
}
