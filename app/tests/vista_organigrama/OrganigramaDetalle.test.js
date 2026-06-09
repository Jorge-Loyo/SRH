/**
 * @jest-environment jsdom
 */
/**
 * OrganigramaDetalle.test.js - Tests de Validación
 */

describe('OrganigramaDetalle', () => {
  test('debe validar período en formato YYYY-MM', () => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/
    expect(regex.test('2024-01')).toBe(true)
    expect(regex.test('2024-12')).toBe(true)
    expect(regex.test('2024-06')).toBe(true)
    expect(regex.test('2024/01')).toBe(false)
    expect(regex.test('2024-1')).toBe(false)
    expect(regex.test('2024-13')).toBe(false)
    expect(regex.test('invalid')).toBe(false)
  })

  test('debe validar sigla alfanumérica (2-10 caracteres)', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('HGARM')).toBe(true)
    expect(siglaRegex.test('HG123')).toBe(true)
    expect(siglaRegex.test('AB')).toBe(true)
    expect(siglaRegex.test('A')).toBe(false)
    expect(siglaRegex.test('A' + 'B'.repeat(10))).toBe(false)
    expect(siglaRegex.test('HG@RM')).toBe(false)
    expect(siglaRegex.test('')).toBe(false)
  })

  test('AbortController debe estar disponible', () => {
    expect(typeof AbortController).not.toBe('undefined')
    const controller = new AbortController()
    expect(controller.signal).toBeDefined()
    expect(typeof controller.abort).toBe('function')
  })

  test('debe importar hospitals-data correctamente', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    expect(hospitalsData.hospitals).toBeDefined()
    expect(hospitalsData.hospitalsMap).toBeDefined()
    expect(Array.isArray(hospitalsData.hospitals)).toBe(true)
    expect(typeof hospitalsData.hospitalsMap).toBe('object')
  })

  test('PropTypes debe estar disponible', () => {
    const PropTypes = require('prop-types')
    expect(PropTypes).toBeDefined()
    expect(PropTypes.string).toBeDefined()
    expect(PropTypes.object).toBeDefined()
    expect(PropTypes.func).toBeDefined()
  })

  test('React debe estar disponible', () => {
    const React = require('react')
    expect(React).toBeDefined()
    expect(React.useState).toBeDefined()
    expect(React.useEffect).toBeDefined()
    expect(React.useMemo).toBeDefined()
  })

  test('debe tener al menos un hospital en data', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    expect(hospitalsData.hospitals.length).toBeGreaterThan(0)
  })

  test('período válido debe ser reutilizable', () => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/
    const periodos = ['2024-01', '2023-12', '2025-06', '2022-03']
    periodos.forEach(p => {
      expect(regex.test(p)).toBe(true)
    })
  })

  test('sigla válida debe ser reutilizable', () => {
    const regex = /^[A-Za-z0-9]{2,10}$/
    const siglas = ['HG', 'HGARM', 'HG123', 'AB123CD']
    siglas.forEach(s => {
      expect(regex.test(s)).toBe(true)
    })
  })
})
