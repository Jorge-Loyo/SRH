const { initDatabase, closeDatabase } = require('./lib/init-db');
const { AuditLog } = require('../src/entities-class/AuditLog');

async function main() {
  const dataSource = await initDatabase();
  
  const daysArg = process.argv[2];
  const days = Math.max(1, parseInt(daysArg || process.env.AUDIT_RETENTION_DAYS || '180', 10));
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const repo = dataSource.getRepository(AuditLog);
  const result = await repo.createQueryBuilder().delete().from(AuditLog).where('created_at < :before', { before }).execute();
  console.log(`[audit:purge] Deleted ${result.affected || 0} rows older than ${days} days`);
  await closeDatabase(dataSource);
}

main().catch((e) => {
  console.error('[audit:purge] error:', e);
  process.exit(1);
});
