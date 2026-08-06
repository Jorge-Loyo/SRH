import { apiGet, apiPost, apiUpload } from './client'

const BASE = '/api/cargos/alta'

export const altaCargoApi = {
  list:         (params = {}) => apiGet(BASE, params),
  getById:      (id)          => apiGet(`${BASE}/${id}`),
  create:       (body)        => apiPost(BASE, body),
  listCarreras:      ()    => apiGet(`${BASE}/carreras`),
  listSiglas:        ()    => apiGet(`${BASE}/siglas`),
  searchBajas:       (q)   => apiGet(`${BASE}/bajas/search`, { q }),
  listEspecialidades:(cat, carrera) => apiGet(`${BASE}/especialidades`, { ...(cat && { categoria: cat }), ...(carrera && { carrera }) }),
  listModalidades:   ()    => apiGet(`${BASE}/modalidades`),
  listNewCargo:      (params = {}) => apiGet(`${BASE}/new-cargo`, params),
  exportNewCargo:    (params = {}) => apiGet(`${BASE}/new-cargo/export`, params),
  uploadDotacion:    (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiUpload(`${BASE}/upload-dotacion`, fd)
  },
}
