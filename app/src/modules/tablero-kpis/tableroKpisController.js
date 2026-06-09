const { AppDataSource } = require('../../config/data-source');
const logger = require('../../utils/logger');

// Replica la lógica de calcSubEstado3 del frontend, en SQL
const SUB_ESTADO_CALC = `
  CASE
    WHEN COALESCE(sub_estado_3, '') <> '' THEN sub_estado_3
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

const toNum = (v) => parseInt(v ?? 0, 10);
const normRows = (rows) => rows.map(r => {
  const out = {};
  for (const [k, v] of Object.entries(r)) out[k] = typeof v === 'string' && /^\d+$/.test(v) ? toNum(v) : v;
  return out;
});

async function getKpis(req, res) {
  try {
    const db = AppDataSource;
    const sigla = req.query.sigla?.trim() || null;
    const sp = [sigla, sigla];

    const [
      totalesRaw,
      subEstados,
      segPouPof,
      segJefaturas,
      bajasMotivo,
      siglasRaw,
    ] = await Promise.all([

      // Totales generales — cada subquery usa (? IS NULL OR campo = ?) para filtro opcional
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM seguimiento_cph    WHERE (? IS NULL OR sigla_efector = ?)) AS total_seguimiento,
          (SELECT COUNT(*) FROM bajas_consolidadas WHERE (? IS NULL OR sigla = ?))         AS total_bajas,
          (SELECT COUNT(*) FROM bajas_consolidadas WHERE (? IS NULL OR sigla = ?) AND UPPER(COALESCE(genera_concurso,'')) = 'SI')  AS bajas_con_concurso,
          (SELECT COUNT(*) FROM bajas_consolidadas WHERE (? IS NULL OR sigla = ?) AND UPPER(COALESCE(genera_concurso,'')) != 'SI') AS bajas_sin_concurso,
          (SELECT COUNT(*) FROM seguimiento_cph    WHERE (? IS NULL OR sigla_efector = ?) AND LOWER(COALESCE(unificador_puestos,'')) LIKE '%jefatura%') AS seg_jefaturas_total
      `, [sigla, sigla, sigla, sigla, sigla, sigla, sigla, sigla, sigla, sigla]),

      // Sub-estados del seguimiento (calculado)
      db.query(`
        SELECT (${SUB_ESTADO_CALC}) AS sub_estado, COUNT(*) AS total
        FROM seguimiento_cph
        WHERE (? IS NULL OR sigla_efector = ?)
        GROUP BY (${SUB_ESTADO_CALC})
        ORDER BY sub_estado ASC
      `, sp),

      // Seguimiento por POU/POF (escalafon_1)
      db.query(`
        SELECT COALESCE(escalafon_1, 'Sin especificar') AS escalafon, COUNT(*) AS total
        FROM seguimiento_cph
        WHERE COALESCE(escalafon_1, '') <> '' AND (? IS NULL OR sigla_efector = ?)
        GROUP BY escalafon_1
        ORDER BY total DESC
      `, sp),

      // Jefaturas en Seguimiento por POU/POF
      db.query(`
        SELECT COALESCE(escalafon_1, 'Sin especificar') AS escalafon, COUNT(*) AS total
        FROM seguimiento_cph
        WHERE LOWER(COALESCE(unificador_puestos, '')) LIKE '%jefatura%' AND (? IS NULL OR sigla_efector = ?)
        GROUP BY escalafon_1
        ORDER BY total DESC
      `, sp),

      // Motivo de baja — todas las bajas_consolidadas
      db.query(`
        SELECT COALESCE(motivo_baja, 'Sin especificar') AS motivo_baja, COUNT(*) AS total
        FROM bajas_consolidadas
        WHERE (? IS NULL OR sigla = ?)
        GROUP BY motivo_baja
        ORDER BY total DESC
      `, sp),

      // Siglas disponibles en CPH (siempre sin filtrar, para poblar el dropdown)
      db.query(`
        SELECT DISTINCT sigla_efector AS sigla
        FROM seguimiento_cph
        WHERE sigla_efector IS NOT NULL AND sigla_efector <> ''
        ORDER BY sigla ASC
      `),
    ]);

    const totales = totalesRaw[0];
    for (const k of Object.keys(totales)) totales[k] = toNum(totales[k]);

    res.json({
      totales,
      seguimiento: {
        porSubEstado: normRows(subEstados),
        porPouPof:    normRows(segPouPof),
        jefaturas:    normRows(segJefaturas),
      },
      bajas: {
        porMotivo: normRows(bajasMotivo),
      },
      siglasDisponibles: siglasRaw.map(r => r.sigla),
    });
  } catch (err) {
    logger.error('[tableroKpisController] getKpis', { error: err.message });
    res.status(500).json({ error: 'Error al obtener KPIs del tablero' });
  }
}

async function getKpisCeetps(req, res) {
  try {
    const db = AppDataSource;
    const sigla = req.query.sigla?.trim() || null;
    const sp = [sigla, sigla];

    const NOMBRES_CODIGO = { 87: 'Enfermeros', 85: 'Técnicos', 83: 'Administrativos' };

    const [
      totalesRaw,
      porCodigo,
      porEstado,
      porAltaSial,
      porMotivo,
      siglasRaw,
    ] = await Promise.all([

      // Total general + con/sin concurso iniciado (expediente_concurso cargado)
      db.query(`
        SELECT
          COUNT(*) AS total_ceetps,
          SUM(CASE WHEN COALESCE(expediente_concurso, '') <> '' THEN 1 ELSE 0 END) AS con_concurso,
          SUM(CASE WHEN COALESCE(expediente_concurso, '') = '' THEN 1 ELSE 0 END)  AS sin_concurso
        FROM seguimiento_ceetps
        WHERE (? IS NULL OR sigla_efector = ?)
      `, sp),

      // Por código de registro (87 Enfermeros / 85 Técnicos / 83 Administrativos)
      db.query(`
        SELECT COALESCE(codigo_registro, 0) AS codigo_registro, COUNT(*) AS total
        FROM seguimiento_ceetps
        WHERE (? IS NULL OR sigla_efector = ?)
        GROUP BY codigo_registro
        ORDER BY codigo_registro ASC
      `, sp),

      // Por estado_concurso — orden lógico de etapas
      db.query(`
        SELECT COALESCE(estado_concurso, 'Sin especificar') AS estado_concurso, COUNT(*) AS total
        FROM seguimiento_ceetps
        WHERE (? IS NULL OR sigla_efector = ?)
        GROUP BY estado_concurso
        ORDER BY CASE COALESCE(estado_concurso, '')
          WHEN 'Sin Autorizar'            THEN 1
          WHEN 'Autorizado'               THEN 2
          WHEN 'Disposición de Llamado'   THEN 3
          WHEN 'IFACS'                    THEN 4
          WHEN 'INSAL'                    THEN 5
          WHEN 'TAD'                      THEN 6
          WHEN 'Disposición de Designación' THEN 7
          WHEN 'Finalizado'               THEN 8
          ELSE 9
        END
      `, sp),

      // Por alta SIAL
      db.query(`
        SELECT
          CASE WHEN COALESCE(alta_sial, 0) = 1 THEN 'Con Alta SIAL' ELSE 'Sin Alta SIAL' END AS estado_alta,
          COUNT(*) AS total
        FROM seguimiento_ceetps
        WHERE (? IS NULL OR sigla_efector = ?)
        GROUP BY alta_sial
        ORDER BY alta_sial DESC
      `, sp),

      // Por motivo de baja
      db.query(`
        SELECT COALESCE(motivo_baja, 'Sin especificar') AS motivo_baja, COUNT(*) AS total
        FROM seguimiento_ceetps
        WHERE (? IS NULL OR sigla_efector = ?)
        GROUP BY motivo_baja
        ORDER BY total DESC
      `, sp),

      // Siglas disponibles en CEETPS (siempre sin filtrar)
      db.query(`
        SELECT DISTINCT sigla_efector AS sigla
        FROM seguimiento_ceetps
        WHERE sigla_efector IS NOT NULL AND sigla_efector <> ''
        ORDER BY sigla ASC
      `),
    ]);

    const totales = totalesRaw[0];
    for (const k of Object.keys(totales)) totales[k] = toNum(totales[k]);

    res.json({
      totales,
      ceetps: {
        porCodigo:   normRows(porCodigo).map(r => ({
          ...r,
          nombre: NOMBRES_CODIGO[r.codigo_registro] ?? `Código ${r.codigo_registro}`,
        })),
        porEstado:   normRows(porEstado),
        porAltaSial: normRows(porAltaSial),
        porMotivo:   normRows(porMotivo),
      },
      siglasDisponibles: siglasRaw.map(r => r.sigla),
    });
  } catch (err) {
    logger.error('[tableroKpisController] getKpisCeetps', { error: err.message });
    res.status(500).json({ error: 'Error al obtener KPIs CEETPS del tablero' });
  }
}

module.exports = { getKpis, getKpisCeetps };
