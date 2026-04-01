/**
 * Handler de página AdminJS para POUDetalle
 * Devuelve los registros POU de un hospital+periodo específico
 */
async function handlePOUDetalle({ AppDataSource, req }) {
  const sigla   = String(req?.query?.hospital || '').toUpperCase()
  const periodo = String(req?.query?.periodo  || '').trim()

  if (!sigla) {
    return { rows: [], columns: POU_COLUMNS, total: 0, error: 'Se requiere el parámetro hospital' }
  }

  try {
    let sql = 'SELECT * FROM pou WHERE sigla = ?'
    const params = [sigla]

    if (periodo) {
      sql += ' AND periodo = ?'
      params.push(periodo)
    }

    sql += ' ORDER BY id ASC'

    const rows = await AppDataSource.query(sql, params)

    return {
      rows,
      columns: POU_COLUMNS,
      total: rows.length,
      sigla,
      periodo: periodo || null,
    }
  } catch (e) {
    const logger = require('../utils/logger')
    logger.error('[handlePOUDetalle] Error:', { error: e?.message })
    return { rows: [], columns: POU_COLUMNS, total: 0, error: e?.message }
  }
}

const POU_COLUMNS = [
  'id',
  'periodo',
  'sigla',
  'descripcion_sigla',
  'perfil',
  'especialidad',
  'dotacion_diaria',
  'dotacion_sem',
  'dotacion_total',
  'activos',
  'tecnicos',
  'vacantes',
]

module.exports = { handlePOUDetalle, POU_COLUMNS }
