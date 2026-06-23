const { buildHospitalFilterSQL } = require('../../utils/rls');
const logger = require('../../utils/logger');

const ENFERMEROS_PUESTOS = [
  'Auxiliar de Enfermería',
  'Enfermero profesional',
  'ENFERMERO/A',
  'Licenciado en Enfermería',
];

module.exports.handleDotacionActiva = async function handleDotacionActiva({ AppDataSource, req }) {
  try {
    const periodo = req.query?.periodo || '';

    if (!periodo) {
      return { enfermeros: [], administrativos: [], tecnicos: [], error: 'Período requerido' };
    }

    const FROM_JOINS = `
      FROM roles r
      LEFT JOIN siglas s ON r.id_sigla = s.id_sigla
    `;

    const { clause: rlsClause, params: rlsBaseParams } = await buildHospitalFilterSQL(req, []);

    // ── ENFERMEROS ─────────────────────────────────────────────────────────────
    const enfPlaceholders = ENFERMEROS_PUESTOS.map(() => '?').join(', ');
    const enfSQL = `
      SELECT r.literal_puesto AS row_key, r.situacion_revista, s.sigla AS hospital, COUNT(*) AS cnt
      ${FROM_JOINS}
      WHERE r.periodo = ?
        AND r.literal_puesto IN (${enfPlaceholders})
        ${rlsClause}
      GROUP BY r.literal_puesto, r.situacion_revista, s.sigla
      ORDER BY r.literal_puesto, r.situacion_revista
    `;
    const enfParams = [periodo, ...ENFERMEROS_PUESTOS, ...rlsBaseParams];

    // ── ADMINISTRATIVOS ────────────────────────────────────────────────────────
    // codigo_registro = 83 identifica el escalafón administrativo
    const admSQL = `
      SELECT r.agrupador AS row_key, r.situacion_revista, s.sigla AS hospital, COUNT(*) AS cnt
      ${FROM_JOINS}
      WHERE r.periodo = ?
        AND r.codigo_registro = '83'
        ${rlsClause}
      GROUP BY r.agrupador, r.situacion_revista, s.sigla
      ORDER BY r.agrupador, r.situacion_revista
    `;
    const admParams = [periodo, ...rlsBaseParams];

    // ── TÉCNICOS ───────────────────────────────────────────────────────────────
    // escalafon = 'CEETPS', excluyendo puestos de enfermería
    const tecSQL = `
      SELECT r.literal_puesto AS row_key, r.situacion_revista, s.sigla AS hospital, COUNT(*) AS cnt
      ${FROM_JOINS}
      WHERE r.periodo = ?
        AND r.escalafon = 'CEETPS'
        AND LOWER(r.literal_puesto) NOT LIKE '%enfermer%'
        ${rlsClause}
      GROUP BY r.literal_puesto, r.situacion_revista, s.sigla
      ORDER BY r.literal_puesto, r.situacion_revista
    `;
    const tecParams = [periodo, ...rlsBaseParams];

    // ── CPH (Tab 2): MÉDICO / NO MÉDICO / JEFES CPH × CPH de Guardia / Planta ──
    const FROM_JOINS_PERS = `
      FROM roles r
      LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
      LEFT JOIN siglas s   ON r.id_sigla   = s.id_sigla
    `;
    const cphSQL = `
      SELECT r.agrupador, r.unificador_puesto, p.especialidad, r.situacion_revista, s.sigla AS hospital, COUNT(*) AS cnt
      ${FROM_JOINS_PERS}
      WHERE r.periodo = ?
        AND r.agrupador         IN ('MEDICO', 'NO MEDICO', 'JEFES CPH')
        AND r.unificador_puesto IN ('CPH de Guardia', 'CPH de Planta')
        ${rlsClause}
      GROUP BY r.agrupador, r.unificador_puesto, p.especialidad, r.situacion_revista, s.sigla
      ORDER BY r.agrupador, r.unificador_puesto, p.especialidad, r.situacion_revista
    `;
    const cphParams = [periodo, ...rlsBaseParams];

    // ── JEFES (Tab 3): JEFES CPH / MÉDICO / NO MÉDICO × unificador contiene "Jefe" ──
    const jefesSQL = `
      SELECT r.agrupador, r.unificador_puesto, r.descripcion_reparticion, r.situacion_revista, s.sigla AS hospital, COUNT(*) AS cnt
      ${FROM_JOINS}
      WHERE r.periodo = ?
        AND r.agrupador IN ('MEDICO', 'NO MEDICO', 'JEFES CPH')
        AND LOWER(r.unificador_puesto) LIKE '%jefe%'
        ${rlsClause}
      GROUP BY r.agrupador, r.unificador_puesto, r.descripcion_reparticion, r.situacion_revista, s.sigla
      ORDER BY r.agrupador, r.unificador_puesto, r.descripcion_reparticion, r.situacion_revista
    `;
    const jefesParams = [periodo, ...rlsBaseParams];

    const [enfermeros, administrativos, tecnicos, cph, jefes] = await Promise.all([
      AppDataSource.query(enfSQL,   enfParams),
      AppDataSource.query(admSQL,   admParams),
      AppDataSource.query(tecSQL,   tecParams),
      AppDataSource.query(cphSQL,   cphParams),
      AppDataSource.query(jefesSQL, jefesParams),
    ]);

    return { enfermeros, administrativos, tecnicos, cph, jefes };
  } catch (error) {
    logger.error('[handleDotacionActiva] Error:', { error: error.message, stack: error.stack });
    return { enfermeros: [], administrativos: [], tecnicos: [], cph: [], jefes: [], error: error.message };
  }
};
