/**
 * M10 — Rellenar FKs faltantes en new_cargo
 *
 * No elimina campos texto (siguen siendo fuente de búsqueda y display).
 * Solo rellena id_carrera, id_modalidad, id_especialidad donde hay match.
 * id_puesto para CPH queda pendiente (nombres no coinciden con puestos_cargo).
 *
 * Pasos:
 * 1. Rellenar id_carrera donde es NULL (usando campo texto carrera)
 * 2. Rellenar id_modalidad donde es NULL (usando campo texto modalidad)
 * 3. Rellenar id_especialidad donde es NULL (usando campo texto especialidad)
 * 4. Rellenar id_puesto para CPH donde sea posible (match por nombre normalizado)
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
    // 1. Rellenar id_carrera
    const [r1] = await conn.query(`
      UPDATE new_cargo nc
      JOIN carreras c ON c.codigo = nc.carrera
      SET nc.id_carrera = c.id_carrera
      WHERE nc.id_carrera IS NULL AND nc.carrera IS NOT NULL
    `)
    console.log(`✓ id_carrera: ${r1.affectedRows} registros actualizados`)

    // Verificar residuales
    const [[{ sin_carrera }]] = await conn.query(`SELECT COUNT(*) sin_carrera FROM new_cargo WHERE id_carrera IS NULL`)
    if (sin_carrera > 0) console.log(`  ⚠ ${sin_carrera} registros sin id_carrera (carrera texto sin match en carreras)`)

    // 2. Rellenar id_modalidad
    const [r2] = await conn.query(`
      UPDATE new_cargo nc
      JOIN modalidades m ON m.nombre = nc.modalidad AND m.activo = 1
      SET nc.id_modalidad = m.id
      WHERE nc.id_modalidad IS NULL AND nc.modalidad IS NOT NULL
    `)
    console.log(`✓ id_modalidad: ${r2.affectedRows} registros actualizados`)

    const [[{ sin_modalidad }]] = await conn.query(`SELECT COUNT(*) sin_modalidad FROM new_cargo WHERE id_modalidad IS NULL AND modalidad IS NOT NULL`)
    if (sin_modalidad > 0) console.log(`  ⚠ ${sin_modalidad} registros con modalidad texto sin match`)

    // 3. Rellenar id_especialidad (match exacto por nombre)
    const [r3] = await conn.query(`
      UPDATE new_cargo nc
      JOIN especialidades e ON e.nombre = nc.especialidad
      SET nc.id_especialidad = e.id
      WHERE nc.id_especialidad IS NULL AND nc.especialidad IS NOT NULL
    `)
    console.log(`✓ id_especialidad (match exacto): ${r3.affectedRows} registros actualizados`)

    // Match case-insensitive para los que quedaron
    const [r3b] = await conn.query(`
      UPDATE new_cargo nc
      JOIN especialidades e ON UPPER(e.nombre) = UPPER(nc.especialidad)
      SET nc.id_especialidad = e.id
      WHERE nc.id_especialidad IS NULL AND nc.especialidad IS NOT NULL
    `)
    console.log(`✓ id_especialidad (match case-insensitive): ${r3b.affectedRows} registros actualizados`)

    const [[{ sin_esp }]] = await conn.query(`SELECT COUNT(*) sin_esp FROM new_cargo WHERE id_especialidad IS NULL AND especialidad IS NOT NULL`)
    if (sin_esp > 0) console.log(`  ⚠ ${sin_esp} registros con especialidad texto sin match`)

    // 4. Rellenar id_puesto para CPH donde haya match (nombre normalizado)
    // Los puestos CPH en new_cargo tienen formato "Médico de Planta", "Especialista en la Guardia Médico"
    // Los puestos en puestos_cargo tienen "MEDICO", "ESPECIALISTA MEDICO"
    // Intentar match por palabras clave
    const mapeosCPH = [
      ['Médico de Planta',                         'MEDICO'],
      ['Médico de Guardia',                        'MEDICO'],
      ['MEDICO',                                   'MEDICO'],
      ['Especialista en la Guardia Médico',        'ESPECIALISTA MEDICO'],
      ['Profesional Guardia Médico',               'PROFESIONAL MEDICO'],
      ['Psicólogo de Planta',                      'PSICOLOGO'],
      ['Psicólogo de Guardia',                     'PSICOLOGO'],
      ['Lic. en Psicología de Planta',             'PSICOLOGO'],
      ['Kinesiólogo de Guardia',                   'KINESIOLOGO'],
      ['Kinesiólogo de Planta',                    'KINESIOLOGO'],
      ['Lic. en Kinesiología de Planta',           'KINESIOLOGO'],
      ['Odontólogo de Planta',                     'ODONTOLOGO'],
      ['Odontólogo de Guardia',                    'ODONTOLOGO'],
      ['Bioquímico de Planta',                     'BIOQUIMICO'],
      ['Bioquímico de Guardia',                    'BIOQUIMICO'],
      ['Lic. en Bioquímica de Planta',             'BIOQUIMICO'],
      ['Bacteriólogo de Guardia',                  'BIOQUIMICO'],
      ['Farmacéutico de Planta',                   'FARMACEUTICO'],
      ['Farmacéutico de Guardia',                  'FARMACEUTICO'],
      ['Farmacéutico',                             'FARMACEUTICO'],
      ['Nutricionista de Planta',                  'NUTRICIONISTA DIETISTA'],
      ['Fonoaudiólogo de Planta',                  'FONOAUDIOLOGO'],
      ['Fonoaudiólogo de Guardia',                 'FONOAUDIOLOGO'],
      ['Trabajador Social de Planta',              'TRABAJADOR SOCIAL'],
      ['Trabajador Social de Guardia',             'TRABAJADOR SOCIAL'],
      ['Asistente Social de Planta',               'TRABAJADOR SOCIAL'],
      ['Asistente Social de Guardia',              'TRABAJADOR SOCIAL'],
      ['Lic. en Servicio Social de Planta',        'TRABAJADOR SOCIAL'],
      ['Obstétrica de Guardia',                    'OBSTETRICA'],
      ['Obstétrica de Planta',                     'OBSTETRICA'],
      ['Terapeuta Ocupacional de Planta',          'TERAPEUTA OCUPACIONAL'],
      ['Terapista Ocupacional de Planta',          'TERAPEUTA OCUPACIONAL'],
      ['Terapista Ocupacional de Guardia',         'TERAPEUTA OCUPACIONAL'],
      ['Lic. en Terapia Ocupacional de Planta',    'TERAPEUTA OCUPACIONAL'],
      ['Musicoterapeuta de Planta',                'MUSICOTERAPEUTA'],
      ['Psicopedagogo de Planta',                  'PSICOPEDAGOGO'],
      ['Sociólogo de Planta',                      'SOCIOLOGO'],
      ['Biólogo de Planta',                        'BIOLOGO'],
      ['Médico Veterinario de Planta',             'BIOLOGO'],
      ['Antropólogo de Planta',                    'BIOLOGO'],
      ['Lic. en Ciencias de la Educación',         'LIC. EN CIENCIAS EDUC.'],
      ['Lic. en Ciencias de la Educ. de Planta',   'LIC. EN CIENCIAS EDUC.'],
      ['Lic. en Comunicación Social',              'LIC. EN CIENCIAS EDUC.'],
      ['Experto en Física Radiante de Planta',     'EXPERTO EN FISICA RADIANTE'],
      ['Experto en Física Radiante',               'EXPERTO EN FISICA RADIANTE'],
      ['Jefe de Unidad (05)',                       'JEFE UNIDAD'],
      ['Jefe de Sección (06)',                      'JEFE SECCION'],
      ['Jefe de División (04)',                     'JEFE DIVISION'],
      ['Jefe de Departamento (02)',                 'JEFE DEPARTAMENTO'],
      ['JEFE DEPARTAMENTO',                        'JEFE DEPARTAMENTO'],
      ['Director (01)',                             'JEFE DEPARTAMENTO'],
      ['Sub-Director (03)',                         'SUB DIRECTOR'],
    ]

    let mappedCPH = 0
    for (const [nombreNC, nombrePC] of mapeosCPH) {
      const [r] = await conn.query(`
        UPDATE new_cargo nc
        JOIN puestos_cargo pc ON pc.nombre = ? AND pc.carrera = 'cph'
        SET nc.id_puesto = pc.id
        WHERE nc.carrera = 'CPH' AND nc.puesto = ? AND nc.id_puesto IS NULL
      `, [nombrePC, nombreNC])
      if (r.affectedRows > 0) {
        mappedCPH += r.affectedRows
        console.log(`  CPH "${nombreNC}" → "${nombrePC}": ${r.affectedRows}`)
      }
    }
    console.log(`✓ id_puesto CPH mapeados: ${mappedCPH} registros`)

    const [[{ sin_puesto_cph }]] = await conn.query(`SELECT COUNT(*) sin_puesto_cph FROM new_cargo WHERE carrera = 'CPH' AND id_puesto IS NULL AND puesto IS NOT NULL`)
    if (sin_puesto_cph > 0) console.log(`  ⚠ ${sin_puesto_cph} CPH sin id_puesto (requieren mapeo manual)`)

    // Resumen final
    console.log('\n=== Resumen final ===')
    const [stats] = await conn.query(`
      SELECT
        SUM(id_carrera IS NULL) sin_id_carrera,
        SUM(id_modalidad IS NULL AND modalidad IS NOT NULL) sin_id_modalidad,
        SUM(id_especialidad IS NULL AND especialidad IS NOT NULL) sin_id_especialidad,
        SUM(id_puesto IS NULL AND puesto IS NOT NULL) sin_id_puesto
      FROM new_cargo
    `)
    console.log(JSON.stringify(stats[0]))

    console.log('\nM10 completado OK (campos texto mantenidos)')
  } finally {
    await conn.end()
  }
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
