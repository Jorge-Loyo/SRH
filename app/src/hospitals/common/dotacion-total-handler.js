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

  return { params, whereSQL: clauses.length ? ' AND ' + clauses.join(' AND ') : '' }
}

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
    const procesosConcursales = query.procesos_concursales === 'true'

    if (!periodo) {
      return {
        columns: [], rows: [], total: 0,
        kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
        error: 'Período requerido'
      }
    }

    if (procesosConcursales) {
      return await handleBajasConcursosTotal({ AppDataSource, query, periodo, page, perPage, sortBy, sortDir })
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

    // ── Queries SELECT DISTINCT (saltear si solo cambió página/orden) ──
    const distinctPromises = skipDistinct ? [] : MULTI_FILTERS.map(({ key, column }) => {
      const { params, whereSQL: dWhereSQL } = buildWhere(query, periodo, key)
      const sql = `
        SELECT DISTINCT ${column} AS val
        ${FROM_JOINS}
        WHERE r.periodo = ? ${dWhereSQL} AND ${column} IS NOT NULL
        ORDER BY val ASC
      `
      return AppDataSource.query(sql, params).then(rows => ({
        key,
        values: rows.map(r => r.val).filter(Boolean)
      }))
    })

    const siglasDistinctPromises = skipDistinct ? [] : SIGLAS_FILTERS.map(({ key, column }) => {
      const { params, whereSQL: dWhereSQL } = buildWhere(query, periodo, key)
      const sql = `
        SELECT DISTINCT ${column} AS val
        ${FROM_JOINS}
        WHERE r.periodo = ? ${dWhereSQL} AND ${column} IS NOT NULL
        ORDER BY val ASC
      `
      return AppDataSource.query(sql, params).then(rows => ({
        key,
        values: rows.map(r => r.val).filter(Boolean)
      }))
    })

    // ── Ejecutar todo en paralelo ──────────────────────────────────────
    const [countRows, kpiRows, dataRows, ...allDistinctResults] = await Promise.all([
      AppDataSource.query(countSQL, mainParams),
      AppDataSource.query(kpiSQL,   mainParams),
      AppDataSource.query(dataSQL,  mainParams),
      ...distinctPromises,
      ...siglasDistinctPromises
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

    // distinctValues desde los SELECT DISTINCT (MULTI_FILTERS + SIGLAS_FILTERS)
    const distinctValues = {}
    const siglasDistinctValues = {}
    allDistinctResults.forEach(({ key, values }) => {
      if (SIGLAS_FILTERS.some(f => f.key === key)) {
        siglasDistinctValues[key] = values
      } else {
        distinctValues[key] = values
      }
    })

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

/**
 * Handler para Procesos Concursales Total - Sin filtro de hospital
 */
async function handleBajasConcursosTotal({ AppDataSource, query, periodo, page, perPage, sortBy, sortDir }) {
  try {
    const FROM_JOINS = `
      FROM bajas_concursos b
      LEFT JOIN siglas s ON b.sigla = s.sigla
    `

    // Whitelist de columnas para ORDER BY en bajas
    const BAJAS_SORT_COLUMNS = {
      'Hospital':              'b.sigla',
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
    const sqlSortCol = BAJAS_SORT_COLUMNS[sortBy] || 'b.sigla'
    const sqlSortDir = (sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
    const offset = (page - 1) * perPage

    const multiFiltersBajas = [
      { key: 'unificador_puesto',       column: 'b.unificador_puestos' },
      { key: 'especialidad',            column: 'b.especialidad_baja' },
      { key: 'literal_puesto',          column: 'b.puesto_baja' },
      { key: 'literal_codigo_registro', column: 'b.motivo_baja' },
    ]

    // Helper local: construye WHERE para bajas (excludeField para filtros encadenados)
    const buildBajasWhere = (excludeField = null) => {
      const clauses = []
      const params = [periodo]

      SIGLAS_FILTERS.forEach(({ key, column }) => {
        if (key === excludeField) return
        const vals = query[key] ? query[key].split(',').map(v => v.trim()).filter(Boolean) : []
        if (!vals.length) return
        const actualColumn = key === 'sigla' ? 'b.sigla' : column
        clauses.push(`${actualColumn} IN (?)`)
        params.push(vals)
      })

      if (query.codigo_cargo)    { clauses.push(`b.codigo_cargo LIKE ?`);    params.push(`%${query.codigo_cargo}%`) }
      if (query.nombre_apellido) { clauses.push(`b.nombre_apellido LIKE ?`); params.push(`%${query.nombre_apellido}%`) }
      if (query.ex_baja)         { clauses.push(`b.ex_baja LIKE ?`);         params.push(`%${query.ex_baja}%`) }
      if (query.ex_concurso)     { clauses.push(`b.ex_concurso LIKE ?`);     params.push(`%${query.ex_concurso}%`) }

      multiFiltersBajas.forEach(({ key, column }) => {
        if (key === excludeField) return
        const vals = query[key] ? query[key].split(',').map(v => v.trim()).filter(Boolean) : []
        if (vals.length) { clauses.push(`${column} IN (?)`); params.push(vals) }
      })

      return { whereSQL: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params }
    }

    const { whereSQL, params: mainParams } = buildBajasWhere()

    // Query de conteo
    const countSQL = `SELECT COUNT(*) AS total ${FROM_JOINS} WHERE b.periodo = ? ${whereSQL}`

    // Query de datos: paginación y orden en SQL (no en JS)
    const dataSQL = `
      SELECT
        b.sigla               AS 'Hospital',
        b.codigo_cargo        AS 'Código de Cargo',
        b.nombre_apellido     AS 'Nombre y Apellido',
        b.puesto_baja         AS 'Puesto de Baja',
        b.especialidad_baja   AS 'Especialidad de Baja',
        b.unificador_puestos  AS 'Unificador de Puestos',
        b.ex_baja             AS 'Expediente Baja',
        b.ex_concurso         AS 'Expediente Concurso',
        b.fecha_baja          AS 'Fecha de Baja',
        b.motivo_baja         AS 'Motivo de Baja'
      ${FROM_JOINS}
      WHERE b.periodo = ? ${whereSQL}
      ORDER BY ${sqlSortCol} ${sqlSortDir}
      LIMIT ${perPage} OFFSET ${offset}
    `

    const skipDistinct = query.skipDistinct === 'true'

    // Queries de distinctValues para filtros de personal (en paralelo, saltear en paginación/orden)
    const multiDistinctPromises = skipDistinct ? [] : multiFiltersBajas.map(({ key, column }) => {
      const { whereSQL: dWhere, params: dParams } = buildBajasWhere(key)
      return AppDataSource.query(
        `SELECT DISTINCT ${column} AS val ${FROM_JOINS} WHERE b.periodo = ? ${dWhere} AND ${column} IS NOT NULL ORDER BY val ASC`,
        dParams
      ).then(rows => ({ key, values: rows.map(r => r.val).filter(Boolean) }))
    })

    // Queries de distinctValues para filtros de siglas (en paralelo, saltear en paginación/orden)
    const siglaDistinctPromises = skipDistinct ? [] : SIGLAS_FILTERS.map(({ key, column }) => {
      const { whereSQL: dWhere, params: dParams } = buildBajasWhere(key)
      const actualColumn = key === 'sigla' ? 'b.sigla' : column
      return AppDataSource.query(
        `SELECT DISTINCT ${actualColumn} AS val ${FROM_JOINS} WHERE b.periodo = ? ${dWhere} AND ${actualColumn} IS NOT NULL ORDER BY val ASC`,
        dParams
      ).then(rows => ({ key, values: rows.map(r => r.val).filter(Boolean) }))
    })

    // Ejecutar todo en paralelo
    const [countRows, dataRows, ...allDistinctResults] = await Promise.all([
      AppDataSource.query(countSQL, mainParams),
      AppDataSource.query(dataSQL, mainParams),
      ...multiDistinctPromises,
      ...siglaDistinctPromises
    ])

    const total = parseInt(countRows[0]?.total || 0)
    const rows = dataRows
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    const SIGLAS_KEYS = new Set(SIGLAS_FILTERS.map(f => f.key))
    let distinctValues = null
    let siglasDistinctValues = null
    if (!skipDistinct) {
      distinctValues = { unificador_puesto: [], especialidad: [], literal_puesto: [], literal_codigo_registro: [] }
      siglasDistinctValues = { sigla: [], universo_totalizador: [], tipo_hospital_sigla: [], monovalencia: [] }
      allDistinctResults.forEach(({ key, values }) => {
        if (SIGLAS_KEYS.has(key)) siglasDistinctValues[key] = values
        else distinctValues[key] = values
      })
    }

    return {
      columns,
      rows,
      total,
      kpis: { total, activos: 0, bloqueados: 0, comision: 0, retencion: 0 },
      distinctValues,
      siglasDistinctValues,
      page,
      perPage,
      info: 'Mostrando datos de Bajas y Concursos (todos los hospitales)'
    }

  } catch (error) {
    logger.error('[handleBajasConcursosTotal] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [], rows: [], total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}


