/**
 * app/src/routes/seguridadApiRoutes.js
 *
 * Expone tokens activos y permisos bajo /api/seguridad/
 *
 * Auditoría → /api/audit (auditRoutes.js)
 * Usuarios  → /api/users (usersRoutes.js)
 * Tokens    → /api/seguridad/tokens
 * Permisos  → /api/seguridad/permisos
 */
const express = require('express');
const { authenticateJWT, requirePermission } = require('../middlewares/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateJWT, requirePermission('can_manage_users'));

// ─── TOKENS ─────────────────────────────────────────────────────────────────

/**
 * GET /api/seguridad/tokens
 * Lista tokens activos (no revocados)
 */
router.get('/tokens', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const repo = AppDataSource.getRepository(RefreshToken);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 30));
    const showRevoked = req.query.active === 'false';

    const qb = repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (showRevoked) {
      qb.where('t.revoked = :r', { r: true });
    } else {
      qb.where('t.revoked = :r', { r: false });
    }

    if (req.query.username) {
      qb.andWhere('u.username LIKE :un', { un: `%${String(req.query.username)}%` });
    }

    const [rawRows, total] = await qb.getManyAndCount();
    // Serializar: exponer username desde la relación, ocultar token_hash
    const rows = rawRows.map(t => ({
      id: t.id,
      username: t.user?.username || null,
      created_at: t.created_at,
      last_used: t.last_used,
      expires_at: t.expires_at,
      revoked: t.revoked,
      revoked_reason: t.revoked_reason,
      revoked_at: t.revoked_at,
      jti: t.jti,
    }));
    return res.json({ page, pageSize, total, rows });
  } catch (e) {
    logger.error('[SeguridadAPI] /tokens', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/seguridad/tokens/:id/revoke
 * Revoca un token por ID
 */
router.patch('/tokens/:id/revoke', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const repo = AppDataSource.getRepository(RefreshToken);
    const result = await repo.update({ id: parseInt(req.params.id, 10) }, { revoked: true });
    return res.json({ revoked: result.affected || 0 });
  } catch (e) {
    logger.error('[SeguridadAPI] /tokens/:id/revoke', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/seguridad/tokens/user/:username/revoke
 * Revoca todos los tokens de un usuario
 */
router.patch('/tokens/user/:username/revoke', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const repo = AppDataSource.getRepository(RefreshToken);
    const result = await repo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked: true, revoked_reason: 'admin_revoke', revoked_at: new Date() })
      .where('revoked = :r', { r: false })
      .andWhere(qb => {
        const sub = qb.subQuery()
          .select('u.id')
          .from('users', 'u')
          .where('u.username = :un')
          .getQuery();
        return 'user_id IN ' + sub;
      })
      .setParameter('un', req.params.username)
      .execute();
    return res.json({ revoked: result.affected || 0 });
  } catch (e) {
    logger.error('[SeguridadAPI] /tokens/user/:username/revoke', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

// ─── PERMISOS ─────────────────────────────────────────────────────────────────

/**
 * GET /api/seguridad/permisos
 * Obtiene todos los permisos por rol
 */
router.get('/permisos', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const { Permission } = require('../entities-class/Permission');
    const repo = AppDataSource.getRepository(Permission);
    const permissions = await repo.find({ order: { role: 'ASC' } });
    return res.json({ permissions });
  } catch (e) {
    logger.error('[SeguridadAPI] /permisos', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/seguridad/permisos/:id
 * Actualiza un permiso
 */
router.put('/permisos/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const { Permission } = require('../entities-class/Permission');
    const repo = AppDataSource.getRepository(Permission);

    const perm = await repo.findOne({ where: { id: parseInt(req.params.id, 10) } });
    if (!perm) return res.status(404).json({ error: 'Permiso no encontrado' });

    const fields = ['description', 'can_read_all', 'can_create', 'can_update', 'can_delete',
      'can_alter_structure', 'can_manage_users', 'can_view_audit', 'filter_by_hospital', 'hospital_code'];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) perm[f] = req.body[f];
    });

    await repo.save(perm);
    return res.json({ success: true });
  } catch (e) {
    logger.error('[SeguridadAPI] PUT /permisos/:id', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
