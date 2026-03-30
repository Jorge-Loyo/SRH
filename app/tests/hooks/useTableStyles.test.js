/**
 * Tests para hook useTableStyles
 * Verifica que los estilos se retornen correctamente y sean memoizados
 */

const { renderHook } = require('@testing-library/react')
const { useTableStyles } = require('../../src/components/hooks/tablas_full/useTableStyles')

describe('useTableStyles Hook', () => {
  it('debe retornar un objeto con todos los estilos', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(result.current).toHaveProperty('headerStyle')
    expect(result.current).toHaveProperty('labelStyle')
    expect(result.current).toHaveProperty('sectionTitleStyle')
    expect(result.current).toHaveProperty('cellLeft')
    expect(result.current).toHaveProperty('cellRight')
  })

  it('debe retornar headerStyle correcto', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(result.current.headerStyle).toEqual({
      position: 'sticky',
      top: 0,
      background: '#F4F6F8',
      zIndex: 1,
      borderBottom: '2px solid #111'
    })
  })

  it('debe retornar labelStyle correcto', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(result.current.labelStyle).toEqual({
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 4,
      color: '#cbd5ff'
    })
  })

  it('debe retornar sectionTitleStyle correcto', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(result.current.sectionTitleStyle).toEqual({
      fontSize: 12,
      fontWeight: 700,
      color: '#AAB8FF',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      borderTop: '1px solid rgba(255,255,255,0.2)',
      paddingTop: 8,
      marginTop: 6
    })
  })

  it('debe retornar cellLeft correcto', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(result.current.cellLeft).toEqual({
      paddingLeft: 8,
      paddingRight: 8
    })
  })

  it('debe retornar cellRight correcto', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(result.current.cellRight).toEqual({
      paddingLeft: 8,
      paddingRight: 8
    })
  })

  it('debe memoizar los estilos (misma referencia en re-renders)', () => {
    const { result, rerender } = renderHook(() => useTableStyles())
    const firstResult = result.current
    
    rerender()
    
    expect(result.current).toBe(firstResult)
  })

  it('debe retornar objetos con todas las propiedades CSS esperadas', () => {
    const { result } = renderHook(() => useTableStyles())
    
    // Verificar que cada estilo es un objeto no vacío
    Object.keys(result.current).forEach(styleKey => {
      expect(typeof result.current[styleKey]).toBe('object')
      expect(Object.keys(result.current[styleKey]).length).toBeGreaterThan(0)
    })
  })

  it('debe tener colores válidos en estilos', () => {
    const { result } = renderHook(() => useTableStyles())
    
    // Expresión regular para validar colores hex
    const colorRegex = /^#[0-9A-F]{6}$/i
    
    expect(colorRegex.test(result.current.headerStyle.background)).toBe(true)
    expect(colorRegex.test(result.current.labelStyle.color)).toBe(true)
    expect(colorRegex.test(result.current.sectionTitleStyle.color)).toBe(true)
  })

  it('debe tener valores numéricos válidos', () => {
    const { result } = renderHook(() => useTableStyles())
    
    expect(typeof result.current.headerStyle.top).toBe('number')
    expect(typeof result.current.headerStyle.zIndex).toBe('number')
    expect(typeof result.current.labelStyle.fontSize).toBe('number')
    expect(typeof result.current.labelStyle.fontWeight).toBe('number')
  })
})
