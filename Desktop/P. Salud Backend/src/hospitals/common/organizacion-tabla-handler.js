/**
 * Generic Handler para OrganizacionTabla - Todos los hospitales
 * Consulta unificada con todos los filtros y KPIs
 * Aplica Row-Level Security (RLS) para directores
 */

const { buildHospitalFilterSQL } = require('../../utils/rls');
const { normalizeSpanishText } = require('../../utils/text');
const logger = require('../../utils/logger');

module.exports.handleOrganizacionTabla = async function handleOrganizacionTabla({ 
  AppDataSource, 
  req,
  defaultHospital = 'HGACA'
}) {
  try {
    const query = req.query || {}
    
    // Parámetros básicos
    let hospital = query.hospital || defaultHospital
    const periodo = query.periodo || ''
    const page = parseInt(query.page) || 1
    const perPage = parseInt(query.perPage) || 50
    const sortBy = query.sortBy || 'id_cargo'
    const sortDir = query.sortDir || 'ASC'
    const procesosConcursales = query.procesos_concursales === 'true'
    
    // Aplicar RLS: Si el usuario es director, forzar su hospital
    if (req.user?.permissions?.filter_by_hospital && req.user?.hospital_code) {
      hospital = req.user.hospital_code;
    }
    
    // Validar periodo
    if (!periodo) {
      return {
        columns: [],
        rows: [],
        total: 0,
        kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
        error: 'Período requerido'
      }
    }

    // Si está activo el filtro de Procesos Concursales, usar tabla bajas_concursos
    if (procesosConcursales) {
      return await handleBajasConcursos({ AppDataSource, query, hospital, periodo, page, perPage, sortBy, sortDir })
    }
    
    let sqlBase = `
      SELECT 
        c.codigo_cargo AS 'Código de Cargo',
        r.codigo_rol AS 'Código SIAL',
        r.situacion_revista AS 'Situación de Revista',
        p.cuil AS 'CUIL',
        p.nombre_apellido AS 'Nombre y Apellido',
        p.fecha_nacimiento AS 'Nacimiento',
        p.edad AS 'Edad',
        p.sexo AS 'Sexo',
        r.descripcion_reparticion AS 'Repartición',
        r.escalafon AS 'Escalafón',
        r.literal_puesto AS 'Puesto',
        r.literal_codigo_registro AS 'Carrera',
        r.agrupador AS 'Agrupamiento',
        p.especialidad AS 'Especialidad',
        r.cargo_desde AS 'Cargo Desde',
        r.jefaturas AS 'Jefatura',
        r.doc_respaldatoria_j_categoria AS 'Documentación Jefatura',
        p.telefono AS 'Teléfono',
        p.mail_personal AS 'Mail Personal',
        p.mail_laboral AS 'Mail Laboral',
        r.fecha_bloqueo AS 'Fecha de Bloqueo',
        r.bloqueo_comentario AS 'Comentario de Bloqueo',
        r.bloqueo_motivo AS 'Motivo de Bloqueo',
        r.unificador_puesto,
        p.antiguedad,
        r.estado
      FROM roles r
      LEFT JOIN cargos c ON r.id_cargo = c.id_cargo AND r.periodo = c.periodo
      LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
      LEFT JOIN siglas s ON r.id_sigla = s.id_sigla
      WHERE r.periodo = ?
        AND s.sigla = ?
    `

    // Usaremos parámetros posicionales `?` compatibles con MySQL
    const paramsArr = [periodo, hospital]
    const whereClauses = []

    // Aplicar filtros multi-select
    const multiFilters = [
      { key: 'unificador_puesto', column: 'r.unificador_puesto' },
      { key: 'especialidad', column: 'p.especialidad' },
      { key: 'literal_puesto', column: 'r.literal_puesto' },
      { key: 'literal_codigo_registro', column: 'r.literal_codigo_registro' },
      { key: 'escalafon', column: 'r.escalafon' },
      { key: 'situacion_revista', column: 'r.situacion_revista' },
      { key: 'agrupador', column: 'r.agrupador' },
      { key: 'sexo', column: 'p.sexo' },
      { key: 'reparticion', column: 'r.descripcion_reparticion' }
    ]

    multiFilters.forEach(({ key, column }) => {
      if (query[key]) {
        const values = query[key].split(',').map(v => v.trim()).filter(Boolean)
        if (values.length > 0) {
          whereClauses.push(`${column} IN (?)`)
          paramsArr.push(values)
        }
      }
    })

    // Aplicar búsquedas LIKE
    if (query.codigo_cargo) {
      whereClauses.push(`c.codigo_cargo LIKE ?`)
      paramsArr.push(`%${query.codigo_cargo}%`)
    }
    if (query.nombre_apellido) {
      whereClauses.push(`p.nombre_apellido LIKE ?`)
      paramsArr.push(`%${query.nombre_apellido}%`)
    }
    if (query.cuil) {
      whereClauses.push(`p.cuil LIKE ?`)
      paramsArr.push(`%${query.cuil}%`)
    }
    if (query.codigo_rol) {
      whereClauses.push(`r.codigo_rol LIKE ?`)
      paramsArr.push(`%${query.codigo_rol}%`)
    }
    if (query.mail_laboral) {
      whereClauses.push(`p.mail_laboral LIKE ?`)
      paramsArr.push(`%${query.mail_laboral}%`)
    }
    if (query.telefono) {
      whereClauses.push(`p.telefono LIKE ?`)
      paramsArr.push(`%${query.telefono}%`)
    }

    // Aplicar rangos
    if (query.edad_min) {
      whereClauses.push(`p.edad >= ?`)
      paramsArr.push(parseInt(query.edad_min))
    }
    if (query.edad_max) {
      whereClauses.push(`p.edad <= ?`)
      paramsArr.push(parseInt(query.edad_max))
    }
    if (query.antiguedad_min) {
      whereClauses.push(`p.antiguedad >= ?`)
      paramsArr.push(parseInt(query.antiguedad_min))
    }
    if (query.antiguedad_max) {
      whereClauses.push(`p.antiguedad <= ?`)
      paramsArr.push(parseInt(query.antiguedad_max))
    }

    // Filtro de estado (desde KPIs clickeables) - usar normalización
    if (query.estado) {
      const estadoNorm = normalizeSpanishText(query.estado);
      
      whereClauses.push(`LOWER(REPLACE(REPLACE(r.estado, 'á', 'a'), 'ó', 'o')) LIKE ?`)
      paramsArr.push(`%${estadoNorm}%`)
    }

    // Agregar WHERE clauses adicionales
    const whereSQL = whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : ''
    const fullSQL = sqlBase + whereSQL

    // Ejecutar query completa para obtener todos los datos (sin paginación primero)
    const allRows = await AppDataSource.query(fullSQL, paramsArr)
    const total = allRows.length

    // Calcular KPIs desde los datos obtenidos usando normalización de texto
    const kpis = {
      total: total,
      activos: allRows.filter(r => {
        const norm = normalizeSpanishText(r.estado);
        return norm === 'activo' || norm === 'activos';
      }).length,
      bloqueados: allRows.filter(r => {
        const norm = normalizeSpanishText(r.estado);
        return norm === 'bloqueado' || norm === 'bloqueados';
      }).length,
      comision: allRows.filter(r => {
        const norm = normalizeSpanishText(r.estado);
        return norm === 'comision';
      }).length,
      retencion: allRows.filter(r => {
        const norm = normalizeSpanishText(r.estado);
        return norm.includes('retencion');
      }).length
    }

    // Aplicar ordenamiento y paginación en memoria
    const sortColumn = sortBy || 'id_cargo'
    const sortDirection = (sortDir || 'ASC').toUpperCase()
    
    // Ordenar
    allRows.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      if (aVal < bVal) return sortDirection === 'ASC' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'ASC' ? 1 : -1
      return 0
    })
    
    // Paginar
    const offset = (page - 1) * perPage
    const rows = allRows.slice(offset, offset + perPage)

    // Campos ocultos (se usan para filtros pero no se muestran en la tabla)
    const hiddenFields = ['unificador_puesto', 'antiguedad', 'estado']

    // Obtener nombres de columnas (excluyendo campos ocultos)
    const columns = rows.length > 0 ? Object.keys(rows[0]).filter(col => !hiddenFields.includes(col)) : []

    // Limpiar campos ocultos de las filas
    const cleanedRows = rows.map(row => {
      const cleanRow = { ...row }
      hiddenFields.forEach(field => delete cleanRow[field])
      return cleanRow
    })

    // **FILTROS ENCADENADOS**: Calcular distinctValues aplicando TODOS los filtros EXCEPTO el que corresponda a cada dropdown
    // Esto permite que cada dropdown solo muestre opciones válidas según los otros filtros seleccionados
    const calculateDistinctValuesForField = async (excludeField) => {
      // Construir WHERE clauses SIN el filtro que excluimos (para esa propiedad específica)
      const chainedWhereClauses = []
      const chainedParamsArr = [periodo, hospital]
      
      // Copiar todos los multifilters EXCEPTO el que excluimos
      multiFilters.forEach(({ key, column }) => {
        if (key === excludeField) return // Saltear el que estamos calculando
        if (query[key]) {
          const values = query[key].split(',').map(v => v.trim()).filter(Boolean)
          if (values.length > 0) {
            chainedWhereClauses.push(`${column} IN (?)`)
            chainedParamsArr.push(values)
          }
        }
      })

      // Aplicar búsquedas LIKE (igual que antes)
      if (query.codigo_cargo) {
        chainedWhereClauses.push(`c.codigo_cargo LIKE ?`)
        chainedParamsArr.push(`%${query.codigo_cargo}%`)
      }
      if (query.nombre_apellido) {
        chainedWhereClauses.push(`p.nombre_apellido LIKE ?`)
        chainedParamsArr.push(`%${query.nombre_apellido}%`)
      }
      // ... (aplicar otros LIKE filters...)

      // Aplicar rangos
      if (query.edad_min) {
        chainedWhereClauses.push(`p.edad >= ?`)
        chainedParamsArr.push(parseInt(query.edad_min))
      }
      if (query.edad_max) {
        chainedWhereClauses.push(`p.edad <= ?`)
        chainedParamsArr.push(parseInt(query.edad_max))
      }
      if (query.antiguedad_min) {
        chainedWhereClauses.push(`p.antiguedad >= ?`)
        chainedParamsArr.push(parseInt(query.antiguedad_min))
      }
      if (query.antiguedad_max) {
        chainedWhereClauses.push(`p.antiguedad <= ?`)
        chainedParamsArr.push(parseInt(query.antiguedad_max))
      }

      const chainedWhereSQL = chainedWhereClauses.length > 0 ? ' AND ' + chainedWhereClauses.join(' AND ') : ''
      const chainedFullSQL = sqlBase + chainedWhereSQL

      const chainedResults = await AppDataSource.query(chainedFullSQL, chainedParamsArr)
      return chainedResults
    }

    // Calcular distinctValues para CADA campo aplicando filtros encadenados
    const distinctValues = {}
    
    for (const filterConfig of multiFilters) {
      const { key, column } = filterConfig
      const chainedData = await calculateDistinctValuesForField(key)
      
      // Extraer valores únicos del campo correspondiente
      let fieldName = column.split('.').pop() // Obtener el nombre del campo sin alias de tabla
      distinctValues[key] = [...new Set(
        chainedData
          .map(r => {
            // Mapear el nombre de columna correcto según el contexto
            if (key === 'unificador_puesto') return r.unificador_puesto
            if (key === 'especialidad') return r['Especialidad']
            if (key === 'literal_puesto') return r['Puesto']
            if (key === 'literal_codigo_registro') return r['Carrera']
            if (key === 'escalafon') return r['Escalafón']
            if (key === 'situacion_revista') return r.situacion_revista
            if (key === 'agrupador') return r['Agrupamiento']
            if (key === 'sexo') return r['Sexo']
            if (key === 'reparticion') return r['Repartición']
            return null
          })
          .filter(Boolean)
      )].sort()
    }

    return {
      columns,
      rows: cleanedRows,
      total,
      kpis,
      distinctValues,
      page,
      perPage
    }

  } catch (error) {
    logger.error('[handleOrganizacionTabla] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [],
      rows: [],
      total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}

/**
 * Handler para Procesos Concursales - Consulta tabla bajas_concursos
 */
async function handleBajasConcursos({ AppDataSource, query, hospital, periodo, page, perPage, sortBy, sortDir }) {
  try {
    // Construir query para bajas_concursos con todas las columnas disponibles
    let sqlBase = `
      SELECT 
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
        AND b.sigla = ?
    `

    const paramsArr = [periodo, hospital]
    const whereClauses = []

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

    // Aplicar filtros multi-select (adaptados a columnas de bajas_concursos)
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

    // Agregar WHERE clauses adicionales
    const whereSQL = whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : ''
    const fullSQL = sqlBase + whereSQL

    // Ejecutar query completa
    const allRows = await AppDataSource.query(fullSQL, paramsArr)
    const total = allRows.length

    // KPIs para bajas_concursos (solo total, ya que no hay estados activos/bloqueados)
    const kpis = {
      total: total,
      activos: 0,
      bloqueados: 0,
      comision: 0,
      retencion: 0
    }

    // Ordenar
    const sortColumn = sortBy || 'id_baja'
    const sortDirection = (sortDir || 'ASC').toUpperCase()
    
    allRows.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      if (aVal < bVal) return sortDirection === 'ASC' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'ASC' ? 1 : -1
      return 0
    })
    
    // Paginar
    const offset = (page - 1) * perPage
    const rows = allRows.slice(offset, offset + perPage)

    // Obtener nombres de columnas
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    // **FILTROS ENCADENADOS para Bajas Concursos**: Calcular distinctValues aplicando TODOS los filtros EXCEPTO el que corresponda a cada dropdown
    const multiFiltersBajas = [
      { key: 'unificador_puesto', column: 'b.unificador_puestos', displayColumn: 'Unificador de Puestos' },
      { key: 'especialidad', column: 'b.especialidad_baja', displayColumn: 'Especialidad de Baja' },
      { key: 'literal_puesto', column: 'b.puesto_baja', displayColumn: 'Puesto de Baja' },
      { key: 'literal_codigo_registro', column: 'b.motivo_baja', displayColumn: 'Motivo de Baja' }
    ]

    const calculateDistinctValuesForFieldBajas = async (excludeField) => {
      let chainedSql = sqlBase
      const chainedParamsArr = [periodo, hospital]
      const chainedWhereClauses = []

      // Aplicar búsquedas LIKE (igual que antes)
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

      // Aplicar filtros multi-select EXCEPTO el que excluimos
      multiFiltersBajas.forEach(({ key, column }) => {
        if (key === excludeField) return // Saltear el que estamos calculando
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

    // Calcular distinctValues para CADA campo aplicando filtros encadenados
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
      info: 'Mostrando datos de Bajas y Concursos'
    }

  } catch (error) {
    logger.error('[handleBajasConcursos] Error:', { error: error.message, stack: error.stack })
    return {
      columns: [],
      rows: [],
      total: 0,
      kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message
    }
  }
}
