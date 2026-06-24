import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListaTareas from '@/app/components/ListaTareas'

const tareasFixture = [
  { _id: '1', titulo: 'Comprar leche', completada: false },
  { _id: '2', titulo: 'Estudiar TypeScript', completada: true },
  { _id: '3', titulo: 'Hacer ejercicio', completada: false },
]

function mockFetch(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as unknown as globalThis.Response)
}

beforeEach(() => {
  global.fetch = jest.fn((url: RequestInfo | URL) => {
    if (url === '/api/tareas') return mockFetch(tareasFixture)
    return mockFetch({ ok: true })
  }) as jest.Mock
})

afterEach(() => {
  jest.clearAllMocks()
})

async function renderAndWait() {
  render(<ListaTareas />)
  await waitFor(() => expect(screen.getByText('Comprar leche')).toBeInTheDocument())
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
    // Render with empty task list
    ;(global.fetch as jest.Mock).mockImplementation(() => mockFetch([]))
    render(<ListaTareas />)
    await waitFor(() => expect(screen.queryByText('Comprar leche')).not.toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'completadas')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Completadas')
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
