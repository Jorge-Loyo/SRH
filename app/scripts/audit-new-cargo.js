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

  await q('jornada valores', `SELECT jornada, COUNT(*) c FROM new_cargo WHERE jornada IS NOT NULL GROUP BY jornada ORDER BY c DESC`)
  await q('id_puesto_tec stats', `SELECT COUNT(*) total, SUM(id_puesto_tec IS NOT NULL) con_id, SUM(id_puesto_tec IS NULL) sin_id FROM new_cargo WHERE carrera = 'TEC'`)
  await q('TEC sin id_puesto_tec (muestra)', `SELECT id, codigo, puesto FROM new_cargo WHERE carrera = 'TEC' AND id_puesto_tec IS NULL LIMIT 10`)
  await q('id_carrera stats', `SELECT SUM(id_carrera IS NOT NULL) con_id, SUM(id_carrera IS NULL) sin_id FROM new_cargo`)
  await q('id_modalidad stats', `SELECT SUM(id_modalidad IS NOT NULL) con_id, SUM(id_modalidad IS NULL) sin_id FROM new_cargo`)
  await q('id_especialidad stats', `SELECT SUM(id_especialidad IS NOT NULL) con_id, SUM(id_especialidad IS NULL) sin_id FROM new_cargo`)
  await q('estado valores', `SELECT estado, COUNT(*) c FROM new_cargo GROUP BY estado`)
  await q('situacion_revista valores', `SELECT situacion_revista, COUNT(*) c FROM new_cargo GROUP BY situacion_revista`)
  await q('antiguedad no null', `SELECT COUNT(*) c FROM new_cargo WHERE antiguedad IS NOT NULL`)

  await conn.end()
}
run().catch(e => { console.error(e.message); process.exit(1) })
