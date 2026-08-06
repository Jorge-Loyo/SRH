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
    if (tipoCph) {
      if (tipoCph === 'jefe')     conditions.push("codigo LIKE 'CPH-J-%'")
      else if (tipoCph === 'director') conditions.push("codigo LIKE 'CPH-D-%'")
      else if (tipoCph === 'comun')    conditions.push("(carrera = 'CPH' AND codigo NOT LIKE 'CPH-J-%' AND codigo NOT LIKE 'CPH-D-%')")
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [{ total }] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM new_cargo ${where}`, params
    )
    const rows = await AppDataSource.query(
      `SELECT id, codigo, sigla, carrera, modalidad, nivel_formacion, puesto, especialidad, fecha_alta
       FROM new_cargo ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
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
    if (tipoCph) {
      if (tipoCph === 'jefe')          conditions.push("codigo LIKE 'CPH-J-%'")
      else if (tipoCph === 'director') conditions.push("codigo LIKE 'CPH-D-%'")
      else if (tipoCph === 'comun')    conditions.push("(carrera = 'CPH' AND codigo NOT LIKE 'CPH-J-%' AND codigo NOT LIKE 'CPH-D-%')")
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = await AppDataSource.query(
      `SELECT id_sial, codigo, sigla, carrera, modalidad, nivel_formacion, puesto, especialidad, estado, fecha_alta
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
      `SELECT id_sigla, sigla FROM siglas ORDER BY sigla ASC`
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
      `SELECT id_carrera, codigo, nombre FROM carreras WHERE activo = 1 ORDER BY id_carrera ASC`
    );
    res.json(rows);
  } catch (err) {
    logger.error('[carrerasController] listCarreras', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { listCarreras, listSiglas, searchBajas, listEspecialidades, listModalidades, listNewCargo, exportNewCargo };
