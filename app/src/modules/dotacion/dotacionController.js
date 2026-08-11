const DotacionSyncService = require('./DotacionSyncService');
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

module.exports = { sincronizar, getEstado, getLista };
