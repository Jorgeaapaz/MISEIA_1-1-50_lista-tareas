'use client'
import { useState, useEffect } from 'react'
import type { Tarea } from './useTareas'

const ITEMS_POR_PAGINA = 5

export function usePaginacion(tareasMostradas: Tarea[]) {
  const [paginaActual, setPaginaActual] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(tareasMostradas.length / ITEMS_POR_PAGINA))

  useEffect(() => {
    setPaginaActual((p) => Math.min(p, totalPaginas))
  }, [totalPaginas])

  const tareasPaginadas = tareasMostradas.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  )

  return {
    paginaActual,
    setPaginaActual,
    totalPaginas,
    tareasPaginadas,
  }
}
