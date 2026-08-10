// Script: add-es-estructura-puestos.js
// Agrega columna es_estructura a puestos_cargo y marca jefaturas como estructura=1

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function main() {
  const ds = await initDatabase()
  try {
    const [col] = await ds.query(
      `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'puestos_cargo' AND COLUMN_NAME = 'es_estructura'`
    )
    if (col.cnt > 0) {
      console.log('- puestos_cargo.es_estructura ya existe, omitido')
    } else {
      await ds.query(`ALTER TABLE puestos_cargo ADD COLUMN es_estructura TINYINT(1) NOT NULL DEFAULT 0`)
      console.log('OK columna es_estructura agregada')
    }

    const { affectedRows } = await ds.query(
      `UPDATE puestos_cargo SET es_estructura = 1 WHERE tipo = 'jefatura'`
    )
    console.log(`OK ${affectedRows} puestos marcados como es_estructura = 1`)
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
