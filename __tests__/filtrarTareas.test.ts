import { filtrarTareas } from '@/lib/filtrarTareas'
import type { TareaBase } from '@/lib/filtrarTareas'

const tareas: TareaBase[] = [
  { titulo: 'Comprar leche', completada: false },
  { titulo: 'Estudiar TypeScript', completada: true },
  { titulo: 'Hacer ejercicio', completada: false },
  { titulo: 'Leer un libro', completada: true },
]

describe('filtrarTareas', () => {
  describe('filtro por título', () => {
    it('devuelve todas las tareas cuando el título está vacío', () => {
      const resultado = filtrarTareas(tareas, { titulo: '', completada: 'todas' })
      expect(resultado).toHaveLength(4)
    })

    it('filtra por coincidencia parcial en el título', () => {
      const resultado = filtrarTareas(tareas, { titulo: 'leche', completada: 'todas' })
      expect(resultado).toHaveLength(1)
      expect(resultado[0]?.titulo).toBe('Comprar leche')
    })

    it('filtra sin distinción de mayúsculas', () => {
      const resultado = filtrarTareas(tareas, { titulo: 'ESTUDIAR', completada: 'todas' })
      expect(resultado).toHaveLength(1)
      expect(resultado[0]?.titulo).toBe('Estudiar TypeScript')
    })

    it('devuelve array vacío si no hay coincidencias', () => {
      const resultado = filtrarTareas(tareas, { titulo: 'xyz123_no_existe', completada: 'todas' })
      expect(resultado).toHaveLength(0)
    })
  })

  describe('filtro por estado', () => {
    it('devuelve solo las tareas pendientes', () => {
      const resultado = filtrarTareas(tareas, { titulo: '', completada: 'pendientes' })
      expect(resultado).toHaveLength(2)
      expect(resultado.every((t) => !t.completada)).toBe(true)
    })

    it('devuelve solo las tareas completadas', () => {
      const resultado = filtrarTareas(tareas, { titulo: '', completada: 'completadas' })
      expect(resultado).toHaveLength(2)
      expect(resultado.every((t) => t.completada)).toBe(true)
    })

    it('devuelve todas las tareas cuando el estado es "todas"', () => {
      const resultado = filtrarTareas(tareas, { titulo: '', completada: 'todas' })
      expect(resultado).toHaveLength(4)
    })
  })

  describe('filtro combinado', () => {
    it('combina filtro de título y estado correctamente', () => {
      const resultado = filtrarTareas(tareas, { titulo: 'e', completada: 'completadas' })
      expect(resultado.every((t) => t.completada)).toBe(true)
      expect(resultado.every((t) => t.titulo.toLowerCase().includes('e'))).toBe(true)
    })

    it('devuelve vacío cuando título y estado no coinciden a la vez', () => {
      const resultado = filtrarTareas(tareas, { titulo: 'leche', completada: 'completadas' })
      expect(resultado).toHaveLength(0)
    })
  })

  it('no muta el array original', () => {
    const copia = [...tareas]
    filtrarTareas(tareas, { titulo: 'leche', completada: 'pendientes' })
    expect(tareas).toEqual(copia)
  })

  it('funciona con un array vacío', () => {
    const resultado = filtrarTareas([], { titulo: 'algo', completada: 'todas' })
    expect(resultado).toHaveLength(0)
  })
})
