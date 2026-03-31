// Rutas de exportación Excel (xlsx) para AdminJS
// Centraliza lógica para entidades simples y la vista combinada DatosCompletos

const { streamExcelResponse, toExcelBuffer, toMinutaExcelBuffer } = require('../utils/excel')
const logger = require('../utils/logger')

// Rate limiting simple en memoria (ventana fija)
function makeRateLimiter({ limit = 30, windowMs = 60_000 } = {}) {
  const store = new Map(); // key -> { count, windowStart }
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = (
      req?.session?.adminUser?.email
      || req?.session?.admin?.id
      || req?.currentAdmin?.email
      || req?.user?.id
      || req.ip
      || 'anon'
    ).toString();
    const rec = store.get(key) || { count: 0, windowStart: now };
    if (now - rec.windowStart >= windowMs) {
      rec.count = 0;
      rec.windowStart = now;
    }
    rec.count += 1;
    store.set(key, rec);
    if (rec.count > limit) {
      res.setHeader('Retry-After', Math.ceil((rec.windowStart + windowMs - now) / 1000));
      return res.status(429).json({ error: 'Too many export requests, please slow down.' });
    }
    return next();
  };
}

function registerAdminExportRoutes({ adminRouter, AppDataSource, entities }) {
  const { Persona, Cargo, Rol, Sigla, BajaConcurso } = entities
  const exportLimiter = makeRateLimiter({ limit: 30, windowMs: 60_000 })
  // Métricas simples en memoria
  const metrics = { exportsTotal: 0, datosCompletos: 0, xlsx: { personas:0, cargos:0, roles:0, siglas:0, bajas:0 }, rateLimited:0 }

  // Datos Completos (JOIN múltiple)
  const { config } = require('../config/env')
  const MAX_BATCH = Math.max(1000, config.export.maxBatch || 20000)

  // Middleware de auth explícito (defensivo aunque adminRouter ya esté autenticado)
  function ensureAdmin(req, res, next) {
    // AdminJS suele guardar el usuario en req.session.adminUser y también expone req.currentAdmin en handlers AdminJS
    if (req?.currentAdmin) return next();
    if (req?.session?.adminUser || req?.session?.admin) return next();
    // Fallback: si existe la cookie de sesión de AdminJS, dejamos pasar (el router autenticado validará igualmente)
    if (req?.cookies && req.cookies['adminjs']) return next();
    return res.status(401).json({ error: 'Unauthorized export' });
  }

  adminRouter.get('/export/datos-completos.xlsx', ensureAdmin, exportLimiter, async (req, res) => {
    metrics.exportsTotal++
    metrics.datosCompletos++
    try {
      const columns = [
        'id_cargo','codigo_cargo','periodo_cargo',
        'id_rol','codigo_rol','id_cargo_rol','id_persona_rol','id_sigla','codigo_reparticion','descripcion_reparticion','escalafon','codigo_registro','literal_codigo_registro','situacion_revista','literal_puesto','unificador_puesto','agrupador','j_categoria','jefaturas','escritorio','pou_desde','dia','fecha_bloqueo','bloqueo_motivo','bloqueo_comentario','cargo_desde','cargo_hasta','puesto','codigo_agrupamiento','literal_agrupamiento','doc_respaldatoria_j_categoria','j_comentario','comision_repa','descripcion_repa_comision','documentacion_alta','documentacion_baja','estado','periodo_rol',
        'id_persona','codigo_persona','cuil','cuil_rol','nombre_apellido','fecha_nacimiento','edad','sexo','tipo_doc','numero_doc','especialidad','telefono','mail_personal','mail_laboral','domicilio','localidad','antiguedad','periodo_persona',
        'id_sigla_sigla','sigla','universo_totalizador','tipo_hospital_sigla','monovalencia',
        'id_baja','id_cargo_baja','ex_baja','sigla_baja','periodo_baja','codigo_cargo_baja','ex_concurso','fecha_baja','motivo_baja','nombre_baja','puesto_baja','especialidad_baja','unificador_baja',
      ]
      const numericKeys = new Set(['id_cargo','id_rol','id_cargo_rol','id_persona_rol','id_persona','id_sigla','id_sigla_sigla','codigo_reparticion','id_baja','id_cargo_baja','edad'])
      function keyMap(k){
        switch(k){
          case 'id_cargo': return 'c.id_cargo'
          case 'codigo_cargo': return 'c.codigo_cargo'
          case 'periodo_cargo': return 'c.periodo'
          case 'id_rol': return 'r.id_rol'
          case 'codigo_rol': return 'r.codigo_rol'
          case 'id_cargo_rol': return 'r.id_cargo'
          case 'id_persona_rol': return 'r.id_persona'
          case 'id_sigla': return 'r.id_sigla'
          case 'codigo_reparticion': return 'r.codigo_reparticion'
          case 'descripcion_reparticion': return 'r.descripcion_reparticion'
          case 'escalafon': return 'r.escalafon'
          case 'codigo_registro': return 'r.codigo_registro'
          case 'literal_codigo_registro': return 'r.literal_codigo_registro'
          case 'situacion_revista': return 'r.situacion_revista'
          case 'literal_puesto': return 'r.literal_puesto'
          case 'unificador_puesto': return 'r.unificador_puesto'
          case 'agrupador': return 'r.agrupador'
          case 'j_categoria': return 'r.j_categoria'
          case 'jefaturas': return 'r.jefaturas'
          case 'escritorio': return 'r.escritorio'
          case 'pou_desde': return 'r.pou_desde'
          case 'dia': return 'r.dia'
          case 'fecha_bloqueo': return 'r.fecha_bloqueo'
          case 'bloqueo_motivo': return 'r.bloqueo_motivo'
          case 'bloqueo_comentario': return 'r.bloqueo_comentario'
          case 'cargo_desde': return 'r.cargo_desde'
          case 'cargo_hasta': return 'r.cargo_hasta'
          case 'puesto': return 'r.puesto'
          case 'codigo_agrupamiento': return 'r.codigo_agrupamiento'
          case 'literal_agrupamiento': return 'r.literal_agrupamiento'
          case 'doc_respaldatoria_j_categoria': return 'r.doc_respaldatoria_j_categoria'
          case 'j_comentario': return 'r.j_comentario'
          case 'comision_repa': return 'r.comision_repa'
          case 'descripcion_repa_comision': return 'r.descripcion_repa_comision'
          case 'documentacion_alta': return 'r.documentacion_alta'
          case 'documentacion_baja': return 'r.documentacion_baja'
          case 'estado': return 'r.estado'
          case 'periodo_rol': return 'r.periodo'
          case 'codigo_persona': return 'p.codigo_persona'
          case 'cuil': return 'p.cuil'
          case 'cuil_rol': return 'p.cuil_rol'
          case 'nombre_apellido': return 'p.nombre_apellido'
          case 'fecha_nacimiento': return 'p.fecha_nacimiento'
          case 'edad': return 'p.edad'
          case 'sexo': return 'p.sexo'
          case 'tipo_doc': return 'p.tipo_doc'
          case 'numero_doc': return 'p.numero_doc'
          case 'especialidad': return 'p.especialidad'
          case 'telefono': return 'p.telefono'
          case 'mail_personal': return 'p.mail_personal'
          case 'mail_laboral': return 'p.mail_laboral'
          case 'domicilio': return 'p.domicilio'
          case 'localidad': return 'p.localidad'
          case 'antiguedad': return 'p.antiguedad'
          case 'periodo_persona': return 'p.periodo'
          case 'id_sigla_sigla': return 's.id_sigla'
          case 'sigla': return 's.sigla'
          case 'universo_totalizador': return 's.universo_totalizador'
          case 'tipo_hospital_sigla': return 's.tipo_hospital_sigla'
          case 'monovalencia': return 's.monovalencia'
          case 'id_baja': return 'b.id_baja'
          case 'id_cargo_baja': return 'b.id_cargo'
          case 'ex_baja': return 'b.ex_baja'
          case 'sigla_baja': return 'b.sigla'
          case 'periodo_baja': return 'b.periodo'
          case 'codigo_cargo_baja': return 'b.codigo_cargo'
          case 'ex_concurso': return 'b.ex_concurso'
          case 'fecha_baja': return 'b.fecha_baja'
          case 'motivo_baja': return 'b.motivo_baja'
          case 'nombre_baja': return 'b.nombre_apellido'
          case 'puesto_baja': return 'b.puesto_baja'
          case 'especialidad_baja': return 'b.especialidad_baja'
          case 'unificador_baja': return 'b.unificador_puestos'
          default: return k
        }
      }
      const whereParts = []
      const values = []
      for (const key of columns) {
        const raw = (req?.query?.[key] ?? '').toString().trim()
        if (!raw) continue
        if (numericKeys.has(key)) {
          whereParts.push(`${keyMap(key)} = ?`)
          values.push(parseInt(raw, 10) || 0)
        } else {
          whereParts.push(`${keyMap(key)} LIKE ?`)
          values.push(`%${raw}%`)
        }
      }
      const whereSql = whereParts.length ? (' WHERE ' + whereParts.join(' AND ')) : ''
      const baseFrom = `FROM cargos c
LEFT JOIN roles r ON c.id_cargo = r.id_cargo AND c.periodo = r.periodo
LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
LEFT JOIN siglas s ON r.id_sigla = s.id_sigla
LEFT JOIN bajas_concursos b ON c.id_cargo = b.id_cargo AND c.periodo = b.periodo`
      const selectSql = `SELECT 
  c.id_cargo AS id_cargo, c.codigo_cargo AS codigo_cargo, c.periodo AS periodo_cargo,
  r.id_rol AS id_rol, r.codigo_rol AS codigo_rol, r.id_cargo AS id_cargo_rol, r.id_persona AS id_persona_rol, r.id_sigla AS id_sigla,
  r.codigo_reparticion AS codigo_reparticion, r.descripcion_reparticion AS descripcion_reparticion, r.escalafon AS escalafon,
  r.codigo_registro AS codigo_registro, r.literal_codigo_registro AS literal_codigo_registro, r.situacion_revista AS situacion_revista,
  r.literal_puesto AS literal_puesto, r.unificador_puesto AS unificador_puesto, r.agrupador AS agrupador, r.j_categoria AS j_categoria,
  r.jefaturas AS jefaturas, r.escritorio AS escritorio, r.pou_desde AS pou_desde, r.dia AS dia, r.fecha_bloqueo AS fecha_bloqueo,
  r.bloqueo_motivo AS bloqueo_motivo, r.bloqueo_comentario AS bloqueo_comentario, r.cargo_desde AS cargo_desde, r.cargo_hasta AS cargo_hasta,
  r.puesto AS puesto, r.codigo_agrupamiento AS codigo_agrupamiento, r.literal_agrupamiento AS literal_agrupamiento,
  r.doc_respaldatoria_j_categoria AS doc_respaldatoria_j_categoria, r.j_comentario AS j_comentario, r.comision_repa AS comision_repa,
  r.descripcion_repa_comision AS descripcion_repa_comision, r.documentacion_alta AS documentacion_alta, r.documentacion_baja AS documentacion_baja,
  r.estado AS estado, r.periodo AS periodo_rol,
  p.id_persona AS id_persona, p.codigo_persona AS codigo_persona, p.cuil AS cuil, p.cuil_rol AS cuil_rol, p.nombre_apellido AS nombre_apellido,
  p.fecha_nacimiento AS fecha_nacimiento, p.edad AS edad, p.sexo AS sexo, p.tipo_doc AS tipo_doc, p.numero_doc AS numero_doc,
  p.especialidad AS especialidad, p.telefono AS telefono, p.mail_personal AS mail_personal, p.mail_laboral AS mail_laboral, p.domicilio AS domicilio,
  p.localidad AS localidad, p.antiguedad AS antiguedad, p.periodo AS periodo_persona,
  s.id_sigla AS id_sigla_sigla, s.sigla AS sigla, s.universo_totalizador AS universo_totalizador, s.tipo_hospital_sigla AS tipo_hospital_sigla, s.monovalencia AS monovalencia,
  b.id_baja AS id_baja, b.id_cargo AS id_cargo_baja, b.ex_baja AS ex_baja, b.sigla AS sigla_baja, b.periodo AS periodo_baja, b.codigo_cargo AS codigo_cargo_baja,
  b.ex_concurso AS ex_concurso, b.fecha_baja AS fecha_baja, b.motivo_baja AS motivo_baja, b.nombre_apellido AS nombre_baja, b.puesto_baja AS puesto_baja,
  b.especialidad_baja AS especialidad_baja, b.unificador_puestos AS unificador_baja`

      const sortByRaw = (req?.query?.sortBy || '').toString()
      const sortDirRaw = ((req?.query?.sortDir || '') + '').toUpperCase()
      const safeSortBy = columns.includes(sortByRaw) ? sortByRaw : null
      const safeSortDir = sortDirRaw === 'DESC' ? 'DESC' : 'ASC'
      const orderSql = safeSortBy ? ` ORDER BY ${keyMap(safeSortBy)} ${safeSortDir}` : ' ORDER BY c.id_cargo ASC, r.id_rol ASC, p.id_persona ASC'

      const batchSizeReq = parseInt((req?.query?.batchSize || '5000'), 10) || 5000
      const batchSize = Math.max(1000, Math.min(MAX_BATCH, batchSizeReq))
      try { res.setTimeout(1000 * 60 * 30) } catch {}
      await streamExcelResponse({
        res,
        filename: `datos_completos_${Date.now()}.xlsx`,
        columns,
        batchSize,
        fetchBatch: async (offset, size) => {
          const exportSql = `${selectSql} ${baseFrom} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`
          return AppDataSource.query(exportSql, [...values, size, offset])
        }
      })
    } catch (err) {
      logger.error('[Export datos-completos] Error', { error: err.message, stack: err.stack })
      if (!res.headersSent) res.status(500).json({ error: 'Error exportando Excel', detail: err?.message })
      try { res.end() } catch {}
    }
  })

  function registerSimpleExportXlsx(pathSuffix, table, alias) {
    adminRouter.get('/export/' + pathSuffix, ensureAdmin, exportLimiter, async (req, res) => {
      metrics.exportsTotal++
      const key = pathSuffix.replace(/\.xlsx$/, '')
      if (metrics.xlsx[key] !== undefined) metrics.xlsx[key]++
      try {
        const meta = AppDataSource.getMetadata(table)
        const cols = meta.columns.map(c => c.propertyName)
        const numeric = new Set(meta.columns.filter(c => ['int','integer','bigint','float','double','decimal'].includes((c.type||'').toString())).map(c => c.propertyName))
        const whereParts = []
        const values = []
        for (const k of cols) {
          const raw = (req?.query?.[k] ?? '').toString().trim()
          if (!raw) continue
          if (numeric.has(k)) {
            whereParts.push(`${alias}.${k} = ?`)
            values.push(parseInt(raw, 10) || 0)
          } else {
            whereParts.push(`${alias}.${k} LIKE ?`)
            values.push(`%${raw}%`)
          }
        }
        const whereSql = whereParts.length ? ' WHERE ' + whereParts.join(' AND ') : ''
        const orderColRaw = (req?.query?.sortBy || '').toString()
        const orderDirRaw = ((req?.query?.sortDir || '') + '').toUpperCase()
        const safeOrderCol = cols.includes(orderColRaw) ? orderColRaw : cols[0]
        const safeOrderDir = orderDirRaw === 'DESC' ? 'DESC' : 'ASC'
        const batchSizeReq = parseInt((req?.query?.batchSize || '2000'), 10) || 2000
        const batchSize = Math.max(1000, Math.min(MAX_BATCH, batchSizeReq))
        const baseName = pathSuffix.replace(/\.xlsx$/, '')

        try { res.setTimeout(1000 * 60 * 15) } catch {}
        await streamExcelResponse({
          res,
          filename: `${baseName}_${Date.now()}.xlsx`,
          columns: cols,
          batchSize,
          fetchBatch: async (offset, size) => {
            const sql = `SELECT ${cols.map(c => `${alias}.${c}`).join(', ')} FROM ${meta.tableName} ${alias}${whereSql} ORDER BY ${alias}.${safeOrderCol} ${safeOrderDir} LIMIT ? OFFSET ?`
            return AppDataSource.query(sql, [...values, size, offset])
          }
        })
      } catch (err) {
        logger.error('[Export xlsx simple] Error', { error: err.message, stack: err.stack })
        if (!res.headersSent) res.status(500).json({ error: 'Error exportando Excel', detail: err?.message })
        try { res.end() } catch {}
      }
    })
  }

  registerSimpleExportXlsx('personas.xlsx', Persona, 'p')
  registerSimpleExportXlsx('cargos.xlsx', Cargo, 'c')
  registerSimpleExportXlsx('roles.xlsx', Rol, 'r')
  registerSimpleExportXlsx('siglas.xlsx', Sigla, 's')
  registerSimpleExportXlsx('bajas.xlsx', BajaConcurso, 'b')

  // Ruta dinámica por hospital: /admin/:hospital/export/dotacion-total.xlsx
  //                           y /admin/:hospital/export/bajas-concursos.xlsx
  adminRouter.get('/:hospitalCode/export/:tipoFile', ensureAdmin, exportLimiter, async (req, res) => {
    metrics.exportsTotal++
    try {
      const { hospitalCode, tipoFile } = req.params
      if (!tipoFile.endsWith('.xlsx')) {
        return res.status(404).json({ error: 'Not found' })
      }
      const tipo = tipoFile.slice(0, -5) // 'dotacion-total' o 'bajas-concursos'
      if (!['dotacion-total', 'bajas-concursos'].includes(tipo)) {
        return res.status(404).json({ error: 'Tipo de exportación no válido' })
      }
      const hospital = hospitalCode.toUpperCase()
      req.query.hospital = hospital
      req.query.procesos_concursales = tipo === 'bajas-concursos' ? 'true' : 'false'
      req.query.page = '1'
      req.query.perPage = '100000'

      const { handleOrganizacionTabla } = require('../hospitals/pages')
      const result = await handleOrganizacionTabla({ AppDataSource, req })

      const rows = result.rows || []
      const columns = result.columns || []
      const periodo = (req.query.periodo || Date.now()).toString().replace(/[^\w\-]/g, '_')
      const buffer = await toExcelBuffer(rows, columns)

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${tipo}_${hospital}_${periodo}.xlsx"`)
      res.setHeader('Cache-Control', 'no-store')
      return res.end(buffer)
    } catch (err) {
      logger.error('[Export hospital xlsx] Error', { error: err.message, stack: err.stack })
      if (!res.headersSent) res.status(500).json({ error: 'Error exportando Excel', detail: err?.message })
      try { res.end() } catch {}
    }
  })

  // Endpoint para exportar minutas: el cliente envía columns + rows y recibe un xlsx
  adminRouter.post('/export/minuta.xlsx', ensureAdmin, async (req, res) => {
    try {
      const body = req.body || req.fields || {}
      let colDefs = body.columns
      let rows    = body.rows
      let titulo  = body.titulo
      let hospitalCode = body.hospitalCode

      // Si llega como string (JSON serializado), parsear
      if (typeof colDefs === 'string') colDefs = JSON.parse(colDefs)
      if (typeof rows === 'string')    rows    = JSON.parse(rows)

      if (!Array.isArray(colDefs) || !Array.isArray(rows)) {
        return res.status(400).json({ error: 'columns y rows son requeridos' })
      }

      const buffer = await toMinutaExcelBuffer(colDefs, rows, titulo || 'Minuta')

      const safeName = (titulo || 'minuta').replace(/[^\w\- áéíóúÁÉÍÓÚñÑ]/g, '_').substring(0, 50)
      const hospital = (hospitalCode || '').toString().replace(/[^\w]/g, '')
      const filename = `${safeName}_${hospital}.xlsx`

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Cache-Control', 'no-store')
      return res.end(buffer)
    } catch (err) {
      logger.error('[Export minuta xlsx] Error', { error: err.message, stack: err.stack })
      if (!res.headersSent) res.status(500).json({ error: 'Error exportando minuta', detail: err?.message })
    }
  })

  // Endpoint interno de métricas (solo admin)
  adminRouter.get('/export/metrics', ensureAdmin, (req, res) => {
    res.json({ exports: metrics })
  })
}

module.exports = { registerAdminExportRoutes }
