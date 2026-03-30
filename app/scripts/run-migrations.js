// Simple runner for TypeORM migrations with ts-node
const { initDatabase, closeDatabase } = require('./lib/init-db');
const { config, getDbTestQuery } = require('../src/config/env');

async function main() {
  const dataSource = await initDatabase();
  
  const cmd = (process.argv[2] || 'run').toLowerCase();
  // Debug: show effective DB config (mask password)
  const mask = (v) => (v ? '***' : '(empty)');
  console.log('[migrate] NODE_ENV=', process.env.NODE_ENV || 'development');
  console.log('[migrate] DB_DIALECT=', config.db.dialect);
  console.log('[migrate] DB_HOST=', config.db.host);
  console.log('[migrate] DB_PORT=', String(config.db.port));
  console.log('[migrate] DB_NAME=', config.db.name);
  console.log('[migrate] DB_USER=', config.db.user);
  console.log('[migrate] DB_PASSWORD=', mask(config.db.password));

  if (cmd === 'diag') {
    const testQuery = getDbTestQuery(config.db.dialect);
    const r = await dataSource.query(testQuery);
    console.log('[migrate] test query ok:', r);
    const pending = await dataSource.showMigrations();
    console.log('[migrate] pending:', pending);
  } else if (cmd === 'run') {
    const res = await dataSource.runMigrations({ transaction: 'all' });
    console.log('[migrate] applied:', res.map(r => r.name));
  } else if (cmd === 'revert') {
    const res = await dataSource.undoLastMigration({ transaction: 'all' });
    console.log('[migrate] reverted');
  } else if (cmd === 'show') {
    const pending = await dataSource.showMigrations();
    console.log('[migrate] pending:', pending);
  } else {
    console.log('Usage: node scripts/run-migrations.js [run|revert|show|diag]');
  }

  await closeDatabase(dataSource);
}

main().catch((e) => {
  console.error('[migrate] error:', e);
  process.exit(1);
});
