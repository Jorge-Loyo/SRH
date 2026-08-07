/**
 * seed-especialidades.js
 * Crea la tabla `especialidades` con FK a `carreras`.
 * Carreras: CPH=1, ENF=2, TEC=3
 */

const { AppDataSource } = require('../src/config/data-source');

// id_carrera = 1 (CPH) — médico
const CPH_MEDICO = [
  'ALERGIA E INMUNOPATOLOGIA',
  'ANATOMIA PATOLOGICA',
  'ANESTESIOLOGIA',
  'ASISTENCIA RESPIRATORIA INTENSIVA',
  'AUDITORIA MEDICA',
  'CARDIOLOGIA',
  'CARDIOLOGIA INFANTIL',
  'CIRUGIA CARDIOVASCULAR',
  'CIRUGIA GENERAL',
  'CIRUGIA INFANTIL',
  'CIRUGIA PLASTICA Y REPARADORA',
  'CIRUGIA TORAXICA',
  'CLINICA MEDICA',
  'DERMATOLOGIA',
  'DERMATOLOGIA PEDIATRICA',
  'DIAGNOSTICO POR IMAGEN',
  'DIAGNOSTICO POR IMAGENES',
  'DIAGNOSTICO POR IMAGENES (ECOGRAFIA)',
  'DIAGNOSTICO POR IMAGENES (TOMOGRAFIA)',
  'EMERGENTOLOGIA',
  'ENDOCRINOLOGIA',
  'ENDOSCOPIA',
  'FISIATRIA',
  'FISIATRIA (MEDICINA FISICA Y REHABILITACION)',
  'GASTROENTEROLOGIA',
  'GENETICA MEDICA',
  'GERIATRIA',
  'GINECOLOGIA',
  'HEMATOLOGIA',
  'HEMODINAMIA',
  'HEMOTERAPIA',
  'HEPATOLOGIA',
  'INFECTOLOGIA',
  'INFECTOLOGIA INFANTIL',
  'MEDICO NUTRICIONISTA',
  'MEDICINA GENERAL Y/O FAMILIAR',
  'MEDICINA NUCLEAR',
  'NEFROLOGIA',
  'NEFROLOGIA INFANTIL',
  'NEONATOLOGIA',
  'NEUMONOLOGIA',
  'NEUROCIRUGIA',
  'NEUROLOGIA',
  'NEUROLOGIA INFANTIL',
  'NUTRICION',
  'OBSTETRICIA',
  'OFTALMOLOGIA',
  'OFTALMOLOGIA PEDIATRICA',
  'ONCOLOGIA',
  'ORTOPEDIA Y TRAUMATOLOGIA',
  'OTORRINOLARINGOLOGIA',
  'PEDIATRIA',
  'PSIQUIATRIA',
  'PSIQUIATRIA INFANTO JUVENIL',
  'RADIOTERAPIA O TERAPIA RADIANTE',
  'REUMATOLOGIA',
  'SIN ESPECIALIDAD',
  'TERAPIA INTENSIVA',
  'TERAPIA INTENSIVA INFANTIL',
  'TOCOGINECOLOGIA',
  'TOXICOLOGIA',
  'UROLOGIA',
]

// id_carrera = 1 (CPH) — no médico
const CPH_NO_MEDICO = [
  'BIOQUIMICA',
  'BIOQUIMICA CLINICA (BACTERIOLOGIA)',
  'BIOQUIMICA CLINICA (GENETICA)',
  'BIOQUIMICA CLINICA (HEMATOLOGIA)',
  'BIOQUIMICA CLINICA (LACTANCIA)',
  'BIOQUIMICA CLINICA (MICROBIOLOGIA CLINICA)',
  'BIOQUIMICA CLINICA (QUIMICA CLINICA)',
  'BIOQUIMICA CLINICA SIN ESPECIALIDAD',
  'CIENCIAS DE LA EDUCACION',
  'CIRUGIA Y TRAUMATOLOGIA BUCOMAXILOFACIAL',
  'ENDODONCIA',
  'FARMACIA HOSPITALARIA',
  'FLEBOLOGIA',
  'FONOAUDIOLOGIA',
  'KINESIOLOGIA',
  'LIC. EN NUTRICION',
  'MUSICOTERAPIA',
  'OBSTETRICA',
  'ODONTOLOGIA GENERAL',
  'ODONTOPEDIATRIA',
  'ORTODONCIA Y ORTOPEDIA MAXILAR',
  'PERIODONCIA',
  'PSICOLOGIA CLINICA',
  'PSICOLOGIA INFANTIL',
  'PSICOPEDAGOGIA',
  'SOCIOLOGIA',
  'TERAPIA OCUPACIONAL',
  'TRABAJO SOCIAL Y SERVICIO SOCIAL',
]

// id_carrera = 3 (TEC)
const TEC = [
  'GENERAL',
  'BIOQUIMICA',
  'HEMATOLOGIA',
  'MICROBIOLOGIA',
  'CITOLOGIA',
  'HISTOPATOLOGIA',
  'DIAGNOSTICO POR IMAGENES',
  'MAMOGRAFIA',
  'TOMOGRAFIA',
  'RESONANCIA MAGNETICA',
  'BANCO DE SANGRE',
  'AFERESIS',
  'CITOTOXICOS',
  'NUTRICION CLINICA',
  'NUTRICION PEDIATRICA',
  'PSIQUIATRIA',
  'ADICCIONES',
  'PROTESIS',
  'ORTESIS',
  'BAJA VISION',
  'CONTACTOLOGIA',
  'ENDODONCIA',
  'PROTESIS DENTAL',
  'RESPIRATORIO',
  'NEUROLOGICO',
  'MUSCULOESQUELETICO',
  'PEDIATRICO',
  'GERIATRICO',
  'COMUNICACION',
  'DEGLUSION',
  'VOZ',
  'PSICOMOTRICIDAD',
  'REHABILITACION',
]

async function run() {
  await AppDataSource.initialize()
  console.log('Conectado.')

  await AppDataSource.query(`DROP TABLE IF EXISTS especialidades`)

  await AppDataSource.query(`
    CREATE TABLE especialidades (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nombre     VARCHAR(150) NOT NULL,
      categoria  ENUM('medico','no_medico') NOT NULL,
      id_carrera INT NOT NULL,
      activo     TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uq_nombre_carrera (nombre, id_carrera),
      CONSTRAINT fk_esp_carrera FOREIGN KEY (id_carrera) REFERENCES carreras(id_carrera)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  console.log('Tabla creada.')

  const rows = [
    ...CPH_MEDICO.map(n    => `('${n.replace(/'/g,"\\'")}', 'medico',    1)`),
    ...CPH_NO_MEDICO.map(n => `('${n.replace(/'/g,"\\'")}', 'no_medico', 1)`),
    ...TEC.map(n           => `('${n.replace(/'/g,"\\'")}', 'no_medico', 3)`),
  ]

  await AppDataSource.query(`
    INSERT INTO especialidades (nombre, categoria, id_carrera) VALUES
    ${rows.join(',\n    ')}
  `)

  const [{ total }] = await AppDataSource.query('SELECT COUNT(*) as total FROM especialidades')
  console.log(`Insertados: ${total} registros.`)

  const resumen = await AppDataSource.query(`
    SELECT c.codigo, e.categoria, COUNT(*) as cnt
    FROM especialidades e
    JOIN carreras c ON c.id_carrera = e.id_carrera
    GROUP BY c.codigo, e.categoria
    ORDER BY c.codigo, e.categoria
  `)
  resumen.forEach(r => console.log(` - ${r.codigo} / ${r.categoria}: ${r.cnt}`))

  await AppDataSource.destroy()
  process.exit(0)
}

run().catch(e => { console.error(e.message); process.exit(1) })
