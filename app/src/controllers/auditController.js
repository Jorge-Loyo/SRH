const { AppDataSource } = require('../config/data-source');
const logger = require('../utils/logger');

function parseDate(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeLegacyPath(value) {
  if (!value || typeof value !== 'string') return value;
  return value
    .replace('/api/modulo2/bajas', '/api/concursales/bajas')
    .replace('/api/modulo2/seguimiento-cph', '/api/concursales/seguimiento-cph')
    .replace('/modulo2/bajas', '/concursales/bajas')
    .replace('/modulo2/seguimiento-cph', '/concursales/seguimiento-cph');
}

function legacyPathVariant(value) {
  if (!value || typeof value !== 'string') return value;
  return value
    .replace('/api/concursales/bajas', '/api/modulo2/bajas')
    .replace('/api/concursales/seguimiento-cph', '/api/modulo2/seguimiento-cph')
    .replace('/concursales/bajas', '/modulo2/bajas')
    .replace('/concursales/seguimiento-cph', '/modulo2/seguimiento-cph')
    .replace('concursales', 'modulo2');
}

function normalizeAuditRow(row) {
  return {
    ...row,
    resource: normalizeLegacyPath(row.resource),
    path: normalizeLegacyPath(row.path),
  };
}

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const skip = (page - 1) * pageSize;
    const { AuditLog } = require('../entities-class/AuditLog');
    const repo = AppDataSource.getRepository(AuditLog);

    const qb = repo.createQueryBuilder('a').orderBy('a.id', 'DESC').skip(skip).take(pageSize);
    // Por defecto solo se muestran acciones de usuarios reales (user_username no nulo)
    qb.andWhere('a.user_username IS NOT NULL');
    const { source, action, user, method, status, path, from, to } = req.query || {};
    if (source) qb.andWhere('a.source = :source', { source: String(source) });
    if (action) qb.andWhere('a.action = :action', { action: String(action) });
    if (user) qb.andWhere('a.user_username = :user', { user: String(user) });
    if (method) qb.andWhere('a.method = :method', { method: String(method).toUpperCase() });
    if (status) qb.andWhere('a.status = :status', { status: parseInt(status, 10) || 0 });
    if (path) {
      const pathTerm = String(path);
      const legacyTerm = legacyPathVariant(pathTerm);
      if (legacyTerm && legacyTerm !== pathTerm) {
        qb.andWhere('(a.path LIKE :path OR a.path LIKE :legacyPath)', {
          path: `%${pathTerm}%`,
          legacyPath: `%${legacyTerm}%`,
        });
      } else {
        qb.andWhere('a.path LIKE :path', { path: `%${pathTerm}%` });
      }
    }
    const fromD = parseDate(from);
    if (fromD) qb.andWhere('a.created_at >= :fromD', { fromD });
    const toD = parseDate(to);
    if (toD) qb.andWhere('a.created_at <= :toD', { toD });

    const [rows, total] = await qb.getManyAndCount();
    res.json({ page, pageSize, total, rows: rows.map(normalizeAuditRow) });
  } catch (e) {
    logger.error('[AuditController.list]', { error: e.message });
    res.status(500).json({ error: 'Error listando auditoría' });
  }
}

async function purge(req, res) {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || parseInt(process.env.AUDIT_RETENTION_DAYS || '180', 10));
    const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { AuditLog } = require('../entities-class/AuditLog');
    const repo = AppDataSource.getRepository(AuditLog);
    const result = await repo.createQueryBuilder()
      .delete()
      .from(AuditLog)
      .where('created_at < :before', { before })
      .execute();
    res.json({ deleted: result.affected || 0, before: before.toISOString() });
  } catch (e) {
    logger.error('[AuditController.purge]', { error: e.message });
    res.status(500).json({ error: 'Error purgando auditoría' });
  }
}

module.exports = { list, purge };
