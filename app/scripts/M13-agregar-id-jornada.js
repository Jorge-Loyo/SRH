/**
 * M13 — Agregar id_jornada FK → jornadas en new_cargo
 *
 * 1. Agrega columna id_jornada int FK → jornadas
 * 2. Migra los 4 registros con jornada = 'Jornada completa' → id_jornada = 1
 * 3. Elimina columna jornada (texto libre)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const mysql = require('mysql2/promise')

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    // 1. Agregar columna id_jornada (mismo tipo que jornadas.id: tinyint unsigned)
    // Si ya existe de una ejecución parcial anterior, la modificamos al tipo correcto
    const [cols] = await conn.query(`SHOW COLUMNS FROM new_cargo LIKE 'id_jornada'`)
    if (cols.length === 0) {
      await conn.query(`ALTER TABLE new_cargo ADD COLUMN id_jornada TINYINT UNSIGNED NULL AFTER jornada`)
      console.log('✓ Columna id_jornada agregada')
    } else {
      await conn.query(`ALTER TABLE new_cargo MODIFY COLUMN id_jornada TINYINT UNSIGNED NULL`)
      console.log('✓ Columna id_jornada corregida a TINYINT UNSIGNED')
    }

    // 2. Agregar FK
    await conn.query(`ALTER TABLE new_cargo ADD CONSTRAINT fk_new_cargo_jornada FOREIGN KEY (id_jornada) REFERENCES jornadas(id)`)
    console.log('✓ FK fk_new_cargo_jornada creada')

    // 3. Migrar datos: mapear texto → id
    const [jornadas] = await conn.query(`SELECT id, nombre FROM jornadas`)
    let migrados = 0
    for (const j of jornadas) {
      const [r] = await conn.query(
        `UPDATE new_cargo SET id_jornada = ? WHERE jornada = ?`,
        [j.id, j.nombre]
      )
      migrados += r.affectedRows
      if (r.affectedRows > 0) console.log(`  → '${j.nombre}' (id=${j.id}): ${r.affectedRows} registros`)
    }
    console.log(`✓ ${migrados} registros migrados`)

    // 4. Verificar que no queden jornadas sin mapear
    const [[{ sin_mapear }]] = await conn.query(
      `SELECT COUNT(*) sin_mapear FROM new_cargo WHERE jornada IS NOT NULL AND id_jornada IS NULL`
    )
    if (sin_mapear > 0) {
      console.warn(`⚠ ${sin_mapear} registros con jornada texto sin mapear — revisar antes de eliminar columna`)
      const [muestra] = await conn.query(`SELECT id, codigo, jornada FROM new_cargo WHERE jornada IS NOT NULL AND id_jornada IS NULL LIMIT 5`)
      muestra.forEach(r => console.log('  ', JSON.stringify(r)))
      return
    }

    // 5. Eliminar columna jornada
    await conn.query(`ALTER TABLE new_cargo DROP COLUMN jornada`)
    console.log('✓ Columna jornada eliminada')

    console.log('\nM13 completado OK')
  } finally {
    await conn.end()
  }
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
