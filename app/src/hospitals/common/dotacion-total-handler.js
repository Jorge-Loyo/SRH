/**
 * Handler para DotacionTotal - Todos los hospitales combinados
 * Similar a organizacion-tabla-handler pero SIN filtro por hospital
 * Muestra datos de TODOS los hospitales a la vez
 */

const { normalizeSpanishText } = require('../../utils/text');
const logger = require('../../utils/logger');

// Whitelist de columnas permitidas para ORDER BY (previene inyección SQL)
const ALLOWED_SORT_COLUMNS = {
  'Hospital':                   's.sigla',
  'Código de Cargo':            'c.codigo_cargo',
  'Código SIAL':                'r.codigo_rol',
  'Situación de Revista':       'r.situacion_revista',
  'CUIL':                       'p.cuil',
  'Nombre y Apellido':          'p.nombre_apellido',
  'Nacimiento':                 'p.fecha_nacimiento',
  'Edad':                       'p.edad',
  'Sexo':                       'p.sexo',
  'Repartición':                'r.descripcion_reparticion',
  'Escalafón':                  'r.escalafon',
  'Puesto':                     'r.literal_puesto',
  'Carrera':                    'r.literal_codigo_registro',
  'Agrupamiento':               'r.agrupador',
  'Especialidad':               'p.especialidad',
  'Día':                        'r.dia',
  'Cargo Desde':                'r.cargo_desde',
  'Jefatura':                   'r.jefaturas',
  'Documentación Jefatura':     'r.doc_respaldatoria_j_categoria',
  'Teléfono':                   'p.telefono',
  'Mail Personal':              'p.mail_personal',
  'Mail Laboral':               'p.mail_laboral',
  'Fecha de Bloqueo':           'r.fecha_bloqueo',
  'Comentario de Bloqueo':      'r.bloqueo_comentario',
  'Motivo de Bloqueo':          'r.bloqueo_motivo',
  'id_cargo':                   'r.id_cargo',
}

const MULTI_FILTERS = [
  { key: 'unificador_puesto',        column: 'r.unificador_puesto' },
  { key: 'especialidad',             column: 'p.especialidad' },
  { key: 'literal_puesto',           column: 'r.literal_puesto' },
  { key: 'literal_codigo_registro',  column: 'r.literal_codigo_registro' },
  { key: 'escalafon',                column: 'r.escalafon' },
  { key: 'situacion_revista',        column: 'r.situacion_revista' },
  { key: 'agrupador',                column: 'r.agrupador' },
  { key: 'sexo',                     column: 'p.sexo' },
  { key: 'reparticion',              column: 'r.descripcion_reparticion' },
]

// Filtros provenientes de la tabla Siglas (segmentación por tipo de hospital)
const SIGLAS_FILTERS = [
  { key: 'sigla',                 column: 's.sigla' },
  { key: 'universo_totalizador',  column: 's.universo_totalizador' },
  { key: 'tipo_hospital_sigla',   column: 's.tipo_hospital_sigla' },
  { key: 'monovalencia',          column: 's.monovalencia' },
]

// Helper: construye WHERE clauses reutilizables
// excludeField: omite ese multiFilter (para filtros encadenados de distinctValues)
function buildWhere(query, periodo, excludeField = null) {
  const clauses = []
  const params = [periodo]

  if (query.hospital_filter) {
    const vals = query.hospital_filter.split(',').map(v => v.trim()).filter(Boolean)
    if (vals.length) { clauses.push(`s.sigla IN (?)`); params.push(vals) }
  }

  SIGLAS_FILTERS.forEach(({ key, column }) => {
    if (key === excludeField) return
    if (query[key]) {
      const vals = query[key].split(',').map(v => v.trim()).filter(Boolean)
      if (vals.length) { clauses.push(`${column} IN (?)`); params.push(vals) }
    }
  })

  MULTI_FILTERS.forEach(({ key, column }) => {
    if (key === excludeField) return
    if (query[key]) {
      const vals = query[key].split(',').map(v => v.trim()).filter(Boolean)
      if (vals.length) { clauses.push(`${column} IN (?)`); params.push(vals) }
    }
  })

  if (query.codigo_cargo)    { clauses.push(`c.codigo_cargo LIKE ?`);    params.push(`%${query.codigo_cargo}%`) }
  if (query.nombre_apellido) { clauses.push(`p.nombre_apellido LIKE ?`); params.push(`%${query.nombre_apellido}%`) }
  if (query.cuil)            { clauses.push(`p.cuil LIKE ?`);            params.push(`%${query.cuil}%`) }
  if (query.codigo_rol)      { clauses.push(`r.codigo_rol LIKE ?`);      params.push(`%${query.codigo_rol}%`) }
  if (query.mail_laboral)    { clauses.push(`p.mail_laboral LIKE ?`);    params.push(`%${query.mail_laboral}%`) }
  if (query.telefono)        { clauses.push(`p.telefono LIKE ?`);        params.push(`%${query.telefono}%`) }

  if (query.edad_min)        { clauses.push(`p.edad >= ?`);        params.push(parseInt(query.edad_min)) }
  if (query.edad_max)        { clauses.push(`p.edad <= ?`);        params.push(parseInt(query.edad_max)) }
  
  if (query.antiguedad_min || query.antiguedad_max) {
    const currentYear = new Date().getFullYear()
    if (query.antiguedad_min) {
      const maxYear = currentYear - parseInt(query.antiguedad_min)
      clauses.push(`YEAR(STR_TO_DATE(p.antiguedad, '%Y-%m-%d')) <= ?`)
      params.push(maxYear)
    }
    if (query.antiguedad_max) {
      const minYear = currentYear - parseInt(query.antiguedad_max)
      clauses.push(`YEAR(STR_TO_DATE(p.antiguedad, '%Y-%m-%d')) >= ?`)
      params.push(minYear)
    }
  }

  if (query.estado) {
    const norm = normalizeSpanishText(query.estado)
    clauses.push(`LOWER(REPLACE(REPLACE(r.estado, 'á', 'a'), 'ó', 'o')) LIKE ?`)
    params.push(`%${norm}%`)
  }

  // Código numérico de registro (distinto de literal_codigo_registro) — sin UI propia,
  // usado por el drill-down del Panel para acotar la categoría "Administrativos" (código 83).
  if (query.codigo_registro) { clauses.push(`r.codigo_registro = ?`); params.push(query.codigo_registro) }

  return { params, whereSQL: clauses.length ? ' AND ' + clauses.join(' AND ') : '' }
}

module.exports.buildWhere = buildWhere;
module.exports.MULTI_FILTERS = MULTI_FILTERS;
module.exports.SIGLAS_FILTERS = SIGLAS_FILTERS;
module.exports.FROM_JOINS = `
  FROM roles r
  LEFT JOIN cargos c   ON r.id_cargo   = c.id_cargo   AND r.periodo = c.periodo
  LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
  LEFT JOIN siglas s   ON r.id_sigla   = s.id_sigla
`;

module.exports.handleDotacionTotal = async function handleDotacionTotal({
  AppDataSource,
  req
}) {
  try {
    const query = req.query || {}
    
    const periodo    = query.periodo || ''
    const page       = Math.max(1, parseInt(query.page) || 1)
    const perPage    = Math.min(500, Math.max(1, parseInt(query.perPage) || 50))
    const sortBy     = query.sortBy || 'id_cargo'
    const sortDir    = (query.sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
    if (!periodo) {
      return {
        columns: [], rows: [], total: 0,
        kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
        error: 'Período requerido'
      }
    }

    // Columna de ordenamiento validada contra whitelist (previene SQL injection)
    const sqlSortCol = ALLOWED_SORT_COLUMNS[sortBy] || 'r.id_cargo'
    const offset = (page - 1) * perPage

    // FROM + JOINs compartido entre todas las queries
    const FROM_JOINS = `
      FROM roles r
      LEFT JOIN cargos c   ON r.id_cargo   = c.id_cargo   AND r.periodo = c.periodo
      LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
      LEFT JOIN siglas s   ON r.id_sigla   = s.id_sigla
    `

    const { params: mainParams, whereSQL } = buildWhere(query, periodo)

    // ── Query 1: total de registros ────────────────────────────────────
    const countSQL = `SELECT COUNT(*) AS total ${FROM_JOINS} WHERE r.periodo = ? ${whereSQL}`

    // ── Query 2: KPIs via GROUP BY (sin traer todas las filas a Node) ──
    const kpiSQL = `
      SELECT
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          r.estado,'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u')) AS estado_norm,
        COUNT(*) AS cnt
      ${FROM_JOINS}
      WHERE r.periodo = ? ${whereSQL}
      GROUP BY estado_norm
    `

    // ── Query 3: solo la página solicitada, ORDER BY en SQL ────────────
    const dataSQL = `
      SELECT
        s.sigla                          AS 'Hospital',
        c.codigo_cargo                   AS 'Código de Cargo',
        r.codigo_rol                     AS 'Código SIAL',
        r.situacion_revista              AS 'Situación de Revista',
        p.cuil                           AS 'CUIL',
        p.nombre_apellido                AS 'Nombre y Apellido',
        p.fecha_nacimiento               AS 'Nacimiento',
        p.edad                           AS 'Edad',
        p.sexo                           AS 'Sexo',
        r.descripcion_reparticion        AS 'Repartición',
        r.escalafon                      AS 'Escalafón',
        r.literal_puesto                 AS 'Puesto',
        r.literal_codigo_registro        AS 'Carrera',
        r.agrupador                      AS 'Agrupamiento',
        p.especialidad                   AS 'Especialidad',
        r.dia                            AS 'Día',
        r.cargo_desde                    AS 'Cargo Desde',
        r.jefaturas                      AS 'Jefatura',
        r.doc_respaldatoria_j_categoria  AS 'Documentación Jefatura',
        p.telefono                       AS 'Teléfono',
        p.mail_personal                  AS 'Mail Personal',
        p.mail_laboral                   AS 'Mail Laboral',
        r.fecha_bloqueo                  AS 'Fecha de Bloqueo',
        r.bloqueo_comentario             AS 'Comentario de Bloqueo',
        r.bloqueo_motivo                 AS 'Motivo de Bloqueo'
      ${FROM_JOINS}
      WHERE r.periodo = ? ${whereSQL}
      ORDER BY ${sqlSortCol} ${sortDir}
      LIMIT ${perPage} OFFSET ${offset}
    `

    const skipDistinct = query.skipDistinct === 'true'

    // ── Ejecutar todo en paralelo ──────────────────────────────────────
    const [countRows, kpiRows, dataRows] = await Promise.all([
      AppDataSource.query(countSQL, mainParams),
      AppDataSource.query(kpiSQL,   mainParams),
      AppDataSource.query(dataSQL,  mainParams),
    ])

    const total = parseInt(countRows[0]?.total || 0)

    // KPIs desde el GROUP BY
    const kpis = { total, activos: 0, bloqueados: 0, comision: 0, retencion: 0 }
    kpiRows.forEach(({ estado_norm, cnt }) => {
      const n = (estado_norm || '').trim()
      const c = parseInt(cnt || 0)
      if (n === 'activo' || n === 'activos')         kpis.activos   += c
      else if (n === 'bloqueado' || n === 'bloqueados') kpis.bloqueados += c
      else if (n === 'comision')                     kpis.comision  += c
      else if (n.includes('retencion'))              kpis.retencion += c
    })

    // distinctValues: vacío en la respuesta principal (se cargan por endpoint separado)
    const distinctValues = {}
    const siglasDistinctValues = {}

    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : []

    return { columns, rows: dataRows, total, kpis, distinctValues, siglasDistinctValues, page, perPage }

  } catch (error) {
    logger.error('[handleDotacionTotal] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [], rows: [], total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}

