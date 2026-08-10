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
    const { User } = require('../entities-class/User');

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { username: req.params.username } });
    if (!user) return res.json({ revoked: 0 });

    const repo = AppDataSource.getRepository(RefreshToken);
    const result = await repo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked: true, revoked_reason: 'admin_revoke', revoked_at: new Date() })
      .where('revoked = :r', { r: false })
      .andWhere('user_id = :uid', { uid: user.id })
      .execute();
    return res.json({ revoked: result.affected || 0 });
  } catch (e) {
    logger.error('[SeguridadAPI] /tokens/user/:username/revoke', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

// ─── ROLES ──────────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { key: 'admin',       label: 'Admin',       description: 'Acceso total al sistema',        color: 'red'    },
  { key: 'editor',      label: 'Editor',      description: 'Puede editar datos y tablas',     color: 'blue'   },
  { key: 'viewer',      label: 'Viewer',      description: 'Solo lectura',                    color: 'gray'   },
  { key: 'director',    label: 'Director',    description: 'Vista de su hospital',            color: 'purple' },
  { key: 'gerencia',    label: 'Gerencia',    description: 'Acceso a recorridas y dotación',  color: 'amber'  },
  { key: 'concursales', label: 'Concursales', description: 'Gestión de procesos concursales', color: 'teal'   },
  { key: 'autoridades', label: 'Autoridades', description: 'Acceso a organigrama y dotación', color: 'indigo' },
];

const SYSTEM_KEYS = new Set(SYSTEM_ROLES.map(r => r.key));

/**
 * GET /api/seguridad/roles
 * Devuelve roles de sistema + roles custom de BD
 */
router.get('/roles', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const { CustomRole } = require('../entities-class/CustomRole');
    const custom = await AppDataSource.getRepository(CustomRole).find({ order: { created_at: 'ASC' } });
    return res.json({ roles: [...SYSTEM_ROLES, ...custom] });
  } catch (e) {
    logger.error('[SeguridadAPI] GET /roles', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/seguridad/roles
 * Body: { key, label, description, color }
 */
router.post('/roles', async (req, res) => {
  const { key, label, description = '', color = 'gray' } = req.body;
  if (!key || !label) return res.status(400).json({ error: 'key y label requeridos' });
  if (!/^[a-z0-9_]+$/.test(key)) return res.status(400).json({ error: 'key inválido' });
  if (SYSTEM_KEYS.has(key)) return res.status(409).json({ error: 'Ya existe un rol de sistema con esa clave' });
  try {
    const { AppDataSource } = require('../config/data-source');
    const { CustomRole } = require('../entities-class/CustomRole');
    const repo = AppDataSource.getRepository(CustomRole);
    const exists = await repo.findOne({ where: { key } });
    if (exists) return res.status(409).json({ error: 'Ya existe un rol con esa clave' });
    await repo.save(repo.create({ key, label, description: description || null, color }));
    logger.info(`[SeguridadAPI] Rol creado: ${key}`);
    return res.status(201).json({ success: true });
  } catch (e) {
    logger.error('[SeguridadAPI] POST /roles', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/seguridad/roles/:key
 * Body: { label, description, color }
 * Roles de sistema: actualiza en memoria. Roles custom: persiste en BD.
 */
router.put('/roles/:key', async (req, res) => {
  const { key } = req.params;
  const { label, description, color } = req.body;
  const sysIdx = SYSTEM_ROLES.findIndex(r => r.key === key);
  if (sysIdx !== -1) {
    if (label)                     SYSTEM_ROLES[sysIdx].label       = label;
    if (description !== undefined) SYSTEM_ROLES[sysIdx].description = description;
    if (color)                     SYSTEM_ROLES[sysIdx].color       = color;
    return res.json({ success: true });
  }
  try {
    const { AppDataSource } = require('../config/data-source');
    const { CustomRole } = require('../entities-class/CustomRole');
    const repo = AppDataSource.getRepository(CustomRole);
    const rol = await repo.findOne({ where: { key } });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    if (label)                     rol.label       = label;
    if (description !== undefined) rol.description = description || null;
    if (color)                     rol.color       = color;
    await repo.save(rol);
    logger.info(`[SeguridadAPI] Rol actualizado: ${key}`);
    return res.json({ success: true });
  } catch (e) {
    logger.error('[SeguridadAPI] PUT /roles/:key', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/seguridad/roles/:key
 * Solo roles custom (no de sistema)
 */
router.delete('/roles/:key', async (req, res) => {
  const { key } = req.params;
  if (SYSTEM_KEYS.has(key)) return res.status(400).json({ error: 'No se pueden eliminar roles del sistema' });
  try {
    const { AppDataSource } = require('../config/data-source');
    const { CustomRole } = require('../entities-class/CustomRole');
    const result = await AppDataSource.getRepository(CustomRole).delete({ key });
    if (!result.affected) return res.status(404).json({ error: 'Rol no encontrado' });
    logger.info(`[SeguridadAPI] Rol eliminado: ${key}`);
    return res.json({ success: true });
  } catch (e) {
    logger.error('[SeguridadAPI] DELETE /roles/:key', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

// ─── PERMISOS DE MÓDULOS (BD) ──────────────────────────────────────────────────────────────────

const mpService = require('../services/modulePermissionsService');

/**
 * GET /api/seguridad/permisos/modulos
 */
router.get('/permisos/modulos', async (req, res) => {
  try {
    const permisos = await mpService.loadAll();
    return res.json({ permisos });
  } catch (e) {
    logger.error('[SeguridadAPI] GET /permisos/modulos', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/seguridad/permisos/modulos
 * Body: { role: string, modulos: string[] }
 */
router.put('/permisos/modulos', async (req, res) => {
  const { role, modulos } = req.body;
  if (!role || !Array.isArray(modulos))
    return res.status(400).json({ error: 'role y modulos requeridos' });
  if (role === 'admin')
    return res.status(400).json({ error: 'No se puede modificar el rol admin' });
  try {
    await mpService.setForRole(role, modulos);
    logger.info(`[SeguridadAPI] Módulos actualizados para rol ${role} (${modulos.length})`);
    return res.json({ success: true });
  } catch (e) {
    logger.error('[SeguridadAPI] PUT /permisos/modulos', { error: e.message });
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
