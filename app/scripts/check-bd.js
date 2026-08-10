require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const mysql = require('mysql2/promise')

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  console.log('=== PUESTOS_CARGO ===')
  const [puestos] = await conn.query(
    'SELECT id, nombre, carrera, tipo, es_estructura, modalidad_tec FROM puestos_cargo ORDER BY carrera, nombre'
  )
  puestos.forEach(r => console.log(JSON.stringify(r)))

  console.log('\n=== CARRERAS ===')
  const [carreras] = await conn.query(
    'SELECT id_carrera, codigo, nombre, norma_referencia, excluir_alta, solo_estructura FROM carreras ORDER BY id_carrera'
  )
  carreras.forEach(r => console.log(JSON.stringify(r)))

  console.log('\n=== TIPOS_CARGO ===')
  const [tipos] = await conn.query('SELECT * FROM tipos_cargo ORDER BY id')
  tipos.forEach(r => console.log(JSON.stringify(r)))

  await conn.end()
}
run().catch(e => console.error(e.message))
