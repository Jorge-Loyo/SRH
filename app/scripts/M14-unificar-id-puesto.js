/**
 * M14 — Unificar id_puesto_tec → id_puesto en new_cargo
 *
 * Contexto: new_cargo tiene id_puesto_tec (smallint FK → puestos_cargo para TEC).
 * El diseño objetivo tiene un único id_puesto FK → puestos_cargo para todas las carreras.
 * CPH/ENF/EG no tienen id_puesto aún (usan campo texto 'puesto').
 *
 * Este script:
 * 1. Agrega columna id_puesto int FK → puestos_cargo
 * 2. Migra id_puesto_tec → id_puesto para todos los TEC
 * 3. Elimina id_puesto_tec
 *
 * Nota: CPH/ENF/EG quedan con id_puesto NULL por ahora (se completan en M10).
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
    // 1. Verificar estado previo
    const [[stats]] = await conn.query(
      `SELECT COUNT(*) total, SUM(id_puesto_tec IS NOT NULL) con_tec FROM new_cargo WHERE carrera = 'TEC'`
    )
    console.log(`TEC: ${stats.total} registros, ${stats.con_tec} con id_puesto_tec`)

    // 2. Agregar columna id_puesto
    await conn.query(`ALTER TABLE new_cargo ADD COLUMN id_puesto INT NULL AFTER id_puesto_tec`)
    console.log('✓ Columna id_puesto agregada')

    // 3. Agregar FK
    await conn.query(`ALTER TABLE new_cargo ADD CONSTRAINT fk_new_cargo_puesto FOREIGN KEY (id_puesto) REFERENCES puestos_cargo(id)`)
    console.log('✓ FK fk_new_cargo_puesto creada')

    // 4. Migrar id_puesto_tec → id_puesto
    const [r] = await conn.query(
      `UPDATE new_cargo SET id_puesto = id_puesto_tec WHERE id_puesto_tec IS NOT NULL`
    )
    console.log(`✓ ${r.affectedRows} registros TEC migrados a id_puesto`)

    // 5. Verificar integridad: todos los TEC deben tener id_puesto
    const [[{ sin_puesto }]] = await conn.query(
      `SELECT COUNT(*) sin_puesto FROM new_cargo WHERE carrera = 'TEC' AND id_puesto IS NULL`
    )
    if (sin_puesto > 0) {
      console.warn(`⚠ ${sin_puesto} registros TEC sin id_puesto — no se elimina id_puesto_tec`)
      return
    }

    // 6. Eliminar FK de id_puesto_tec si existe
    const [[fkRow]] = await conn.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'new_cargo' AND COLUMN_NAME = 'id_puesto_tec'
      AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1
    `)
    if (fkRow) {
      await conn.query(`ALTER TABLE new_cargo DROP FOREIGN KEY ${fkRow.CONSTRAINT_NAME}`)
      console.log(`✓ FK ${fkRow.CONSTRAINT_NAME} eliminada`)
    }

    // 7. Eliminar columna id_puesto_tec
    await conn.query(`ALTER TABLE new_cargo DROP COLUMN id_puesto_tec`)
    console.log('✓ Columna id_puesto_tec eliminada')

    // Resumen final
    const [[final]] = await conn.query(
      `SELECT SUM(id_puesto IS NOT NULL) con_puesto, SUM(id_puesto IS NULL) sin_puesto FROM new_cargo`
    )
    console.log(`\nEstado final: ${final.con_puesto} con id_puesto, ${final.sin_puesto} sin id_puesto (CPH/ENF/EG pendientes M10)`)
    console.log('\nM14 completado OK')
  } finally {
    await conn.end()
  }
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
