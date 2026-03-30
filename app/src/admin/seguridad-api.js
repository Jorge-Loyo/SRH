// API Controllers para vista_seguridad
const logger = require('../utils/logger');

/**
 * GET /admin/api/auditoria
 * Obtiene logs de auditoría con paginación y filtros
 */
async function getAuditLogs(req, res, AppDataSource) {
  try {
    // express-formidable coloca los datos JSON en req.fields, no req.body
    const data = req.fields || req.body || {};
    const { page = 1, perPage = 50, filters = {} } = data;
    
    const { AuditLog } = require('../entities-class/AuditLog');
    
    const repo = AppDataSource.getRepository(AuditLog);
    const queryBuilder = repo.createQueryBuilder('log');
    
    // Aplicar filtros
    if (filters.user_username) {
      queryBuilder.andWhere('log.user_username LIKE :username', { username: `%${filters.user_username}%` });
    }
    if (filters.action) {
      queryBuilder.andWhere('log.action = :action', { action: filters.action });
    }
    if (filters.resource) {
      queryBuilder.andWhere('log.resource LIKE :resource', { resource: `%${filters.resource}%` });
    }
    if (filters.dateFrom) {
      queryBuilder.andWhere('log.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      queryBuilder.andWhere('log.created_at <= :dateTo', { dateTo: filters.dateTo });
    }
    
    // Paginación
    const total = await queryBuilder.getCount();
    const logs = await queryBuilder
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();
    res.json({ logs, total, page, perPage });
  } catch (e) {
    logger.error('[Auditoria API] Error', { error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /admin/api/usuarios
 * Obtiene todos los usuarios
 */
async function getUsers(req, res, AppDataSource) {
  try {
    const { User } = require('../entities-class/User');
    const repo = AppDataSource.getRepository(User);
    
    const users = await repo.find({
      select: ['id', 'username', 'email', 'role', 'is_active', 'hospital_code'],
      order: { id: 'ASC' }
    });
    
    res.json({ users });
  } catch (e) {
    logger.error('[Usuarios API] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /admin/api/usuarios
 * Crea un nuevo usuario
 */
async function createUser(req, res, AppDataSource) {
  try {
    const { User } = require('../entities-class/User');
    const { hashPassword } = require('../utils/passwordHelpers');
    const repo = AppDataSource.getRepository(User);
    
    const { username, email, role, password, hospital_code } = req.fields || req.body || {};
    
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    // Verificar si ya existe
    const exists = await repo.findOne({ where: [{ username }, { email }] });
    if (exists) {
      return res.status(400).json({ error: 'Usuario o email ya existe' });
    }
    
    const password_hash = hashPassword(password);
    
    const user = repo.create({
      username,
      email: email || null,
      role,
      password_hash,
      is_active: true,
      hospital_code: hospital_code || null
    });
    
    await repo.save(user);
    
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (e) {
    logger.error('[Usuarios API] Error creando:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PUT /admin/api/usuarios
 * Actualiza un usuario existente
 */
async function updateUser(req, res, AppDataSource) {
  try {
    const { User } = require('../entities-class/User');
    const { hashPassword } = require('../utils/passwordHelpers');
    const repo = AppDataSource.getRepository(User);
    
    const { id, username, email, role, password, hospital_code } = req.fields || req.body || {};
    
    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }
    
    const user = await repo.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualizar campos
    if (username) user.username = username;
    if (email !== undefined) user.email = email;
    if (role) user.role = role;
    if (password) user.password_hash = hashPassword(password);
    if (hospital_code !== undefined) user.hospital_code = hospital_code;
    
    await repo.save(user);
    
    res.json({ success: true });
  } catch (e) {
    logger.error('[Usuarios API] Error actualizando:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PATCH /admin/api/usuarios/:id/toggle
 * Activa/desactiva un usuario
 */
async function toggleUserActive(req, res, AppDataSource) {
  try {
    const { User } = require('../entities-class/User');
    const repo = AppDataSource.getRepository(User);
    const userId = parseInt(req.params.id);
    
    const user = await repo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    user.is_active = !user.is_active;
    await repo.save(user);
    
    res.json({ success: true, is_active: user.is_active });
  } catch (e) {
    logger.error('[Usuarios API] Error toggle:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /admin/api/tokens
 * Obtiene todos los tokens
 * Query param: ?includeRevoked=true para incluir tokens revocados
 */
async function getTokens(req, res, AppDataSource) {
  try {
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const repo = AppDataSource.getRepository(RefreshToken);
    const includeRevoked = req.query.includeRevoked === 'true';
    
    const query = repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .orderBy('t.created_at', 'DESC');
    
    // Filtrar según lo que se pida
    if (includeRevoked) {
      // Mostrar SOLO los tokens revocados
      query.where('t.revoked = true');
    } else {
      // Mostrar SOLO los tokens activos
      query.where('t.revoked = false');
    }
    
    const tokens = await query.getMany();
    
    res.json({ tokens, showingRevoked: includeRevoked });
  } catch (e) {
    logger.error('[Tokens API] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PATCH /admin/api/tokens/:id/revoke
 * Marca un token como revocado (no lo elimina, se va en 7 días automáticamente)
 */
async function revokeToken(req, res, AppDataSource) {
  try {
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const repo = AppDataSource.getRepository(RefreshToken);
    const tokenId = parseInt(req.params.id);
    
    const token = await repo.findOne({ where: { id: tokenId } });
    if (!token) {
      return res.status(404).json({ error: 'Token no encontrado' });
    }
    
    token.revoked = true;
    token.revoked_at = new Date();
    await repo.save(token);
    
    res.json({ success: true });
  } catch (e) {
    logger.error('[Tokens API] Error revoke:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PATCH /admin/api/tokens/family/:familyId/revoke
 * Marca toda una familia como revocada (no la elimina, se va en 7 días automáticamente)
 */
async function revokeFamilyTokens(req, res, AppDataSource) {
  try {
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const repo = AppDataSource.getRepository(RefreshToken);
    const familyId = req.params.familyId;
    
    const result = await repo.update(
      { family_id: familyId },
      { revoked: true, revoked_at: new Date() }
    );
    
    res.json({ success: true, revoked: result.affected || 0 });
  } catch (e) {
    logger.error('[Tokens API] Error revoke family:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PATCH /admin/api/tokens/user/:username/revoke
 * Marca todos los tokens de un usuario como revocados
 */
async function revokeUserTokens(req, res, AppDataSource) {
  try {
    const { RefreshToken } = require('../entities-class/RefreshToken');
    const { User } = require('../entities-class/User');
    const repo = AppDataSource.getRepository(RefreshToken);
    const userRepo = AppDataSource.getRepository(User);
    const username = req.params.username;
    
    // Obtener el usuario
    const user = await userRepo.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Revocar todos sus tokens
    const result = await repo.update(
      { user: { id: user.id } },
      { revoked: true, revoked_at: new Date() }
    );
    
    res.json({ success: true, revoked: result.affected || 0 });
  } catch (e) {
    logger.error('[Tokens API] Error revoke user:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /admin/api/permisos
 * Obtiene todos los permisos
 */
async function getPermissions(req, res, AppDataSource) {
  try {
    const { Permission } = require('../entities-class/Permission');
    const repo = AppDataSource.getRepository(Permission);
    
    const permissions = await repo.find({
      order: { role: 'ASC' }
    });
    
    res.json({ permissions });
  } catch (e) {
    logger.error('[Permisos API] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PUT /admin/api/permisos
 * Actualiza permisos de un rol
 */
async function updatePermission(req, res, AppDataSource) {
  try {
    const { Permission } = require('../entities-class/Permission');
    const repo = AppDataSource.getRepository(Permission);
    
    const { id, description, can_create, can_update, can_delete, can_alter_structure, can_manage_users, filter_by_hospital, hospital_code } = req.fields || req.body || {};
    
    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }
    
    const perm = await repo.findOne({ where: { id } });
    if (!perm) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    
    // Actualizar campos
    if (description !== undefined) perm.description = description;
    if (can_create !== undefined) perm.can_create = can_create;
    if (can_update !== undefined) perm.can_update = can_update;
    if (can_delete !== undefined) perm.can_delete = can_delete;
    if (can_alter_structure !== undefined) perm.can_alter_structure = can_alter_structure;
    if (can_manage_users !== undefined) perm.can_manage_users = can_manage_users;
    if (filter_by_hospital !== undefined) perm.filter_by_hospital = filter_by_hospital;
    if (hospital_code !== undefined) perm.hospital_code = hospital_code;
    
    await repo.save(perm);
    
    res.json({ success: true });
  } catch (e) {
    logger.error('[Permisos API] Error actualizando:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * Registra todas las rutas API de Seguridad
 */
function registerSeguridadAPI({ adminRouter, AppDataSource }) {
  // Middleware para verificar que solo admin puede acceder
  const ensureAdmin = (req, res, next) => {
    // El usuario ya viene autenticado por createJWTAuthMiddleware
    const role = req.user?.role;
    
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo administradores' });
    }
    next();
  };
  
  // Auditoría
  adminRouter.post('/api/auditoria', ensureAdmin, (req, res) => getAuditLogs(req, res, AppDataSource));
  
  // Usuarios
  adminRouter.get('/api/usuarios', ensureAdmin, (req, res) => getUsers(req, res, AppDataSource));
  adminRouter.post('/api/usuarios', ensureAdmin, (req, res) => createUser(req, res, AppDataSource));
  adminRouter.put('/api/usuarios', ensureAdmin, (req, res) => updateUser(req, res, AppDataSource));
  adminRouter.patch('/api/usuarios/:id/toggle', ensureAdmin, (req, res) => toggleUserActive(req, res, AppDataSource));
  
  // Tokens
  adminRouter.get('/api/tokens', ensureAdmin, (req, res) => getTokens(req, res, AppDataSource));
  adminRouter.patch('/api/tokens/:id/revoke', ensureAdmin, (req, res) => revokeToken(req, res, AppDataSource));
  adminRouter.patch('/api/tokens/family/:familyId/revoke', ensureAdmin, (req, res) => revokeFamilyTokens(req, res, AppDataSource));
  adminRouter.patch('/api/tokens/user/:username/revoke', ensureAdmin, (req, res) => revokeUserTokens(req, res, AppDataSource));
  
  // Permisos
  adminRouter.get('/api/permisos', ensureAdmin, (req, res) => getPermissions(req, res, AppDataSource));
  adminRouter.put('/api/permisos', ensureAdmin, (req, res) => updatePermission(req, res, AppDataSource));
  
  logger.info('[Seguridad API] Rutas registradas correctamente');
}

module.exports = { registerSeguridadAPI };
