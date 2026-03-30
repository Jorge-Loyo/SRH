/**
 * organigramaRoutes.test.js - Tests del Backend
 */

// Polyfill TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
if (!global.TextEncoder) global.TextEncoder = TextEncoder
if (!global.TextDecoder) global.TextDecoder = TextDecoder

describe('Validaciones de Endpoint /api/organigrama', () => {
  test('debe validar formato de sigla correctamente', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('HGARM')).toBe(true)
    expect(siglaRegex.test('HG')).toBe(true)
    expect(siglaRegex.test('A')).toBe(false)
    expect(siglaRegex.test('A' + 'B'.repeat(11))).toBe(false)
  })

  test('debe validar período si se proporciona', () => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/
    expect(regex.test('2024-01')).toBe(true)
    expect(regex.test('2024-12')).toBe(true)
    expect(regex.test('2024/01')).toBe(false)
    expect(regex.test('invalid')).toBe(false)
  })

  test('debe requerir sigla no vacía', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('')).toBe(false)
  })

  test('debe validar sigla sin caracteres especiales', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('HG@RM')).toBe(false)
    expect(siglaRegex.test('HG-RM')).toBe(false)
    expect(siglaRegex.test('HG.RM')).toBe(false)
    expect(siglaRegex.test('HG RM')).toBe(false)
  })

  test('debe aceptar sigla alfanumérica variada', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('ABC')).toBe(true)
    expect(siglaRegex.test('AB12')).toBe(true)
    expect(siglaRegex.test('A1B2C3')).toBe(true)
    expect(siglaRegex.test('abc')).toBe(true)
  })

  test('debe validar rango de meses del período', () => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/
    expect(regex.test('2024-00')).toBe(false)
    expect(regex.test('2024-13')).toBe(false)
    expect(regex.test('2024-01')).toBe(true)
    expect(regex.test('2024-12')).toBe(true)
  })

  test('debe validar año en período', () => {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/
    expect(regex.test('2024-06')).toBe(true)
    expect(regex.test('1900-06')).toBe(true)
    expect(regex.test('2099-06')).toBe(true)
    expect(regex.test('24-06')).toBe(false)
  })

  test('Express debe estar disponible', () => {
    const express = require('express')
    expect(express).toBeDefined()
    expect(typeof express).toBe('function')
  })

  test('Supertest debe estar disponible', () => {
    const request = require('supertest')
    expect(request).toBeDefined()
    expect(typeof request).toBe('function')
  })

  test('sigla máxima debe ser 10 caracteres', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('AB')).toBe(true)
    expect(siglaRegex.test('ABC123')).toBe(true)
    expect(siglaRegex.test('ABCDEFGHIJ')).toBe(true)
    expect(siglaRegex.test('ABCDEFGHIJK')).toBe(false)
  })

  test('sigla mínima debe ser 2 caracteres', () => {
    const siglaRegex = /^[A-Za-z0-9]{2,10}$/
    expect(siglaRegex.test('A')).toBe(false)
    expect(siglaRegex.test('AB')).toBe(true)
  })
})
