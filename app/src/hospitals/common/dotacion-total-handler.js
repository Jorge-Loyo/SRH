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

// Helper: construye WHERE clauses reutilizables
// excludeField: omite ese multiFilter (para filtros encadenados de distinctValues)
function buildWhere(query, periodo, excludeField = null) {
  const clauses = []
  const params = [periodo]

  if (query.hospital_filter) {
    const vals = query.hospital_filter.split(',').map(v => v.trim()).filter(Boolean)
    if (vals.length) { clauses.push(`s.sigla IN (?)`); params.push(vals) }
  }

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
  if (query.antiguedad_min)  { clauses.push(`p.antiguedad >= ?`);  params.push(parseInt(query.antiguedad_min)) }
  if (query.antiguedad_max)  { clauses.push(`p.antiguedad <= ?`);  params.push(parseInt(query.antiguedad_max)) }

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

    // ── Queries 4-12: SELECT DISTINCT por campo (filtros encadenados) ──
    // Cada una excluye su propio filtro para mostrar opciones contextuales.
    // Se usan solo las columnas necesarias (no las 27 del SELECT principal).
    const distinctPromises = MULTI_FILTERS.map(({ key, column }) => {
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
    const [countRows, kpiRows, dataRows, ...distinctResults] = await Promise.all([
      AppDataSource.query(countSQL, mainParams),
      AppDataSource.query(kpiSQL,   mainParams),
      AppDataSource.query(dataSQL,  mainParams),
      ...distinctPromises
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

    // distinctValues desde los SELECT DISTINCT
    const distinctValues = {}
    distinctResults.forEach(({ key, values }) => { distinctValues[key] = values })

    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : []

    return { columns, rows: dataRows, total, kpis, distinctValues, page, perPage }

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
    let sqlBase = `
      SELECT 
        b.sigla AS 'Hospital',
        b.codigo_cargo AS 'Código de Cargo',
        b.nombre_apellido AS 'Nombre y Apellido',
        b.puesto_baja AS 'Puesto de Baja',
        b.especialidad_baja AS 'Especialidad de Baja',
        b.unificador_puestos AS 'Unificador de Puestos',
        b.ex_baja AS 'Expediente Baja',
        b.ex_concurso AS 'Expediente Concurso',
        b.fecha_baja AS 'Fecha de Baja',
        b.motivo_baja AS 'Motivo de Baja'
      FROM bajas_concursos b
      WHERE b.periodo = ?
    `

    const paramsArr = [periodo]
    const whereClauses = []

    // Filtro opcional de hospital
    if (query.hospital_filter) {
      const values = query.hospital_filter.split(',').map(v => v.trim()).filter(Boolean)
      if (values.length > 0) {
        whereClauses.push(`b.sigla IN (?)`)
        paramsArr.push(values)
      }
    }

    // Aplicar filtros de búsqueda rápida
    if (query.codigo_cargo) {
      whereClauses.push(`b.codigo_cargo LIKE ?`)
      paramsArr.push(`%${query.codigo_cargo}%`)
    }
    if (query.nombre_apellido) {
      whereClauses.push(`b.nombre_apellido LIKE ?`)
      paramsArr.push(`%${query.nombre_apellido}%`)
    }
    if (query.ex_baja) {
      whereClauses.push(`b.ex_baja LIKE ?`)
      paramsArr.push(`%${query.ex_baja}%`)
    }
    if (query.ex_concurso) {
      whereClauses.push(`b.ex_concurso LIKE ?`)
      paramsArr.push(`%${query.ex_concurso}%`)
    }

    // Aplicar filtros multi-select
    if (query.unificador_puesto) {
      const values = query.unificador_puesto.split(',').map(v => v.trim()).filter(Boolean)
      if (values.length > 0) {
        whereClauses.push(`b.unificador_puestos IN (?)`)
        paramsArr.push(values)
      }
    }
    if (query.especialidad) {
      const values = query.especialidad.split(',').map(v => v.trim()).filter(Boolean)
      if (values.length > 0) {
        whereClauses.push(`b.especialidad_baja IN (?)`)
        paramsArr.push(values)
      }
    }
    if (query.literal_puesto) {
      const values = query.literal_puesto.split(',').map(v => v.trim()).filter(Boolean)
      if (values.length > 0) {
        whereClauses.push(`b.puesto_baja IN (?)`)
        paramsArr.push(values)
      }
    }

    const whereSQL = whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : ''
    const fullSQL = sqlBase + whereSQL

    const allRows = await AppDataSource.query(fullSQL, paramsArr)
    const total = allRows.length

    const kpis = {
      total: total,
      activos: 0,
      bloqueados: 0,
      comision: 0,
      retencion: 0
    }

    const sortColumn = sortBy || 'id_baja'
    const sortDirection = (sortDir || 'ASC').toUpperCase()
    
    allRows.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      if (aVal < bVal) return sortDirection === 'ASC' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'ASC' ? 1 : -1
      return 0
    })
    
    const offset = (page - 1) * perPage
    const rows = allRows.slice(offset, offset + perPage)

    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    const multiFiltersBajas = [
      { key: 'unificador_puesto', column: 'b.unificador_puestos', displayColumn: 'Unificador de Puestos' },
      { key: 'especialidad', column: 'b.especialidad_baja', displayColumn: 'Especialidad de Baja' },
      { key: 'literal_puesto', column: 'b.puesto_baja', displayColumn: 'Puesto de Baja' },
      { key: 'literal_codigo_registro', column: 'b.motivo_baja', displayColumn: 'Motivo de Baja' }
    ]

    const calculateDistinctValuesForFieldBajas = async (excludeField) => {
      const chainedParamsArr = [periodo]
      const chainedWhereClauses = []

      if (query.hospital_filter) {
        const values = query.hospital_filter.split(',').map(v => v.trim()).filter(Boolean)
        if (values.length > 0) {
          chainedWhereClauses.push(`b.sigla IN (?)`)
          chainedParamsArr.push(values)
        }
      }

      if (query.codigo_cargo) {
        chainedWhereClauses.push(`b.codigo_cargo LIKE ?`)
        chainedParamsArr.push(`%${query.codigo_cargo}%`)
      }
      if (query.nombre_apellido) {
        chainedWhereClauses.push(`b.nombre_apellido LIKE ?`)
        chainedParamsArr.push(`%${query.nombre_apellido}%`)
      }
      if (query.ex_baja) {
        chainedWhereClauses.push(`b.ex_baja LIKE ?`)
        chainedParamsArr.push(`%${query.ex_baja}%`)
      }
      if (query.ex_concurso) {
        chainedWhereClauses.push(`b.ex_concurso LIKE ?`)
        chainedParamsArr.push(`%${query.ex_concurso}%`)
      }

      multiFiltersBajas.forEach(({ key, column }) => {
        if (key === excludeField) return
        if (query[key]) {
          const values = query[key].split(',').map(v => v.trim()).filter(Boolean)
          if (values.length > 0) {
            chainedWhereClauses.push(`${column} IN (?)`)
            chainedParamsArr.push(values)
          }
        }
      })

      const chainedWhereSQL = chainedWhereClauses.length > 0 ? ' AND ' + chainedWhereClauses.join(' AND ') : ''
      const chainedFullSQL = sqlBase + chainedWhereSQL

      const chainedResults = await AppDataSource.query(chainedFullSQL, chainedParamsArr)
      return chainedResults
    }

    const distinctValues = {
      agrupador: [],
      escalafon: [],
      sexo: [],
      situacion_revista: [],
      reparticion: [],
      antiguedad: []
    }
    
    for (const filterConfig of multiFiltersBajas) {
      const { key, displayColumn } = filterConfig
      const chainedData = await calculateDistinctValuesForFieldBajas(key)
      
      distinctValues[key] = [...new Set(
        chainedData
          .map(r => r[displayColumn])
          .filter(Boolean)
      )].sort()
    }

    return {
      columns,
      rows,
      total,
      kpis,
      distinctValues,
      page,
      perPage,
      info: 'Mostrando datos de Bajas y Concursos (todos los hospitales)'
    }

  } catch (error) {
    logger.error('[handleBajasConcursosTotal] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [],
      rows: [],
      total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}
