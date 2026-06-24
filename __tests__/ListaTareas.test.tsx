import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListaTareas from '@/app/components/ListaTareas'

// ─── fixtures ────────────────────────────────────────────────────────────────

const tareasFixture = [
  { _id: '1', titulo: 'Comprar leche', completada: false },
  { _id: '2', titulo: 'Estudiar TypeScript', completada: true },
  { _id: '3', titulo: 'Hacer ejercicio', completada: false },
]

/** 7 tasks → 2 pages of 5 */
const tareasPaginaFixture = Array.from({ length: 7 }, (_, i) => ({
  _id: String(i + 1),
  titulo: `Tarea número ${i + 1}`,
  completada: i % 2 === 0,
}))

// ─── helpers ─────────────────────────────────────────────────────────────────

function mockFetch(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as unknown as globalThis.Response)
}

function setupFetch(fixture: unknown[]) {
  global.fetch = jest.fn((url: RequestInfo | URL) => {
    if (url === '/api/tareas') return mockFetch(fixture)
    return mockFetch({ ok: true })
  }) as jest.Mock
}

afterEach(() => jest.clearAllMocks())

// ─── search tests (3-task fixture) ───────────────────────────────────────────

async function renderAndWait(fixture = tareasFixture) {
  setupFetch(fixture)
  render(<ListaTareas />)
  await waitFor(() => expect(screen.getByText(fixture[0]!.titulo)).toBeInTheDocument())
}

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
    // 2 pending tasks → search panel visible, but searching "completadas" yields 0 results
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
    await renderAndWait() // 3-task fixture
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument()
  })
})

// ─── paging tests ─────────────────────────────────────────────────────────────

describe('ListaTareas — paginación', () => {
  it('no muestra controles de paginación con 5 o menos tareas', async () => {
    await renderAndWait() // 3 tasks
    expect(screen.queryByRole('navigation', { name: 'Paginación de tareas' })).not.toBeInTheDocument()
  })

  it('muestra controles de paginación con más de 5 tareas', async () => {
    await renderAndWait(tareasPaginaFixture) // 7 tasks
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

    // Search that matches only first-page items
    await user.type(screen.getByLabelText('Buscar por título'), 'número 1')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText('Tarea número 1')).toBeInTheDocument()
    // Pagination should be gone (only 1 result)
    expect(screen.queryByRole('navigation', { name: 'Paginación de tareas' })).not.toBeInTheDocument()
  })
})
