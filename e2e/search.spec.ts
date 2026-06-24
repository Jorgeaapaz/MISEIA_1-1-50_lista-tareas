import { test, expect } from '@playwright/test'

// ─── fixtures ────────────────────────────────────────────────────────────────

const tareasBase = [
  { _id: '1', titulo: 'Comprar leche', completada: false },
  { _id: '2', titulo: 'Estudiar TypeScript', completada: true },
  { _id: '3', titulo: 'Hacer ejercicio', completada: false },
]

const tareasPagina = Array.from({ length: 7 }, (_, i) => ({
  _id: String(i + 1),
  titulo: `Tarea número ${i + 1}`,
  completada: i % 2 === 0,
}))

// ─── helper ──────────────────────────────────────────────────────────────────

async function mockTareas(page: import('@playwright/test').Page, data: unknown[]) {
  await page.route('/api/tareas', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    } else {
      await route.continue()
    }
  })
}

// ─── search tests ─────────────────────────────────────────────────────────────

test.describe('Búsqueda de tareas', () => {
  test.beforeEach(async ({ page }) => {
    await mockTareas(page, tareasBase)
    await page.goto('/')
    await page.waitForSelector('text=Comprar leche')
  })

  test('muestra el panel de búsqueda con sus controles', async ({ page }) => {
    await expect(page.getByLabel('Buscar por título')).toBeVisible()
    await expect(page.getByLabel('Filtrar por estado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible()
  })

  test('filtra tareas por título', async ({ page }) => {
    await page.getByLabel('Buscar por título').fill('leche')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('Comprar leche')).toBeVisible()
    await expect(page.getByText('Estudiar TypeScript')).not.toBeVisible()
    await expect(page.getByText('Hacer ejercicio')).not.toBeVisible()
  })

  test('filtra tareas por estado completadas', async ({ page }) => {
    await page.getByLabel('Filtrar por estado').selectOption('completadas')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('Estudiar TypeScript')).toBeVisible()
    await expect(page.getByText('Comprar leche')).not.toBeVisible()
    await expect(page.getByText('Hacer ejercicio')).not.toBeVisible()
  })

  test('filtra tareas por estado pendientes', async ({ page }) => {
    await page.getByLabel('Filtrar por estado').selectOption('pendientes')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('Comprar leche')).toBeVisible()
    await expect(page.getByText('Hacer ejercicio')).toBeVisible()
    await expect(page.getByText('Estudiar TypeScript')).not.toBeVisible()
  })

  test('muestra modal de sin resultados con los datos de búsqueda', async ({ page }) => {
    await page.getByLabel('Buscar por título').fill('tarea_inexistente_xyz')
    await page.getByRole('button', { name: 'Buscar' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('No se han encotrado registros con los datos proporcionados')
    await expect(dialog).toContainText('tarea_inexistente_xyz')
  })

  test('cierra el modal al hacer clic en Cerrar', async ({ page }) => {
    await page.getByLabel('Buscar por título').fill('nada_aqui')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('limpia la búsqueda y restaura la lista completa', async ({ page }) => {
    await page.getByLabel('Buscar por título').fill('leche')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('Estudiar TypeScript')).not.toBeVisible()
    await page.getByRole('button', { name: 'Limpiar' }).click()

    await expect(page.getByText('Estudiar TypeScript')).toBeVisible()
    await expect(page.getByText('Comprar leche')).toBeVisible()
    await expect(page.getByText('Hacer ejercicio')).toBeVisible()
  })

  test('combina filtros de título y estado', async ({ page }) => {
    await page.getByLabel('Buscar por título').fill('e')
    await page.getByLabel('Filtrar por estado').selectOption('pendientes')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('Comprar leche')).toBeVisible()
    await expect(page.getByText('Hacer ejercicio')).toBeVisible()
    await expect(page.getByText('Estudiar TypeScript')).not.toBeVisible()
  })

  test('muestra el contador de resultados', async ({ page }) => {
    await page.getByLabel('Buscar por título').fill('leche')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('1 resultado encontrado')).toBeVisible()
  })
})

// ─── conditional search visibility ───────────────────────────────────────────

test.describe('Visibilidad del buscador', () => {
  test('oculta la búsqueda cuando la lista está vacía', async ({ page }) => {
    await mockTareas(page, [])
    await page.goto('/')
    await page.waitForSelector('text=No hay tareas')
    await expect(page.getByRole('button', { name: 'Buscar' })).not.toBeVisible()
  })

  test('oculta la búsqueda con solo 1 tarea', async ({ page }) => {
    await mockTareas(page, [{ _id: '1', titulo: 'Única tarea', completada: false }])
    await page.goto('/')
    await page.waitForSelector('text=Única tarea')
    await expect(page.getByRole('button', { name: 'Buscar' })).not.toBeVisible()
  })

  test('muestra la búsqueda con 2 o más tareas', async ({ page }) => {
    await mockTareas(page, tareasBase)
    await page.goto('/')
    await page.waitForSelector('text=Comprar leche')
    await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible()
  })
})

// ─── paging tests ─────────────────────────────────────────────────────────────

test.describe('Paginación', () => {
  test.beforeEach(async ({ page }) => {
    await mockTareas(page, tareasPagina)
    await page.goto('/')
    await page.waitForSelector('text=Tarea número 1')
  })

  test('muestra solo 5 tareas en la primera página', async ({ page }) => {
    await expect(page.getByText('Tarea número 1')).toBeVisible()
    await expect(page.getByText('Tarea número 5')).toBeVisible()
    await expect(page.getByText('Tarea número 6')).not.toBeVisible()
    await expect(page.getByText('Tarea número 7')).not.toBeVisible()
  })

  test('muestra el indicador Página 1 de 2', async ({ page }) => {
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
  })

  test('el botón Anterior está deshabilitado en la primera página', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  test('navega a la página 2 al pulsar Siguiente', async ({ page }) => {
    await page.getByRole('button', { name: 'Siguiente' }).click()

    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(page.getByText('Tarea número 6')).toBeVisible()
    await expect(page.getByText('Tarea número 7')).toBeVisible()
    await expect(page.getByText('Tarea número 1')).not.toBeVisible()
  })

  test('el botón Siguiente está deshabilitado en la última página', async ({ page }) => {
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  test('regresa a la página 1 al pulsar Anterior', async ({ page }) => {
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.getByRole('button', { name: 'Anterior' }).click()

    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(page.getByText('Tarea número 1')).toBeVisible()
  })

  test('la búsqueda resetea la paginación a la página 1', async ({ page }) => {
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()

    await page.getByLabel('Buscar por título').fill('número 1')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('Tarea número 1')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Paginación de tareas' })).not.toBeVisible()
  })
})
