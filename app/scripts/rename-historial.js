const mysql = require('mysql2/promise')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

;(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  // Renombrar tabla de historial de cambios
  await c.execute(`RENAME TABLE dot_resultado_historial TO dot_resultado_historial_cambios`)
  console.log('ok: dot_resultado_historial → dot_resultado_historial_cambios')
  await c.end()
})().catch(e => { console.error(e.message); process.exit(1) })
