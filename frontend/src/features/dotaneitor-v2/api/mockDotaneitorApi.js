// ─── Adaptador MOCK del Dotaneitor ──────────────────────────────────────────
// Misma interfaz que api/dotaneitorApi.js pero sin backend real.
// Datos deterministas: cada recarga genera el mismo "archivo" y el mismo diff.

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10)
}

// ── Datos base (deterministas) ──────────────────────────────────────────────

const NOMBRES = [
  'MARIA', 'JOSE', 'ANA', 'CARLOS', 'LAURA', 'DIEGO', 'PAOLA', 'MARTIN',
  'SILVIA', 'GUSTAVO', 'CLAUDIA', 'ANDRES', 'VALERIA', 'FEDERICO', 'ROMINA',
  'LEANDRO', 'GABRIELA', 'PABLO', 'VERONICA', 'SEBASTIAN', 'DANIELA',
  'MATIAS', 'CINTIA', 'NICOLAS', 'FLORENCIA', 'JAVIER', 'CARINA', 'MARCELO',
  'GRISELDA', 'HERNAN', 'NATALIA', 'RICARDO', 'SOLEDAD', 'FERNANDO',
  'MARIANA', 'OSCAR', 'LILIANA', 'DAMIAN', 'MARCELA', 'ROBERTO',
]

const APELLIDOS = [
  'GONZALEZ', 'RODRIGUEZ', 'FERNANDEZ', 'LOPEZ', 'MARTINEZ', 'GARCIA',
  'SANCHEZ', 'PEREZ', 'GOMEZ', 'DIAS', 'ALVAREZ', 'ROMERO', 'SUAREZ',
  'TORRES', 'RUIZ', 'RAMIREZ', 'FLORES', 'ACOSTA', 'MORALES', 'CABRAL',
  'MEDINA', 'HERRERA', 'AGUIRRE', 'BENITEZ', 'CORDOBA', 'PAZ', 'VEGA',
  'SOSA', 'RIVERA', 'CAMPOS', 'MENDEZ', 'MOLINA', 'PONCE', 'RIOS',
  'IBARRA', 'OROZCO', 'VILLALBA', 'FIGUEROA', 'LAGOS', 'ARIAS',
]

const HOSPITALES = [
  'HOSPITAL ALVAREZ', 'HOSPITAL PINERO', 'HOSPITAL FERNANDEZ',
  'HOSPITAL RAMOS MEJIA', 'HOSPITAL DURAND', 'HOSPITAL SANTOLANNI',
  'CESAC Nº 3', 'CESAC Nº 12', 'HOSPITAL TORNU', 'HOSPITAL ARGERICH',
]

const SIGLA_BY_HOSP = {
  'HOSPITAL ALVAREZ': 'HALV', 'HOSPITAL PINERO': 'HPIN',
  'HOSPITAL FERNANDEZ': 'HFER', 'HOSPITAL RAMOS MEJIA': 'HRM',
  'HOSPITAL DURAND': 'HDUR', 'HOSPITAL SANTOLANNI': 'HSAN',
  'CESAC Nº 3': 'C3', 'CESAC Nº 12': 'C12', 'HOSPITAL TORNU': 'HTOR',
  'HOSPITAL ARGERICH': 'HARG',
}

const LITERAL_PUESTO = [
  'MEDICO DE GUARDIA', 'MEDICO DE PLANTA', 'LIC. EN ENFERMERIA',
  'ENFERMERO', 'TECNICO EN RADIOLOGIA', 'ADMINISTRATIVO',
  'JEFE DE UNIDAD', 'RESIDENTE 1ER AÑO', 'RESIDENTE 3ER AÑO',
  'TECNICO EN LABORATORIO', 'PSICOLOGO', 'KINESIOLOGO',
]

const ESPECIALIDADES = [
  'CLINICA MEDICA', 'CARDIOLOGIA', 'PEDIATRIA', 'NEUMONOLOGIA',
  'INFECTOLOGIA', 'TERAPIA INTENSIVA', 'CIRUGIA GENERAL', 'TRAUMATOLOGIA',
]

const AGRUPADORES = ['Medico', 'No medico', 'Residente']
const UNIVERSOS = ['MEDICO', 'PARAMEDICO', 'TECNICO', 'ADMINISTRATIVO', 'RESIDENTE', 'SUPLENTE']
const ESTADOS = ['ACTIVO', 'LICENCIA', 'ACTIVO', 'ACTIVO', 'AUSENTE']
const SIT_REVISTA = ['OFICIAL', 'REEMPLAZANTE', 'CONTRATADO', 'SUPLENTE', 'OFICIAL']

const WATCH = [
  'siglas', 'universo_totalizador', 'escalafon', 'codigo_de_registro',
  'literal_puesto', 'especialidad', 'unificador_de_puestos', 'agrupador',
  'estado', 'situacion_de_revista',
]

const TOTAL_BASE = 130
const MODIFICADOS = new Set([3, 17, 22, 45, 58, 71, 90, 104])
const NUEVOS_IDX = new Set([121, 122, 123, 124, 125, 126, 127, 128, 129])
const ELIMINADOS_EXTRA = ['S90001001', 'S90001002', 'S90001003', 'S90001004']

function sial(i) { return String(10000000 + i * 173) }

function persona(i, { conModificacion = false } = {}) {
  const hosp = HOSPITALES[i % HOSPITALES.length]
  const ayn = `${APELLIDOS[i % APELLIDOS.length]}, ${NOMBRES[(i * 7) % NOMBRES.length]}`.trim()
  const sexo = i % 3 === 0 ? 'F' : 'M'
  const anioNac = 1958 + ((i * 11) % 45)
  const codReg = i % 17 === 0 ? '23' : i % 23 === 0 ? '24' : '37'
  const esResidente = codReg === '24'
  let agrupador = esResidente ? 'Residente' : (i % 2 === 0 ? 'Medico' : 'No medico')
  let especialidad = ''
  if (agrupador === 'Medico') especialidad = ESPECIALIDADES[(i * 5) % ESPECIALIDADES.length]
  if (esResidente) especialidad = ESPECIALIDADES[(i * 7 + 2) % ESPECIALIDADES.length]

  if (conModificacion) {
    const tipo = i % 3
    if (tipo === 0) especialidad = ESPECIALIDADES[(i * 5 + 3) % ESPECIALIDADES.length]
    if (tipo === 1) agrupador = agrupador === 'Medico' ? 'No medico' : 'Medico'
    if (tipo === 2) especialidad = ''
  }

  const numDoc = String(20000000 + i * 137).padStart(8, '0')
  return {
    'ID SIAL': sial(i),
    'CUIL': '20' + numDoc,
    'CUIL Y ROL': `20-${numDoc.slice(0, 8)}-${codReg}`,
    'AYN': ayn,
    'FECHA NACIMIENTO': `${anioNac}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    'EDAD': 2026 - anioNac,
    'SEXO': sexo,
    'TIPO DOC': 'DNI',
    'NUMERO DOC': numDoc,
    'CODIGO REPA': null,
    'DESCRIPCION REPA': null,
    'SIGLAS': SIGLA_BY_HOSP[hosp],
    'UNIVERSO TOTALIZADOR': UNIVERSOS[i % UNIVERSOS.length],
    'TIPO DE HOSPITAL / SIGLA': 'HOSPITAL',
    'MONOVALENCIA': i % 7 === 0 ? 'MONOVALENTE' : null,
    'ESCALAFON': agrupador === 'Medico' ? 'MEDICO' : 'PARAMEDICO',
    'CODIGO DE REGISTRO': codReg,
    'LITERAL CR': LITERAL_PUESTO[(i * 3) % LITERAL_PUESTO.length],
    'REGIMEN': 'Ley 6035',
    'SITUACION DE REVISTA': SIT_REVISTA[i % SIT_REVISTA.length],
    'PUESTO': esResidente ? `R${(i % 3) + 1}` : `P${(i % 14) + 1}`,
    'LITERAL PUESTO': LITERAL_PUESTO[(i * 3) % LITERAL_PUESTO.length],
    'ESPECIALIDAD': especialidad,
    'UNIFICADOR DE PUESTOS': (i * 3) % 7,
    'AGRUPADOR': agrupador,
    'CODIGO JEFATURAS': null,
    'JEFE ESCALAFON': null,
    'ESTADO': ESTADOS[i % ESTADOS.length],
  }
}

function personaEliminada(i) {
  const p = persona((i * 5) % TOTAL_BASE)
  return {
    ...p,
    'ID SIAL': ELIMINADOS_EXTRA[i],
    'AYN': p['AYN'].replace(/^([A-Z]+), (.*)$/, 'EXTRA, $2 $1'),
    'ESPECIALIDAD': p['ESPECIALIDAD'],
    'ESTADO': 'RETIRO',
  }
}

function baseRows() {
  return Array.from({ length: TOTAL_BASE }, (_, i) => persona(i))
}

// ── Estado de la "BD actual" (mutado por guardar-bd) ───────────────────────

let bdRows = null
let historial = []
let ultimoGuardado = null

export function _resetMock() {
  bdRows = null
  historial = []
  ultimoGuardado = null
}

function buildBdRows() {
  const rows = []
  for (let i = 0; i < TOTAL_BASE; i++) {
    if (NUEVOS_IDX.has(i)) continue
    rows.push(persona(i))
  }
  for (let j = 0; j < ELIMINADOS_EXTRA.length; j++) {
    rows.push(personaEliminada(j))
  }
  MODIFICADOS.forEach((i) => {
    const idx = rows.findIndex((r) => r['ID SIAL'] === sial(i))
    if (idx >= 0) rows[idx] = persona(i, { conModificacion: true })
  })
  return rows
}

function getBdRows() {
  if (!bdRows) bdRows = buildBdRows()
  return bdRows
}

// ── Diff (mismo formato que el endpoint real) ───────────────────────────────

const CAMPO_KEY = {
  'SIGLAS': 'siglas', 'UNIVERSO TOTALIZADOR': 'universo_totalizador',
  'ESCALAFON': 'escalafon', 'CODIGO DE REGISTRO': 'codigo_de_registro',
  'LITERAL PUESTO': 'literal_puesto', 'ESPECIALIDAD': 'especialidad',
  'UNIFICADOR DE PUESTOS': 'unificador_de_puestos', 'AGRUPADOR': 'agrupador',
  'ESTADO': 'estado', 'SITUACION DE REVISTA': 'situacion_de_revista',
}

function computeDiff(nuevosRows) {
  const bd = getBdRows()
  const bdById = new Map(bd.map((r) => [String(r['ID SIAL']), r]))
  const nuevosIds = new Set(nuevosRows.map((r) => String(r['ID SIAL'])))

  const nuevos = []
  const eliminados = []
  const modificados = []

  for (const r of nuevosRows) {
    const id = String(r['ID SIAL'])
    if (!bdById.has(id)) {
      nuevos.push({
        id_sial: id, cuil_y_rol: r['CUIL Y ROL'], ayn: r['AYN'],
        siglas: r['SIGLAS'], escalafon: r['ESCALAFON'],
        literal_puesto: r['LITERAL PUESTO'], especialidad: r['ESPECIALIDAD'],
      })
    }
  }
  for (const r of bd) {
    const id = String(r['ID SIAL'])
    if (!nuevosIds.has(id)) {
      eliminados.push({
        id_sial: id, cuil_y_rol: r['CUIL Y ROL'], ayn: r['AYN'],
        siglas: r['SIGLAS'], escalafon: r['ESCALAFON'],
        literal_puesto: r['LITERAL PUESTO'], especialidad: r['ESPECIALIDAD'],
      })
    }
  }
  for (const r of nuevosRows) {
    const id = String(r['ID SIAL'])
    const ant = bdById.get(id)
    if (!ant) continue
    const cambios = []
    for (const [colEs, key] of Object.entries(CAMPO_KEY)) {
      const vAnt = String(ant[colEs] ?? '')
      const vNew = String(r[colEs] ?? '')
      if (vAnt !== vNew) {
        cambios.push({ campo: key, antes: vAnt || null, despues: vNew || null })
      }
    }
    if (cambios.length) {
      modificados.push({
        id_sial: id, cuil_y_rol: r['CUIL Y ROL'], ayn: r['AYN'],
        siglas: r['SIGLAS'], cambios,
      })
    }
  }

  return {
    nuevos, eliminados, modificados,
    total_nuevos: nuevos.length,
    total_eliminados: eliminados.length,
    total_modificados: modificados.length,
    total_campos_modificados: modificados.reduce((a, m) => a + m.cambios.length, 0),
  }
}

// ── Logs por paso ───────────────────────────────────────────────────────────

function logsNormalizar() {
  return [
    { text: '✓ Normalización completada', type: 'success' },
    { text: '• 12 filas con nombre en mayúsculas corregido', type: 'info' },
    { text: '• 3 documentos sin dígito verificador completados', type: 'info' },
    { text: '• 4 cargos repetidos consolidados (CUIL Y ROL)', type: 'info' },
  ]
}

function logsProcesar() {
  return [
    { text: `✓ ${TOTAL_BASE} registros procesados`, type: 'success' },
    { text: `• Escalafones asignados: ${Math.round(TOTAL_BASE / 2)} MEDICO, ${TOTAL_BASE - Math.round(TOTAL_BASE / 2)} PARAMEDICO`, type: 'info' },
    { text: `[!] ${WATCH.length} filas sin LITERAL PUESTO — ver reporte de calidad`, type: 'warning' },
    { text: '[!] 2 filas con UNIVERSO TOTALIZADOR incompleto', type: 'warning' },
  ]
}

function logsCruzar() {
  return [
    { text: 'ESPECIALIDADES CPH: 98 cuiles, 21 filas duplicadas removidas, 3 cuiles con varias especialidades', type: 'info' },
    { text: 'ESPECIALIDADES SUPLEMENTES: 21 cuiles', type: 'info' },
    { text: 'ESPECIALIDADES RESIDENTES: 11 cuiles', type: 'info' },
    { text: '✓ Huecos completados por CUIL: 9', type: 'success' },
    { text: '✓ Completados por AGRUPADOR: 6 (5 por CUIL, 1 por puesto)', type: 'success' },
    { text: `Cobertura ESPECIALIDAD: ${(100 - (14 / TOTAL_BASE) * 100).toFixed(1)}% (${TOTAL_BASE - 14}/${TOTAL_BASE})`, type: 'info' },
    { text: '[!] 14 filas con ESPECIALIDAD pero sin LITERAL PUESTO', type: 'warning' },
  ]
}

// ── Sesiones y jobs ─────────────────────────────────────────────────────────

const jobs = new Map()
const sesiones = new Set()

const API = {
  async health() {
    await delay(300)
    return true
  },

  async ultimaActualizacion() {
    await delay(150)
    return '2026-08-14 11:23:07'
  },

  async createSession() {
    await delay(150)
    const sid = 'mock_' + uid()
    sesiones.add(sid)
    return { session_id: sid }
  },

  async uploadCargos(session_id, file) {
    await delay(900)
    if (!sesiones.has(session_id)) throw new Error('Sesión no encontrada')
    const rows = 12800 + ((file?.name?.length ?? 7) % 7) * 100
    return { filename: file?.name ?? 'Cargos_salud_mock.xlsx', rows }
  },

  async runStep(session_id, step) {
    await delay(200)
    const job_id = 'job_' + uid()
    jobs.set(job_id, { status: 'pending', result: null, error: null })
    const ms = { normalizar: 2400, procesar: 3400, cruzar: 2100 }[step] ?? 2000
    const logs = { normalizar: logsNormalizar, procesar: logsProcesar, cruzar: logsCruzar }[step]()
    setTimeout(() => {
      jobs.set(job_id, { status: 'done', result: { logs }, error: null })
    }, ms)
    return { job_id }
  },

  async pollJob(job_id) {
    await delay(650)
    return jobs.get(job_id) ?? { status: 'error', result: null, error: 'Job no encontrado' }
  },

  async preview(session_id, page = 1, limit = 50) {
    await delay(250)
    const rows = baseRows()
    const start = (page - 1) * limit
    return {
      cols: Object.keys(rows[0]),
      rows: rows.slice(start, start + limit),
      total: rows.length,
      page,
      limit,
    }
  },

  async diff(session_id, fechaAsignada) {
    await delay(1400)
    return computeDiff(baseRows())
  },

  async guardar(session_id, excluidos, fechaAsignada) {
    await delay(1500)
    const hoy = new Date().toISOString().slice(0, 10)
    const esHistorico = !!fechaAsignada && fechaAsignada < hoy

    const df = computeDiff(baseRows())
    if (!esHistorico) {
      const excl = new Set(excluidos)
      bdRows = baseRows().filter((r) => !excl.has(String(r['ID SIAL'])))
    }

    const nuevoProceso = {
      proceso_id: uid('proc_'),
      fecha_asignada: fechaAsignada || hoy,
      es_historico: esHistorico,
      insertados: df.total_nuevos,
      registros_actualizados: df.total_modificados,
      campos_modificados: df.total_campos_modificados,
      eliminados: df.total_eliminados,
      snapshot_guardado: true,
      fecha_proceso: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    historial.unshift(nuevoProceso)
    ultimoGuardado = nuevoProceso
    return nuevoProceso
  },

  async descargar(session_id, tipo) {
    await delay(600)
    const names = { descargar: 'Dotacion_procesada.xlsx', 'reporte-calidad': 'Reporte_calidad.xlsx' }
    const blob = new Blob(['--- archivo simulado ----'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = names[tipo] ?? 'descarga.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  },

  async sincronizar() {
    await delay(1100)
    const base = ultimoGuardado ?? { insertados: 0, registros_actualizados: 0, eliminados: 0 }
    return {
      insertados: base.insertados || 0,
      actualizados: base.registros_actualizados || 0,
      bajas: base.eliminados || 0,
    }
  },

  async historial() {
    await delay(400)
    const seed = {
      proceso_id: 'proc_seed_1',
      fecha: '2026-08-12 15:42:00',
      insertados: 3,
      eliminados: 1,
      campos_modificados: 7,
      registros_actualizados: 4,
      es_carga_inicial: 0,
      cambios: [
        { accion: 'update', id_sial: '10000121', ayn: 'GOMEZ, MARIA', campo: 'especialidad', valor_anterior: 'CLINICA MEDICA', valor_nuevo: 'CARDIOLOGIA' },
        { accion: 'update', id_sial: '10000051', ayn: 'LOPEZ, DIEGO', campo: 'situacion_de_revista', valor_anterior: 'OFICIAL', valor_nuevo: 'CONTRATADO' },
        { accion: 'insert', id_sial: '10000231', ayn: 'PAZ, CARINA', campo: null, valor_anterior: null, valor_nuevo: null },
      ],
    }
    return [seed, ...historial]
  },

  async deleteSession(session_id) {
    await delay(150)
    sesiones.delete(session_id)
    return { ok: true }
  },

  _mock: true,
}

export default API
export { WATCH }