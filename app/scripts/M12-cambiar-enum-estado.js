/**
 * M12 — Cambiar enum estado en new_cargo
 *
 * activo    → vigente
 * bloqueado → no_vigente
 *
 * Pasos:
 * 1. Cambiar valores de datos (activo→vigente, bloqueado→no_vigente)
 * 2. Modificar la definición del enum
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
    // Estado previo
    const [antes] = await conn.query(`SELECT estado, COUNT(*) c FROM new_cargo GROUP BY estado`)
    console.log('Estado previo:')
    antes.forEach(r => console.log(`  ${r.estado}: ${r.c}`))

    // 1. Ampliar el enum para aceptar los 4 valores temporalmente
    await conn.query(`ALTER TABLE new_cargo MODIFY COLUMN estado ENUM('activo','bloqueado','vigente','no_vigente') NOT NULL DEFAULT 'vigente'`)
    console.log('\n✓ Enum ampliado (4 valores)')

    // 2. Migrar datos
    const [r1] = await conn.query(`UPDATE new_cargo SET estado = 'vigente'    WHERE estado = 'activo'`)
    console.log(`✓ activo → vigente: ${r1.affectedRows} registros`)

    const [r2] = await conn.query(`UPDATE new_cargo SET estado = 'no_vigente' WHERE estado = 'bloqueado'`)
    console.log(`✓ bloqueado → no_vigente: ${r2.affectedRows} registros`)

    // 3. Reducir el enum a solo los nuevos valores
    await conn.query(`ALTER TABLE new_cargo MODIFY COLUMN estado ENUM('vigente','no_vigente') NOT NULL DEFAULT 'vigente'`)
    console.log('✓ Enum reducido a vigente/no_vigente')

    // Verificar
    const [despues] = await conn.query(`SELECT estado, COUNT(*) c FROM new_cargo GROUP BY estado`)
    console.log('\nEstado final:')
    despues.forEach(r => console.log(`  ${r.estado}: ${r.c}`))

    console.log('\nM12 completado OK')
  } finally {
    await conn.end()
  }
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
