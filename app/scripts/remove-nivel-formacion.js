// Script: remove-nivel-formacion.js
// Elimina la columna nivel_formacion de new_cargo (no existe en cargos_alta)

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function dropColumnIfExists(ds, table, column) {
  const [row] = await ds.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  if (row.cnt === 0) {
    console.log(`- ${table}.${column} no existe, omitido`)
    return
  }
  await ds.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``)
  console.log(`[OK] ${table}.${column} eliminada`)
}

async function main() {
  const ds = await initDatabase()
  try {
    await dropColumnIfExists(ds, 'new_cargo', 'nivel_formacion')
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
