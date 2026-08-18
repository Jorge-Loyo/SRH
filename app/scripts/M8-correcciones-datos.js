/**
 * M8 — Correcciones de datos
 *
 * 1. Carreras: CPH y EG → solo_estructura = 1
 *    (solo aparecen en modo estructura; en ejecución también aparecen porque
 *     solo_estructura filtra el modo estructura, no excluye del modo ejecución)
 *    NOTA: Revisando la lógica del frontend: modo estructura → solo_estructura=1
 *          modo ejecución → !excluir_alta. Son filtros independientes.
 *          CPH y EG deben aparecer en AMBOS modos → solo_estructura=1 Y excluir_alta=0
 *
 * 2. Puestos TEC: corregir modalidad_tec
 *    POU (guardia): Radiólogos, Hemoterapia, Anatomía Patológica, Instrumentadores Quirúrgicos
 *    El resto: POF (planta)
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
    // 1. Setear solo_estructura=1 para CPH y EG
    const [r1] = await conn.query(
      `UPDATE carreras SET solo_estructura = 1 WHERE codigo IN ('CPH', 'EG')`
    )
    console.log(`✓ ${r1.affectedRows} carreras actualizadas: solo_estructura=1 (CPH, EG)`)

    // 2. Corregir puestos TEC POU
    // Según regla: Radiólogos, Hemoterapia, Anatomía Patológica, Instrumentadores Quirúrgicos → POU
    const nombresPOU = [
      'TECNICO EN RADIOLOGIA',
      'TECNICO EN HEMOTERAPIA',
      'TECNICO EN ANATOMIA PATOLOGICA',
      'INSTRUMENTADORA QUIRÚRGICA',
      'TÉCNICO EN INSTRUMENTACIÓN QUIRÚRGICA',
      'LICENCIADO EN INSTRUMENTACIÓN QUIRÚRGICA',
    ]
    const placeholders = nombresPOU.map(() => '?').join(',')
    const [r2] = await conn.query(
      `UPDATE puestos_cargo SET modalidad_tec = 'pou' WHERE carrera = 'tec' AND nombre IN (${placeholders})`,
      nombresPOU
    )
    console.log(`✓ ${r2.affectedRows} puestos TEC corregidos a POU`)

    // Verificar resultado
    const [pouPuestos] = await conn.query(
      `SELECT nombre, modalidad_tec FROM puestos_cargo WHERE carrera = 'tec' AND modalidad_tec = 'pou' ORDER BY nombre`
    )
    console.log('\nPuestos TEC POU:')
    pouPuestos.forEach(p => console.log(' -', p.nombre))

    const [carreras] = await conn.query(
      `SELECT codigo, nombre, excluir_alta, solo_estructura FROM carreras ORDER BY id_carrera`
    )
    console.log('\nCarreras:')
    carreras.forEach(c => console.log(` ${c.codigo}: excluir_alta=${c.excluir_alta} solo_estructura=${c.solo_estructura}`))

    console.log('\nM8 completado OK')
  } finally {
    await conn.end()
  }
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
