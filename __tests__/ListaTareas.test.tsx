import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListaTareas from '@/app/components/ListaTareas'

// ─── mock jsPDF so it does not require Canvas in jsdom ────────────────────────

const mockSave = jest.fn()
const mockText = jest.fn()
const mockSetFontSize = jest.fn()
const mockDocInstance = {
  setFontSize: mockSetFontSize,
  text: mockText,
  save: mockSave,
  lastAutoTable: { finalY: 50 },
}

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(() => mockDocInstance),
}))

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// ─── fixtures ────────────────────────────────────────────────────────────────

const tareasFixture = [
  { _id: '1', titulo: 'Comprar leche', completada: false },
  { _id: '2', titulo: 'Estudiar TypeScript', completada: true },
  { _id: '3', titulo: 'Hacer ejercicio', completada: false },
]

const tareasPaginaFixture = Array.from({ length: 7 }, (_, i) => ({
  _id: String(i + 1),
  titulo: `Tarea número ${i + 1}`,
  completada: i % 2 === 0,
}))

const mockTareasOffline = [
  { _id: 'mock-1', titulo: 'Revisar correos (sin conexión)', completada: false },
  { _id: 'mock-2', titulo: 'Preparar informe semanal (sin conexión)', completada: true },
  { _id: 'mock-3', titulo: 'Actualizar documentación (sin conexión)', completada: false },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

function mockFetch(
  data: unknown,
  options: { dbStatus?: 'connected' | 'disconnected'; ok?: boolean; status?: number } = {},
) {
  const { dbStatus = 'connected', ok = true, status = 200 } = options
  const headersMap: Record<string, string> = { 'x-db-status': dbStatus }
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: { get: (key: string) => headersMap[key.toLowerCase()] ?? null },
  } as unknown as globalThis.Response)
}

function setupFetch(
  fixture: unknown[],
  dbStatus: 'connected' | 'disconnected' = 'connected',
) {
  global.fetch = jest.fn((url: RequestInfo | URL) => {
    if (url === '/api/tareas') return mockFetch(fixture, { dbStatus })
    return mockFetch({ ok: true })
  }) as jest.Mock
}

afterEach(() => {
  jest.clearAllMocks()
})

async function renderAndWait(
  fixture = tareasFixture,
  dbStatus: 'connected' | 'disconnected' = 'connected',
) {
  setupFetch(fixture, dbStatus)
  render(<ListaTareas />)
  await waitFor(() => expect(screen.getByText(fixture[0]!.titulo)).toBeInTheDocument())
}

// ─── search tests ─────────────────────────────────────────────────────────────

describe('ListaTareas — búsqueda', () => {
  it('muestra el formulario de búsqueda con sus controles', async () => {
    await renderAndWait()
    expect(screen.getByLabelText('Buscar por título')).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
  })

  it('filtra tareas por título al hacer clic en Buscar', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'leche')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText('Comprar leche')).toBeInTheDocument()
    expect(screen.queryByText('Estudiar TypeScript')).not.toBeInTheDocument()
    expect(screen.queryByText('Hacer ejercicio')).not.toBeInTheDocument()
  })

  it('filtra tareas por estado "completadas"', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'completadas')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText('Estudiar TypeScript')).toBeInTheDocument()
    expect(screen.queryByText('Comprar leche')).not.toBeInTheDocument()
    expect(screen.queryByText('Hacer ejercicio')).not.toBeInTheDocument()
  })

  it('filtra tareas por estado "pendientes"', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'pendientes')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText('Comprar leche')).toBeInTheDocument()
    expect(screen.getByText('Hacer ejercicio')).toBeInTheDocument()
    expect(screen.queryByText('Estudiar TypeScript')).not.toBeInTheDocument()
  })

  it('muestra el modal cuando no hay resultados', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'tarea_inexistente_xyz')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent('No se han encotrado registros con los datos proporcionados')
    expect(dialog).toHaveTextContent('tarea_inexistente_xyz')
  })

  it('incluye el estado en el modal cuando se busca solo por estado sin resultado', async () => {
    const user = userEvent.setup()
    setupFetch([
      { _id: '1', titulo: 'Tarea A', completada: false },
      { _id: '2', titulo: 'Tarea B', completada: false },
    ])
    render(<ListaTareas />)
    await waitFor(() => expect(screen.getByText('Tarea A')).toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'completadas')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Completadas')
  })

  it('cierra el modal al hacer clic en Cerrar', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'nada')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('restaura la lista completa al limpiar la búsqueda', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'leche')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.queryByText('Estudiar TypeScript')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(screen.getByText('Estudiar TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Comprar leche')).toBeInTheDocument()
    expect(screen.getByText('Hacer ejercicio')).toBeInTheDocument()
  })

  it('muestra el contador de resultados tras la búsqueda', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'leche')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText(/1 resultado encontrado/)).toBeInTheDocument()
  })

  it('no muestra el botón Limpiar antes de realizar una búsqueda', async () => {
    await renderAndWait()
    expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument()
  })
})

// ─── conditional search visibility ───────────────────────────────────────────

describe('ListaTareas — visibilidad del buscador', () => {
  it('oculta la búsqueda cuando la lista está vacía', async () => {
    setupFetch([])
    render(<ListaTareas />)
    await waitFor(() =>
      expect(screen.getByText(/No hay tareas/)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument()
  })

  it('oculta la búsqueda cuando solo hay 1 tarea', async () => {
    setupFetch([{ _id: '1', titulo: 'Única tarea', completada: false }])
    render(<ListaTareas />)
    await waitFor(() => expect(screen.getByText('Única tarea')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument()
  })

  it('muestra la búsqueda cuando hay 2 o más tareas', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
  })
})

// ─── paging tests ─────────────────────────────────────────────────────────────

describe('ListaTareas — paginación', () => {
  it('no muestra controles de paginación con 5 o menos tareas', async () => {
    await renderAndWait()
    expect(screen.queryByRole('navigation', { name: 'Paginación de tareas' })).not.toBeInTheDocument()
  })

  it('muestra controles de paginación con más de 5 tareas', async () => {
    await renderAndWait(tareasPaginaFixture)
    expect(screen.getByRole('navigation', { name: 'Paginación de tareas' })).toBeInTheDocument()
  })

  it('muestra solo 5 tareas en la primera página', async () => {
    await renderAndWait(tareasPaginaFixture)
    expect(screen.getByText('Tarea número 1')).toBeInTheDocument()
    expect(screen.getByText('Tarea número 5')).toBeInTheDocument()
    expect(screen.queryByText('Tarea número 6')).not.toBeInTheDocument()
    expect(screen.queryByText('Tarea número 7')).not.toBeInTheDocument()
  })

  it('muestra el indicador de página correctamente', async () => {
    await renderAndWait(tareasPaginaFixture)
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('el botón Anterior está deshabilitado en la primera página', async () => {
    await renderAndWait(tareasPaginaFixture)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  it('navega a la siguiente página al hacer clic en Siguiente', async () => {
    const user = userEvent.setup()
    await renderAndWait(tareasPaginaFixture)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByText('Tarea número 6')).toBeInTheDocument()
    expect(screen.getByText('Tarea número 7')).toBeInTheDocument()
    expect(screen.queryByText('Tarea número 1')).not.toBeInTheDocument()
  })

  it('el botón Siguiente está deshabilitado en la última página', async () => {
    const user = userEvent.setup()
    await renderAndWait(tareasPaginaFixture)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('regresa a la primera página al hacer clic en Anterior', async () => {
    const user = userEvent.setup()
    await renderAndWait(tareasPaginaFixture)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(screen.getByRole('button', { name: 'Anterior' }))

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(screen.getByText('Tarea número 1')).toBeInTheDocument()
  })

  it('la búsqueda resetea a la página 1', async () => {
    const user = userEvent.setup()
    await renderAndWait(tareasPaginaFixture)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Buscar por título'), 'número 1')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText('Tarea número 1')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Paginación de tareas' })).not.toBeInTheDocument()
  })
})

// ─── PDF report button ────────────────────────────────────────────────────────

describe('ListaTareas — botón Reporte', () => {
  it('muestra el botón Reporte en la página', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Reporte' })).toBeInTheDocument()
  })

  it('el botón Reporte está deshabilitado cuando la lista está vacía', async () => {
    setupFetch([])
    render(<ListaTareas />)
    await waitFor(() => expect(screen.getByText(/No hay tareas/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Reporte' })).toBeDisabled()
  })

  it('el botón Reporte está habilitado cuando hay tareas', async () => {
    await renderAndWait()
    expect(screen.getByRole('button', { name: 'Reporte' })).toBeEnabled()
  })

  it('el botón Reporte está deshabilitado cuando la búsqueda no devuelve resultados', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'xyz_no_existe')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.getByRole('button', { name: 'Reporte' })).toBeDisabled()
  })

  it('el botón Reporte permanece habilitado con resultados de búsqueda', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.type(screen.getByLabelText('Buscar por título'), 'leche')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByRole('button', { name: 'Reporte' })).toBeEnabled()
  })

  it('llama a doc.save con el nombre de archivo correcto al hacer clic', async () => {
    const user = userEvent.setup()
    await renderAndWait()

    await user.click(screen.getByRole('button', { name: 'Reporte' }))

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith('reporte-tareas.pdf'))
  })
})

// ─── DB connection status ─────────────────────────────────────────────────────

describe('ListaTareas — estado de conexión a BD', () => {
  it('muestra el icono verde cuando la BD está conectada', async () => {
    await renderAndWait(tareasFixture, 'connected')
    const icon = screen.getByLabelText('Base de datos conectada')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('bg-green-500')
  })

  it('muestra el icono rojo cuando la BD está desconectada', async () => {
    await renderAndWait(mockTareasOffline, 'disconnected')
    const icon = screen.getByLabelText('Base de datos desconectada')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('bg-red-500')
  })

  it('no muestra la banda naranja cuando la BD está conectada', async () => {
    await renderAndWait(tareasFixture, 'connected')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('muestra la banda naranja cuando la BD está desconectada', async () => {
    await renderAndWait(mockTareasOffline, 'disconnected')
    const banner = screen.getByRole('status')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent(
      'You are not connected to the Database, Click on Reconnect',
    )
  })

  it('muestra el botón Reconnect en la banda naranja', async () => {
    await renderAndWait(mockTareasOffline, 'disconnected')
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument()
  })

  it('muestra los 3 registros de muestra cuando está desconectada', async () => {
    await renderAndWait(mockTareasOffline, 'disconnected')
    expect(screen.getByText('Revisar correos (sin conexión)')).toBeInTheDocument()
    expect(screen.getByText('Preparar informe semanal (sin conexión)')).toBeInTheDocument()
    expect(screen.getByText('Actualizar documentación (sin conexión)')).toBeInTheDocument()
  })

  it('llama a cargarTareas al hacer clic en Reconnect', async () => {
    const user = userEvent.setup()
    // First call: disconnected (mock data)
    // Second call (reconnect): connected (real data)
    let callCount = 0
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      if (url === '/api/tareas') {
        callCount++
        if (callCount === 1) {
          return mockFetch(mockTareasOffline, { dbStatus: 'disconnected' })
        }
        return mockFetch(tareasFixture, { dbStatus: 'connected' })
      }
      return mockFetch({ ok: true })
    }) as jest.Mock

    render(<ListaTareas />)
    await waitFor(() =>
      expect(screen.getByText('Revisar correos (sin conexión)')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Reconnect' }))

    await waitFor(() => expect(screen.getByText('Comprar leche')).toBeInTheDocument())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Base de datos conectada')).toBeInTheDocument()
  })
})
