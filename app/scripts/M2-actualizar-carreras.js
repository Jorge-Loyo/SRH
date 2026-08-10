// Script: M2-actualizar-carreras.js
// - Renombra GEN → EG en tabla carreras
// - Agrega campos: norma_referencia, excluir_alta, solo_estructura
// - Carga valores iniciales

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function addColumnIfMissing(ds, table, column, definition) {
  const [row] = await ds.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  if (row.cnt > 0) { console.log(`- ${table}.${column} ya existe, omitido`); return }
  await ds.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
  console.log(`OK ${table}.${column} agregada`)
}

async function main() {
  const ds = await initDatabase()
  try {
    // 1. Agregar columnas a carreras
    await addColumnIfMissing(ds, 'carreras', 'norma_referencia', 'VARCHAR(100) NULL DEFAULT NULL')
    await addColumnIfMissing(ds, 'carreras', 'excluir_alta',     'TINYINT(1) NOT NULL DEFAULT 0')
    await addColumnIfMissing(ds, 'carreras', 'solo_estructura',  'TINYINT(1) NOT NULL DEFAULT 0')

    // 2. Renombrar GEN → EG
    const [gen] = await ds.query(`SELECT id_carrera FROM carreras WHERE codigo = 'GEN' LIMIT 1`)
    if (gen) {
      await ds.query(`UPDATE carreras SET codigo = 'EG', nombre = 'Escalafón General' WHERE codigo = 'GEN'`)
      console.log('OK carreras: GEN → EG')
    } else {
      console.log('- GEN no encontrado, verificar si ya fue migrado')
    }

    // 3. Cargar norma_referencia por carrera
    const normas = [
      { codigo: 'CPH', norma: 'Ley 6.035' },
      { codigo: 'TEC', norma: 'Ley 6.035' },
      { codigo: 'ENF', norma: 'Ley 6.767' },
      { codigo: 'EG',  norma: 'Ley 471'   },
    ]
    for (const { codigo, norma } of normas) {
      const { affectedRows } = await ds.query(
        `UPDATE carreras SET norma_referencia = ? WHERE codigo = ?`, [norma, codigo]
      )
      if (affectedRows) console.log(`OK carreras ${codigo}: norma_referencia = '${norma}'`)
      else console.log(`- carreras ${codigo}: no encontrada`)
    }

    // 4. Marcar carreras excluidas del formulario de alta
    const excluidas = ['SG', 'DOC', 'RES', 'SUP']
    for (const codigo of excluidas) {
      await ds.query(`UPDATE carreras SET excluir_alta = 1 WHERE codigo = ?`, [codigo])
    }
    console.log(`OK excluir_alta = 1 para: ${excluidas.join(', ')}`)

    // 5. Marcar carreras solo para modo estructura
    await ds.query(`UPDATE carreras SET solo_estructura = 0`) // reset
    // CPH y EG aparecen en ambos modos; ninguna es SOLO estructura por ahora
    console.log('OK solo_estructura configurado')

  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
