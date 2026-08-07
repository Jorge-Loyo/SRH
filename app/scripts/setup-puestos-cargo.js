// Script: setup-puestos-cargo.js
// Crea tabla puestos_cargo e inserta puestos CPH y TEC con nombres limpios

const { initDatabase, closeDatabase } = require('./lib/init-db')

const PUESTOS = [
  // CPH - guardia
  { nombre: 'ESPECIALISTA MEDICO',   carrera: 'cph', tipo: 'guardia',   es_medico: 1 },
  { nombre: 'PROFESIONAL MEDICO',    carrera: 'cph', tipo: 'guardia',   es_medico: 1 },
  { nombre: 'FARMACEUTICO',          carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  { nombre: 'KINESIOLOGO',           carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  { nombre: 'OBSTETRICA',            carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  { nombre: 'TRABAJADOR SOCIAL',     carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  { nombre: 'ODONTOLOGO',            carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  { nombre: 'PSICOLOGO',             carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  { nombre: 'BIOQUIMICO',            carrera: 'cph', tipo: 'guardia',   es_medico: 0 },
  // CPH - planta
  { nombre: 'MEDICO',                carrera: 'cph', tipo: 'planta',    es_medico: 1 },
  { nombre: 'EXPERTO EN FISICA RADIANTE', carrera: 'cph', tipo: 'planta', es_medico: 0 },
  { nombre: 'PSICOPEDAGOGO',         carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'FONOAUDIOLOGO',         carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'NUTRICIONISTA DIETISTA',carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'TERAPEUTA OCUPACIONAL', carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'MUSICOTERAPEUTA',       carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'SOCIOLOGO',             carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'LIC. EN CIENCIAS EDUC.',carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  { nombre: 'BIOLOGO',               carrera: 'cph', tipo: 'planta',    es_medico: 0 },
  // CPH - jefatura (aparece en planta Y guardia)
  { nombre: 'JEFE DEPARTAMENTO',     carrera: 'cph', tipo: 'jefatura',  es_medico: 1 },
  { nombre: 'JEFE DIVISION',         carrera: 'cph', tipo: 'jefatura',  es_medico: 1 },
  { nombre: 'JEFE SECCION',          carrera: 'cph', tipo: 'jefatura',  es_medico: 1 },
  { nombre: 'JEFE UNIDAD',           carrera: 'cph', tipo: 'jefatura',  es_medico: 1 },
  // TEC
  { nombre: 'TECNICO EN LABORATORIO',          carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN RADIOLOGIA',           carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN HEMOTERAPIA',          carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ANATOMIA PATOLOGICA',  carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN FARMACIA',             carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ESTERILIZACION',       carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ELECTROMEDICINA',      carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN NUTRICION',            carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN SALUD MENTAL',         carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ORTOPEDIA',            carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN OPTICA',               carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ODONTOLOGIA',          carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN KINESIOLOGIA',         carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN FONOAUDIOLOGIA',       carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN TERAPIA OCUPACIONAL',  carrera: 'tec', tipo: null, es_medico: 0 },
]

async function main() {
  const ds = await initDatabase()
  try {
    // Crear tabla
    await ds.query(`
      CREATE TABLE IF NOT EXISTS puestos_cargo (
        id        INT          NOT NULL AUTO_INCREMENT,
        nombre    VARCHAR(150) NOT NULL,
        carrera   VARCHAR(10)  NOT NULL,
        tipo      VARCHAR(20)  NULL,
        es_medico TINYINT      NOT NULL DEFAULT 0,
        activo    TINYINT      NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_puesto_carrera (nombre, carrera)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('[OK] Tabla puestos_cargo lista')

    // Insertar puestos
    let insertados = 0
    let omitidos   = 0
    for (const p of PUESTOS) {
      const [row] = await ds.query(
        `SELECT COUNT(*) as cnt FROM puestos_cargo WHERE nombre = ? AND carrera = ?`,
        [p.nombre, p.carrera]
      )
      if (row.cnt > 0) {
        omitidos++
        continue
      }
      await ds.query(
        `INSERT INTO puestos_cargo (nombre, carrera, tipo, es_medico) VALUES (?, ?, ?, ?)`,
        [p.nombre, p.carrera, p.tipo, p.es_medico]
      )
      insertados++
    }
    console.log(`[OK] ${insertados} puestos insertados, ${omitidos} omitidos`)
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
