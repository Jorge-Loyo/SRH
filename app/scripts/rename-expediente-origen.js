// Script: rename-expediente-origen.js
// Renombra expediente_origen -> documento_origen en cargos_alta y new_cargo

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function renameIfExists(ds, table, oldCol, newCol, definition) {
  const [rows] = await ds.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, oldCol]
  )
  if (rows.cnt === 0) { console.log(`- ${table}.${oldCol} no existe, omitido`); return }
  await ds.query(`ALTER TABLE \`${table}\` CHANGE \`${oldCol}\` \`${newCol}\` ${definition}`)
  console.log(`OK ${table}.${oldCol} -> ${newCol}`)
}

async function main() {
  const ds = await initDatabase()
  try {
    await renameIfExists(ds, 'cargos_alta', 'expediente_origen', 'documento_origen', 'VARCHAR(100) NULL DEFAULT NULL')
    await renameIfExists(ds, 'new_cargo',   'expediente_origen', 'documento_origen', 'VARCHAR(100) NULL DEFAULT NULL')
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
