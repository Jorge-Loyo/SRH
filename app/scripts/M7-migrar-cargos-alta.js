/**
 * M7 — Migrar tabla cargos_alta
 *
 * Cambios:
 *   1. Agregar columna `tipo_alta` enum('ejecucion','estructura') NOT NULL DEFAULT 'ejecucion'
 *   2. Agregar columna `documento` varchar(100) NULL
 *   3. Copiar `expediente` → `documento` en registros existentes
 *   4. Mover `norma_referencia`, `nro_resolucion`, `documento_origen` a cargos_alta
 *      (ya existen — solo verificar)
 *   5. Eliminar columnas que son atributos del cargo, no del evento:
 *      `carrera_seleccionada`, `categoria_interna`, `jornada`
 *
 * NOTA: `expediente` se mantiene por compatibilidad con datos históricos y FK existentes.
 *       Se puede eliminar en una migración futura una vez confirmado que nada lo usa.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const mysql = require('mysql2/promise')

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    console.log('Conectado a BD:', process.env.DB_NAME)

    // 1. Verificar columnas existentes
    const [cols] = await conn.query(`SHOW COLUMNS FROM cargos_alta`)
    const colNames = cols.map(c => c.Field)
    console.log('Columnas actuales:', colNames.join(', '))

    // 2. Agregar tipo_alta si no existe
    if (!colNames.includes('tipo_alta')) {
      await conn.query(`
        ALTER TABLE cargos_alta
        ADD COLUMN tipo_alta ENUM('ejecucion','estructura') NOT NULL DEFAULT 'ejecucion'
        AFTER fecha_registro
      `)
      console.log('✓ Columna tipo_alta agregada')
    } else {
      console.log('- tipo_alta ya existe')
    }

    // 3. Agregar documento si no existe
    if (!colNames.includes('documento')) {
      await conn.query(`
        ALTER TABLE cargos_alta
        ADD COLUMN documento VARCHAR(100) NULL
        AFTER tipo_alta
      `)
      console.log('✓ Columna documento agregada')
    } else {
      console.log('- documento ya existe')
    }

    // 4. Copiar expediente → documento donde documento es null
    if (colNames.includes('expediente')) {
      const [r] = await conn.query(`
        UPDATE cargos_alta SET documento = expediente
        WHERE documento IS NULL AND expediente IS NOT NULL
      `)
      console.log(`✓ ${r.affectedRows} registros: expediente → documento`)
    }

    // 5. Eliminar carrera_seleccionada si existe
    if (colNames.includes('carrera_seleccionada')) {
      await conn.query(`ALTER TABLE cargos_alta DROP COLUMN carrera_seleccionada`)
      console.log('✓ Columna carrera_seleccionada eliminada')
    } else {
      console.log('- carrera_seleccionada no existe (ya eliminada)')
    }

    // 6. Eliminar categoria_interna si existe
    if (colNames.includes('categoria_interna')) {
      await conn.query(`ALTER TABLE cargos_alta DROP COLUMN categoria_interna`)
      console.log('✓ Columna categoria_interna eliminada')
    } else {
      console.log('- categoria_interna no existe (ya eliminada)')
    }

    // 7. Eliminar jornada si existe
    if (colNames.includes('jornada')) {
      await conn.query(`ALTER TABLE cargos_alta DROP COLUMN jornada`)
      console.log('✓ Columna jornada eliminada')
    } else {
      console.log('- jornada no existe (ya eliminada)')
    }

    // Verificar resultado final
    const [finalCols] = await conn.query(`SHOW COLUMNS FROM cargos_alta`)
    console.log('\nColumnas finales:', finalCols.map(c => c.Field).join(', '))
    console.log('\nM7 completado OK')

  } finally {
    await conn.end()
  }
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
