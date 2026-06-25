'use client'
import { useState } from 'react'
import { filtrarTareas } from '@/lib/filtrarTareas'
import type { FiltroCompletada, TerminosBusqueda } from '@/lib/filtrarTareas'
import type { Tarea } from './useTareas'

export function useBusqueda(tareas: Tarea[]) {
  const [busquedaTitulo, setBusquedaTitulo] = useState('')
  const [busquedaCompletada, setBusquedaCompletada] = useState<FiltroCompletada>('todas')
  const [terminosBusqueda, setTerminosBusqueda] = useState<TerminosBusqueda | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const tareasMostradas =
    terminosBusqueda !== null ? filtrarTareas(tareas, terminosBusqueda) : tareas

  function ejecutarBusqueda(): void {
    const terminos: TerminosBusqueda = { titulo: busquedaTitulo, completada: busquedaCompletada }
    setTerminosBusqueda(terminos)
    if (filtrarTareas(tareas, terminos).length === 0) {
      setModalVisible(true)
    }
  }

  function limpiarBusqueda(): void {
    setBusquedaTitulo('')
    setBusquedaCompletada('todas')
    setTerminosBusqueda(null)
    setModalVisible(false)
  }

  return {
    busquedaTitulo,
    setBusquedaTitulo,
    busquedaCompletada,
    setBusquedaCompletada,
    terminosBusqueda,
    modalVisible,
    setModalVisible,
    tareasMostradas,
    ejecutarBusqueda,
    limpiarBusqueda,
  }
}
