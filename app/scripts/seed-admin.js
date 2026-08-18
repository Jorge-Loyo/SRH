/**
 * Script one-off: crea usuario admin/admin si no existe.
 * Uso en Render Shell: node app/scripts/seed-admin.js
 */
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
try { require('ts-node/register'); } catch {}
require('reflect-metadata');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: false });

const { AppDataSource } = require('../src/config/data-source');
const { hashPassword } = require('../src/utils/passwordHelpers');
const { User } = require('../src/entities-class/User');

async function main() {
  AppDataSource.options.entities = [User];
  await AppDataSource.initialize();
  console.log('[DB] Conectado');

  const repo = AppDataSource.getRepository(User);
  const exists = await repo.findOne({ where: { username: 'admin' } });

  if (exists) {
    console.log('[Seed] Usuario admin ya existe, id:', exists.id);
  } else {
    await repo.save({
      username: 'admin',
      email: null,
      password_hash: hashPassword('admin'),
      role: 'admin',
      is_active: true,
      hospital_code: null,
      role_alias: null,
    });
    console.log('[Seed] Usuario admin creado OK');
  }

  await AppDataSource.destroy();
}

main().catch(err => {
  console.error('[Seed] Error:', err.message);
  process.exit(1);
});
