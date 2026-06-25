'use client'

import { useState } from 'react'
import type { FiltroCompletada } from '@/lib/filtrarTareas'
import { useTareas } from '@/app/hooks/useTareas'
import { useBusqueda } from '@/app/hooks/useBusqueda'
import { usePaginacion } from '@/app/hooks/usePaginacion'

const ETIQUETA_ESTADO: Record<FiltroCompletada, string> = {
  todas: 'Todas',
  completadas: 'Completadas',
  pendientes: 'Pendientes',
}

export default function ListaTareas() {
  const [input, setInput] = useState('')

  const {
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
  } = useTareas()

  const {
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
  } = useBusqueda(tareas)

  const { paginaActual, setPaginaActual, totalPaginas, tareasPaginadas } =
    usePaginacion(tareasMostradas)

  const pendientes = tareas.filter((t) => !t.completada).length
  const mostrarBusqueda = tareas.length > 1

  function handleAgregarTarea(e: React.FormEvent): void {
    e.preventDefault()
    if (!input.trim()) return
    agregarTarea(input)
    setInput('')
  }

  function handleBuscar(e: React.FormEvent): void {
    e.preventDefault()
    ejecutarBusqueda()
    setPaginaActual(1)
  }

  function handleLimpiarBusqueda(): void {
    limpiarBusqueda()
    setPaginaActual(1)
  }

  async function generarReporte(): Promise<void> {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new JsPDF()
    const fecha = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    doc.setFontSize(16)
    doc.text('Reporte de Tareas', 14, 20)

    doc.setFontSize(10)
    doc.text(`Fecha de generación: ${fecha}`, 14, 29)

    let startY = 38

    if (terminosBusqueda !== null) {
      const filtros: string[] = []
      if (terminosBusqueda.titulo) {
        filtros.push(`Título: "${terminosBusqueda.titulo}"`)
      }
      if (terminosBusqueda.completada !== 'todas') {
        filtros.push(`Estado: ${ETIQUETA_ESTADO[terminosBusqueda.completada]}`)
      }
      if (filtros.length > 0) {
        doc.text(`Filtros: ${filtros.join('  |  ')}`, 14, startY)
        startY += 8
      }
    }

    autoTable(doc, {
      startY,
      head: [['#', 'Título', 'Estado']],
      body: tareasMostradas.map((t, i) => [
        String(i + 1),
        t.titulo,
        t.completada ? 'Completada' : 'Pendiente',
      ]),
      columnStyles: {
        0: { cellWidth: 12 },
        2: { cellWidth: 30 },
      },
      headStyles: { fillColor: [24, 24, 27] },
      styles: { fontSize: 10 },
    })

    const completadas = tareasMostradas.filter((t) => t.completada).length
    const pendientesReporte = tareasMostradas.length - completadas
    const tableDoc = doc as unknown as { lastAutoTable: { finalY: number } }
    const finalY = tableDoc.lastAutoTable.finalY + 6

    doc.setFontSize(9)
    doc.text(
      `Total: ${tareasMostradas.length}  |  Completadas: ${completadas}  |  Pendientes: ${pendientesReporte}`,
      14,
      finalY,
    )

    doc.save('reporte-tareas.pdf')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Lista de Tareas
        </h1>

        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {pendientes} tarea{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={() => { void generarReporte() }}
            disabled={tareasMostradas.length === 0}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reporte
          </button>
        </div>

        {/* Add task */}
        <form onSubmit={handleAgregarTarea} className="flex gap-2 mb-6">
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

        {/* Search — hidden when list has 0 or 1 task */}
        {mostrarBusqueda && (
          <form
            onSubmit={handleBuscar}
            aria-label="Buscar tareas"
            className="flex flex-col gap-3 mb-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Buscar
            </p>
            <div className="flex gap-2">
              <label htmlFor="busqueda-titulo" className="sr-only">
                Buscar por título
              </label>
              <input
                id="busqueda-titulo"
                type="text"
                value={busquedaTitulo}
                onChange={(e) => setBusquedaTitulo(e.target.value)}
                placeholder="Buscar por título..."
                className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400"
              />
              <label htmlFor="busqueda-estado" className="sr-only">
                Filtrar por estado
              </label>
              <select
                id="busqueda-estado"
                value={busquedaCompletada}
                onChange={(e) => setBusquedaCompletada(e.target.value as FiltroCompletada)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400"
              >
                <option value="todas">Todas</option>
                <option value="pendientes">Pendientes</option>
                <option value="completadas">Completadas</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
              >
                Buscar
              </button>
              {terminosBusqueda !== null && (
                <button
                  type="button"
                  onClick={handleLimpiarBusqueda}
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Limpiar
                </button>
              )}
            </div>
          </form>
        )}

        {terminosBusqueda !== null && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {tareasMostradas.length} resultado
            {tareasMostradas.length !== 1 ? 's' : ''} encontrado
            {tareasMostradas.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Loading skeleton */}
        {isLoading ? (
          <ul aria-label="Cargando tareas" className="space-y-2">
            {[1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-12 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 animate-pulse motion-reduce:animate-none"
              />
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {tareasPaginadas.map((tarea) => (
              <li
                key={tarea._id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={tarea.completada}
                  onChange={() => { void toggleCompletada(tarea) }}
                  className="h-4 w-4 cursor-pointer accent-zinc-900 dark:accent-zinc-50"
                />

                {editandoId === tarea._id ? (
                  <input
                    type="text"
                    value={editandoTexto}
                    onChange={(e) => setEditandoTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void guardarEdicion(tarea._id)
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
                    onClick={() => { void guardarEdicion(tarea._id) }}
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
                  onClick={() => { void eliminarTarea(tarea._id) }}
                  className="text-xs font-medium text-red-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </li>
            ))}
            {tareasMostradas.length === 0 && terminosBusqueda === null && (
              <li className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-sm">
                No hay tareas. ¡Agrega una!
              </li>
            )}
          </ul>
        )}

        {/* Pagination */}
        {totalPaginas > 1 && (
          <nav
            aria-label="Paginación de tareas"
            className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700"
          >
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </nav>
        )}

        {/* Spacer so content is not hidden behind the offline band */}
        {!dbConectada && <div className="h-14" />}
      </div>

      {/* No-results modal */}
      {modalVisible && terminosBusqueda !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-sin-resultados-titulo"
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
        >
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h2
              id="modal-sin-resultados-titulo"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-3"
            >
              Sin resultados
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              No se han encotrado registros con los datos proporcionados
            </p>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 space-y-1 mb-4">
              {terminosBusqueda.titulo && (
                <p>
                  <span className="font-medium">Título:</span>{' '}
                  &ldquo;{terminosBusqueda.titulo}&rdquo;
                </p>
              )}
              <p>
                <span className="font-medium">Estado:</span>{' '}
                {ETIQUETA_ESTADO[terminosBusqueda.completada]}
              </p>
            </div>
            <button
              onClick={() => setModalVisible(false)}
              className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-50 py-2 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* DB connection status icon — always visible, bottom-right */}
      <div className={`fixed right-4 z-50 ${!dbConectada ? 'bottom-16' : 'bottom-4'}`}>
        <div
          aria-label={dbConectada ? 'Base de datos conectada' : 'Base de datos desconectada'}
          title={dbConectada ? 'Conectado a la base de datos' : 'Sin conexión a la base de datos'}
          className={`w-3 h-3 rounded-full shadow ${dbConectada ? 'bg-green-500' : 'bg-red-500'}`}
        />
      </div>

      {/* Offline banner */}
      {!dbConectada && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-0 left-0 right-0 z-40 bg-orange-500 text-white px-6 py-3 flex items-center justify-between"
        >
          <span className="text-sm font-medium">
            You are not connected to the Database, Click on Reconnect
          </span>
          <button
            type="button"
            onClick={() => { void cargarTareas() }}
            className="ml-4 flex-shrink-0 rounded-lg bg-white text-orange-600 px-4 py-1.5 text-sm font-semibold hover:bg-orange-50 transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}
    </div>
  )
}
