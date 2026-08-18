/**
 * Réplica en backend (CommonJS) de calcEstado/calcSubEstado/calcSubEstado3
 * de frontend/src/utils/concursalesHelpers.js — mantener ambas en sync a mano
 * si la fórmula cambia (mismo patrón que la réplica en SQL de tablero-kpis).
 */

function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d) ? null : d;
  const s = String(d).substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [day, m, y] = s.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  return null;
}

function calcEstado(row) {
  if (row.resolucion_designacion) return 'FINALIZADO';
  if (row.ee_baja && row.ee_concurso && row.fecha_baja && row.fecha_ee_concurso) return 'ACTIVO';
  return 'NO INICIADO';
}

function calcSubEstado(row) {
  if (row.fecha_dispo_desierta && row.dispo_desierta)     return 'Q-DESIERTO';
  if (row.cargo_sial)                                     return 'O-ALTA SIAL';
  if (row.fecha_resolucion && row.resolucion_designacion) return 'N-DESIGNADO';
  if (row.reso_a_la_firma)                                return 'M-RESO A LA FIRMA';
  if (row.proyecto_resolucion)                            return 'L-PYCTO DE RESO';
  if (row.fecha_ite)                                      return 'K-ITE';
  if (row.fecha_apto_medico)                              return 'J-APTO MED';
  if (row.carga_documentacion)                            return 'I-CARGA DOCU';
  if (row.ee_designacion)                                 return 'H-TAD';
  if (row.fecha_insal)                                    return 'G-INSAL';
  if (row.fecha_ifacs)                                    return 'F-IFACS';
  if (row.fecha_orden_merito)                             return 'E-ORDEN DE MERITO';
  if (row.fecha_examen)                                   return 'D-EXAMEN PUBLICADO';
  if (row.disposicion)                                    return 'C-DISPO DE LLAMADO';
  if (row.sorteo_jurado)                                  return 'B-SORTEO JUR';
  if (row.fecha_autorizacion)                             return 'A-AUTZN';
  if (row.ee_concurso && row.ee_baja)                     return 'A-CARATULADO';
  if (!row.ee_baja && !row.ee_concurso)                   return 'VACANTE';
  return 'NO INICIADO';
}

function calcSubEstado3(row) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (row.fecha_dispo_desierta)                   return 'H-DESIERTO';
  if (row.resolucion_designacion)                 return 'G-RESOLUCION';
  if (row.ee_designacion)                         return 'F-PROX. A DESIG';
  const dExamen = parseDate(row.fecha_examen);
  if (dExamen && hoy >= dExamen)                  return 'E-ADJUDI';
  const dInscHasta = parseDate(row.fecha_insc_hasta);
  if (dInscHasta && hoy >= dInscHasta)            return 'D-ETAPA EVAL';
  if (row.disposicion)                            return 'C-INSCRIPCION';
  if (row.fecha_autorizacion && row.sorteo_jurado) return 'B-AUTORIZADO';
  return 'A-VALID. VCTE';
}

// Misma lógica que calcSubEstado3, en SQL (MySQL) — para poder filtrar/agrupar
// en la base sin depender del valor guardado en sub_estado_3, que se desactualiza
// solo con el paso del tiempo (las ramas E-ADJUDI/D-ETAPA EVAL dependen de hoy).
// Usada por SeguimientoCphService (filtro) y tablero-kpis (agregados).
const SUB_ESTADO_3_SQL = `
  CASE
    WHEN fecha_dispo_desierta IS NOT NULL THEN 'H-DESIERTO'
    WHEN COALESCE(resolucion_designacion, '') <> '' THEN 'G-RESOLUCION'
    WHEN COALESCE(ee_designacion, '') <> '' THEN 'F-PROX. A DESIG'
    WHEN fecha_examen IS NOT NULL AND fecha_examen <= CURDATE() THEN 'E-ADJUDI'
    WHEN fecha_insc_hasta IS NOT NULL AND fecha_insc_hasta <= CURDATE() THEN 'D-ETAPA EVAL'
    WHEN COALESCE(disposicion, '') <> '' THEN 'C-INSCRIPCION'
    WHEN fecha_autorizacion IS NOT NULL AND sorteo_jurado = 1 THEN 'B-AUTORIZADO'
    ELSE 'A-VALID. VCTE'
  END
`;

module.exports = { calcEstado, calcSubEstado, calcSubEstado3, SUB_ESTADO_3_SQL };
