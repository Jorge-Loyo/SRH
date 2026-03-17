// Common helpers for hospital AdminJS pages

function buildPageParams(req){
  const hospital = String(req?.query?.hospital || '').toUpperCase()
  const type = String(req?.query?.type || '').toUpperCase()
  // El periodo se maneja vía filtros/URL; sin archivo dedicado
  const periodo = String(req?.query?.periodo || '')
  const page = Math.max(1, parseInt((req?.query?.page || '1'), 10))
  const perPage = Math.min(200, Math.max(1, parseInt((req?.query?.perPage || '50'), 10)))
  const sortBy = (req?.query?.sortBy || '').toString().trim()
  const sortDir = ((req?.query?.sortDir || '') + '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
  const exportType = (req?.query?.export || '').toString().toLowerCase()
  const filters = { ...req.query }
  delete filters.hospital
  delete filters.type
  delete filters.page
  delete filters.perPage
  delete filters.sortBy
  delete filters.sortDir
  delete filters.periodo
  delete filters.export
  return { hospital, type, periodo, page, perPage, sortBy, sortDir, exportType, filters }
}

module.exports = { buildPageParams }
