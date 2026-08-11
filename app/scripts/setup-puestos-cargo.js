// Script: setup-puestos-cargo.js
// Crea tabla puestos_cargo e inserta puestos CPH y TEC con nombres limpios

const { initDatabase, closeDatabase } = require('./lib/init-db')

const PUESTOS = [
  // CPH médico - guardia
  { nombre: 'ESPECIALISTA MEDICO',        carrera: 'cph', tipo: 'guardia',  es_medico: 1 },
  { nombre: 'PROFESIONAL MEDICO',         carrera: 'cph', tipo: 'guardia',  es_medico: 1 },
  // CPH médico - planta
  { nombre: 'MEDICO',                     carrera: 'cph', tipo: 'planta',   es_medico: 1 },
  // CPH médico - jefatura
  { nombre: 'JEFE DEPARTAMENTO',          carrera: 'cph', tipo: 'jefatura', es_medico: 1 },
  { nombre: 'JEFE DIVISION',              carrera: 'cph', tipo: 'jefatura', es_medico: 1 },
  { nombre: 'JEFE SECCION',               carrera: 'cph', tipo: 'jefatura', es_medico: 1 },
  { nombre: 'JEFE UNIDAD',                carrera: 'cph', tipo: 'jefatura', es_medico: 1 },
  // CPH no médico - planta y guardia
  { nombre: 'BIOQUIMICO',                 carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'BIOQUIMICO',                 carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'BIOLOGO',                    carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'BIOLOGO',                    carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'EXPERTO EN FISICA RADIANTE', carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'EXPERTO EN FISICA RADIANTE', carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'FARMACEUTICO',               carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'FARMACEUTICO',               carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'FONOAUDIOLOGO',              carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'FONOAUDIOLOGO',              carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'KINESIOLOGO',                carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'KINESIOLOGO',                carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'LIC. EN CIENCIAS EDUC.',     carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'LIC. EN CIENCIAS EDUC.',     carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'MUSICOTERAPEUTA',            carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'MUSICOTERAPEUTA',            carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'NUTRICIONISTA DIETISTA',     carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'NUTRICIONISTA DIETISTA',     carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'OBSTETRICA',                 carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'OBSTETRICA',                 carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'ODONTOLOGO',                 carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'ODONTOLOGO',                 carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'PSICOLOGO',                  carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'PSICOLOGO',                  carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'PSICOPEDAGOGO',              carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'PSICOPEDAGOGO',              carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'SOCIOLOGO',                  carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'SOCIOLOGO',                  carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'TERAPEUTA OCUPACIONAL',      carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'TERAPEUTA OCUPACIONAL',      carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'TRABAJADOR SOCIAL',          carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'TRABAJADOR SOCIAL',          carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  // Ley 6035 art.6 - profesiones faltantes
  { nombre: 'FISIOTERAPEUTA',             carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'FISIOTERAPEUTA',             carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'VETERINARIO',                carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'VETERINARIO',                carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'ANTROPOLOGO',                carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'ANTROPOLOGO',                carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'LIC. EN SISTEMAS DE SALUD',  carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'LIC. EN SISTEMAS DE SALUD',  carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'LIC. EN ESTADISTICAS SALUD', carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'LIC. EN ESTADISTICAS SALUD', carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  { nombre: 'LIC. EN COMUNICACION SOCIAL',carrera: 'cph', tipo: 'planta',   es_medico: 0 },
  { nombre: 'LIC. EN COMUNICACION SOCIAL',carrera: 'cph', tipo: 'guardia',  es_medico: 0 },
  // EG - puestos activos
  { nombre: 'CUIDADOR ENFERMERO DE ANIMALES',               carrera: 'eg', tipo: null,       es_medico: 0 },
  { nombre: 'RADIO OPERADOR',                               carrera: 'eg', tipo: null,       es_medico: 0 },
  { nombre: 'CHOFER DE AMBULANCIA',                         carrera: 'eg', tipo: null,       es_medico: 0 },
  { nombre: 'CAMILLERO',                                    carrera: 'eg', tipo: null,       es_medico: 0 },
  { nombre: 'MORGUERO',                                     carrera: 'eg', tipo: null,       es_medico: 0 },
  { nombre: 'AYUDANTE DE LABORATORIO HEMOTERAPIA FARMACIA', carrera: 'eg', tipo: null,       es_medico: 0 },
  { nombre: 'OXIGENISTA',                                   carrera: 'eg', tipo: null,       es_medico: 0 },
  // EG - jefatura
  { nombre: 'JEFE DEPARTAMENTO', carrera: 'eg', tipo: 'jefatura', es_medico: 0, es_estructura: 1 },
  { nombre: 'JEFE DIVISION',     carrera: 'eg', tipo: 'jefatura', es_medico: 0, es_estructura: 1 },
  { nombre: 'JEFE SECCION',      carrera: 'eg', tipo: 'jefatura', es_medico: 0, es_estructura: 1 },
  // EG - gerencial
  { nombre: 'GERENTE',           carrera: 'eg', tipo: 'gerencial', es_medico: 0, es_estructura: 1 },
  { nombre: 'SUBGERENTE',        carrera: 'eg', tipo: 'gerencial', es_medico: 0, es_estructura: 1 },
  // TEC - Res. 2675/MEFGC/19 art.3
  { nombre: 'TECNICO EN INSTRUMENTACION QUIRURGICA', carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN PODOLOGIA',                  carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ANESTESIOLOGIA',             carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN BIOTECNOLOGIA',              carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN CITOLOGIA',                  carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN DIALISIS',                   carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ESTERILIZACION',             carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN HEMATOLOGIA',                carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN HEMOTERAPIA',                carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN LABORATORIO',                carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN LABORATORIO DE PATOLOGIA',   carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN MEDICINA NUCLEAR',           carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN NEUROFISIOLOGIA',            carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ORTESIS Y PROTESIS',         carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN PRACTICAS CARDIOLOGICAS',    carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN MECANICA DENTAL',            carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ASISTENCIA DENTAL',          carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN OPTICA',                     carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN BIOTERIO',                   carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO QUIMICO',                       carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN RADIOLOGIA',                 carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN NECROPSIA',                  carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN PERFUSION',                  carrera: 'tec', tipo: null, es_medico: 0 },
  // TEC - puestos adicionales en uso
  { nombre: 'TECNICO EN ANATOMIA PATOLOGICA',  carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN FARMACIA',             carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ELECTROMEDICINA',      carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN NUTRICION',            carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN SALUD MENTAL',         carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ORTOPEDIA',            carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN ODONTOLOGIA',          carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN KINESIOLOGIA',         carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN FONOAUDIOLOGIA',       carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'TECNICO EN TERAPIA OCUPACIONAL',  carrera: 'tec', tipo: null, es_medico: 0 },
  // TEC - Especialidades Profesionales (LS)
  { nombre: 'LIC. EN INSTRUMENTACION QUIRURGICA',    carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'LIC. EN PRODUCCION DE BIOIMAGENES',     carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'LIC. EN BIOTECNOLOGIA',                 carrera: 'tec', tipo: null, es_medico: 0 },
  { nombre: 'LIC. EN ORTESIS Y PROTESIS',            carrera: 'tec', tipo: null, es_medico: 0 },
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
        UNIQUE KEY uq_puesto_carrera_tipo (nombre, carrera, tipo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('[OK] Tabla puestos_cargo lista')

    // Insertar puestos
    let insertados = 0
    let omitidos   = 0
    for (const p of PUESTOS) {
      const [row] = await ds.query(
        `SELECT COUNT(*) as cnt FROM puestos_cargo WHERE nombre = ? AND carrera = ? AND (tipo = ? OR (tipo IS NULL AND ? IS NULL))`,
        [p.nombre, p.carrera, p.tipo, p.tipo]
      )
      if (row.cnt > 0) {
        omitidos++
        continue
      }
      await ds.query(
        `INSERT INTO puestos_cargo (nombre, carrera, tipo, es_medico, es_estructura) VALUES (?, ?, ?, ?, ?)`,
        [p.nombre, p.carrera, p.tipo, p.es_medico, p.es_estructura ?? 0]
      )
      insertados++
    }
    console.log(`[OK] ${insertados} puestos insertados, ${omitidos} omitidos`)
  } finally {
    await closeDatabase(ds)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
