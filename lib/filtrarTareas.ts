export type FiltroCompletada = 'todas' | 'completadas' | 'pendientes'

export interface TerminosBusqueda {
  titulo: string
  completada: FiltroCompletada
}

export interface TareaBase {
  titulo: string
  completada: boolean
}

export function filtrarTareas<T extends TareaBase>(tareas: T[], terminos: TerminosBusqueda): T[] {
  return tareas.filter((t) => {
    const coincideTitulo =
      terminos.titulo === '' ||
      t.titulo.toLowerCase().includes(terminos.titulo.toLowerCase())
    const coincideEstado =
      terminos.completada === 'todas' ||
      (terminos.completada === 'completadas' && t.completada) ||
      (terminos.completada === 'pendientes' && !t.completada)
    return coincideTitulo && coincideEstado
  })
}
