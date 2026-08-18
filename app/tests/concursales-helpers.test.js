/**
 * Tests unitarios — helpers calculados del módulo Concursales
 *
 * Cubre: calcEstado, calcSubEstado, calcSubEstado3 (backend: seguimientoCphCalc.js)
 * No requiere BD — lógica pura.
 *
 * Casos borde documentados:
 *  - Prioridad de suspendido sobre todo lo demás
 *  - Prioridad de resolucion_designacion sobre ACTIVO
 *  - calcSubEstado3: ramas dependientes de fecha (E-ADJUDI, D-ETAPA EVAL)
 *  - Campos falsy vs null vs string vacío
 */

const {
  calcEstado,
  calcSubEstado,
  calcSubEstado3,
} = require('../src/modules/seguimiento-cph/seguimientoCphCalc');

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

/** Fecha ISO N días en el pasado */
function pastDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Fecha ISO N días en el futuro */
function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── calcEstado ───────────────────────────────────────────────────────────────

describe('calcEstado', () => {
  test('suspendido tiene prioridad máxima sobre todo', () => {
    expect(calcEstado({
      suspendido: true,
      resolucion_designacion: 'RES-123',
      ee_baja: 'EE-1', ee_concurso: 'EE-2',
      fecha_baja: '2024-01-01', fecha_ee_concurso: '2024-02-01',
    })).toBe('SUSPENDIDO');
  });

  test('resolucion_designacion → FINALIZADO (sin suspendido)', () => {
    expect(calcEstado({
      suspendido: false,
      resolucion_designacion: 'RES-456',
    })).toBe('FINALIZADO');
  });

  test('resolucion_designacion string vacío no activa FINALIZADO', () => {
    expect(calcEstado({
      suspendido: false,
      resolucion_designacion: '',
      ee_baja: 'EE-1', ee_concurso: 'EE-2',
      fecha_baja: '2024-01-01', fecha_ee_concurso: '2024-02-01',
    })).toBe('ACTIVO');
  });

  test('todos los campos de ACTIVO presentes → ACTIVO', () => {
    expect(calcEstado({
      suspendido: false,
      resolucion_designacion: null,
      ee_baja: 'EE-1',
      ee_concurso: 'EE-2',
      fecha_baja: '2024-01-01',
      fecha_ee_concurso: '2024-02-01',
    })).toBe('ACTIVO');
  });

  test('falta ee_concurso → NO INICIADO', () => {
    expect(calcEstado({
      suspendido: false,
      resolucion_designacion: null,
      ee_baja: 'EE-1',
      ee_concurso: null,
      fecha_baja: '2024-01-01',
      fecha_ee_concurso: '2024-02-01',
    })).toBe('NO INICIADO');
  });

  test('falta fecha_baja → NO INICIADO', () => {
    expect(calcEstado({
      suspendido: false,
      resolucion_designacion: null,
      ee_baja: 'EE-1',
      ee_concurso: 'EE-2',
      fecha_baja: null,
      fecha_ee_concurso: '2024-02-01',
    })).toBe('NO INICIADO');
  });

  test('row vacío → NO INICIADO', () => {
    expect(calcEstado({})).toBe('NO INICIADO');
  });
});

// ─── calcSubEstado ────────────────────────────────────────────────────────────

describe('calcSubEstado', () => {
  test('Q-DESIERTO: fecha_dispo_desierta + dispo_desierta', () => {
    expect(calcSubEstado({
      fecha_dispo_desierta: '2024-06-01',
      dispo_desierta: true,
    })).toBe('Q-DESIERTO');
  });

  test('Q-DESIERTO no activa si falta dispo_desierta', () => {
    // Solo fecha sin flag → no es Q-DESIERTO, cae a P-SUSPENDIDO si suspendido
    expect(calcSubEstado({
      fecha_dispo_desierta: '2024-06-01',
      dispo_desierta: false,
      suspendido: true,
    })).toBe('P-SUSPENDIDO');
  });

  test('P-SUSPENDIDO tiene prioridad sobre todo excepto Q-DESIERTO', () => {
    expect(calcSubEstado({
      suspendido: true,
      cargo_sial: 'SIAL-1',
      resolucion_designacion: 'RES-1',
    })).toBe('P-SUSPENDIDO');
  });

  test('O-ALTA SIAL: cargo_sial presente', () => {
    expect(calcSubEstado({ cargo_sial: 'SIAL-001' })).toBe('O-ALTA SIAL');
  });

  test('N-DESIGNADO: fecha_resolucion + resolucion_designacion', () => {
    expect(calcSubEstado({
      fecha_resolucion: '2024-10-01',
      resolucion_designacion: 'RES-789',
    })).toBe('N-DESIGNADO');
  });

  test('N-DESIGNADO no activa si falta fecha_resolucion', () => {
    expect(calcSubEstado({
      fecha_resolucion: null,
      resolucion_designacion: 'RES-789',
      reso_a_la_firma: true,
    })).toBe('M-RESO A LA FIRMA');
  });

  test('M-RESO A LA FIRMA', () => {
    expect(calcSubEstado({ reso_a_la_firma: true })).toBe('M-RESO A LA FIRMA');
  });

  test('L-PYCTO DE RESO', () => {
    expect(calcSubEstado({ proyecto_resolucion: true })).toBe('L-PYCTO DE RESO');
  });

  test('K-ITE', () => {
    expect(calcSubEstado({ fecha_ite: '2024-09-01' })).toBe('K-ITE');
  });

  test('J-APTO MED', () => {
    expect(calcSubEstado({ fecha_apto_medico: '2024-08-01' })).toBe('J-APTO MED');
  });

  test('I-CARGA DOCU', () => {
    expect(calcSubEstado({ carga_documentacion: true })).toBe('I-CARGA DOCU');
  });

  test('H-TAD: ee_designacion presente', () => {
    expect(calcSubEstado({ ee_designacion: 'EE-DES-001' })).toBe('H-TAD');
  });

  test('G-INSAL', () => {
    expect(calcSubEstado({ fecha_insal: '2024-07-01' })).toBe('G-INSAL');
  });

  test('F-IFACS', () => {
    expect(calcSubEstado({ fecha_ifacs: '2024-06-01' })).toBe('F-IFACS');
  });

  test('E-ORDEN DE MERITO', () => {
    expect(calcSubEstado({ fecha_orden_merito: '2024-05-01' })).toBe('E-ORDEN DE MERITO');
  });

  test('D-EXAMEN PUBLICADO', () => {
    expect(calcSubEstado({ fecha_examen: '2024-04-01' })).toBe('D-EXAMEN PUBLICADO');
  });

  test('C-DISPO DE LLAMADO', () => {
    expect(calcSubEstado({ disposicion: 'DISP-001' })).toBe('C-DISPO DE LLAMADO');
  });

  test('B-SORTEO JUR', () => {
    expect(calcSubEstado({ sorteo_jurado: true })).toBe('B-SORTEO JUR');
  });

  test('A-AUTZN: solo fecha_autorizacion', () => {
    expect(calcSubEstado({ fecha_autorizacion: '2024-03-01' })).toBe('A-AUTZN');
  });

  test('A-CARATULADO: ee_concurso + ee_baja sin más datos', () => {
    expect(calcSubEstado({ ee_concurso: 'EE-C', ee_baja: 'EE-B' })).toBe('A-CARATULADO');
  });

  test('VACANTE: sin ee_baja ni ee_concurso', () => {
    expect(calcSubEstado({ ee_baja: null, ee_concurso: null })).toBe('VACANTE');
  });

  test('VACANTE: row vacío', () => {
    expect(calcSubEstado({})).toBe('VACANTE');
  });

  test('NO INICIADO: solo ee_baja sin ee_concurso', () => {
    // ee_baja presente pero ee_concurso ausente → no es A-CARATULADO ni VACANTE
    expect(calcSubEstado({ ee_baja: 'EE-B', ee_concurso: null })).toBe('NO INICIADO');
  });

  // Verificar orden de prioridad completo
  test('prioridad: Q > P > O > N > M > L > K > J > I > H > G > F > E > D > C > B > A-AUTZN', () => {
    // Registro con todos los campos — debe retornar el de mayor prioridad
    const full = {
      fecha_dispo_desierta: '2024-01-01', dispo_desierta: true,
      suspendido: true, cargo_sial: 'X',
      fecha_resolucion: '2024-01-01', resolucion_designacion: 'R',
      reso_a_la_firma: true, proyecto_resolucion: true,
      fecha_ite: '2024-01-01', fecha_apto_medico: '2024-01-01',
      carga_documentacion: true, ee_designacion: 'X',
      fecha_insal: '2024-01-01', fecha_ifacs: '2024-01-01',
      fecha_orden_merito: '2024-01-01', fecha_examen: '2024-01-01',
      disposicion: 'X', sorteo_jurado: true,
      fecha_autorizacion: '2024-01-01',
      ee_concurso: 'X', ee_baja: 'X',
    };
    expect(calcSubEstado(full)).toBe('Q-DESIERTO');
  });
});

// ─── calcSubEstado3 ───────────────────────────────────────────────────────────

describe('calcSubEstado3', () => {
  test('H-DESIERTO: fecha_dispo_desierta presente', () => {
    expect(calcSubEstado3({ fecha_dispo_desierta: '2024-01-01' })).toBe('H-DESIERTO');
  });

  test('G-RESOLUCION: resolucion_designacion presente', () => {
    expect(calcSubEstado3({ resolucion_designacion: 'RES-001' })).toBe('G-RESOLUCION');
  });

  test('F-PROX. A DESIG: ee_designacion presente', () => {
    expect(calcSubEstado3({ ee_designacion: 'EE-DES' })).toBe('F-PROX. A DESIG');
  });

  test('E-ADJUDI: fecha_examen en el pasado', () => {
    expect(calcSubEstado3({ fecha_examen: pastDate(1) })).toBe('E-ADJUDI');
  });

  test('E-ADJUDI: fecha_examen = hoy', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    expect(calcSubEstado3({ fecha_examen: hoy })).toBe('E-ADJUDI');
  });

  test('NO E-ADJUDI: fecha_examen en el futuro → sigue evaluando', () => {
    // Sin más datos → cae a A-VALID. VCTE
    expect(calcSubEstado3({ fecha_examen: futureDate(5) })).toBe('A-VALID. VCTE');
  });

  test('D-ETAPA EVAL: fecha_insc_hasta en el pasado (sin examen)', () => {
    expect(calcSubEstado3({ fecha_insc_hasta: pastDate(1) })).toBe('D-ETAPA EVAL');
  });

  test('D-ETAPA EVAL: fecha_insc_hasta = hoy', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    expect(calcSubEstado3({ fecha_insc_hasta: hoy })).toBe('D-ETAPA EVAL');
  });

  test('NO D-ETAPA EVAL: fecha_insc_hasta en el futuro', () => {
    expect(calcSubEstado3({ fecha_insc_hasta: futureDate(5) })).toBe('A-VALID. VCTE');
  });

  test('C-INSCRIPCION: disposicion presente', () => {
    expect(calcSubEstado3({ disposicion: 'DISP-001' })).toBe('C-INSCRIPCION');
  });

  test('B-AUTORIZADO: fecha_autorizacion + sorteo_jurado', () => {
    expect(calcSubEstado3({
      fecha_autorizacion: '2024-03-01',
      sorteo_jurado: true,
    })).toBe('B-AUTORIZADO');
  });

  test('NO B-AUTORIZADO: fecha_autorizacion sin sorteo_jurado', () => {
    expect(calcSubEstado3({
      fecha_autorizacion: '2024-03-01',
      sorteo_jurado: false,
    })).toBe('A-VALID. VCTE');
  });

  test('A-VALID. VCTE: row vacío', () => {
    expect(calcSubEstado3({})).toBe('A-VALID. VCTE');
  });

  test('prioridad: H > G > F > E > D > C > B > A', () => {
    const full = {
      fecha_dispo_desierta: '2024-01-01',
      resolucion_designacion: 'R',
      ee_designacion: 'X',
      fecha_examen: pastDate(1),
      fecha_insc_hasta: pastDate(1),
      disposicion: 'X',
      fecha_autorizacion: '2024-01-01', sorteo_jurado: true,
    };
    expect(calcSubEstado3(full)).toBe('H-DESIERTO');
  });

  // Caso borde: E-ADJUDI tiene prioridad sobre D-ETAPA EVAL
  test('E-ADJUDI tiene prioridad sobre D-ETAPA EVAL cuando ambas fechas pasaron', () => {
    expect(calcSubEstado3({
      fecha_examen: pastDate(2),
      fecha_insc_hasta: pastDate(1),
    })).toBe('E-ADJUDI');
  });

  // Caso borde: fecha_examen futuro + fecha_insc_hasta pasado → D-ETAPA EVAL
  test('fecha_examen futuro + fecha_insc_hasta pasado → D-ETAPA EVAL', () => {
    expect(calcSubEstado3({
      fecha_examen: futureDate(10),
      fecha_insc_hasta: pastDate(1),
    })).toBe('D-ETAPA EVAL');
  });

  // Caso borde: string vacío en resolucion_designacion no activa G-RESOLUCION
  test('resolucion_designacion string vacío no activa G-RESOLUCION', () => {
    expect(calcSubEstado3({
      resolucion_designacion: '',
      ee_designacion: 'EE-X',
    })).toBe('F-PROX. A DESIG');
  });
});

// ─── Consistencia frontend ↔ backend ─────────────────────────────────────────
// Los helpers del frontend son idénticos al backend — verificamos que los casos
// críticos producen el mismo resultado en ambas implementaciones.
// (Aquí testeamos la versión backend; si divergen, hay que sincronizar a mano.)

describe('consistencia calcSubEstado3 — casos que dependen de la fecha actual', () => {
  test('fecha_examen ayer → E-ADJUDI (no D-ETAPA EVAL)', () => {
    const row = { fecha_examen: pastDate(1) };
    expect(calcSubEstado3(row)).toBe('E-ADJUDI');
  });

  test('fecha_insc_hasta ayer, sin examen → D-ETAPA EVAL', () => {
    const row = { fecha_insc_hasta: pastDate(1) };
    expect(calcSubEstado3(row)).toBe('D-ETAPA EVAL');
  });

  test('ambas fechas en el futuro → A-VALID. VCTE', () => {
    const row = {
      fecha_examen: futureDate(10),
      fecha_insc_hasta: futureDate(5),
    };
    expect(calcSubEstado3(row)).toBe('A-VALID. VCTE');
  });
});
