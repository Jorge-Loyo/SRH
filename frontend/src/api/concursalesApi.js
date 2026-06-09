/**
 * API Client — Módulo 2: Bajas Consolidadas + Seguimiento CPH
 * Wrapper sobre los métodos base de client.js
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client'

const BASE_BAJAS         = '/api/concursales/bajas'
const BASE_SEGUIMIENTO   = '/api/concursales/seguimiento-cph'
const BASE_SEG_CEETPS    = '/api/concursales/seguimiento-ceetps'
const BASE_CONFIG        = '/api/concursales/config'
const BASE_TABLERO       = '/api/concursales/tablero'

// ─── BAJAS CONSOLIDADAS ──────────────────────────────────────────────────────

export const bajasApi = {
  list: (params = {}) =>
    apiGet(BASE_BAJAS, params),

  getById: (id) =>
    apiGet(`${BASE_BAJAS}/${id}`),

  create: (body) =>
    apiPost(BASE_BAJAS, body),

  update: (id, body) =>
    apiPut(`${BASE_BAJAS}/${id}`, body),

  remove: (id) =>
    apiDelete(`${BASE_BAJAS}/${id}`),
}

// ─── SEGUIMIENTO CPH ─────────────────────────────────────────────────────────

export const seguimientoApi = {
  list: (params = {}) =>
    apiGet(BASE_SEGUIMIENTO, params),

  getById: (id) =>
    apiGet(`${BASE_SEGUIMIENTO}/${id}`),

  getByBaja: (idBaja) =>
    apiGet(`${BASE_SEGUIMIENTO}/by-baja/${idBaja}`),

  getEstados: () =>
    apiGet(`${BASE_SEGUIMIENTO}/estados/unique`),

  getStatsByEfector: () =>
    apiGet(`${BASE_SEGUIMIENTO}/stats/by-efector`),

  create: (body) =>
    apiPost(BASE_SEGUIMIENTO, body),

  update: (id, body) =>
    apiPut(`${BASE_SEGUIMIENTO}/${id}`, body),

  remove: (id) =>
    apiDelete(`${BASE_SEGUIMIENTO}/${id}`),
}

// ─── SEGUIMIENTO CEETPS ──────────────────────────────────────────────────────

export const seguimientoCeetpsApi = {
  list: (params = {}) =>
    apiGet(BASE_SEG_CEETPS, params),

  getById: (id) =>
    apiGet(`${BASE_SEG_CEETPS}/${id}`),

  getByBaja: (idBaja) =>
    apiGet(`${BASE_SEG_CEETPS}/by-baja/${idBaja}`),

  create: (body) =>
    apiPost(BASE_SEG_CEETPS, body),

  update: (id, body) =>
    apiPut(`${BASE_SEG_CEETPS}/${id}`, body),

  remove: (id) =>
    apiDelete(`${BASE_SEG_CEETPS}/${id}`),
}

// ─── CONFIGURACIÓN (reglas de Conjuntos) ─────────────────────────────────────

export const configApi = {
  getConjuntos: () =>
    apiGet(`${BASE_CONFIG}/conjuntos`),

  saveConjuntos: (rules) =>
    apiPut(`${BASE_CONFIG}/conjuntos`, { rules }),

  getConjuntosCeetps: () =>
    apiGet(`${BASE_CONFIG}/conjuntos-ceetps`),

  saveConjuntosCeetps: (rules) =>
    apiPut(`${BASE_CONFIG}/conjuntos-ceetps`, { rules }),
}

// ─── TABLERO — KPIs ──────────────────────────────────────────────────────────

export const tableroApi = {
  getKpis: (sigla = null) =>
    apiGet(`${BASE_TABLERO}/kpis`, sigla ? { sigla } : {}),

  getKpisCeetps: (sigla = null) =>
    apiGet(`${BASE_TABLERO}/kpis-ceetps`, sigla ? { sigla } : {}),
}
