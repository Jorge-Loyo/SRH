const { AppDataSource } = require('../../config/data-source');
const logger = require('../../utils/logger');

async function listNewCargo(req, res) {
  try {
    const page    = Math.max(1, parseInt(req.query.page  || '1',  10))
    const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)))
    const offset  = (page - 1) * limit
    const q        = (req.query.q        || '').trim()
    const carrera  = (req.query.carrera  || '').trim().toUpperCase()
    const modalidad = (req.query.modalidad || '').trim().toLowerCase()
    const sigla    = (req.query.sigla    || '').trim().toUpperCase()
    const tipoCph  = (req.query.tipoCph  || '').trim().toLowerCase()
    const estado   = (req.query.estado   || '').trim().toLowerCase()
    const categoria = (req.query.categoria || '').trim().toUpperCase()

    const conditions = []
    const params = []

    if (q) {
      conditions.push('(nc.codigo LIKE ? OR nc.sigla LIKE ? OR nc.puesto LIKE ? OR nc.especialidad LIKE ? OR nc.norma_referencia LIKE ? OR nc.nro_resolucion LIKE ? OR ca.documento LIKE ? OR ca.expediente LIKE ?)')
      const like = `%${q}%`
      params.push(like, like, like, like, like, like, like, like)
    }
    if (carrera)   { conditions.push('nc.carrera = ?');   params.push(carrera) }
    if (modalidad) { conditions.push('nc.modalidad = ?'); params.push(modalidad) }
    if (sigla)     { conditions.push('nc.sigla = ?');     params.push(sigla) }
    if (categoria) { conditions.push('nc.categoria_interna = ?'); params.push(categoria) }
    if (estado) {
      if (estado === 'comision')  { conditions.push("cd.situacion_revista = 'comision'") }
      else if (estado === 'retencion') { conditions.push("cd.situacion_revista = 'retencion_cargo'") }
      else if (estado === 'vacante') {
        conditions.push("nc.estado = 'vigente' AND cd.id IS NULL")
      }
      else if (estado === 'activo') {
        conditions.push("nc.estado = 'vigente' AND cd.id IS NOT NULL AND cd.situacion_revista NOT IN ('comision', 'retencion_cargo')")
      }
      else { conditions.push('nc.estado = ?'); params.push(estado === 'bloqueado' ? 'no_vigente' : estado) }
    }
    if (tipoCph) {
      if (tipoCph === 'jefe')          conditions.push("nc.codigo LIKE 'CPH-J-%'")
      else if (tipoCph === 'director') conditions.push("nc.codigo LIKE 'CPH-D-%'")
      else if (tipoCph === 'comun')    conditions.push("(nc.carrera = 'CPH' AND nc.codigo NOT LIKE 'CPH-J-%' AND nc.codigo NOT LIKE 'CPH-D-%')")
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [{ total }] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM new_cargo nc
       LEFT JOIN cargos_alta ca ON ca.id = nc.id_alta
       LEFT JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
       ${where}`, params
    )
    const rows = await AppDataSource.query(
      `SELECT
        nc.id, nc.id_sial, nc.codigo, nc.sigla, nc.carrera, nc.modalidad,
        nc.puesto, nc.especialidad, nc.estado, nc.situacion_revista,
        nc.cargo_desde, nc.cargo_hasta, nc.fecha_alta,
        nc.fecha_actualizacion, nc.categoria_interna,
        nc.norma_referencia, nc.nro_resolucion, nc.documento_origen,
        ca.id        AS id_alta,
        ca.tipo_alta, ca.documento, ca.expediente, ca.cantidad,
        ca.fecha_registro,
        COALESCE(ca.norma_referencia, nc.norma_referencia)   AS norma_ref_final,
        COALESCE(ca.nro_resolucion,   nc.nro_resolucion)     AS resolucion_final,
        COALESCE(ca.documento_origen, nc.documento_origen)   AS doc_origen_final,
        cd.antiguedad,
        CASE WHEN cd.antiguedad IS NOT NULL THEN CONCAT(
          TIMESTAMPDIFF(YEAR, cd.antiguedad, CURDATE()), ' a ',
          MOD(TIMESTAMPDIFF(MONTH, cd.antiguedad, CURDATE()), 12), ' m'
        ) ELSE NULL END AS antiguedad_calc,
        pd.cuil  AS dot_cuil,
        pd.ayn   AS dot_ayn,
        cd.situacion_revista AS dot_sit_revista,
        cd.estado            AS dot_estado,
        cd.codigo_repa       AS dot_codigo_repa,
        CASE
          WHEN nc.estado != 'vigente' THEN NULL
          WHEN cd.id IS NULL THEN 'vacante'
          WHEN cd.situacion_revista = 'comision' THEN 'comision'
          WHEN cd.situacion_revista = 'retencion_cargo' THEN 'retencion'
          ELSE 'activo'
        END AS dot_ocupacion,
        (SELECT os.desc_rep FROM organigramas os
          WHERE os.sigla COLLATE utf8mb4_unicode_ci = nc.sigla
          ORDER BY os.lvl ASC LIMIT 1) AS org_desc_rep
       FROM new_cargo nc
       LEFT JOIN cargos_alta ca ON ca.id = nc.id_alta
       LEFT JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
       LEFT JOIN personas_dotacion pd ON pd.id = cd.id_persona
       ${where}
       ORDER BY nc.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    res.json({ rows, total: parseInt(total, 10), page, limit })
  } catch (err) {
    logger.error('[carrerasController] listNewCargo', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function exportNewCargo(req, res) {
  try {
    const q        = (req.query.q        || '').trim()
    const carrera  = (req.query.carrera  || '').trim().toUpperCase()
    const modalidad = (req.query.modalidad || '').trim().toLowerCase()
    const sigla    = (req.query.sigla    || '').trim().toUpperCase()
    const tipoCph  = (req.query.tipoCph  || '').trim().toLowerCase()
    const estado   = (req.query.estado   || '').trim().toLowerCase()

    const conditions = []
    const params = []
    if (q) {
      conditions.push('(codigo LIKE ? OR sigla LIKE ? OR puesto LIKE ? OR especialidad LIKE ?)')
      const like = `%${q}%`
      params.push(like, like, like, like)
    }
    if (carrera)   { conditions.push('carrera = ?');   params.push(carrera) }
    if (modalidad) { conditions.push('modalidad = ?'); params.push(modalidad) }
    if (sigla)     { conditions.push('sigla = ?');     params.push(sigla) }
    if (estado) {
      if (estado === 'comision') { conditions.push("situacion_revista = 'comision'") }
      else if (estado === 'retencion') { conditions.push("situacion_revista = 'retencion_cargo'") }
      else { conditions.push('estado = ?'); params.push(estado) }
    }
    if (tipoCph) {
      if (tipoCph === 'jefe')          conditions.push("codigo LIKE 'CPH-J-%'")
      else if (tipoCph === 'director') conditions.push("codigo LIKE 'CPH-D-%'")
      else if (tipoCph === 'comun')    conditions.push("(carrera = 'CPH' AND codigo NOT LIKE 'CPH-J-%' AND codigo NOT LIKE 'CPH-D-%')")
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = await AppDataSource.query(
      `SELECT id_sial, codigo, sigla, carrera, modalidad, puesto, especialidad,
              estado, situacion_revista, cargo_desde, cargo_hasta, antiguedad, fecha_actualizacion,
              CASE WHEN estado = 'activo' AND antiguedad IS NOT NULL
                THEN CONCAT(
                  TIMESTAMPDIFF(YEAR, antiguedad, CURDATE()), ' a ',
                  MOD(TIMESTAMPDIFF(MONTH, antiguedad, CURDATE()), 12), ' m'
                )
                ELSE NULL
              END AS antiguedad_calc
       FROM new_cargo ${where} ORDER BY id DESC`,
      params
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] exportNewCargo', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listModalidades(req, res) {
  try {
    const rows = await AppDataSource.query(
      `SELECT id, nombre FROM modalidades WHERE activo = 1 ORDER BY id ASC`
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listModalidades', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listSiglas(req, res) {
  try {
    const rows = await AppDataSource.query(
      `SELECT id_sigla, sigla FROM siglas WHERE activo = 1 ORDER BY sigla ASC`
    );
    res.json(rows);
  } catch (err) {
    logger.error('[carrerasController] listSiglas', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function searchBajas(req, res) {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json([])
    const isNum = /^\d+$/.test(q)
    const rows = await AppDataSource.query(
      isNum
        ? `SELECT id, codigo_registro, sigla, nombre_apellido, puesto_baja, especialidad_baja, escalafon, es_cph, pou_pof, origen
           FROM bajas_consolidadas WHERE codigo_registro = ? AND genera_concurso = 'SI' ORDER BY id DESC LIMIT 20`
        : `SELECT id, codigo_registro, sigla, nombre_apellido, puesto_baja, especialidad_baja, escalafon, es_cph, pou_pof, origen
           FROM bajas_consolidadas WHERE (nombre_apellido LIKE ? OR sigla LIKE ?) AND genera_concurso = 'SI' ORDER BY id DESC LIMIT 20`,
      isNum ? [parseInt(q, 10)] : [`%${q}%`, `%${q}%`]
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] searchBajas', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listEspecialidadesPuesto(req, res) {
  try {
    const id_puesto = parseInt(req.query.id_puesto, 10)
    if (!id_puesto) return res.json([])
    const rows = await AppDataSource.query(
      `SELECT e.id, e.nombre, e.categoria
       FROM puesto_especialidades pe
       JOIN especialidades e ON e.id = pe.id_especialidad
       WHERE pe.id_puesto = ? AND e.activo = 1
       ORDER BY e.nombre ASC`,
      [id_puesto]
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listEspecialidadesPuesto', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listEspecialidades(req, res) {
  try {
    const { categoria, carrera } = req.query
    const conditions = ['e.activo = 1']
    const params = []
    if (categoria) { conditions.push('e.categoria = ?'); params.push(categoria) }
    if (carrera)   { conditions.push('c.codigo = ?');    params.push(carrera.toUpperCase()) }
    const rows = await AppDataSource.query(
      `SELECT e.id, e.nombre, e.categoria, c.codigo as carrera
       FROM especialidades e
       JOIN carreras c ON c.id_carrera = e.id_carrera
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.nombre ASC`,
      params
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listEspecialidades', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listCarreras(req, res) {
  try {
    const rows = await AppDataSource.query(
      `SELECT id_carrera, codigo, nombre, norma_referencia, excluir_alta, solo_estructura
       FROM carreras WHERE activo = 1 ORDER BY id_carrera ASC`
    );
    res.json(rows);
  } catch (err) {
    logger.error('[carrerasController] listCarreras', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function listTiposCargo(req, res) {
  try {
    const carrera = (req.query.carrera || '').trim().toUpperCase()
    const conditions = ['activo = 1', 'solo_estructura = 1']
    const params = []
    if (carrera) { conditions.push('aplica_carrera = ?'); params.push(carrera) }
    const rows = await AppDataSource.query(
      `SELECT id, codigo, nombre, aplica_carrera, requiere_modalidad
       FROM tipos_cargo WHERE ${conditions.join(' AND ')} ORDER BY id ASC`,
      params
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listTiposCargo', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listJornadas(req, res) {
  try {
    const rows = await AppDataSource.query(
      `SELECT id, nombre FROM jornadas WHERE activo = 1 ORDER BY id ASC`
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listJornadas', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function getNewCargoInfo(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })
    const [row] = await AppDataSource.query(
      `SELECT
        nc.id, nc.id_sial, nc.codigo, nc.sigla, nc.carrera, nc.modalidad,
        nc.puesto, nc.especialidad, nc.estado, nc.situacion_revista,
        nc.cargo_desde, nc.cargo_hasta, nc.fecha_alta,
        nc.fecha_actualizacion, nc.categoria_interna,
        nc.norma_referencia, nc.nro_resolucion, nc.documento_origen,
        ca.tipo_alta, ca.documento, ca.expediente, ca.cantidad, ca.fecha_registro,
        COALESCE(ca.norma_referencia, nc.norma_referencia)   AS norma_ref_final,
        COALESCE(ca.nro_resolucion,   nc.nro_resolucion)     AS resolucion_final,
        COALESCE(ca.documento_origen, nc.documento_origen)   AS doc_origen_final,
        CASE WHEN cd.antiguedad IS NOT NULL
          THEN CONCAT(
            TIMESTAMPDIFF(YEAR,  cd.antiguedad, CURDATE()), ' a ',
            MOD(TIMESTAMPDIFF(MONTH, cd.antiguedad, CURDATE()), 12), ' m'
          )
          ELSE NULL
        END AS antiguedad_calc,
        pd.cuil        AS dot_cuil,
        pd.ayn         AS dot_ayn,
        pd.especialidad AS dot_especialidad,
        cd.id_sial     AS dot_id_sial,
        cd.cuil_y_rol  AS dot_cuil_y_rol,
        cd.situacion_revista AS dot_sit_revista,
        cd.estado      AS dot_estado,
        cd.codigo_repa AS dot_codigo_repa,
        cd.periodo     AS dot_periodo,
        cd.desde       AS dot_desde,
        cd.antiguedad  AS dot_antiguedad,
        o.desc_rep     AS dot_reparticion,
        o.path_nombres AS dot_path,
        os.desc_rep    AS org_desc_rep,
        os.path_nombres AS org_path,
        os.lvl         AS org_lvl,
        os.tipo        AS org_tipo
       FROM new_cargo nc
       LEFT JOIN cargos_alta ca ON ca.id = nc.id_alta
       LEFT JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
       LEFT JOIN personas_dotacion pd ON pd.id = cd.id_persona
       LEFT JOIN organigramas o  ON o.codigo_reparticion = cd.codigo_repa
       LEFT JOIN organigramas os ON os.sigla COLLATE utf8mb4_unicode_ci = nc.sigla
       WHERE nc.id = ?`,
      [id]
    )
    if (!row) return res.status(404).json({ error: 'Cargo no encontrado' })
    res.json(row)
  } catch (err) {
    logger.error('[carrerasController] getNewCargoInfo', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function updateNewCargo(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

    // Manejar documento/expediente por separado
    const docValue = req.body.documento ?? req.body.expediente ?? undefined
    if (docValue !== undefined) {
      const documento = docValue?.trim() || null
      const [cargo] = await AppDataSource.query(
        `SELECT id_alta FROM new_cargo WHERE id = ?`, [id]
      )
      if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' })

      if (cargo.id_alta) {
        await AppDataSource.query(
          `UPDATE cargos_alta SET documento = ?, expediente = ? WHERE id = ?`,
          [documento, documento, cargo.id_alta]
        )
      } else {
        const result = await AppDataSource.query(
          `INSERT INTO cargos_alta (tipo_alta, documento, expediente, cantidad) VALUES ('ejecucion', ?, ?, 1)`,
          [documento, documento]
        )
        await AppDataSource.query(
          `UPDATE new_cargo SET id_alta = ? WHERE id = ?`, [result.insertId, id]
        )
      }
    }

    const ALLOWED = ['estado', 'situacion_revista', 'cargo_desde', 'cargo_hasta']
    const fields = []
    const vals   = []
    for (const key of ALLOWED) {
      if (key in req.body) {
        fields.push(`${key} = ?`)
        vals.push(req.body[key] === '' ? null : req.body[key])
      }
    }
    if (fields.length) {
      vals.push(id)
      await AppDataSource.query(
        `UPDATE new_cargo SET ${fields.join(', ')} WHERE id = ?`, vals
      )
    }

    // antiguedad se actualiza en cargo_dotacion (fuente de verdad)
    if ('antiguedad' in req.body) {
      const ant = req.body.antiguedad === '' ? null : req.body.antiguedad
      await AppDataSource.query(
        `UPDATE cargo_dotacion SET antiguedad = ? WHERE id_cargo = ? AND hasta IS NULL`,
        [ant, id]
      )
    }

    const [updated] = await AppDataSource.query(
      `SELECT nc.id, nc.codigo, nc.sigla, nc.carrera, nc.modalidad, nc.especialidad,
              nc.estado, nc.situacion_revista, nc.cargo_desde, nc.cargo_hasta, nc.fecha_actualizacion,
              nc.id_jornada, nc.id_puesto, ca.documento, ca.tipo_alta,
              cd.antiguedad,
              CASE WHEN cd.antiguedad IS NOT NULL
                THEN CONCAT(TIMESTAMPDIFF(YEAR, cd.antiguedad, CURDATE()), ' a ', MOD(TIMESTAMPDIFF(MONTH, cd.antiguedad, CURDATE()), 12), ' m')
                ELSE NULL END AS antiguedad_calc
       FROM new_cargo nc
       LEFT JOIN cargos_alta ca ON ca.id = nc.id_alta
       LEFT JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
       WHERE nc.id = ?`, [id]
    )
    res.json(updated)
  } catch (err) {
    logger.error('[carrerasController] updateNewCargo', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listPuestos(req, res) {
  try {
    const carrera  = (req.query.carrera  || '').trim().toLowerCase()
    const tipo     = (req.query.tipo     || '').trim().toLowerCase()
    const modo     = (req.query.modo     || 'ejecucion').trim().toLowerCase()
    const conditions = ['activo = 1']
    const params = []
    if (carrera) { conditions.push('carrera = ?'); params.push(carrera) }
    if (tipo)    { conditions.push('tipo = ?');    params.push(tipo) }
    conditions.push('es_estructura = ?')
    params.push(modo === 'estructura' ? 1 : 0)
    const rows = await AppDataSource.query(
      `SELECT id, nombre, carrera, tipo, es_medico, modalidad_tec FROM puestos_cargo WHERE ${conditions.join(' AND ')} ORDER BY tipo ASC, nombre ASC`,
      params
    )
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listPuestos', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listEtiquetas(req, res) {
  try {
    const q = (req.query.q || '').trim()
    const rows = q
      ? await AppDataSource.query(`SELECT id, codigo, descripcion FROM cargo_etiquetas WHERE codigo LIKE ? ORDER BY codigo ASC LIMIT 50`, [`%${q}%`])
      : await AppDataSource.query(`SELECT id, codigo, descripcion FROM cargo_etiquetas ORDER BY codigo ASC`)
    res.json(rows)
  } catch (err) {
    logger.error('[carrerasController] listEtiquetas', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function createEtiqueta(req, res) {
  try {
    const codigo      = (req.body.codigo      || '').trim().toUpperCase()
    const descripcion = (req.body.descripcion || '').trim() || null
    if (!codigo) return res.status(400).json({ error: 'El código es requerido' })
    if (codigo.length > 50) return res.status(400).json({ error: 'Código demasiado largo' })
    const [existing] = await AppDataSource.query(`SELECT id FROM cargo_etiquetas WHERE codigo = ?`, [codigo])
    if (existing) return res.status(409).json({ error: 'Ya existe una etiqueta con ese código' })
    const result = await AppDataSource.query(`INSERT INTO cargo_etiquetas (codigo, descripcion) VALUES (?, ?)`, [codigo, descripcion])
    res.status(201).json({ id: result.insertId, codigo, descripcion })
  } catch (err) {
    logger.error('[carrerasController] createEtiqueta', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function getDotacionEvolucion(req, res) {
  try {
    const db    = AppDataSource
    const sigla = (req.query.sigla || '').trim().toUpperCase() || null
    const desde = (req.query.desde || '').trim() || null
    const hasta = (req.query.hasta || '').trim() || null

    const conds  = []
    const params = []
    if (sigla) { conds.push('siglas = ?');              params.push(sigla) }
    if (desde) { conds.push('fecha_asignada >= ?');     params.push(desde) }
    if (hasta) { conds.push('fecha_asignada <= ?');     params.push(hasta) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    const rows = await db.query(`
      SELECT
        fecha_asignada,
        COUNT(*)                                                        AS total,
        COUNT(DISTINCT cuil)                                            AS personas_unicas,
        COUNT(DISTINCT siglas)                                          AS efectores,
        SUM(CASE WHEN UPPER(estado) = 'ACTIVO'    THEN 1 ELSE 0 END)   AS activos,
        SUM(CASE WHEN UPPER(estado) = 'BLOQUEADO' THEN 1 ELSE 0 END)   AS bloqueados,
        SUM(CASE WHEN UPPER(estado) = 'COMISION'  THEN 1 ELSE 0 END)   AS comision,
        SUM(CASE WHEN jefe_escalafon IS NOT NULL   THEN 1 ELSE 0 END)   AS jefaturas
      FROM dot_resultado_historico
      ${where}
      GROUP BY fecha_asignada
      ORDER BY fecha_asignada ASC
    `, params)

    const toN = v => parseInt(v ?? 0, 10)
    res.json(rows.map(r => ({
      fecha:          String(r.fecha_asignada).slice(0, 10),
      total:          toN(r.total),
      personas_unicas:toN(r.personas_unicas),
      efectores:      toN(r.efectores),
      activos:        toN(r.activos),
      bloqueados:     toN(r.bloqueados),
      comision:       toN(r.comision),
      jefaturas:      toN(r.jefaturas),
    })))
  } catch (err) {
    logger.error('[carrerasController] getDotacionEvolucion', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function getDotacionKpis(req, res) {
  try {
    const db     = AppDataSource
    const sigla  = (req.query.sigla  || '').trim().toUpperCase() || null
    const desde  = (req.query.desde  || '').trim() || null
    const hasta  = (req.query.hasta  || '').trim() || null

    // Construir WHERE dinámico sobre dot_resultado
    const conds  = []
    const params = []
    if (sigla)  { conds.push('siglas = ?');                params.push(sigla) }
    if (desde)  { conds.push('DATE(fecha_proceso) >= ?');  params.push(desde) }
    if (hasta)  { conds.push('DATE(fecha_proceso) <= ?');  params.push(hasta) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    // Fecha del último proceso (para mostrar en el header)
    const metaArr = await db.query(
      `SELECT MAX(fecha_proceso) AS ultimo_proceso, COUNT(DISTINCT DATE(fecha_proceso)) AS total_procesos FROM dot_resultado`
    )
    const meta = metaArr[0] ?? {}

    const [
      globalesArr,
      porAgrupador,
      porEscalafon,
      porUniverso,
      porEstado,
      porSitRevista,
      porJefatura,
      porEfector,
      procesosDisponibles,
      siglasDisponibles,
    ] = await Promise.all([

      // Globales
      db.query(`
        SELECT
          COUNT(*)                                                          AS total,
          COUNT(DISTINCT cuil)                                              AS personas_unicas,
          COUNT(DISTINCT siglas)                                            AS efectores,
          SUM(CASE WHEN UPPER(estado) = 'ACTIVO'    THEN 1 ELSE 0 END)     AS activos,
          SUM(CASE WHEN UPPER(estado) = 'BLOQUEADO' THEN 1 ELSE 0 END)     AS bloqueados,
          SUM(CASE WHEN UPPER(estado) = 'COMISION'  THEN 1 ELSE 0 END)     AS comision,
          SUM(CASE WHEN jefe_escalafon IS NOT NULL   THEN 1 ELSE 0 END)     AS jefaturas,
          SUM(CASE WHEN UPPER(situacion_de_revista) LIKE '%RETENCI%' THEN 1 ELSE 0 END) AS retencion
        FROM dot_resultado ${where}
      `, params),

      // Por agrupador
      db.query(`
        SELECT COALESCE(agrupador,'Sin agrupador') AS agrupador, COUNT(*) AS total
        FROM dot_resultado ${where}
        GROUP BY agrupador ORDER BY total DESC
      `, params),

      // Por escalafón
      db.query(`
        SELECT COALESCE(escalafon,'Sin escalafón') AS escalafon, COUNT(*) AS total
        FROM dot_resultado ${where}
        GROUP BY escalafon ORDER BY total DESC
      `, params),

      // Por universo totalizador
      db.query(`
        SELECT COALESCE(universo_totalizador,'Sin universo') AS universo, COUNT(*) AS total
        FROM dot_resultado ${where}
        GROUP BY universo_totalizador ORDER BY total DESC
      `, params),

      // Por estado
      db.query(`
        SELECT COALESCE(estado,'Sin estado') AS estado, COUNT(*) AS total
        FROM dot_resultado ${where}
        GROUP BY estado ORDER BY total DESC
      `, params),

      // Por situación de revista
      db.query(`
        SELECT COALESCE(situacion_de_revista,'Sin dato') AS situacion, COUNT(*) AS total
        FROM dot_resultado ${where}
        GROUP BY situacion_de_revista ORDER BY total DESC
      `, params),

      // Por tipo de jefatura
      db.query(`
        SELECT jefe_escalafon, COUNT(*) AS total
        FROM dot_resultado
        WHERE jefe_escalafon IS NOT NULL ${sigla ? 'AND siglas = ?' : ''}
              ${desde ? 'AND DATE(fecha_proceso) >= ?' : ''}
              ${hasta ? 'AND DATE(fecha_proceso) <= ?' : ''}
        GROUP BY jefe_escalafon ORDER BY total DESC
      `, params),

      // Por efector (top 61)
      db.query(`
        SELECT siglas,
          COUNT(*) AS total,
          SUM(CASE WHEN UPPER(estado)='ACTIVO'    THEN 1 ELSE 0 END) AS activos,
          SUM(CASE WHEN UPPER(estado)='BLOQUEADO' THEN 1 ELSE 0 END) AS bloqueados,
          SUM(CASE WHEN UPPER(estado)='COMISION'  THEN 1 ELSE 0 END) AS comision,
          SUM(CASE WHEN jefe_escalafon IS NOT NULL THEN 1 ELSE 0 END) AS jefaturas
        FROM dot_resultado ${where}
        GROUP BY siglas ORDER BY total DESC
      `, params),

      // Procesos disponibles para el selector de fecha
      db.query(`
        SELECT DATE(fecha_proceso) AS fecha, COUNT(*) AS registros
        FROM dot_resultado
        GROUP BY DATE(fecha_proceso) ORDER BY fecha DESC
      `),

      // Siglas disponibles
      db.query(`SELECT DISTINCT siglas FROM dot_resultado WHERE siglas IS NOT NULL ORDER BY siglas ASC`),
    ])

    const toN  = v => parseInt(v ?? 0, 10)
    const norm = rows => rows.map(r => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^\d+$/.test(v) ? toN(v) : v])
    ))

    const globales = globalesArr[0] ?? {}

    res.json({
      meta: {
        ultimo_proceso: meta.ultimo_proceso,
        total_procesos: toN(meta.total_procesos),
        fuente: 'dot_resultado',
      },
      globales:            Object.fromEntries(Object.entries(globales).map(([k, v]) => [k, toN(v)])),
      porAgrupador:        norm(porAgrupador),
      porEscalafon:        norm(porEscalafon),
      porUniverso:         norm(porUniverso),
      porEstado:           norm(porEstado),
      porSitRevista:       norm(porSitRevista),
      porJefatura:         norm(porJefatura),
      porEfector:          norm(porEfector),
      procesosDisponibles: procesosDisponibles.map(r => ({ fecha: r.fecha instanceof Date ? r.fecha.toISOString().slice(0,10) : String(r.fecha).slice(0,10), registros: toN(r.registros) })),
      siglasDisponibles:   siglasDisponibles.map(r => r.siglas),
    })
  } catch (err) {
    logger.error('[carrerasController] getDotacionKpis', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

async function listRecientes(req, res) {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)))
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10))
    const q = (req.query.q || '').trim()

    const conds = []
    const params = []
    if (q) {
      conds.push('(ca.documento LIKE ? OR nc.sigla LIKE ? OR nc.carrera LIKE ?)')
      const like = `%${q}%`
      params.push(like, like, like)
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    // Agrupar por id_alta (expediente/decreto), traer los códigos generados
    const rows = await AppDataSource.query(
      `SELECT
        ca.id            AS id_alta,
        ca.documento,
        ca.tipo_alta,
        ca.cantidad,
        ca.norma_referencia,
        ca.fecha_registro,
        GROUP_CONCAT(nc.codigo ORDER BY nc.id ASC SEPARATOR ',') AS codigos,
        GROUP_CONCAT(DISTINCT nc.sigla ORDER BY nc.sigla ASC SEPARATOR ',') AS siglas,
        GROUP_CONCAT(DISTINCT nc.carrera ORDER BY nc.carrera ASC SEPARATOR ',') AS carreras,
        GROUP_CONCAT(DISTINCT COALESCE(nc.modalidad,'') ORDER BY nc.modalidad ASC SEPARATOR ',') AS modalidades,
        GROUP_CONCAT(DISTINCT COALESCE(nc.puesto,'') ORDER BY nc.puesto ASC SEPARATOR '|') AS puestos,
        GROUP_CONCAT(DISTINCT COALESCE(nc.especialidad,'') ORDER BY nc.especialidad ASC SEPARATOR '|') AS especialidades,
        MIN(nc.cargo_desde) AS cargo_desde,
        COUNT(nc.id) AS total_cargos
       FROM cargos_alta ca
       INNER JOIN new_cargo nc ON nc.id_alta = ca.id
       ${where}
       GROUP BY ca.id
       ORDER BY ca.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    const [{ total }] = await AppDataSource.query(
      `SELECT COUNT(DISTINCT ca.id) AS total FROM cargos_alta ca INNER JOIN new_cargo nc ON nc.id_alta = ca.id ${where}`,
      params
    )

    res.json({
      data: rows.map(r => ({
        ...r,
        codigos: r.codigos ? r.codigos.split(',') : [],
        siglas: r.siglas ? [...new Set(r.siglas.split(','))] : [],
        carreras: r.carreras ? [...new Set(r.carreras.split(','))] : [],
        modalidades: r.modalidades ? [...new Set(r.modalidades.split(',').filter(Boolean))] : [],
        puestos: r.puestos ? [...new Set(r.puestos.split('|').filter(Boolean))] : [],
        especialidades: r.especialidades ? [...new Set(r.especialidades.split('|').filter(Boolean))] : [],
        total_cargos: parseInt(r.total_cargos, 10),
      })),
      meta: { total: parseInt(total, 10), limit, offset },
    })
  } catch (err) {
    logger.error('[carrerasController] listRecientes', { error: err.message })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { listCarreras, listSiglas, searchBajas, listEspecialidades, listEspecialidadesPuesto, listModalidades, listNewCargo, exportNewCargo, getNewCargoInfo, updateNewCargo, listEtiquetas, createEtiqueta, listPuestos, listJornadas, listTiposCargo, getDotacionKpis, getDotacionEvolucion, listRecientes };
