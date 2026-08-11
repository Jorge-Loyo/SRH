// Script: M4-crear-tipos-cargo.js
// Crea tabla tipos_cargo con todos los tipos definidos en el diseño

const { initDatabase, closeDatabase } = require('./lib/init-db')

async function main() {
  const ds = await initDatabase()
  try {
    await ds.query(`
      CREATE TABLE IF NOT EXISTS tipos_cargo (
        id                 TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
        codigo             VARCHAR(30)      NOT NULL,
        nombre             VARCHAR(50)      NOT NULL,
        aplica_carrera     VARCHAR(10)      NULL COMMENT 'NULL = todas, o codigo de carrera especifica',
        requiere_modalidad TINYINT(1)       NOT NULL DEFAULT 0,
        solo_estructura    TINYINT(1)       NOT NULL DEFAULT 0,
        activo             TINYINT(1)       NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_tipos_cargo_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('OK tabla tipos_cargo creada (o ya existía)')

    // codigo | nombre | aplica_carrera | requiere_modalidad | solo_estructura
    const tipos = [
      { codigo: 'ejecucion',  nombre: 'Ejecución',        aplica: null,  modal: 1, struct: 0 },
      { codigo: 'jefe',       nombre: 'Jefe',              aplica: 'CPH', modal: 1, struct: 1 },
      { codigo: 'director',   nombre: 'Director',          aplica: 'CPH', modal: 0, struct: 1 },
      { codigo: 'subdirector',nombre: 'Sub Director',      aplica: 'CPH', modal: 0, struct: 1 },
      { codigo: 'jefe_eg',    nombre: 'Jefe',              aplica: 'EG',  modal: 0, struct: 1 },
      { codigo: 'director_eg',nombre: 'Director',          aplica: 'EG',  modal: 0, struct: 1 },
      { codigo: 'gerencial',        nombre: 'Carrera Gerencial',        aplica: 'EG',  modal: 0, struct: 1 },
      { codigo: 'ministro',          nombre: 'Ministro',                 aplica: 'AS',  modal: 0, struct: 1 },
      { codigo: 'subsecretaria',     nombre: 'SubSecretaria',            aplica: 'AS',  modal: 0, struct: 1 },
      { codigo: 'dir_general',       nombre: 'Direccion General',        aplica: 'AS',  modal: 0, struct: 1 },
      { codigo: 'dir_general_adjunta', nombre: 'Direccion General Adjunta', aplica: 'AS', modal: 0, struct: 1 },
    ]

    for (const t of tipos) {
      const [existing] = await ds.query(`SELECT id FROM tipos_cargo WHERE codigo = ?`, [t.codigo])
      if (existing) { console.log(`- tipo '${t.codigo}' ya existe`); continue }
      await ds.query(
        `INSERT INTO tipos_cargo (codigo, nombre, aplica_carrera, requiere_modalidad, solo_estructura)
         VALUES (?, ?, ?, ?, ?)`,
        [t.codigo, t.nombre, t.aplica, t.modal, t.struct]
      )
      console.log(`OK tipo '${t.codigo}' insertado`)
    }

    const rows = await ds.query(`SELECT * FROM tipos_cargo ORDER BY id`)
    console.log('\nContenido final:')
    rows.forEach(r => console.log(
      ` ${r.codigo.padEnd(12)} | ${r.nombre.padEnd(20)} | carrera=${r.aplica_carrera ?? 'todas'} | modal=${r.requiere_modalidad} | struct=${r.solo_estructura}`
    ))
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
