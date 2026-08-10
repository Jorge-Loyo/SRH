// Script: M3-crear-jornadas.js
// Crea tabla jornadas e inserta valores iniciales para ENF

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function main() {
  const ds = await initDatabase()
  try {
    await ds.query(`
      CREATE TABLE IF NOT EXISTS jornadas (
        id     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(50)      NOT NULL,
        activo TINYINT(1)       NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_jornadas_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('OK tabla jornadas creada (o ya existía)')

    const valores = ['Jornada completa', 'ATP']
    for (const nombre of valores) {
      const [existing] = await ds.query(`SELECT id FROM jornadas WHERE nombre = ?`, [nombre])
      if (existing) { console.log(`- jornada '${nombre}' ya existe`); continue }
      await ds.query(`INSERT INTO jornadas (nombre) VALUES (?)`, [nombre])
      console.log(`OK jornada '${nombre}' insertada`)
    }

    const rows = await ds.query(`SELECT * FROM jornadas`)
    console.log('\nContenido final:')
    rows.forEach(r => console.log(` id=${r.id} | ${r.nombre} | activo=${r.activo}`))
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
