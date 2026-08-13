import { apiGet, apiPost, apiPatch, apiUpload } from './client'

const BASE = '/api/cargos/alta'

export const altaCargoApi = {
  list:         (params = {}) => apiGet(BASE, params),
  getById:      (id)          => apiGet(`${BASE}/${id}`),
  create:       (body)        => apiPost(BASE, body),
  listEtiquetas:     (q)   => apiGet(`${BASE}/etiquetas`, q ? { q } : {}),
  createEtiqueta:    (body) => apiPost(`${BASE}/etiquetas`, body),
  listCarreras:      ()    => apiGet(`${BASE}/carreras`),
  listJornadas:       ()    => apiGet(`${BASE}/jornadas`),
  listTiposCargo:     (carrera) => apiGet(`${BASE}/tipos-cargo`, carrera ? { carrera } : {}),
  listSiglas:        ()    => apiGet(`${BASE}/siglas`),
  searchBajas:       (q)   => apiGet(`${BASE}/bajas/search`, { q }),
  listEspecialidades:(cat, carrera) => apiGet(`${BASE}/especialidades`, { ...(cat && { categoria: cat }), ...(carrera && { carrera }) }),
  listModalidades:   ()    => apiGet(`${BASE}/modalidades`),
  listPuestos:       (carrera, tipo, modo) => apiGet(`${BASE}/puestos`, { ...(carrera && { carrera }), ...(tipo && { tipo }), ...(modo && { modo }) }),
  listNewCargo:      (params = {}) => apiGet(`${BASE}/new-cargo`, params),
  exportNewCargo:    (params = {}) => apiGet(`${BASE}/new-cargo/export`, params),
  getNewCargoInfo:   (id)          => apiGet(`${BASE}/new-cargo/${id}`),
  updateNewCargo:    (id, body)    => apiPatch(`${BASE}/new-cargo/${id}`, body),
  getDotacionKpis:      (params = {}) => apiGet(`${BASE}/dotacion-kpis`, params),
  getDotacionEvolucion:  (params = {}) => apiGet(`${BASE}/dotacion-kpis/evolucion`, params),
  uploadDotacion:    (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiUpload(`${BASE}/upload-dotacion`, fd)
  },
}
