// Script: M1-migrar-codigos-gen-eg.js
// Migra todos los códigos GEN-... → EG-... en new_cargo

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function main() {
  const ds = await initDatabase()
  try {
    const [{ total }] = await ds.query(
      `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE 'GEN-%'`
    )
    console.log(`Registros GEN-... encontrados: ${total}`)

    if (total === 0) { console.log('Nada que migrar.'); return }

    const { affectedRows } = await ds.query(
      `UPDATE new_cargo SET
        codigo  = CONCAT('EG-', SUBSTRING(codigo, 5)),
        carrera = 'EG'
       WHERE codigo LIKE 'GEN-%'`
    )
    console.log(`OK ${affectedRows} registros migrados GEN-... → EG-...`)

    // Verificar que no quedaron GEN
    const [{ restantes }] = await ds.query(
      `SELECT COUNT(*) as restantes FROM new_cargo WHERE codigo LIKE 'GEN-%'`
    )
    console.log(`Registros GEN-... restantes: ${restantes}`)
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
