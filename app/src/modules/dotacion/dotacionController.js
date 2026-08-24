const DotacionSyncService = require('./DotacionSyncService');
const CargoDotacionSyncService = require('./CargoDotacionSyncService');
const { AppDataSource } = require('../../config/data-source');
const logger = require('../../utils/logger');

const FILTERABLE_COLS = ['siglas', 'escalafon', 'literal_puesto', 'especialidad',
  'agrupador', 'unificador_de_puestos', 'situacion_de_revista', 'estado',
  'universo_totalizador', 'tipo_hospital_sigla'];

async function getLista(req, res) {
  try {
    const page    = Math.max(1, parseInt(req.query.page)    || 1);
    const perPage = Math.min(200, parseInt(req.query.perPage) || 50);
    const offset  = (page - 1) * perPage;
    const search  = (req.query.search || '').trim();
    const sortBy  = req.query.sortBy  || 'ayn';
    const sortDir = req.query.sortDir === 'DESC' ? 'DESC' : 'ASC';

    const ALLOWED_SORT = ['id_sial','cuil','ayn','siglas','escalafon','literal_puesto',
      'especialidad','agrupador','situacion_de_revista','estado','fecha_proceso'];
    const orderCol = ALLOWED_SORT.includes(sortBy) ? sortBy : 'ayn';

    // Filtros multi-valor
    const where = [];
    const params = [];
    FILTERABLE_COLS.forEach(col => {
      const val = req.query[col];
      if (val) {
        const vals = val.split(',').map(v => v.trim()).filter(Boolean);
        if (vals.length) {
          where.push(`\`${col}\` IN (${vals.map(() => '?').join(',')})`)
          params.push(...vals);
        }
      }
    });
    if (search) {
      where.push('(ayn LIKE ? OR cuil LIKE ? OR id_sial LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [{ total }] = await AppDataSource.query(
      `SELECT COUNT(*) AS total FROM dot_resultado ${whereSQL}`, params
    );

    const rows = await AppDataSource.query(
      `SELECT id_sial, cuil, cuil_y_rol, ayn, siglas, escalafon, literal_cr,
              literal_puesto, especialidad, agrupador, unificador_de_puestos,
              situacion_de_revista, estado, universo_totalizador,
              tipo_hospital_sigla, fecha_proceso
       FROM dot_resultado ${whereSQL}
       ORDER BY \`${orderCol}\` ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    // Distinct values para filtros (solo si primera página sin filtros activos)
    let distinctValues = null;
    if (page === 1 && !search && !where.length) {
      distinctValues = {};
      await Promise.all(FILTERABLE_COLS.map(async col => {
        const vals = await AppDataSource.query(
          `SELECT DISTINCT \`${col}\` AS v FROM dot_resultado WHERE \`${col}\` IS NOT NULL ORDER BY \`${col}\``
        );
        distinctValues[col] = vals.map(r => r.v).filter(Boolean);
      }));
    }

    return res.json({ rows, total: Number(total), page, perPage, distinctValues });
  } catch (e) {
    logger.error('[Dotacion] Error en getLista', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
}

async function sincronizar(req, res) {
  try {
    const svc = new DotacionSyncService(AppDataSource);
    const resultado = await svc.sincronizar();
    logger.info('[Dotacion] Sincronización completada', resultado);
    return res.json(resultado);
  } catch (e) {
    logger.error('[Dotacion] Error en sincronización', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
}

async function getEstado(req, res) {
  try {
    const svc = new DotacionSyncService(AppDataSource);
    const estado = await svc.getEstado();
    return res.json(estado);
  } catch (e) {
    logger.error('[Dotacion] Error en getEstado', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
}

async function sincronizarCargos(req, res) {
  try {
    const svc = new CargoDotacionSyncService(AppDataSource);
    const resultado = await svc.sincronizar();
    logger.info('[Dotacion] Sincronización cargo_dotacion completada', resultado);
    return res.json(resultado);
  } catch (e) {
    logger.error('[Dotacion] Error en sincronizarCargos', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
}

async function getEstadoCargos(req, res) {
  try {
    const svc = new CargoDotacionSyncService(AppDataSource);
    const estado = await svc.getEstado();
    return res.json(estado);
  } catch (e) {
    logger.error('[Dotacion] Error en getEstadoCargos', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
}

async function getKpis(req, res) {
  try {
    const db = AppDataSource;
    const sigla  = (req.query.sigla || '').trim().toUpperCase() || null;

    // Obtener el período más reciente disponible
    const [[{ periodo }]] = await db.query(
      `SELECT r.periodo FROM roles r GROUP BY r.periodo ORDER BY r.periodo DESC LIMIT 1`
    );

    const FROM = `
      FROM roles r
      LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
      LEFT JOIN siglas   s ON r.id_sigla   = s.id_sigla
    `;
    const WHERE = sigla
      ? `WHERE r.periodo = ? AND s.sigla = ?`
      : `WHERE r.periodo = ?`;
    const sp = sigla ? [periodo, sigla] : [periodo];

    const [[globales], porEscalafon, porSitRevista, porSexo, porEfector] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                                AS total,
          SUM(r.situacion_revista = 'Activo')                    AS activos,
          SUM(r.situacion_revista LIKE 'Retenci%n de Cargo')     AS retencion,
          SUM(r.situacion_revista LIKE 'Comisi%n')               AS comision,
          SUM(p.sexo = 'F')                                      AS mujeres,
          SUM(p.sexo = 'M')                                      AS varones,
          COUNT(DISTINCT s.sigla)                                AS efectores
        ${FROM} ${WHERE}
      `, sp),

      db.query(`
        SELECT r.escalafon, COUNT(*) AS total
        ${FROM} ${WHERE}
        GROUP BY r.escalafon ORDER BY total DESC
      `, sp),

      db.query(`
        SELECT r.situacion_revista AS situacion, COUNT(*) AS total
        ${FROM} ${WHERE}
        GROUP BY r.situacion_revista ORDER BY total DESC
      `, sp),

      db.query(`
        SELECT COALESCE(p.sexo, 'Sin dato') AS sexo, COUNT(*) AS total
        ${FROM} ${WHERE}
        GROUP BY p.sexo ORDER BY total DESC
      `, sp),

      db.query(`
        SELECT s.sigla, COUNT(*) AS total
        ${FROM} ${WHERE}
        GROUP BY s.sigla ORDER BY total DESC LIMIT 20
      `, sp),
    ]);

    const toN = v => parseInt(v ?? 0, 10);
    const norm = rows => rows.map(r =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^\d+$/.test(v) ? toN(v) : v]))
    );

    res.json({
      globales:      Object.fromEntries(Object.entries(globales).map(([k, v]) => [k, toN(v)])),
      porEscalafon:  norm(porEscalafon),
      porSitRevista: norm(porSitRevista),
      porSexo:       norm(porSexo),
      porEfector:    norm(porEfector),
    });
  } catch (e) {
    logger.error('[Dotacion] Error en getKpis', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { sincronizar, getEstado, getLista, sincronizarCargos, getEstadoCargos, getKpis };
