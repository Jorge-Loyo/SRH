/**
 * fix-puestos-cargo-duplicados.js
 * Elimina duplicados en puestos_cargo (CPH), migrando relaciones de puesto_especialidades
 * al ID canónico (el menor) antes de borrar el duplicado.
 */
require('dotenv').config({ path: '.env.local' })
const { AppDataSource } = require('../src/config/data-source')

async function run() {
  await AppDataSource.initialize()

  // 1. Encontrar duplicados: conservar el ID menor, borrar el mayor
  const dupes = await AppDataSource.query(`
    SELECT nombre, carrera, GROUP_CONCAT(id ORDER BY id) AS ids
    FROM puestos_cargo
    GROUP BY nombre, carrera
    HAVING COUNT(*) > 1
  `)

  console.log(`Encontrados ${dupes.length} puestos duplicados`)

  for (const row of dupes) {
    const [keepId, ...deleteIds] = row.ids.split(',').map(Number)
    console.log(`\n[${row.nombre}] conservar id=${keepId}, borrar ids=${deleteIds}`)

    for (const delId of deleteIds) {
      // 2. Ver qué especialidades tiene el duplicado que NO tiene el canónico
      const espDupe = await AppDataSource.query(
        `SELECT id_especialidad FROM puesto_especialidades WHERE id_puesto = ?`, [delId]
      )
      const espKeep = await AppDataSource.query(
        `SELECT id_especialidad FROM puesto_especialidades WHERE id_puesto = ?`, [keepId]
      )
      const keepSet = new Set(espKeep.map(r => r.id_especialidad))

      for (const { id_especialidad } of espDupe) {
        if (!keepSet.has(id_especialidad)) {
          // Migrar la relación al ID canónico
          await AppDataSource.query(
            `INSERT INTO puesto_especialidades (id_puesto, id_especialidad) VALUES (?, ?)`,
            [keepId, id_especialidad]
          )
          console.log(`  migrada especialidad ${id_especialidad} → id_puesto ${keepId}`)
        }
      }

      // 3. Borrar relaciones del duplicado
      await AppDataSource.query(`DELETE FROM puesto_especialidades WHERE id_puesto = ?`, [delId])
      console.log(`  eliminadas relaciones de id_puesto=${delId}`)

      // 4. Borrar el puesto duplicado
      await AppDataSource.query(`DELETE FROM puestos_cargo WHERE id = ?`, [delId])
      console.log(`  eliminado puestos_cargo id=${delId}`)
    }
  }

  console.log('\n✓ Limpieza completada')
  process.exit(0)
}

run().catch(e => { console.error(e.message); process.exit(1) })
