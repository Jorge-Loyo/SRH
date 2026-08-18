require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const mysql = require('mysql2/promise')

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const q = async (label, sql) => {
    const [r] = await conn.query(sql)
    console.log(`\n=== ${label} ===`)
    r.forEach(row => console.log(JSON.stringify(row)))
  }

  await q('Sin id_carrera (por carrera texto)',
    `SELECT carrera, COUNT(*) c FROM new_cargo WHERE id_carrera IS NULL GROUP BY carrera`)

  await q('Sin id_modalidad pero con modalidad texto',
    `SELECT modalidad, COUNT(*) c FROM new_cargo WHERE id_modalidad IS NULL AND modalidad IS NOT NULL GROUP BY modalidad`)

  await q('Sin id_especialidad pero con especialidad texto (muestra)',
    `SELECT especialidad, COUNT(*) c FROM new_cargo WHERE id_especialidad IS NULL AND especialidad IS NOT NULL GROUP BY especialidad ORDER BY c DESC LIMIT 10`)

  await q('Sin id_puesto pero con puesto texto (no ENF, no EG)',
    `SELECT carrera, puesto, COUNT(*) c FROM new_cargo WHERE id_puesto IS NULL AND puesto IS NOT NULL AND carrera NOT IN ('ENF','EG','SG','RES','DOC') GROUP BY carrera, puesto ORDER BY carrera, c DESC LIMIT 20`)

  await q('CPH sin id_puesto (detalle)',
    `SELECT puesto, COUNT(*) c FROM new_cargo WHERE carrera = 'CPH' AND id_puesto IS NULL AND puesto IS NOT NULL GROUP BY puesto ORDER BY c DESC`)

  await q('ENF/EG sin id_puesto',
    `SELECT carrera, COUNT(*) c FROM new_cargo WHERE carrera IN ('ENF','EG') AND id_puesto IS NULL AND puesto IS NOT NULL GROUP BY carrera`)

  await q('Modalidades distintas en new_cargo',
    `SELECT modalidad, COUNT(*) c FROM new_cargo GROUP BY modalidad ORDER BY c DESC`)

  await q('Especialidades sin match en tabla especialidades (muestra)',
    `SELECT nc.especialidad, COUNT(*) c FROM new_cargo nc
     LEFT JOIN especialidades e ON e.nombre = nc.especialidad
     WHERE nc.especialidad IS NOT NULL AND e.id IS NULL
     GROUP BY nc.especialidad ORDER BY c DESC LIMIT 10`)

  await conn.end()
}
run().catch(e => { console.error(e.message); process.exit(1) })
