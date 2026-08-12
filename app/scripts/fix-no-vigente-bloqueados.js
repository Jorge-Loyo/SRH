/**
 * fix-no-vigente-bloqueados.js
 * Corrige 256 cargos marcados como no_vigente en new_cargo cuya persona
 * en dot_resultado tiene estado='Bloqueado' (baja en trámite de la persona,
 * no del cargo). Si tiene codigo_repa asignado, el cargo está vigente.
 */
const mysql = require('mysql2/promise')

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'dotacion_user',
    password: 'Matris94.', database: 'dotacion_db'
  })

  const [afectados] = await conn.query(`
    SELECT nc.id, nc.codigo
    FROM new_cargo nc
    INNER JOIN dot_resultado dr ON dr.id_sial = nc.id_sial
    WHERE dr.estado = 'Bloqueado'
      AND nc.estado = 'no_vigente'
      AND dr.codigo_repa IS NOT NULL AND dr.codigo_repa != ''
  `)

  console.log(`Cargos a corregir: ${afectados.length}`)

  const ids = afectados.map(r => r.id)
  const [result] = await conn.query(
    `UPDATE new_cargo SET estado = 'vigente' WHERE id IN (?)`, [ids]
  )

  console.log(`Actualizados: ${result.affectedRows}`)
  await conn.end()
}

main().catch(e => { console.error(e); process.exit(1) })
