/**
 * services/modulePermissionsService.js
 * Lectura y escritura de permisos de módulos en BD.
 * Módulo independiente para evitar dependencias circulares.
 */
const { PAGE_PERMISSIONS } = require('../config/pagePermissions');

/**
 * Devuelve objeto { role: [module_key, ...] } desde BD.
 */
async function loadAll() {
  const { AppDataSource } = require('../config/data-source');
  const rows = await AppDataSource.query(
    'SELECT `role`, `module_key` FROM `module_permissions`'
  );
  const result = {};
  for (const { role, module_key } of rows) {
    if (!result[role]) result[role] = [];
    result[role].push(module_key);
  }
  return result;
}

/**
 * Devuelve los módulos permitidos para un rol específico.
 * Admin siempre devuelve null (sin restricciones).
 * Si la BD falla, cae al fallback de PAGE_PERMISSIONS.
 */
async function getForRole(role) {
  if (role === 'admin') return null;
  try {
    const { AppDataSource } = require('../config/data-source');
    const rows = await AppDataSource.query(
      'SELECT `module_key` FROM `module_permissions` WHERE `role` = ?',
      [role]
    );
    // Si no hay filas en BD para este rol, usar PAGE_PERMISSIONS como fallback
    if (rows.length === 0) return PAGE_PERMISSIONS[role] ?? [];
    return rows.map(r => r.module_key);
  } catch {
    return PAGE_PERMISSIONS[role] ?? [];
  }
}

/**
 * Reemplaza todos los módulos de un rol en BD (DELETE + INSERT en transacción).
 */
async function setForRole(role, moduleKeys) {
  const { AppDataSource } = require('../config/data-source');
  await AppDataSource.transaction(async (em) => {
    await em.query('DELETE FROM `module_permissions` WHERE `role` = ?', [role]);
    for (const module_key of moduleKeys) {
      await em.query(
        'INSERT INTO `module_permissions` (`role`, `module_key`) VALUES (?, ?)',
        [role, module_key]
      );
    }
  });
}

module.exports = { loadAll, getForRole, setForRole };
