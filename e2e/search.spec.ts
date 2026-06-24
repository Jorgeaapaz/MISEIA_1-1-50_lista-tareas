import { test, expect } from '@playwright/test'

const tareasFixture = [
  { _id: '1', titulo: 'Comprar leche', completada: false },
  { _id: '2', titulo: 'Estudiar TypeScript', completada: true },
  { _id: '3', titulo: 'Hacer ejercicio', completada: false },
]

test.describe('Búsqueda de tareas', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/tareas', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tareasFixture),
        })
      } else {
        await route.continue()
      }
    })
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
