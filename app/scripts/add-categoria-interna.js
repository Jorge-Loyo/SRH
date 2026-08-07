const { initDatabase, closeDatabase } = require('./lib/init-db')

async function addColumnIfMissing(ds, table, column, definition) {
  const [rows] = await ds.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  if (rows.cnt > 0) {
    console.log(`- ${table}.${column} ya existe, omitido`)
    return
  }
  await ds.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
  console.log(`✓ ${table}.${column} agregada`)
}

async function main() {
  const ds = await initDatabase()
  try {
    await addColumnIfMissing(ds, 'cargos_alta', 'categoria_interna', 'VARCHAR(50) NULL DEFAULT NULL')
    await addColumnIfMissing(ds, 'new_cargo',   'categoria_interna', 'VARCHAR(50) NULL DEFAULT NULL')
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
