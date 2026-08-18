/**
 * seed-especialidades.js
 * Crea la tabla `especialidades` con FK a `carreras`.
 * Carreras: CPH=1, ENF=2, TEC=3
 */

const { AppDataSource } = require('../src/config/data-source');

// id_carrera = 1 (CPH) — médico
const CPH_MEDICO = [
  'Alergia e Inmunopatología',
  'Anatomía Patológica',
  'Anestesiología',
  'Anestesiología Pediátrica',
  'Asistencia Respiratoria Intensiva',
  'Auditoría Médica',
  'Cardiología',
  'Cardiología Infantil',
  'Cirugía Cardiovascular',
  'Cirugía General',
  'Cirugía Infantil',
  'Cirugía Plástica y Reparadora',
  'Cirugía Torácica',
  'Cirugía y Traumatología Bucomaxilofacial',
  'Clínica Médica',
  'Dermatología',
  'Dermatología Pediátrica',
  'Diagnóstico por Imágenes',
  'Diagnóstico por Imágenes (Ecografía)',
  'Diagnóstico por Imágenes (Tomografía)',
  'Emergentología',
  'Endocrinología',
  'Endocrinología Infantil',
  'Endoscopía',
  'Enfermedades Infecciosas (Infectología)',
  'Fisiatría (Medicina Física y Rehabilitación)',
  'Gastroenterología',
  'Gastroenterología Infantil',
  'Genética Médica',
  'Geriatría',
  'Ginecología',
  'Hematología',
  'Hematología Infantil',
  'Hemodinamia',
  'Hemoterapia e Inmunohematología',
  'Hepatología',
  'Infectología',
  'Infectología Infantil',
  'Médico Nutricionista',
  'Medicina del Trabajo',
  'Medicina Familiar',
  'Medicina General y/o Familiar',
  'Medicina Legal',
  'Medicina Nuclear',
  'Medicina Sanitaria (Salud Pública)',
  'Nefrología',
  'Nefrología Infantil',
  'Neonatología',
  'Neumonología',
  'Neumonología Infantil',
  'Neurocirugía',
  'Neurocirugía Infantil',
  'Neurología',
  'Neurología Infantil',
  'Nutrición',
  'Obstetricia',
  'Oftalmología',
  'Oftalmología Pediátrica',
  'Oncología',
  'Oncología Infantil',
  'Ortopedia y Traumatología',
  'Ortopedia y Traumatología Infantil',
  'Otorrinolaringología',
  'Otorrinolaringología Infantil',
  'Pediatría',
  'Psiquiatría',
  'Psiquiatría Infanto Juvenil',
  'Radioterapia o Terapia Radiante',
  'Reumatología',
  'Reumatología Infantil',
  'Sin Especialidad',
  'Terapia Intensiva',
  'Terapia Intensiva Infantil',
  'Tocoginecología',
  'Toxicología',
  'Trasplante Renal',
  'Urología',
  'Urología Infantil',
]

// id_carrera = 1 (CPH) — no médico
const CPH_NO_MEDICO = [
  'Bioquímica Clínica',
  'Bioquímica Clínica (Bacteriología)',
  'Bioquímica Clínica (Genética)',
  'Bioquímica Clínica (Hematología)',
  'Bioquímica Clínica (Microbiología Clínica)',
  'Bioquímica Clínica (Química Clínica)',
  'Bioquímica Clínica sin Especialidad',
  'Ciencias de la Educación',
  'Endodoncia',
  'Farmacia Hospitalaria',
  'Fonoaudiología',
  'Kinesiología',
  'Lic. en Nutrición',
  'Musicoterapia',
  'Obstétrica',
  'Odontología General',
  'Odontopediatría',
  'Ortodoncia y Ortopedia Maxilar',
  'Periodoncia',
  'Psicología Clínica',
  'Psicología Infantil',
  'Psicopedagogía',
  'Servicio Social',
  'Sociología',
  'Terapia Ocupacional',
  'Trabajo Social',
]

// id_carrera = 3 (TEC)
const TEC = [
  'General',
  'Análisis Clínicos',
  'Bioquímica',
  'Hematología',
  'Microbiología',
  'Citología',
  'Histopatología',
  'Diagnóstico por Imágenes',
  'Mamografía',
  'Tomografía',
  'Resonancia Magnética',
  'Banco de Sangre',
  'Aféresis',
  'Citotóxicos',
  'Nutrición Clínica',
  'Nutrición Pediátrica',
  'Psiquiatría',
  'Adicciones',
  'Prótesis',
  'Órtesis',
  'Baja Visión',
  'Contactología',
  'Endodoncia',
  'Prótesis Dental',
  'Respiratorio',
  'Neurológico',
  'Musculoesquelético',
  'Pediátrico',
  'Geriátrico',
  'Comunicación',
  'Deglución',
  'Voz',
  'Psicomotricidad',
  'Rehabilitación',
  'Esterilización',
  'Electromedicina',
  'Perfusión',
  'Neurofisiología',
  'Medicina Nuclear',
  'Podología',
]

async function run() {
  await AppDataSource.initialize()
  console.log('Conectado.')

  await AppDataSource.query(`SET FOREIGN_KEY_CHECKS = 0`)
  await AppDataSource.query(`TRUNCATE TABLE especialidades`)
  await AppDataSource.query(`SET FOREIGN_KEY_CHECKS = 1`)
  console.log('Tabla limpiada.')

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
