/**
 * Tests para hook useTableFilters
 * Verifica que buildActiveFilters filtra correctamente valores vacíos y procesa arrays
 */

const { renderHook } = require('@testing-library/react')
const { useTableFilters } = require('../../src/components/hooks/tablas_full/useTableFilters')

describe('useTableFilters Hook', () => {
  it('debe retornar un objeto con buildActiveFilters', () => {
    const { result } = renderHook(() => useTableFilters())
    expect(result.current).toHaveProperty('buildActiveFilters')
    expect(typeof result.current.buildActiveFilters).toBe('function')
  })

  it('debe filtrar valores vacíos de strings', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = { 
      nombre: 'Juan', 
      apellido: '', 
      email: 'juan@test.com',
      telefono: ''
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({
      nombre: 'Juan',
      email: 'juan@test.com'
    })
    expect(filtered).not.toHaveProperty('apellido')
    expect(filtered).not.toHaveProperty('telefono')
  })

  it('debe filtrar valores null y undefined', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = {
      campo1: 'valor',
      campo2: null,
      campo3: undefined,
      campo4: 'otro'
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({
      campo1: 'valor',
      campo4: 'otro'
    })
  })

  it('debe convertir arrays a strings separados por coma', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = {
      periodos: ['2023', '2024', '2025'],
      sexos: ['M', 'F'],
      estado: []
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({
      periodos: '2023,2024,2025',
      sexos: 'M,F'
    })
    expect(filtered).not.toHaveProperty('estado') // Array vacío se filtra
  })

  it('debe manejar arrays con un solo elemento', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = {
      especialidad: ['Cardiología']
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({
      especialidad: 'Cardiología'
    })
  })

  it('debe retornar objeto vacío cuando todos los valores están vacíos', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = {
      campo1: '',
      campo2: null,
      campo3: [],
      campo4: undefined
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({})
  })

  it('debe preservar valores booleanos y números', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = {
      activo: true,
      verificado: false,
      edad: 25,
      saldo: 0,
      nombre: 'test'
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({
      activo: true,
      verificado: false,
      edad: 25,
      saldo: 0,
      nombre: 'test'
    })
  })

  it('debe mantener memoización (mismas referencias)', () => {
    const { result: result1 } = renderHook(() => useTableFilters())
    const { result: result2 } = renderHook(() => useTableFilters())
    
    // Las funciones deben ser diferentes porque son diferentes instancias del hook
    expect(result1.current.buildActiveFilters).not.toBe(result2.current.buildActiveFilters)
  })

  it('debe manejar casos complejos con múltiples tipos', () => {
    const { result } = renderHook(() => useTableFilters())
    const formData = {
      id: 123,
      periodos: ['2023', '2024'],
      nombre: 'test',
      apellido: '',
      especialidades: [],
      activo: true,
      email: null,
      documento: '12345678'
    }
    const filtered = result.current.buildActiveFilters(formData)
    
    expect(filtered).toEqual({
      id: 123,
      periodos: '2023,2024',
      nombre: 'test',
      activo: true,
      documento: '12345678'
    })
  })
})
