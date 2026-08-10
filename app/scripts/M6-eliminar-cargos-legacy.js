// Script: M6-eliminar-cargos-legacy.js
// Elimina la tabla `cargos` que ya no se usa

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function main() {
  const ds = await initDatabase()
  try {
    const [row] = await ds.query(
      `SELECT COUNT(*) as cnt FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargos'`
    )
    if (row.cnt === 0) { console.log('- tabla cargos no existe, omitido'); return }

    const [{ total }] = await ds.query(`SELECT COUNT(*) as total FROM cargos`)
    console.log(`Registros en cargos: ${total}`)
    console.log('ADVERTENCIA: tabla cargos tiene FK desde bajas_concursos y contiene datos.')
    console.log('NO se elimina. Requiere análisis previo de migración de bajas_concursos.')
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
