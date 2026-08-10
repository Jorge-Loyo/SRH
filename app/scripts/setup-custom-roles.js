/**
 * scripts/setup-custom-roles.js
 * Crea la tabla custom_roles si no existe.
 * Uso: node scripts/setup-custom-roles.js
 */
const { initDatabase, closeDatabase } = require('./lib/init-db');

async function main() {
  const ds = await initDatabase();
  try {
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`custom_roles\` (
        \`key\`        VARCHAR(32)  NOT NULL,
        \`label\`      VARCHAR(64)  NOT NULL,
        \`description\` VARCHAR(255) NULL DEFAULT NULL,
        \`color\`      VARCHAR(16)  NOT NULL DEFAULT 'gray',
        \`created_at\` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Tabla custom_roles lista');
  } finally {
    await closeDatabase(ds);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
