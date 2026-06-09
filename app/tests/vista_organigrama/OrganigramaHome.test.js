/**
 * @jest-environment jsdom
 */
/**
 * OrganigramaHome.test.js - Tests de Datos
 */

describe('OrganigramaHome', () => {
  test('debe tener hospitales disponibles', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    expect(hospitalsData.hospitals).toBeDefined()
    expect(Array.isArray(hospitalsData.hospitals)).toBe(true)
    expect(hospitalsData.hospitals.length).toBeGreaterThan(0)
  })

  test('cada hospital debe tener id, nombre y categoría', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    hospitalsData.hospitals.forEach(hospital => {
      expect(hospital).toHaveProperty('id')
      expect(hospital).toHaveProperty('name')
      expect(hospital).toHaveProperty('category')
      expect(typeof hospital.id).toBe('string')
      expect(typeof hospital.name).toBe('string')
      expect(typeof hospital.category).toBe('string')
    })
  })

  test('debe tener mapa de hospitales consistente', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    const hospitals = hospitalsData.hospitals
    const map = hospitalsData.hospitalsMap

    hospitals.forEach(hospital => {
      expect(map[hospital.id]).toBe(hospital.name)
    })
  })

  test('debe agrupar hospitales por categoría', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    const categories = new Set(hospitalsData.hospitals.map(h => h.category))
    expect(categories.size).toBeGreaterThan(0)
  })

  test('debe tener categorías definidas', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    const categories = [...new Set(hospitalsData.hospitals.map(h => h.category))]
    expect(categories.length).toBeGreaterThan(0)
  })

  test('todos los hospitales deben tener id único', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    const ids = hospitalsData.hospitals.map(h => h.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  test('mapa de hospitales no debe estar vacío', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    expect(Object.keys(hospitalsData.hospitalsMap).length).toBeGreaterThan(0)
  })

  test('cantidad de hospitales debe coincidir con tamaño del mapa', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    const hospitals = hospitalsData.hospitals
    const uniqueIds = new Set(hospitals.map(h => h.id))
    expect(Object.keys(hospitalsData.hospitalsMap).length).toBe(uniqueIds.size)
  })

  test('debe haber al menos 2 categorías diferentes', () => {
    const hospitalsData = require('../../src/components/vista_organigrama/hospitals-data')
    const categories = new Set(hospitalsData.hospitals.map(h => h.category))
    expect(categories.size).toBeGreaterThanOrEqual(2)
  })
})
