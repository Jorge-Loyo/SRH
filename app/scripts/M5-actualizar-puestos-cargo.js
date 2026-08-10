// Script: M5-actualizar-puestos-cargo.js
// - Agrega campo modalidad_tec a puestos_cargo
// - Migra puestos_tec → puestos_cargo con carrera='tec' y modalidad_tec correcta
// - Agrega puestos EG
// - Agrega Sub Director CPH

const { initDatabase, closeDatabase } = require('./lib/init-db')

// Puestos TEC que son POU (guardia) — el resto es POF (planta)
const PUESTOS_TEC_POU = [
  'TECNICO EN RADIOLOGIA',
  'TECNICO EN HEMOTERAPIA',
  'TECNICO EN ANATOMIA PATOLOGICA', // instrumentadores quirúrgicos → este es el equivalente
]

// Puestos EG a insertar
const PUESTOS_EG = [
  'PROFESIONAL DE GUARDIA',
  'PROFESIONAL DE PLANTA',
  'ADMINISTRATIVO',
  'AUXILIAR ADMINISTRATIVO',
  'TECNICO',
  'OPERARIO',
  'MAESTRANZA',
]

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
    // 1. Agregar campo modalidad_tec a puestos_cargo
    await addColumnIfMissing(ds, 'puestos_cargo', 'modalidad_tec', "ENUM('pou','pof') NULL DEFAULT NULL COMMENT 'Solo para TEC: pou=guardia, pof=planta'")

    // 2. Migrar puestos desde puestos_tec → puestos_cargo
    const puestosTec = await ds.query(`SELECT id, nombre FROM puestos_tec WHERE activo = 1`)
    console.log(`\nMigrando ${puestosTec.length} puestos desde puestos_tec...`)

    for (const p of puestosTec) {
      const nombreUpper = p.nombre.toUpperCase()
      const esPou = PUESTOS_TEC_POU.some(n => nombreUpper.includes(n) || n.includes(nombreUpper))
      const modalidad_tec = esPou ? 'pou' : 'pof'

      const [existing] = await ds.query(
        `SELECT id FROM puestos_cargo WHERE nombre = ? AND carrera = 'tec'`, [nombreUpper]
      )
      if (existing) {
        // Actualizar modalidad_tec si falta
        await ds.query(
          `UPDATE puestos_cargo SET modalidad_tec = ? WHERE id = ?`, [modalidad_tec, existing.id]
        )
        console.log(`- '${nombreUpper}' ya existe → modalidad_tec=${modalidad_tec}`)
        continue
      }

      await ds.query(
        `INSERT INTO puestos_cargo (nombre, carrera, tipo, es_medico, activo, es_estructura, modalidad_tec)
         VALUES (?, 'tec', NULL, 0, 1, 0, ?)`,
        [nombreUpper, modalidad_tec]
      )
      console.log(`OK TEC '${nombreUpper}' → modalidad_tec=${modalidad_tec}`)
    }

    // 3. Actualizar modalidad_tec en puestos TEC ya existentes en puestos_cargo
    const existentesTec = await ds.query(
      `SELECT id, nombre FROM puestos_cargo WHERE carrera = 'tec' AND modalidad_tec IS NULL`
    )
    for (const p of existentesTec) {
      const nombreUpper = p.nombre.toUpperCase()
      const esPou = PUESTOS_TEC_POU.some(n => nombreUpper.includes(n) || n.includes(nombreUpper))
      await ds.query(
        `UPDATE puestos_cargo SET modalidad_tec = ? WHERE id = ?`,
        [esPou ? 'pou' : 'pof', p.id]
      )
      console.log(`OK TEC existente '${p.nombre}' → modalidad_tec=${esPou ? 'pou' : 'pof'}`)
    }

    // 4. Agregar Sub Director CPH
    const [sdExiste] = await ds.query(
      `SELECT id FROM puestos_cargo WHERE nombre = 'SUB DIRECTOR' AND carrera = 'cph'`
    )
    if (!sdExiste) {
      await ds.query(
        `INSERT INTO puestos_cargo (nombre, carrera, tipo, es_medico, activo, es_estructura)
         VALUES ('SUB DIRECTOR', 'cph', 'jefatura', 0, 1, 1)`
      )
      console.log('OK SUB DIRECTOR CPH insertado')
    } else {
      console.log('- SUB DIRECTOR CPH ya existe')
    }

    // 5. Agregar puestos EG
    console.log('\nAgregando puestos EG...')
    for (const nombre of PUESTOS_EG) {
      const [existing] = await ds.query(
        `SELECT id FROM puestos_cargo WHERE nombre = ? AND carrera = 'eg'`, [nombre]
      )
      if (existing) { console.log(`- EG '${nombre}' ya existe`); continue }
      await ds.query(
        `INSERT INTO puestos_cargo (nombre, carrera, tipo, es_medico, activo, es_estructura)
         VALUES (?, 'eg', NULL, 0, 1, 0)`,
        [nombre]
      )
      console.log(`OK EG '${nombre}' insertado`)
    }

    // 6. Agregar puestos EG estructura (Jefe, Director, Carrera Gerencial)
    const puestosEgEstructura = [
      { nombre: 'JEFE',              tipo: 'jefatura'  },
      { nombre: 'DIRECTOR',          tipo: 'direccion' },
      { nombre: 'CARRERA GERENCIAL', tipo: 'gerencial' },
    ]
    for (const p of puestosEgEstructura) {
      const [existing] = await ds.query(
        `SELECT id FROM puestos_cargo WHERE nombre = ? AND carrera = 'eg'`, [p.nombre]
      )
      if (existing) { console.log(`- EG '${p.nombre}' ya existe`); continue }
      await ds.query(
        `INSERT INTO puestos_cargo (nombre, carrera, tipo, es_medico, activo, es_estructura)
         VALUES (?, 'eg', ?, 0, 1, 1)`,
        [p.nombre, p.tipo]
      )
      console.log(`OK EG estructura '${p.nombre}' insertado`)
    }

    console.log('\nResumen puestos_cargo:')
    const resumen = await ds.query(
      `SELECT carrera, COUNT(*) as total FROM puestos_cargo GROUP BY carrera ORDER BY carrera`
    )
    resumen.forEach(r => console.log(` ${r.carrera}: ${r.total} puestos`))

  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
