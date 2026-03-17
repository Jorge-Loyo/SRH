// Seed initial users into the DB (works with MySQL or sql.js in dev)
// Usage: node scripts/seed-users.js

const { initDatabase, closeDatabase } = require('./lib/init-db');
const { hashPassword } = require('../src/utils/passwordHelpers');
const { User } = require('../src/entities-class');

async function main() {
  const dataSource = await initDatabase();
  
  // Try to create schema for User if missing
  try { await dataSource.synchronize(); } catch {}

  const repo = dataSource.getRepository(User);

  const users = [
    { username: 'Lucas', password: 'Gerente', role: 'admin' },
    { username: 'Agustin', password: 'Ezequiel', role: 'editor' },
    { username: 'Leandro', password: 'Datos', role: 'viewer' },
    { username: 'Nacho', password: 'Apuestas', role: 'viewer' },
    { username: 'Fernan', password: 'Ministro', role: 'director', hospital_code: 'HGACA' },
  ];

  for (const u of users) {
    const existing = await repo.findOne({ where: { username: u.username } });
    if (existing) {
      console.log(`Skip existing user: ${u.username}`);
      continue;
    }
    const password_hash = hashPassword(u.password);
    await repo.save({ username: u.username, email: null, password_hash, role: u.role, is_active: true, hospital_code: u.hospital_code || null });
    console.log(`Created user: ${u.username} (${u.role})`);
  }

  await closeDatabase(dataSource);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
