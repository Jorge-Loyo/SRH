/**
 * scripts/setup-module-permissions.js
 * Crea la tabla module_permissions y la puebla con PAGE_PERMISSIONS.
 * Es idempotente: usa INSERT IGNORE para no duplicar.
 * Uso: node scripts/setup-module-permissions.js
 */
const { initDatabase, closeDatabase } = require('./lib/init-db');
const { PAGE_PERMISSIONS } = require('../src/config/pagePermissions');

async function main() {
  const ds = await initDatabase();
  try {
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`module_permissions\` (
        \`role\`       VARCHAR(32) NOT NULL,
        \`module_key\` VARCHAR(64) NOT NULL,
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`role\`, \`module_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Tabla module_permissions lista');

    let inserted = 0;
    for (const [role, modules] of Object.entries(PAGE_PERMISSIONS)) {
      if (role === 'admin') continue; // admin no necesita filas, tiene acceso total
      for (const module_key of modules) {
        await ds.query(
          'INSERT IGNORE INTO `module_permissions` (`role`, `module_key`) VALUES (?, ?)',
          [role, module_key]
        );
        inserted++;
      }
    }
    console.log(`✓ ${inserted} permisos sembrados (INSERT IGNORE)`);
  } finally {
    await closeDatabase(ds);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
