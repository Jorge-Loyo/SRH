/**
 * Generic Handler para OrganizacionTabla - Todos los hospitales
 * Consulta unificada con todos los filtros y KPIs
 * Aplica Row-Level Security (RLS) para directores
 */

const { normalizeSpanishText } = require('../../utils/text');
const logger = require('../../utils/logger');

// Whitelist de columnas permitidas para ORDER BY (previene inyección SQL)
const ALLOWED_SORT_COLUMNS = {
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

const FROM_JOINS = `
  FROM roles r
  LEFT JOIN cargos c   ON r.id_cargo   = c.id_cargo   AND r.periodo = c.periodo
  LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
  LEFT JOIN siglas s   ON r.id_sigla   = s.id_sigla
`

// Construye cláusulas WHERE. excludeField omite ese filtro (para distinctValues encadenados)
function buildWhere(query, periodo, hospital, excludeField = null) {
  const clauses = []
  const params = [periodo, hospital]

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

  if (query.edad_min) { clauses.push(`p.edad >= ?`); params.push(parseInt(query.edad_min)) }
  if (query.edad_max) { clauses.push(`p.edad <= ?`); params.push(parseInt(query.edad_max)) }

  // Antigüedad: búsqueda por año (año_actual - años_solicitados)
  if (query.antiguedad) {
    const currentYear = new Date().getFullYear()
    const targetYear = currentYear - parseInt(query.antiguedad)
    clauses.push(`p.antiguedad = ?`)
    params.push(targetYear)
  }

  if (query.estado) {
    const norm = normalizeSpanishText(query.estado)
    clauses.push(`LOWER(REPLACE(REPLACE(r.estado, 'á', 'a'), 'ó', 'o')) LIKE ?`)
    params.push(`%${norm}%`)
  }

  return { whereSQL: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params }
}

module.exports.handleOrganizacionTabla = async function handleOrganizacionTabla({
  AppDataSource,
  req,
  defaultHospital = 'HGACA'
}) {
  try {
    const query = req.query || {}

    let hospital = query.hospital || defaultHospital
    const periodo = query.periodo || ''
    const page = Math.max(1, parseInt(query.page) || 1)
    const perPage = Math.min(500, Math.max(1, parseInt(query.perPage) || 50))
    const sortBy = query.sortBy || 'id_cargo'
    const sortDir = (query.sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
    const procesosConcursales = query.procesos_concursales === 'true'
    const skipDistinct = query.skipDistinct === 'true'

    // Aplicar RLS: si el usuario es director, forzar su hospital
    if (req.user?.permissions?.filter_by_hospital && req.user?.hospital_code) {
      hospital = req.user.hospital_code
    }

    if (!periodo) {
      return {
        columns: [], rows: [], total: 0,
        kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
        error: 'Período requerido'
      }
    }

    if (procesosConcursales) {
      return await handleBajasConcursos({ AppDataSource, query, hospital, periodo, page, perPage, sortBy, sortDir, skipDistinct })
    }

    const sqlSortCol = ALLOWED_SORT_COLUMNS[sortBy] || 'r.id_cargo'
    const offset = (page - 1) * perPage

    const { whereSQL, params: mainParams } = buildWhere(query, periodo, hospital)

    const countSQL = `SELECT COUNT(*) AS total ${FROM_JOINS} WHERE r.periodo = ? AND s.sigla = ? ${whereSQL}`

    const kpiSQL = `
      SELECT
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          r.estado,'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u')) AS estado_norm,
        COUNT(*) AS cnt
      ${FROM_JOINS}
      WHERE r.periodo = ? AND s.sigla = ? ${whereSQL}
      GROUP BY estado_norm
    `

    const dataSQL = `
      SELECT
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
      WHERE r.periodo = ? AND s.sigla = ? ${whereSQL}
      ORDER BY ${sqlSortCol} ${sortDir}
      LIMIT ${perPage} OFFSET ${offset}
    `

    // distinctValues: SELECT DISTINCT en paralelo, omitir si skipDistinct
    const distinctPromises = skipDistinct ? [] : MULTI_FILTERS.map(({ key, column }) => {
      const { params, whereSQL: dWhere } = buildWhere(query, periodo, hospital, key)
      return AppDataSource.query(
        `SELECT DISTINCT ${column} AS val ${FROM_JOINS} WHERE r.periodo = ? AND s.sigla = ? ${dWhere} AND ${column} IS NOT NULL ORDER BY val ASC`,
        params
      ).then(rows => ({ key, values: rows.map(r => r.val).filter(Boolean) }))
    })

    // Todo en paralelo: count + kpi + datos + distinctValues
    const [countRows, kpiRows, dataRows, ...distinctResults] = await Promise.all([
      AppDataSource.query(countSQL, mainParams),
      AppDataSource.query(kpiSQL,   mainParams),
      AppDataSource.query(dataSQL,  mainParams),
      ...distinctPromises
    ])

    const total = parseInt(countRows[0]?.total || 0)

    const kpis = { total, activos: 0, bloqueados: 0, comision: 0, retencion: 0 }
    kpiRows.forEach(({ estado_norm, cnt }) => {
      const n = (estado_norm || '').trim()
      const c = parseInt(cnt || 0)
      if (n === 'activo' || n === 'activos')            kpis.activos    += c
      else if (n === 'bloqueado' || n === 'bloqueados') kpis.bloqueados += c
      else if (n === 'comision')                         kpis.comision   += c
      else if (n.includes('retencion'))                  kpis.retencion  += c
    })

    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : []

    let distinctValues = null
    if (!skipDistinct) {
      distinctValues = {}
      distinctResults.forEach(({ key, values }) => { distinctValues[key] = values })
    }

    return { columns, rows: dataRows, total, kpis, distinctValues, page, perPage }

  } catch (error) {
    logger.error('[handleOrganizacionTabla] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [], rows: [], total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}

/**
 * Handler para Procesos Concursales — consulta tabla bajas_concursos
 */
async function handleBajasConcursos({ AppDataSource, query, hospital, periodo, page, perPage, sortBy, sortDir, skipDistinct }) {
  try {
    const BAJAS_SORT_COLUMNS = {
      'Código de Cargo':       'b.codigo_cargo',
      'Nombre y Apellido':     'b.nombre_apellido',
      'Puesto de Baja':        'b.puesto_baja',
      'Especialidad de Baja':  'b.especialidad_baja',
      'Unificador de Puestos': 'b.unificador_puestos',
      'Expediente Baja':       'b.ex_baja',
      'Expediente Concurso':   'b.ex_concurso',
      'Fecha de Baja':         'b.fecha_baja',
      'Motivo de Baja':        'b.motivo_baja',
    }
    const sqlSortCol = BAJAS_SORT_COLUMNS[sortBy] || 'b.codigo_cargo'
    const sqlSortDir = sortDir === 'DESC' ? 'DESC' : 'ASC'
    const offset = (page - 1) * perPage

    const BAJAS_FILTERS = [
      { key: 'unificador_puesto',       column: 'b.unificador_puestos' },
      { key: 'especialidad',            column: 'b.especialidad_baja' },
      { key: 'literal_puesto',          column: 'b.puesto_baja' },
      { key: 'literal_codigo_registro', column: 'b.motivo_baja' },
    ]

    const buildBajasWhere = (excludeField = null) => {
      const clauses = []
      const params = [periodo, hospital]

      if (query.codigo_cargo)    { clauses.push(`b.codigo_cargo LIKE ?`);    params.push(`%${query.codigo_cargo}%`) }
      if (query.nombre_apellido) { clauses.push(`b.nombre_apellido LIKE ?`); params.push(`%${query.nombre_apellido}%`) }
      if (query.ex_baja)         { clauses.push(`b.ex_baja LIKE ?`);         params.push(`%${query.ex_baja}%`) }
      if (query.ex_concurso)     { clauses.push(`b.ex_concurso LIKE ?`);     params.push(`%${query.ex_concurso}%`) }

      BAJAS_FILTERS.forEach(({ key, column }) => {
        if (key === excludeField) return
        const vals = query[key] ? query[key].split(',').map(v => v.trim()).filter(Boolean) : []
        if (vals.length) { clauses.push(`${column} IN (?)`); params.push(vals) }
      })

      return { whereSQL: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params }
    }

    const { whereSQL, params: mainParams } = buildBajasWhere()

    const countSQL = `SELECT COUNT(*) AS total FROM bajas_concursos b WHERE b.periodo = ? AND b.sigla = ? ${whereSQL}`

    const dataSQL = `
      SELECT
        b.codigo_cargo        AS 'Código de Cargo',
        b.nombre_apellido     AS 'Nombre y Apellido',
        b.puesto_baja         AS 'Puesto de Baja',
        b.especialidad_baja   AS 'Especialidad de Baja',
        b.unificador_puestos  AS 'Unificador de Puestos',
        b.ex_baja             AS 'Expediente Baja',
        b.ex_concurso         AS 'Expediente Concurso',
        b.fecha_baja          AS 'Fecha de Baja',
        b.motivo_baja         AS 'Motivo de Baja'
      FROM bajas_concursos b
      WHERE b.periodo = ? AND b.sigla = ? ${whereSQL}
      ORDER BY ${sqlSortCol} ${sqlSortDir}
      LIMIT ${perPage} OFFSET ${offset}
    `

    const distinctPromises = skipDistinct ? [] : BAJAS_FILTERS.map(({ key, column }) => {
      const { whereSQL: dWhere, params: dParams } = buildBajasWhere(key)
      return AppDataSource.query(
        `SELECT DISTINCT ${column} AS val FROM bajas_concursos b WHERE b.periodo = ? AND b.sigla = ? ${dWhere} AND ${column} IS NOT NULL ORDER BY val ASC`,
        dParams
      ).then(rows => ({ key, values: rows.map(r => r.val).filter(Boolean) }))
    })

    const [countRows, dataRows, ...distinctResults] = await Promise.all([
      AppDataSource.query(countSQL, mainParams),
      AppDataSource.query(dataSQL,  mainParams),
      ...distinctPromises
    ])

    const total = parseInt(countRows[0]?.total || 0)
    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : []

    let distinctValues = null
    if (!skipDistinct) {
      distinctValues = {}
      distinctResults.forEach(({ key, values }) => { distinctValues[key] = values })
    }

    return {
      columns, rows: dataRows, total,
      kpis: { total, activos: 0, bloqueados: 0, comision: 0, retencion: 0 },
      distinctValues, page, perPage,
      info: 'Mostrando datos de Bajas y Concursos'
    }

  } catch (error) {
    logger.error('[handleBajasConcursos] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [], rows: [], total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}
