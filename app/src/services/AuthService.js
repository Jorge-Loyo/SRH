/**
 * src/services/AuthService.js
 * Lógica de autenticación centralizada
 * Separa concerns: controller maneja HTTP, service maneja lógica de negocio
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { AppDataSource } = require('../config/data-source');
const { User } = require('../entities-class/User');
const { RefreshToken } = require('../entities-class/RefreshToken');
const { AuditLog } = require('../entities-class/AuditLog');
const { comparePassword } = require('../utils/passwordHelpers');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ===== HELPER FUNCTIONS =====

function parseUsersFromEnv() {
  const users = [];
  users.push({ email: config.admin.email, password: config.admin.password, role: 'admin' });
  try {
    const arr = JSON.parse(config.auth.usersJson || '[]');
    if (Array.isArray(arr)) {
      for (const u of arr) {
        if (u && u.email && u.password && u.role) {
          users.push({ email: u.email, password: u.password, role: String(u.role).toLowerCase() });
        }
      }
    }
  } catch {}
  const map = new Map();
  for (const u of users) map.set(u.email.toLowerCase(), u);
  return Array.from(map.values());
}

function findUserFromEnv(email) {
  const users = parseUsersFromEnv();
  const em = email.toLowerCase();
  return users.find((u) => u.email.toLowerCase() === em) || null;
}

function makeAccessToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: '15m' });
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function makeId(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

// ===== DATABASE FUNCTIONS =====

async function createRefreshToken(user, familyId) {
  const repo = AppDataSource.getRepository(RefreshToken);
  const raw = crypto.randomBytes(64).toString('hex');
  const token_hash = hashToken(raw);
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const jti = makeId(16);
  const family_id = familyId || makeId(12);
  const rt = await repo.save({
    token_hash,
    jti,
    family_id,
    user,
    expires_at,
    revoked: false,
    last_used: new Date(),
    replaced_by_jti: null,
    revoked_reason: null,
  });
  return { raw, entity: rt };
}

async function findValidRefreshToken(raw) {
  const repo = AppDataSource.getRepository(RefreshToken);
  const token_hash = hashToken(raw);
  const now = new Date();
  const rt = await repo.findOne({ where: { token_hash, revoked: false }, relations: ['user'] });
  if (!rt) return null;
  if (rt.expires_at <= now) return null;
  const idleMs = (config.auth.idleMinutes || 30) * 60 * 1000;
  if (rt.last_used && now.getTime() - new Date(rt.last_used).getTime() > idleMs) {
    rt.revoked = true;
    rt.revoked_reason = 'idle';
    await repo.save(rt);
    return null;
  }
  return rt;
}

async function revokeRefreshToken(rt, reason) {
  const repo = AppDataSource.getRepository(RefreshToken);
  rt.revoked = true;
  rt.revoked_reason = reason || rt.revoked_reason || 'revoked';
  await repo.save(rt);
}

async function revokeFamily(familyId) {
  const repo = AppDataSource.getRepository(RefreshToken);
  await repo
    .createQueryBuilder()
    .update(RefreshToken)
    .set({ revoked: true, revoked_reason: 'family-revoked' })
    .where('family_id = :fid', { fid: familyId })
    .execute();
}

// ===== PUBLIC SERVICE METHODS =====

/**
 * Autentica un usuario (DB o ENV mode) y retorna tokens
 */
async function authenticateUser(email, username, password) {
  if (config.auth.mode === 'db') {
    const repo = AppDataSource.getRepository(User);
    const where = email ? { email: email.toLowerCase() } : { username: username.toLowerCase() };
    const u = await repo.findOne({ where });
    if (!u || !u.is_active) {
      throw { statusCode: 401, message: 'Credenciales inválidas' };
    }
    const ok = comparePassword(password, u.password_hash);
    if (!ok) {
      throw { statusCode: 401, message: 'Credenciales inválidas' };
    }
    const payload = { sub: u.username, role: u.role };
    const accessToken = makeAccessToken(payload);
    const { raw: refreshToken } = await createRefreshToken(u);
    return {
      accessToken,
      refreshToken,
      user: { id: u.id, username: u.username, email: u.email, role: u.role },
    };
  } else {
    // ENV mode
    const idVal = email || username;
    const user = findUserFromEnv(idVal);
    if (!user) {
      throw { statusCode: 401, message: 'Credenciales inválidas' };
    }
    let ok = false;
    if (user.password && user.password.startsWith('$2')) {
      ok = comparePassword(password, user.password);
    } else {
      ok = password === user.password;
    }
    if (!ok) {
      throw { statusCode: 401, message: 'Credenciales inválidas' };
    }
    const role = user.role || 'viewer';
    const payload = { sub: user.email, role };
    const accessToken = makeAccessToken(payload);
    return {
      accessToken,
      refreshToken: null,
      user: { email: user.email, role },
    };
  }
}

/**
 * Obtiene datos del usuario autenticado
 */
async function getCurrentUser(user) {
  if (!user) {
    throw { statusCode: 401, message: 'No autenticado' };
  }
  if (config.auth.mode === 'db') {
    try {
      const repo = AppDataSource.getRepository(User);
      const u = await repo.findOne({
        where: [{ username: user.username || user.sub }, { email: user.email || null }],
      });
      if (u) {
        return { id: u.id, username: u.username, email: u.email, role: u.role };
      }
    } catch {}
  }
  return user;
}

/**
 * Refresca un token de acceso usando refresh token
 */
async function refreshAccessToken(rawRefreshToken) {
  if (config.auth.mode !== 'db') {
    throw { statusCode: 400, message: 'Refresh no soportado en este modo' };
  }
  if (!rawRefreshToken) {
    throw { statusCode: 400, message: 'Falta refreshToken' };
  }

  const rt = await findValidRefreshToken(rawRefreshToken);
  if (!rt) {
    const repo = AppDataSource.getRepository(RefreshToken);
    const token_hash = hashToken(rawRefreshToken);
    const existing = await repo.findOne({ where: { token_hash }, relations: ['user'] });
    if (existing && existing.revoked && (existing.revoked_reason === 'rotated' || existing.replaced_by_jti)) {
      await revokeFamily(existing.family_id);
      try {
        await AppDataSource.getRepository(AuditLog).save({
          user_username: existing.user?.username || null,
          user_role: existing.user?.role || null,
          source: 'auth',
          action: 'refresh-reuse-detected',
          resource: '/api/auth/refresh',
          record_id: existing.jti,
          method: 'POST',
          path: '/api/auth/refresh',
          status: 401,
          changes: null,
          ip: null,
          user_agent: null,
        });
      } catch {}
    }
    throw { statusCode: 401, message: 'Refresh token inválido' };
  }

  const userRepo = AppDataSource.getRepository(User);
  const u = await userRepo.findOne({ where: { id: rt.user.id } });
  if (!u || !u.is_active) {
    throw { statusCode: 401, message: 'Usuario inválido' };
  }

  const payload = { sub: u.username, role: u.role };
  const accessToken = makeAccessToken(payload);
  const { raw: newRefreshToken, entity: newRt } = await createRefreshToken(u, rt.family_id);
  rt.replaced_by_jti = newRt.jti;
  await revokeRefreshToken(rt, 'rotated');

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Revoca un refresh token (logout)
 */
async function revokeUserSession(rawRefreshToken) {
  if (config.auth.mode !== 'db') {
    return; // No-op en ENV mode
  }
  if (!rawRefreshToken) {
    throw { statusCode: 400, message: 'Falta refreshToken' };
  }
  const rt = await findValidRefreshToken(rawRefreshToken);
  if (rt) {
    await revokeRefreshToken(rt);
  }
}

module.exports = {
  authenticateUser,
  getCurrentUser,
  refreshAccessToken,
  revokeUserSession,
  // Helpers (si se necesitan desde afuera)
  makeAccessToken,
  createRefreshToken,
  findValidRefreshToken,
};
