/**
 * Helpers para el Módulo 2 — Bajas Consolidadas y Seguimiento CPH
 * Colores y normalización de estados del proceso concursal
 */

export const ESTADOS_CPH = {
  VACANTE:      'A-VALID. VCTE',
  AUTORIZADO:   'B-AUTORIZADO',
  INSCRIPCION:  'C-INSCRIPCION',
  EVAL:         'D-ETAPA EVAL',
  ADJUDI:       'E-ADJUDI',
  PROX_DESIG:   'F-PROX. A DESIG',
  DESIERTO:     'H-DESIERTO',
  FINALIZADO:   'FINALIZADO',
}

export const COLORES_ESTADO_CPH = {
  'NO INICIADO':       { bg: '#FAFAFA', text: '#616161', ring: '#bdbdbd' },
  'ACTIVO':            { bg: '#E8F5E9', text: '#1b5e20', ring: '#66bb6a' },
  'A-VALID. VCTE':     { bg: '#FFF8E1', text: '#f57f17', ring: '#ffca28' },
  'B-AUTORIZADO':      { bg: '#E8F5E9', text: '#2e7d32', ring: '#66bb6a' },
  'C-INSCRIPCION':     { bg: '#E3F2FD', text: '#1565c0', ring: '#42a5f5' },
  'D-ETAPA EVAL':      { bg: '#EDE7F6', text: '#4527a0', ring: '#ab47bc' },
  'E-ADJUDI':          { bg: '#F3E5F5', text: '#6a1b9a', ring: '#ce93d8' },
  'F-PROX. A DESIG':   { bg: '#FFF3E0', text: '#e65100', ring: '#ffa726' },
  'H-DESIERTO':        { bg: '#EFEBE9', text: '#4e342e', ring: '#a1887f' },
  'FINALIZADO':        { bg: '#E0F2F1', text: '#004d40', ring: '#26a69a' },
}

export function getColorEstadoCph(estado) {
  if (!estado) return { bg: '#F5F5F5', text: '#9e9e9e', ring: '#bdbdbd' }
  const upper = estado.toUpperCase().trim()
  for (const [key, val] of Object.entries(COLORES_ESTADO_CPH)) {
    if (upper === key.toUpperCase()) return val
  }
  for (const [key, val] of Object.entries(COLORES_ESTADO_CPH)) {
    if (upper.includes(key.toUpperCase())) return val
  }
  return { bg: '#F5F5F5', text: '#9e9e9e', ring: '#bdbdbd' }
}

/** Formatea una fecha 'YYYY-MM-DD' o string similar → 'DD/MM/YYYY' */
export function formatDate(d) {
  if (!d) return '—'
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, dd] = d.split('T')[0].split('-')
    return `${dd}/${m}/${y}`
  }
  return d
}

/** Convierte 'SI'/'NO'/true/false a etiqueta legible */
export function boolLabel(val) {
  if (val === true || val === 'SI' || val === 'si') return 'Sí'
  if (val === false || val === 'NO' || val === 'no') return 'No'
  return '—'
}

/** Opciones del campo "Estado" (los 3 valores reales de calcEstado) */
export const OPCIONES_ESTADO = [
  'ACTIVO',
  'NO INICIADO',
  'FINALIZADO',
]

export const OPCIONES_SUB_ESTADO_3 = [
  'A-VALID. VCTE',
  'B-AUTORIZADO',
  'C-INSCRIPCION',
  'D-ETAPA EVAL',
  'E-ADJUDI',
  'F-PROX. A DESIG',
  'G-RESOLUCION',
  'H-DESIERTO',
]

export const OPCIONES_GENERA_CONCURSO = ['SI', 'NO']

export const OPCIONES_ESCALAFON = [
  'Medico',
  'CEETPS',
  'POU',
  'Profesional',
  'Administrativo',
]

export const OPCIONES_USUARIOS            = ['Nahila', 'Luka', 'Joe', 'Mariano', 'Lucía', 'Alexis', 'Angelo']
export const OPCIONES_USUARIOS_CEETPS     = ['Laura', 'Christian', 'Camila', 'Diego', 'Lorena', 'Mariela', 'Daiana', 'Fiorella']

/**
 * Siglas habilitadas por usuario en Bajas Consolidadas.
 * null = todas las siglas disponibles (Mariano tiene asignados todos los hospitales).
 */
export const SIGLAS_POR_USUARIO_BAJAS = {
  Nahila: ['CSMA', 'DGSCOM', 'EAIT', 'HGARM', 'HGAT', 'HGAVS', 'HGNRG', 'DGESAME', 'HIJCTG', 'HQ', 'HRR', 'DGSAM', 'DGHOSP', 'SSAH', 'URO', 'DGDIYDP', 'DGGECDSSP', 'TPRPS'],
  'Lucía': ['DGATP', 'HMIRS', 'SSAPAC', 'HGAJAF', 'IRPS', 'HRRMF'],
  Joe:     ['HGACD', 'HGNPE', 'HGAZ', 'HSL', 'HGAP', 'HMO', 'HO', 'HOI', 'IZLP'],
  Angelo:  ['HNBM', 'HNJTB', 'HGAPP', 'HOPL', 'HBU', 'HEPTA', 'HGACA', 'HGAIP', 'HGATA'],
  Luka:    ['HGACG', 'HMOMC', 'HBR', 'HGADS', 'HIFJM'],
  Alexis:  null,
  Mariano: null,
}

/**
 * Siglas habilitadas por usuario en Seguimiento CEETPS.
 * null = todas las siglas disponibles.
 */
export const SIGLAS_POR_USUARIO_CEETPS = {
  Christian: ['HGAT', 'HGAZ', 'HGACD', 'DGESAME', 'HO', 'HRR', 'EAIT', 'HIJCTG', 'SSPSGER', 'SSAH', 'SSAPAC'],
  Daiana:    ['HGADS', 'HSL', 'HMO', 'HMOMC', 'IZLP', 'DGPAPM', 'HGAPP', 'HBU', 'HOI'],
  Diego:     ['HGAJAF', 'HGNRG', 'HGACG', 'HOPL', 'HRRMF', 'DGSAM', 'CSMA', 'HQ', 'HGAIP'],
  Lorena:    ['TPRPS', 'HGAP', 'IRPS', 'HGACA', 'HEPTA', 'HBR', 'HGARM'],
  Mariela:   ['HNBM', 'HGAVS', 'HGATA', 'HIFJM', 'HGNPE', 'HMIRS', 'HNJTB'],
  // Camila, Fiorella y Laura: null → todas las siglas
  Camila:    null,
  Fiorella:  null,
  Laura:     null,
}
export const OPCIONES_ESCALAFON_BAJAS     = ['Médico', 'No Médico']
export const OPCIONES_ESCALAFON_SEGUIMIENTO = ['POU', 'POF']
export const OPCIONES_UNIFICADOR_PUESTOS  = ['CPH de Guardia', 'CPH de Planta', 'Jefaturas']
export const OPCIONES_ORIGEN              = ['Alta por Baja', 'Ampliación', 'Cobertura Dotación', 'POU a POF']
export const ORIGENES_MODULO = {
  1: ['Ampliación', 'POU a POF'],
  2: ['Alta por Baja', 'Cobertura Dotación'],
}

// ─── CEETPS — escalafón automático por código de registro ─────────────────────
export const CEETPS_ESCALAFON_POR_CODIGO = {
  87: 'Enfermería',
  85: 'Técnicos',
  83: 'Servicios',
}

// ─── CEETPS — "Unificador de puestos" automático por código de registro ───────
export const CEETPS_UNIFICADOR_POR_CODIGO = {
  87: 'Nueva Carrera de Enfermería',
  85: 'CEETPS',
  83: 'Escalafón General',
}

export const CEETPS_PUESTOS = {
  'Técnicos': [
    'Tec. en Laboratorio',
    'Tec. en Citologia',
    'Tec. en Esterilizacion',
    'Tec. en Anestesiologia',
    'Tec. en Instrumentacion quirurgica',
    'Tec. en Radiologia',
    'Tec. en Hemoterapia',
    'Tec. en Practicas cardiologicas',
    'Tec. en Laboratorio de patologia',
    'Tec. en Mecanica dental',
    'Tec. en Farmacia',
    'Tec. en Neurofisiologia',
    'Tec. en Hematologia',
    'Tec. en Optica',
    'Tec. en Dialisis',
    'Tec. en Quimica',
    'Tec. en Necropsia',
    'Tec. en Medicina nuclear',
    'Tec. en Perfusion',
    'Tec. en Ortesis y Protesis',
    'Tec. en Podologia',
    'Tec. en Biotecnologia',
    'Tec. en Densiometria',
    'Tec. en Asistencia dental',
    'Bioterio',
    'Lic. en Produccion de bioimagenes',
    'Lic. en Instrumentacion quirurgica',
    'Lic. en Órtesis y Prótesis',
    'Lic. en Biotecnología',
  ],
  'Enfermería': [
    'Lic. en Enfermeria',
    'Enfermero Profesional',
    'Lic. en Enfermeria ATP',
    'Enfermero/a ATP',
    'Auxiliar de Enfermeria',
  ],
  'Servicios': [
    'Asistente Administrativo',
    'Asistente Contable',
    'Asistente de Apoyo Informático',
    'Asistente de Archivo y Digitalización',
    'Asistente de Mantenimiento',
    'Asistente de Mesa de Ayuda al Ciudadano',
    'Asistente de Patrimonio',
    'Asistente de Planeamiento y Administración de Recursos Humanos',
    'Asistente Legal',
    'Auxiliar Administrativo',
    'Licenciado en Enfermería',
    '1er. Año Básica',
    '2do. Año Básica',
    '3ro. y 4to. Año Básica',
    'Instructor (con Otro Cargo) / Instructor (sin Otro Cargo)',
    'Analista de Compras y Contrataciones',
    'Auxiliar de Compras y Contrataciones',
    'Analista Administrativo General',
    'Asistente de Compras y Contrataciones',
    'Asistente de Presupuesto',
    'Analista de Presupuesto',
    'Secretaria',
    'Auxiliar de Presupuesto',
    'Auxiliar Contable',
    'Conductor de Vehículos',
    'Asistente de Programas de Salud',
    'Auxiliar de Mesa de Ayuda al Ciudadano',
    'Administrativo de Facturación',
    'Analista de Apoyo Informático',
    'Asistente de Georreferenciación',
    'Auxiliar de Apoyo Informático',
    'Auxiliar de Archivo y Digitalización',
    'Auxiliar de Control de Gestión y Calidad',
    'Auxiliar de Programas de Salud',
    'Capacitador al Ciudadano',
    'Chofer de Funcionario',
    'Curador / Museógrafo',
    'Fonoaudiólogo',
    'Analista de Planeamiento de Recursos Humanos',
    'Analista de Administración de Recursos Humanos',
    'Auxiliar de Planeamiento y Administración de Recursos Humanos',
    'Analista de Selección de Personal',
    'Analista de Control de Gestión Operativo Administrativa',
    'Auxiliar de Eventos y Ceremonias',
    'Analista Legal General',
    'Operador de Logística de Eventos y Ceremonías',
    'Auxiliar de Servicios de Información Institucional',
    '1er. Año Post-Básica',
    '2do. Año Post-Básica',
    '3er. Año Post-Básica',
    'Jefe de Residentes',
    'Asistente de Biblioteca',
    'Operador de Mesa de Ayuda Interna',
    'Chofer de Ambulancia',
    'Radio Operador',
    'Auxiliar de Mesa de Entradas',
    'Radio Operador de Emergencias',
    'Asistente de Control de Gestión Operativo Administrativa',
    'Asistente de Monitoreo de Operaciones',
    'Auxiliar de Mantenimiento',
    'Auxiliar Legal',
    'Asistente de Mesa de Entradas',
    'Oficial de Correo / Cadete',
    'Administrador de Obra',
    'Inspector de Obras Públicas',
    'Proyectista',
    'Colaborador de Fiscalización de Obras',
    'Gasista',
    'Verificador de Seguridad Edilicia',
    'Asistente de Proyectista',
    'Agente de Vigilancia sin Portación de Armas',
    'Auxiliar de Limpieza',
    'Electricista de Baja y Media Tensión',
    'Operario de Mantenimiento',
    'Pintor',
    'Inspector de Fiscalización General',
    'Verificador de Servicios, Obras y/o Prestaciones',
    'Auxiliar de Patrimonio',
    'Auxiliar de Proyectista',
    'Especialista en Proyectos de Instalaciones y Estructuras',
    'Carpintero / Colocador de Placas de Fibrocemento',
    'Pañolero / Operario de Depósito',
    'Plomero',
    'Analista de Programas de Salud',
    'Asistente de Administración de Documentos Electrónicos',
    'Secretaria de Sala en Establecimientos de Atención a la Salud',
    'Acompañante Terapéutico',
    'Analista Contable',
    'Auxiliar de Operador Social',
    'Conductor de Vehículos en Operativos Sociales',
    'Operador Auxiliar de Rehabilitación',
    'Operador Social',
    'Terapeuta Social',
    'Administrativo de Depósito',
    'Ayudante de Laboratorio, Hemoterapia, Farmacia y Droguería',
    'Operador Asistente de Rehabilitación',
    'Operador Principal de Rehabilitación',
    'Analista de Proyectos',
    'Analista de Soporte a Usuarios',
    'Asistente de Proyectos y Gestión de Servicios',
    'Asistente de Soporte 1er Nivel',
    'Asistente Desarrollador',
    'Asistente de Diseño y Experiencia del Usuario',
    'Asistente Funcional y de Soporte',
    'Auxiliar de Soporte 1er Nivel',
    'Administrativo de Operativo de Trasplante',
    'Ayudante Administrativo de Operativo de Trasplante',
    'Analista de Relaciones Institucionales',
    'Asistente de Relaciones Institucionales',
    'Asistente de Estadísticas de Salud',
    'Auxiliar Estadístico',
    'Certificador de Documentación',
    'Camillero',
    'Asistente Social de Guardia',
    'Lic. Kinesiología de Guardia',
    'Analista Estadístico',
    'Asistente de Reserva Patrimonial',
    'Catalogador / Clasificador',
    'Morguero',
    'Operador Telefónico en Guardia de Hospitales',
    'Operario de Carga y Descarga',
    'Oxigenista',
    'Herrero / Soldador',
    'Operario de Lavandería',
    'Promotor Social',
    'Asistente Estadístico',
    'Albañil',
    'Capellán',
    'Lic. en Psicología de Guardia',
    'Nutricionista de Guardia',
    'Analista de Asesoramiento al Ciudadano',
    'Relevador',
    'No Aplica',
    'Recolector de Residuos',
    'Recepcionista',
    'Instrumentadora Quirúrgica',
    'Enfermero/a',
    'Nutricionista Dietista de Guardia',
    'Técnico en Laboratorio de Análisis Clínicos',
    'Oficial Notificador',
    'Bibliotecario Referencista',
    'Programador de Sistemas de Parcela Digital',
    'Licenciado en Obstetricia - Obstétrica',
    'Acopiador de Residuos Patogénicos y Líquidos Peligrosos',
    'Conductor de Furgón',
    'Auxiliar de Promoción Social',
    'Técnico de Mantenimiento Electrónico',
    'Especialista en Ingeniería Biomédica',
    'Hermana de Caridad',
    'Lic. en Psicopedagogía de Guardia',
    'Costurero',
    'Bibliotecaria',
    'Kinesiólogo Fisiatra de Guardia',
    'Psicopedagogo de Guardia',
    'Ayudante de Fotografía',
    'Tallerista',
    'Instructor de Actividades Deportivas y Recreativas',
    'Asistente de Gestión de Calidad',
    'Auxiliar de Auditoría',
    'Comunicador Visual',
    'Cocinero',
    'Mecánico de Vehículos Livianos',
    'Operador Convivencial en Niñez y/o Adolescencia',
    'Analista de Redeterminación de Precios',
    'Maestro Celador Hospital Manuel Rocca',
    'Maestro de Atípicos Hospital Manuel Rocca',
    'Maestro Mat. Comp./Prof. Educ. Física (H/C) Htal. Rocca',
    'Auxiliar de Portería',
    'Camarero',
    'Cuidador Enfermero de Animales',
    'Verificador de Vacunación Animal',
    'Director Inst. Sup. de Tecnicat. P/La Salud',
    'Instructor Técnico Escuela Técnicos para la Salud',
    'Profesor Hora-Cátedra (Transitorio) E.T. para la Salud',
    'Profesor Hora-Cátedra Escuela Técnicos para la Salud',
    'Vicedirector Escuela Técnicos para la Salud',
    'Asistente de Prensa y Difusión',
    'Colaborador de Comunicación y Desarrollo Audiovisual',
    'Desarrollo de Front End',
    'Organizador de Eventos y Ceremonias',
    'Secretaria Ejecutiva',
    'Planta Gabinete Transitorio',
    'Técnico en Hemoterapia',
    'Cuidador Gerontológico',
    'Biólogo de Guardia',
    'Bioquímico',
    'Farmacéutico',
    'Lic. Bioquímico de Guardia',
    'Lic. en Nutrición de Guardia',
    'Médico',
    'Médico Veterinario de Guardia',
    'Auditor',
    'Auditor Principal',
    'Auxiliar de Necropsia',
  ],
}

/** Retorna las opciones de puesto para el escalafón CEETPS dado */
export function getCeetpsPuestoOptions(escalafon) {
  return CEETPS_PUESTOS[escalafon] ?? []
}

/** Todos los puestos CEETPS (Técnicos + Enfermería + Servicios), sin segmentar por escalafón */
export const OPCIONES_PUESTO_CEETPS_TODOS = Object.values(CEETPS_PUESTOS).flat()

export const OPCIONES_MOTIVO_BAJA         = [
  'Renuncia', 'Cese de Cargo', 'Defunción', 'Jubilación', 'Cesantía',
  'Jubilación Ordinaria', 'Ampliación', 'Exoneración', 'Reubicación', 'Cese',
]
export const OPCIONES_DISPO_DESIERTA = ['1', '2', '3', '4', '5', 'Declarado', 'Sin Declarar']

// ─── PUESTO por tipo (POU = Guardia / POF = Planta) ──────────────────────────
// Orden según Excel "POUPOF PUESTO ESPECIALIDAD"

const _PUESTO_JEFATURAS = [
  'JEFE DEPARTAMENTO',
  'JEFE DIVISION',
  'JEFE SECCION',
  'JEFE UNIDAD',
]

// POU — CPH de Guardia, Médico
const _PUESTO_GUARDIA_MEDICO = [
  'ESPECIALISTA EN LA GUARDIA MEDICO',
  'PROFESIONAL GUARDIA MEDICO',
]

// POU — CPH de Guardia, No Médico
const _PUESTO_GUARDIA_NO_MEDICO = [
  'FARMACEUTICO DE GUARDIA',
  'KINESIOLOGO DE GUARDIA',
  'OBSTETRICA DE GUARDIA',
  'TRABAJADOR SOCIAL DE GUARDIA',
  'ODONTOLOGO DE GUARDIA',
  'PSICOLOGO DE GUARDIA',
  'BIOQUIMICO DE GUARDIA',
]

// POF — CPH de Planta, Médico
const _PUESTO_PLANTA_MEDICO = [
  'MEDICO DE PLANTA',
]

// POF — CPH de Planta, No Médico
const _PUESTO_PLANTA_NO_MEDICO = [
  'EXPERTO EN FISICA RADIANTE DE PLANTA',
  'PSICOPEDAGOGO DE PLANTA',
  'ODONTOLOGO DE PLANTA',
  'FARMACEUTICO DE PLANTA',
  'FONOAUDIOLOGO DE PLANTA',
  'OBSTETRICA DE PLANTA',
  'PSICOLOGO DE PLANTA',
  'TRABAJADOR SOCIAL DE PLANTA',
  'NUTRICIONISTA DIETISTA DE PLANTA',
  'BIOQUIMICO DE PLANTA',
  'KINESIOLOGO DE PLANTA',
  'TERAPEUTA OCUPACIONAL DE PLANTA',
  'MUSICOTERAPEUTA DE PLANTA',
  'SOCIOLOGO DE PLANTA',
  'LIC. EN CIENCIAS EDUC. DE PLANTA',
  'BIOLOGO DE PLANTA',
]

/**
 * Retorna las opciones de PUESTO según Unificador y Escalafón.
 * - unificador: 'CPH de Guardia' | 'POU' | 'CPH de Planta' | 'POF' | 'Jefaturas' | ''
 * - escalafon:  'Médico' | 'No Médico' | ''
 */
export function getPuestoOptions(unificador = '', escalafon = '') {
  const u = (unificador || '').toLowerCase().trim()
  const isMedico   = /^m[eé]dico$/i.test(escalafon || '')
  const isNoMedico = /no\s+m[eé]dico/i.test(escalafon || '')

  const isGuardia = u.includes('guardia') || u === 'pou'
  const isPlanta  = u.includes('planta')  || u === 'pof'

  if (u.includes('jefatura')) return _PUESTO_JEFATURAS

  if (isGuardia) {
    if (isMedico)   return [..._PUESTO_GUARDIA_MEDICO]
    if (isNoMedico) return [..._PUESTO_GUARDIA_NO_MEDICO]
    return [..._PUESTO_GUARDIA_MEDICO, ..._PUESTO_GUARDIA_NO_MEDICO]
  }

  if (isPlanta) {
    if (isMedico)   return [..._PUESTO_PLANTA_MEDICO]
    if (isNoMedico) return [..._PUESTO_PLANTA_NO_MEDICO]
    return [..._PUESTO_PLANTA_MEDICO, ..._PUESTO_PLANTA_NO_MEDICO]
  }

  // Sin unificador: filtrar solo por escalafón
  if (isMedico)   return [..._PUESTO_GUARDIA_MEDICO, ..._PUESTO_PLANTA_MEDICO]
  if (isNoMedico) return [..._PUESTO_GUARDIA_NO_MEDICO, ..._PUESTO_PLANTA_NO_MEDICO]

  // Sin filtros: todos los puestos CPH (jefaturas aparte)
  return [
    ..._PUESTO_GUARDIA_MEDICO, ..._PUESTO_GUARDIA_NO_MEDICO,
    ..._PUESTO_PLANTA_MEDICO,  ..._PUESTO_PLANTA_NO_MEDICO,
  ]
}

/** Lista unificada de especialidades */
export const OPCIONES_ESPECIALIDADES = [
  'ALERGIA E INMUNOPATOLOGIA', 'ANATOMIA PATOLOGICA', 'ANESTESIOLOGIA',
  'ASISTENCIA RESPIRATORIA INTENSIVA', 'AUDITORIA MEDICA',
  'BIOQUIMICA',
  'BIOQUIMICA CLINICA (BACTERIOLOGIA)',
  'BIOQUIMICA CLINICA (GENETICA)', 'BIOQUIMICA CLINICA (HEMATOLOGIA)',
  'BIOQUIMICA CLINICA (LACTANCIA)', 'BIOQUIMICA CLINICA (MICROBIOLOGIA CLINICA)',
  'BIOQUIMICA CLINICA (QUIMICA CLINICA)',
  'BIOQUIMICA CLINICA SIN ESPECIALIDAD',
  'CARDIOLOGIA', 'CARDIOLOGIA INFANTIL', 'CIENCIAS DE LA EDUCACION',
  'CIRUGIA CARDIOVASCULAR', 'CIRUGIA GENERAL', 'CIRUGIA INFANTIL',
  'CIRUGIA PLASTICA Y REPARADORA', 'CIRUGIA TORAXICA',
  'CIRUGIA Y TRAUMATOLOGIA BUCOMAXILOFACIAL', 'CLINICA MEDICA',
  'DERMATOLOGIA', 'DERMATOLOGIA PEDIATRICA',
  'DIAGNOSTICO POR IMAGEN', 'DIAGNOSTICO POR IMAGENES',
  'DIAGNOSTICO POR IMAGENES (ECOGRAFIA)', 'DIAGNOSTICO POR IMAGENES (TOMOGRAFIA)',
  'EMERGENTOLOGIA', 'ENDOCRINOLOGIA', 'ENDODONCIA', 'ENDOSCOPIA',
  'FARMACIA HOSPITALARIA',
  'FISIATRIA', 'FISIATRIA (MEDICINA FISICA Y REHABILITACION)',
  'FLEBOLOGIA', 'FONOAUDIOLOGIA', 'GASTROENTEROLOGIA',
  'GENETICA MEDICA', 'GERIATRIA', 'GINECOLOGIA',
  'HEMATOLOGIA', 'HEMODINAMIA', 'HEMOTERAPIA', 'HEPATOLOGIA',
  'INFECTOLOGIA', 'INFECTOLOGIA INFANTIL', 'KINESIOLOGIA', 'LIC. EN NUTRICION',
  'MEDICO NUTRICIONISTA', 'MEDICINA GENERAL Y/O FAMILIAR', 'MEDICINA NUCLEAR', 'MUSICOTERAPIA',
  'NEFROLOGIA', 'NEFROLOGIA INFANTIL', 'NEONATOLOGIA', 'NEUMONOLOGIA',
  'NEUROCIRUGIA', 'NEUROLOGIA', 'NEUROLOGIA INFANTIL', 'NUTRICION',
  'OBSTETRICIA', 'OBSTETRICA', 'OFTALMOLOGIA', 'OFTALMOLOGIA PEDIATRICA',
  'ONCOLOGIA',
  'ODONTOLOGIA GENERAL', 'ODONTOPEDIATRIA',
  'ORTODONCIA Y ORTOPEDIA MAXILAR', 'ORTOPEDIA Y TRAUMATOLOGIA', 'OTORRINOLARINGOLOGIA',
  'PEDIATRIA', 'PERIODONCIA',
  'PSICOLOGIA CLINICA', 'PSICOLOGIA INFANTIL', 'PSICOPEDAGOGIA',
  'PSIQUIATRIA', 'PSIQUIATRIA INFANTO JUVENIL', 'RADIOTERAPIA O TERAPIA RADIANTE',
  'REUMATOLOGIA', 'SIN ESPECIALIDAD', 'SOCIOLOGIA',
  'TERAPIA INTENSIVA', 'TERAPIA INTENSIVA INFANTIL', 'TERAPIA OCUPACIONAL',
  'TOCOGINECOLOGIA', 'TOXICOLOGIA', 'TRABAJO SOCIAL Y SERVICIO SOCIAL',
  'UROLOGIA',
]

// ─── Especialidades por PUESTO (fuente: Excel POUPOF PUESTO ESPECIALIDAD) ────

const _PUESTO_ESP_MAP = {
  // ── POU / CPH de Guardia — Médico ────────────────────────────────────────
  'ESPECIALISTA EN LA GUARDIA MEDICO': [
    'DIAGNOSTICO POR IMAGENES', 'ENDOSCOPIA', 'ANESTESIOLOGIA', 'CLINICA MEDICA',
    'PEDIATRIA', 'CIRUGIA GENERAL', 'UROLOGIA', 'CIRUGIA INFANTIL',
    'TERAPIA INTENSIVA', 'NEONATOLOGIA', 'CARDIOLOGIA', 'ORTOPEDIA Y TRAUMATOLOGIA',
    'TERAPIA INTENSIVA INFANTIL', 'TOCOGINECOLOGIA', 'NEUROCIRUGIA',
    'PSIQUIATRIA', 'PSIQUIATRIA INFANTO JUVENIL', 'INFECTOLOGIA', 'OFTALMOLOGIA',
    'TOXICOLOGIA', 'NEFROLOGIA INFANTIL', 'GASTROENTEROLOGIA', 'CIRUGIA PLASTICA Y REPARADORA',
    'CARDIOLOGIA INFANTIL', 'NEUMONOLOGIA', 'HEMOTERAPIA', 'NEUROLOGIA', 'NEFROLOGIA',
    'CIRUGIA CARDIOVASCULAR', 'ASISTENCIA RESPIRATORIA INTENSIVA', 'HEMODINAMIA',
    'OBSTETRICIA', 'DIAGNOSTICO POR IMAGENES (TOMOGRAFIA)', 'CIRUGIA TORAXICA', 'EMERGENTOLOGIA',
  ],
  'PROFESIONAL GUARDIA MEDICO': [
    'SIN ESPECIALIDAD',
  ],
  // ── POU / CPH de Guardia — No Médico ─────────────────────────────────────
  'FARMACEUTICO DE GUARDIA': [
    'FARMACIA HOSPITALARIA',
  ],
  'KINESIOLOGO DE GUARDIA': [
    'KINESIOLOGIA',
  ],
  'OBSTETRICA DE GUARDIA': [
    'OBSTETRICA',
  ],
  'TRABAJADOR SOCIAL DE GUARDIA': [
    'TRABAJO SOCIAL Y SERVICIO SOCIAL',
  ],
  'ODONTOLOGO DE GUARDIA': [
    'ODONTOLOGIA GENERAL', 'ODONTOPEDIATRIA',
  ],
  'PSICOLOGO DE GUARDIA': [
    'PSICOLOGIA CLINICA',
  ],
  'BIOQUIMICO DE GUARDIA': [
    'BIOQUIMICA CLINICA SIN ESPECIALIDAD', 'BIOQUIMICA', 'BIOQUIMICA CLINICA (QUIMICA CLINICA)',
    'SIN ESPECIALIDAD', 'BIOQUIMICA CLINICA (BACTERIOLOGIA)', 'BIOQUIMICA CLINICA (HEMATOLOGIA)',
  ],
  // ── POF / CPH de Planta — No Médico ──────────────────────────────────────
  'EXPERTO EN FISICA RADIANTE DE PLANTA': [
    'RADIOTERAPIA O TERAPIA RADIANTE',
  ],
  'PSICOPEDAGOGO DE PLANTA': [
    'PSICOPEDAGOGIA',
  ],
  'ODONTOLOGO DE PLANTA': [
    'ODONTOLOGIA GENERAL', 'PERIODONCIA', 'ORTODONCIA Y ORTOPEDIA MAXILAR',
    'ODONTOPEDIATRIA', 'ENDODONCIA', 'CIRUGIA Y TRAUMATOLOGIA BUCOMAXILOFACIAL',
  ],
  'FARMACEUTICO DE PLANTA': [
    'FARMACIA HOSPITALARIA',
  ],
  'FONOAUDIOLOGO DE PLANTA': [
    'FONOAUDIOLOGIA',
  ],
  'OBSTETRICA DE PLANTA': [
    'OBSTETRICA',
  ],
  'PSICOLOGO DE PLANTA': [
    'PSICOLOGIA CLINICA', 'PSICOLOGIA INFANTIL',
  ],
  'TRABAJADOR SOCIAL DE PLANTA': [
    'TRABAJO SOCIAL Y SERVICIO SOCIAL',
  ],
  'NUTRICIONISTA DIETISTA DE PLANTA': [
    'LIC. EN NUTRICION',
  ],
  'BIOQUIMICO DE PLANTA': [
    'BIOQUIMICA CLINICA (BACTERIOLOGIA)', 'BIOQUIMICA CLINICA (MICROBIOLOGIA CLINICA)',
    'BIOQUIMICA CLINICA (QUIMICA CLINICA)', 'BIOQUIMICA CLINICA SIN ESPECIALIDAD',
    'BIOQUIMICA', 'BIOQUIMICA CLINICA (GENETICA)', 'BIOQUIMICA CLINICA (LACTANCIA)',
  ],
  'KINESIOLOGO DE PLANTA': [
    'KINESIOLOGIA',
  ],
  'TERAPEUTA OCUPACIONAL DE PLANTA': [
    'TERAPIA OCUPACIONAL',
  ],
  'MUSICOTERAPEUTA DE PLANTA': [
    'MUSICOTERAPIA',
  ],
  'SOCIOLOGO DE PLANTA': [
    'SOCIOLOGIA',
  ],
  'LIC. EN CIENCIAS EDUC. DE PLANTA': [
    'CIENCIAS DE LA EDUCACION',
  ],
  'BIOLOGO DE PLANTA': [
    'SIN ESPECIALIDAD',
  ],
  // ── POF / CPH de Planta — Médico ──────────────────────────────────────────
  'MEDICO DE PLANTA': [
    'CLINICA MEDICA', 'OBSTETRICIA', 'INFECTOLOGIA INFANTIL', 'DIAGNOSTICO POR IMAGENES',
    'ONCOLOGIA', 'MEDICINA GENERAL Y/O FAMILIAR', 'PEDIATRIA', 'PSIQUIATRIA',
    'TOCOGINECOLOGIA', 'GASTROENTEROLOGIA', 'ANESTESIOLOGIA', 'CARDIOLOGIA',
    'OFTALMOLOGIA', 'NEONATOLOGIA', 'TERAPIA INTENSIVA', 'FISIATRIA (MEDICINA FISICA Y REHABILITACION)',
    'OTORRINOLARINGOLOGIA', 'UROLOGIA', 'INFECTOLOGIA', 'NEUROLOGIA', 'DERMATOLOGIA',
    'PSIQUIATRIA INFANTO JUVENIL', 'MEDICO NUTRICIONISTA', 'DERMATOLOGIA PEDIATRICA',
    'ORTOPEDIA Y TRAUMATOLOGIA', 'HEMOTERAPIA', 'GINECOLOGIA', 'GENETICA MEDICA',
    'REUMATOLOGIA', 'CIRUGIA GENERAL', 'ANATOMIA PATOLOGICA', 'FISIATRIA',
    'GERIATRIA', 'AUDITORIA MEDICA', 'NUTRICION', 'DIAGNOSTICO POR IMAGEN',
    'NEUROLOGIA INFANTIL', 'NEUMONOLOGIA', 'MEDICINA NUCLEAR', 'NEUROCIRUGIA',
    'CIRUGIA CARDIOVASCULAR', 'TERAPIA INTENSIVA INFANTIL', 'ALERGIA E INMUNOPATOLOGIA',
    'DIAGNOSTICO POR IMAGENES (ECOGRAFIA)', 'DIAGNOSTICO POR IMAGENES (TOMOGRAFIA)',
    'CIRUGIA PLASTICA Y REPARADORA', 'ENDOCRINOLOGIA', 'RADIOTERAPIA O TERAPIA RADIANTE',
    'SIN ESPECIALIDAD', 'HEMATOLOGIA', 'ASISTENCIA RESPIRATORIA INTENSIVA',
    'CIRUGIA TORAXICA', 'CIRUGIA INFANTIL', 'HEPATOLOGIA', 'CARDIOLOGIA INFANTIL',
    'OFTALMOLOGIA PEDIATRICA', 'FLEBOLOGIA', 'NEFROLOGIA',
  ],
}

/**
 * Retorna opciones de especialidad filtradas por puesto.
 * Busca coincidencia exacta (case-insensitive) en el mapa puesto → especialidades.
 * Fallback: si escalafon = 'Médico' devuelve lista médica; si no, lista completa.
 */
export function getEspecialidadOptions(puesto = '', escalafon = '') {
  const p = (puesto || '').trim().toUpperCase()

  for (const [key, esp] of Object.entries(_PUESTO_ESP_MAP)) {
    if (p === key.toUpperCase()) return esp
  }

  // Fallback por escalafón
  if (/^m[eé]dico$/i.test(escalafon || '')) {
    return OPCIONES_ESPECIALIDADES.filter(e =>
      _PUESTO_ESP_MAP['ESPECIALISTA EN LA GUARDIA MEDICO'].includes(e) ||
      _PUESTO_ESP_MAP['MEDICO DE PLANTA'].includes(e)
    )
  }

  return OPCIONES_ESPECIALIDADES
}

/** Mapa siglas → { descr, tipo } para auto-completar en Seguimiento */
export const SIGLAS_DATA = [
  // ─── Hospitales de Agudos ─────────────────────────────────────────────────
  { sigla: 'HBR',          descr: 'Hospital General de Agudos Bernardino Rivadavia',         tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGACA',        descr: 'Hospital General de Agudos Dr. Cosme Argerich',           tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGACD',        descr: 'Hospital General de Agudos Dr. Carlos G. Durand',         tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGACG',        descr: 'Hospital General de Agudos Dra. Cecilia Grierson',        tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGADS',        descr: 'Hospital General de Agudos Donacion F. Santojanni',       tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAIP',        descr: 'Hospital General de Agudos Dr. Ignacio Pirovano',         tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAJAF',       descr: 'Hospital General de Agudos Dr. Juan A. Fernandez',        tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAP',         descr: 'Hospital General de Agudos Jose Maria Penna',             tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAPP',        descr: 'Hospital General de Agudos Parmenio Piñero',              tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGARM',        descr: 'Hospital General de Agudos Jose M. Ramos Mejia',          tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAT',         descr: 'Hospital General de Agudos Dr. Enrique Tornu',            tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGATA',        descr: 'Hospital General de Agudos Dr. Teodoro Alvarez',          tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAVS',        descr: 'Hospital General de Agudos Dalmacio Velez Sarsfield',     tipo: 'HOSPITALES DE AGUDOS' },
  { sigla: 'HGAZ',         descr: 'Hospital General de Agudos Dr. Abel Zubizarreta',         tipo: 'HOSPITALES DE AGUDOS' },
  // ─── Hospitales de Niños ──────────────────────────────────────────────────
  { sigla: 'HGNPE',        descr: 'Hospital General de Niños Pedro de Elizalde',             tipo: 'HOSPITALES DE NIÑOS' },
  { sigla: 'HGNRG',        descr: 'Hospital General de Niños Dr. Ricardo Gutierrez',         tipo: 'HOSPITALES DE NIÑOS' },
  // ─── Hospitales Monovalentes ──────────────────────────────────────────────
  { sigla: 'HBU',          descr: 'Hospital de Gastroenterologia Dr. Carlos Bonorino Udaondo', tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HIFJM',        descr: 'Hospital de Enfermedades Infecciosas Francisco J. Muñiz', tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HMIRS',        descr: 'Hospital Materno Infantil Ramon Sarda',                   tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HMO',          descr: 'Hospital de Odontologia Dueñas',                          tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HMOMC',        descr: 'Hospital Municipal de Oncologia Marie Curie',             tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HO',           descr: 'Hospital de Odontologia Carrillo',                        tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HOI',          descr: 'Hospital de Odontologia Quinquela Martin',                tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HOPL',         descr: 'Hospital Oftalmologico Dr. Pedro Lagleyze',               tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HQ',           descr: 'Hospital de Quemados Dr. Arturo U. Illia',                tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HRR',          descr: 'Hospital de Rehabilitacion Manuel Rocca',                 tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HRRMF',        descr: 'Hospital de Rehabilitacion Respiratoria Maria Ferrer',    tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'HSL',          descr: 'Hospital Oftalmologico Santa Lucia',                      tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'IRPS',         descr: 'Instituto de Rehabilitacion Psicofisica',                 tipo: 'HOSPITALES MONOVALENTES' },
  { sigla: 'IZLP',         descr: 'Instituto de Zoonosis Pasteur',                           tipo: 'HOSPITALES MONOVALENTES' },
  // ─── Hospitales de Salud Mental ───────────────────────────────────────────
  { sigla: 'HEPTA',        descr: 'Hospital de Emergencias Psiquiatricas Torcuato de Alvear', tipo: 'HOSPITALES DE SALUD MENTAL' },
  { sigla: 'HIJCTG',       descr: 'Hospital Infanto Juvenil Tobar Garcia',                   tipo: 'HOSPITALES DE SALUD MENTAL' },
  { sigla: 'HNBM',         descr: 'Hospital de Salud Mental Dr. Braulio Moyano',             tipo: 'HOSPITALES DE SALUD MENTAL' },
  { sigla: 'HNJTB',        descr: 'Hospital de Salud Mental Dr. Jose T. Borda',              tipo: 'HOSPITALES DE SALUD MENTAL' },
  // ─── SAME ─────────────────────────────────────────────────────────────────
  { sigla: 'DGESAME',      descr: 'Dirección General SAME',                                  tipo: 'SAME' },
  // ─── SS Atención Hospitalaria ─────────────────────────────────────────────
  { sigla: 'CSMA',         descr: 'Coordinación de Salud Mental y Adicciones',               tipo: 'SS Atencion Hospitalaria' },
  { sigla: 'DGSAM',        descr: 'Dirección General de Salud Mental',                       tipo: 'SS Atencion Hospitalaria' },
  { sigla: 'DGHOSP',       descr: 'Dirección General de Hospitales',                         tipo: 'SS Atencion Hospitalaria' },
  { sigla: 'EAIT',         descr: 'Equipo de Asistencia e Intervención en Trasplantes',      tipo: 'SS Atencion Hospitalaria' },
  { sigla: 'SSAH',         descr: 'Subsecretaría de Atención Hospitalaria',                  tipo: 'SS Atencion Hospitalaria' },
  { sigla: 'TPRPS',        descr: 'Dir. Talleres Protegidos',                                tipo: 'SS Atencion Hospitalaria' },
  // ─── SS Administración de Salud ───────────────────────────────────────────
  { sigla: 'DGACSA',       descr: 'Dirección General de Administración y Control del Sistema de Atención', tipo: 'SS Administración de Salud' },
  { sigla: 'DGADCYP',      descr: 'Dirección General de Administración, Diseño, Control y Programación',   tipo: 'SS Administración de Salud' },
  { sigla: 'DGAYDRH',      descr: 'Dirección General de Asuntos y Desarrollo de los Recursos Humanos',     tipo: 'SS Administración de Salud' },
  { sigla: 'DGRFISS',      descr: 'Dirección General de Recursos Físicos e Infraestructura en Salud',      tipo: 'SS Administración de Salud' },
  { sigla: 'SSASS',        descr: 'Subsecretaría de Administración del Sistema de Salud',                  tipo: 'SS Administración de Salud' },
  // ─── SS Planificación Sanitaria ───────────────────────────────────────────
  { sigla: 'DGCOECSSP',    descr: 'Dirección General de Coordinación Estratégica, Comunicación y Sistemas de Salud Pública', tipo: 'SS Planificación Sanitaria' },
  { sigla: 'DGCRFS',       descr: 'Dirección General de Control, Regulación y Fiscalización Sanitaria',    tipo: 'SS Planificación Sanitaria' },
  { sigla: 'DGDIYDP',      descr: 'Dirección General de Desarrollo, Investigación y Diseño de Políticas',  tipo: 'SS Planificación Sanitaria' },
  { sigla: 'DGSISAN',      descr: 'Dirección General de Sistemas de Información Sanitaria',                tipo: 'SS Planificación Sanitaria' },
  { sigla: 'SSPSGER',      descr: 'Subsecretaría de Planificación Sanitaria y Gestión de Redes',           tipo: 'SS Planificación Sanitaria' },
  { sigla: 'UPETDESRHCE',  descr: 'Unidad de Proyectos Especiales para Transformación y Desarrollo de RRHH en Ciencias de la Salud', tipo: 'SS Planificación Sanitaria' },
  // ─── SS Atención Primaria ─────────────────────────────────────────────────
  { sigla: 'DGATP',        descr: 'Dirección General de Atención Temprana y Programas',                    tipo: 'SS Atencion Primaria / Cesacs y Áreas Programáticas' },
  { sigla: 'DGSCOM',       descr: 'Dirección General de Saneamiento Comunitario',                          tipo: 'SS Atencion Primaria / Cesacs y Áreas Programáticas' },
  { sigla: 'SSAPAC',       descr: 'Subsecretaría de Atención Primaria, Cesacs y Áreas Programáticas',      tipo: 'SS Atencion Primaria / Cesacs y Áreas Programáticas' },
  { sigla: 'URO',          descr: 'Unidad de Reconversión y Organización',                                 tipo: 'SS Atencion Primaria / Cesacs y Áreas Programáticas' },
  // ─── SS Personas Mayores ──────────────────────────────────────────────────
  { sigla: 'DGPAPM',       descr: 'Dirección General de Políticas Asistenciales para Personas Mayores', tipo: 'SS Personas Mayores' },
  // ─── Unidad de Ministro ───────────────────────────────────────────────────
  { sigla: 'DGCSJ',        descr: 'Dirección General de Coordinación de Servicios Jurídicos',              tipo: 'Unidad de Ministro' },
  { sigla: 'DGLTMSGC',     descr: 'Dirección General de Logística y Tecnología del MSGC',                  tipo: 'Unidad de Ministro' },
  { sigla: 'MSGC',         descr: 'Ministerio de Salud del Gobierno de la Ciudad',                         tipo: 'Unidad de Ministro' },
  { sigla: 'UAIMS',        descr: 'Unidad de Auditoría Interna del Ministerio de Salud',                   tipo: 'Unidad de Ministro' },
  // ─── Nivel Central (sin subsecretaría específica) ─────────────────────────
  { sigla: 'DGCOR',        descr: 'Dirección General de Coordinación',                                     tipo: 'Nivel Central' },
  { sigla: 'DGGECDSSP',    descr: 'Dirección General de Gestión, Evaluación y Control del Sistema de Salud Pública', tipo: 'Nivel Central' },
]

export const OPCIONES_SIGLAS = SIGLAS_DATA.map(s => s.sigla)

export const OPCIONES_TIPO_EFECTOR = [
  'HOSPITALES DE AGUDOS', 'HOSPITALES DE NIÑOS', 'HOSPITALES MONOVALENTES',
  'HOSPITALES DE SALUD MENTAL', 'Unidad de Ministro', 'SS Administración de Salud',
  'SS Planificación Sanitaria', 'SS Atencion Primaria / Cesacs y Áreas Programáticas',
  'SS Atencion Hospitalaria', 'SAME', 'Nivel Central', 'BIENESTAR', 'SS Personas Mayores',
]

// ─── Helpers de fechas internos ───────────────────────────────────────────────

/** Parsea 'YYYY-MM-DD' / Date → Date; null si inválido */
function parseDate(d) {
  if (!d) return null
  if (d instanceof Date) return isNaN(d) ? null : d
  const s = String(d).substring(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [day, m, y] = s.split('-').map(Number)
    return new Date(y, m - 1, day)
  }
  return null
}

/** Días transcurridos desde fecha hasta hoy (entero). Null si fecha inválida */
function diasDesde(fecha) {
  const d = parseDate(fecha)
  if (!d) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.floor((hoy - d) / 86_400_000)
}

/**
 * Formatea un valor calculado de "tiempo":
 * - null/undefined → '—'
 * - string (estado textual) → tal cual
 * - número → 'N d.'
 */
export function formatDias(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'string') return val
  return `${val} d.`
}

// ─── Campos calculados — réplica de fórmulas Excel ───────────────────────────

export function calcSubEstado(row) {
  if (row.fecha_dispo_desierta && row.dispo_desierta)     return 'Q-DESIERTO'
  if (row.cargo_sial)                                     return 'O-ALTA SIAL'
  if (row.fecha_resolucion && row.resolucion_designacion) return 'N-DESIGNADO'
  if (row.reso_a_la_firma)                                return 'M-RESO A LA FIRMA'
  if (row.proyecto_resolucion)                            return 'L-PYCTO DE RESO'
  if (row.fecha_ite)                                      return 'K-ITE'
  if (row.fecha_apto_medico)                              return 'J-APTO MED'
  if (row.carga_documentacion)                            return 'I-CARGA DOCU'
  if (row.ee_designacion)                                 return 'H-TAD'
  if (row.fecha_insal)                                   return 'G-INSAL'
  if (row.fecha_ifacs)                                   return 'F-IFACS'
  if (row.fecha_orden_merito)                             return 'E-ORDEN DE MERITO'
  if (row.fecha_examen)                                  return 'D-EXAMEN PUBLICADO'
  if (row.disposicion)                                    return 'C-DISPO DE LLAMADO'
  if (row.sorteo_jurado)                                  return 'B-SORTEO JUR'
  if (row.fecha_autorizacion)                             return 'A-AUTZN'
  if (row.ee_concurso && row.ee_baja)                     return 'A-CARATULADO'
  if (!row.ee_baja && !row.ee_concurso)                   return 'VACANTE'
  return 'NO INICIADO'
}

export function calcEstado(row) {
  if (row.resolucion_designacion) return 'FINALIZADO'
  if (row.ee_baja && row.ee_concurso && row.fecha_baja && row.fecha_ee_concurso) return 'ACTIVO'
  return 'NO INICIADO'
}

export function calcSubEstado3(row) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  if (row.fecha_dispo_desierta)                         return 'H-DESIERTO'
  if (row.resolucion_designacion)                       return 'G-RESOLUCION'
  if (row.ee_designacion)                               return 'F-PROX. A DESIG'
  const dExamen    = parseDate(row.fecha_examen)
  if (dExamen && hoy >= dExamen)                        return 'E-ADJUDI'
  const dInscHasta = parseDate(row.fecha_insc_hasta)
  if (dInscHasta && hoy >= dInscHasta)                  return 'D-ETAPA EVAL'
  if (row.disposicion)                                  return 'C-INSCRIPCION'
  if (row.fecha_autorizacion && row.sorteo_jurado)       return 'B-AUTORIZADO'
  return 'A-VALID. VCTE'
}

export function calcCambioEspecialidad(row) {
  if (!row.especialidad_baja || !row.especialidad_solicitada) return ''
  return row.especialidad_baja.trim() !== row.especialidad_solicitada.trim() ? 'SI' : 'NO'
}

export function calcTiempoBaja(row) {
  if (!row.ee_concurso) return diasDesde(row.fecha_baja)
  return 'CON CONCURSO'
}

export function calcTiempoDesdeAutorizacion(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (!row.fecha_autorizacion && row.ee_concurso) return diasDesde(row.fecha_ee_concurso)
  if (row.fecha_autorizacion) return 'AUTORIZADO'
  return 'PENDIENTE'
}

export function calcTiempoConAutorizacion(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (!row.disposicion && row.fecha_autorizacion) return diasDesde(row.fecha_autorizacion)
  if (row.disposicion) return 'CON DISPOSICION'
  return 'PENDIENTE'
}

export function calcTiempoInscripcion(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (!row.examen_publicado && row.disposicion) return diasDesde(row.fecha_insc_hasta)
  if (row.examen_publicado) return 'CON EXAMEN'
  return 'PENDIENTE'
}

export function calcTiempoExamen(row) {
  if (!row.orden_merito && row.examen_publicado) return diasDesde(row.fecha_examen)
  if (row.orden_merito) return 'CON ORDEN DE MERITO'
  return 'PENDIENTE'
}

export function calcTiempoIfacs(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (!row.fecha_ifacs && row.orden_merito) return diasDesde(row.fecha_orden_merito)
  if (row.fecha_ifacs) return 'CON IFACS'
  return 'PENDIENTE'
}

export function calcTiempoInsal(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (!row.insal && row.fecha_ifacs) return diasDesde(row.fecha_ifacs)
  if (row.insal) return 'CON INSAL'
  return 'PENDIENTE'
}

export function calcTiempoAdjudicacion(row) {
  if (row.ee_designacion) return 'ADJUDICADO'
  if (row.fecha_examen) return diasDesde(row.fecha_examen)
  return 'AGUARDA F. EXAMEN'
}

export function calcTiempoTad(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (!row.ee_designacion && row.insal) return diasDesde(row.fecha_insal)
  if (row.ee_designacion) return 'CON TAD'
  return 'PENDIENTE'
}

export function calcArcoTadApto(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (row.fecha_ite) return 'APTO REALIZADO'
  if (row.fecha_apto_medico) return diasDesde(row.fecha_apto_medico)
  return 'PENDIENTE'
}

export function calcArcoTadIte(row) {
  if (row.fecha_dispo_desierta) return 'DESIERTO'
  if (row.proyecto_resolucion) return 'ITE REALIZADO'
  if (row.fecha_ite) return diasDesde(row.fecha_ite)
  return 'PENDIENTE'
}

export function calcArcoTadReso(row) {
  if (!row.resolucion_designacion && row.ee_designacion) return diasDesde(row.fecha_ee_designacion)
  if (row.resolucion_designacion) return 'CON RESOLUCION'
  return 'PENDIENTE'
}

export function calcArcoProxDesig(row) {
  if (row.resolucion_designacion) return 'CON RESOLUCION'
  if (!row.ee_designacion && row.fecha_insal) return diasDesde(row.fecha_insal)
  if (!row.fecha_insal) return 'PENDIENTE INSAL'
  return 'PROXIMO DESIG'
}

export function calcConteoConcurso(row) {
  if (row.resolucion_designacion) return 'CON RESOLUCION'
  if (!row.disposicion) return 'PENDIENTE DISPOSICION'
  const d1 = parseDate(row.fecha_insc_desde)
  const d2 = parseDate(row.fecha_insc_hasta)
  if (!d1 || !d2) return null
  return Math.round((d2 - d1) / 86_400_000)
}

export function calcSubEstadoPou(row) {
  if ((row.escalafon_2 || '').toUpperCase() !== 'POU') return ''
  const sub3 = calcSubEstado3(row)
  return sub3 !== 'G-RESOLUCION' ? sub3 : ''
}

export function calcCargoBaja(row) {
  const d1 = parseDate(row.fecha_ee_concurso)
  const d2 = parseDate(row.fecha_ee_designacion)
  if (!d1 || !d2) return null
  return Math.round((d2 - d1) / 86_400_000)
}

/**
 * Calcula el "Estado Concurso" para un registro CEETPS según la etapa más
 * avanzada que tenga datos cargados. Evaluación de más a menos avanzada.
 */
export function computeEstadoConcurso(form) {
  const ok = (v) => v !== null && v !== undefined && v !== '' && v !== false
  if (ok(form.resolucion_designacion)) return 'Finalizado'
  if (ok(form.dispo_designacion))      return 'Disposición de Designación'
  if (ok(form.expediente_designacion)) return 'TAD'
  if (ok(form.fecha_insal))            return 'INSAL'
  if (ok(form.fecha_ifacs))            return 'IFACS'
  if (ok(form.dispo_llamado))          return 'Disposición de Llamado'
  if (ok(form.puesto_solicitado))      return 'Autorizado'
  if (ok(form.expediente_concurso))    return 'Sin Autorizar'
  return ''
}

// --- Date conversion helpers -------------------------------------------------

export function isoToDmy(v) {
  if (!v) return ''
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[3] + '/' + m[2] + '/' + m[1]
  return v
}

export function dmyToIso(v) {
  if (!v) return null
  const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  // Si no matchea DD/MM/AAAA completo (fecha a medio tipear, formato inválido),
  // no lo mandamos tal cual al backend — se guardaría un string no-ISO.
  return m ? (m[3] + '-' + m[2] + '-' + m[1]) : null
}

// --- Date mask helper (DD/MM/AAAA, sin separadores mixtos, tope año actual + 1) --
const FECHA_MASK_MAX = { dia: 31, mes: 12, get anio() { return new Date().getFullYear() + 1 } }

/** A partir de cualquier texto (con o sin separadores), devuelve 'DD/MM/AAAA'
 *  parcial o completo, recortando cada segmento a su máximo real
 *  (día ≤ 31, mes ≤ 12, año ≤ año actual + 1) — nunca deja pasar un valor de más. */
export function formatDateMask(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8)
  let dia  = digits.slice(0, 2)
  let mes  = digits.slice(2, 4)
  let anio = digits.slice(4, 8)

  if (dia.length === 2) {
    const d = Math.min(Math.max(parseInt(dia, 10) || 0, 1), FECHA_MASK_MAX.dia)
    dia = String(d).padStart(2, '0')
  }
  if (mes.length === 2) {
    const m = Math.min(Math.max(parseInt(mes, 10) || 0, 1), FECHA_MASK_MAX.mes)
    mes = String(m).padStart(2, '0')
  }
  if (anio.length === 4) {
    const a = Math.min(parseInt(anio, 10) || 0, FECHA_MASK_MAX.anio)
    anio = String(a)
  }

  // Recorta el día al máximo real del mes ya cargado (ej: no deja pasar 31/02).
  // Mientras el año no esté completo, usa un año bisiesto de referencia para no
  // cortar el 29/02 de más; al completarse el año se vuelve a ajustar si hace falta.
  if (dia.length === 2 && mes.length === 2) {
    const anioRef = anio.length === 4 ? parseInt(anio, 10) : 2000
    const maxDia = new Date(anioRef, parseInt(mes, 10), 0).getDate()
    if (parseInt(dia, 10) > maxDia) dia = String(maxDia).padStart(2, '0')
  }

  let out = dia
  if (mes)  out += '/' + mes
  if (anio) out += '/' + anio
  return out
}
