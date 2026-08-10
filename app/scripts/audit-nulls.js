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

  // Resumen general de NULLs por campo FK
  await q('RESUMEN GENERAL — NULLs por campo FK',
    `SELECT
       COUNT(*) total,
       SUM(id_carrera    IS NULL) sin_id_carrera,
       SUM(id_modalidad  IS NULL) sin_id_modalidad,
       SUM(id_especialidad IS NULL) sin_id_especialidad,
       SUM(id_puesto     IS NULL) sin_id_puesto,
       SUM(id_jornada    IS NULL) sin_id_jornada,
       SUM(id_alta       IS NULL) sin_id_alta
     FROM new_cargo`)

  // id_modalidad NULL — ¿tienen modalidad texto?
  await q('Sin id_modalidad — desglose',
    `SELECT
       COALESCE(modalidad, '(null)') modalidad_texto,
       COUNT(*) c
     FROM new_cargo WHERE id_modalidad IS NULL
     GROUP BY modalidad ORDER BY c DESC`)

  // id_especialidad NULL — ¿tienen especialidad texto?
  await q('Sin id_especialidad — desglose por carrera',
    `SELECT carrera,
       SUM(especialidad IS NOT NULL) con_texto,
       SUM(especialidad IS NULL) sin_texto
     FROM new_cargo WHERE id_especialidad IS NULL
     GROUP BY carrera ORDER BY carrera`)

  // id_puesto NULL — desglose por carrera
  await q('Sin id_puesto — desglose por carrera',
    `SELECT carrera,
       SUM(puesto IS NOT NULL) con_texto,
       SUM(puesto IS NULL) sin_texto,
       COUNT(*) total
     FROM new_cargo WHERE id_puesto IS NULL
     GROUP BY carrera ORDER BY total DESC`)

  // CPH sin id_puesto con texto (los 2 residuales)
  await q('CPH sin id_puesto — casos residuales',
    `SELECT puesto, COUNT(*) c FROM new_cargo
     WHERE carrera = 'CPH' AND id_puesto IS NULL AND puesto IS NOT NULL
     GROUP BY puesto ORDER BY c DESC`)

  // id_alta NULL — cuántos cargos sin evento de alta
  await q('Sin id_alta — por carrera',
    `SELECT carrera, COUNT(*) c FROM new_cargo
     WHERE id_alta IS NULL GROUP BY carrera ORDER BY c DESC`)

  await conn.end()
}
run().catch(e => { console.error(e.message); process.exit(1) })
