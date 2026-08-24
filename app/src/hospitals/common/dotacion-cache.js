/**
 * Cache en memoria para dotacion-total.
 * Se construye una vez por período y se reutiliza hasta que expire o se invalide.
 * TTL: 10 minutos (configurable).
 */

const logger = require('../../utils/logger');

const TTL_MS = 10 * 60 * 1000; // 10 minutos

// Map<periodo, { rows, builtAt }>
const cache = new Map();
// Map<periodo, Promise> — evita builds simultáneos del mismo período
const building = new Map();

const FROM_JOINS = `
  FROM roles r
  LEFT JOIN cargos c   ON r.id_cargo   = c.id_cargo   AND r.periodo = c.periodo
  LEFT JOIN personas p ON r.id_persona = p.id_persona AND r.periodo = p.periodo
  LEFT JOIN siglas s   ON r.id_sigla   = s.id_sigla
`;

async function buildCache(AppDataSource, periodo) {
  logger.info(`[DotacionCache] Construyendo caché para período ${periodo}...`);
  const t = Date.now();

  const rows = await AppDataSource.query(`
    SELECT
      s.sigla                          AS 'Hospital',
      c.codigo_cargo                   AS 'Código de Cargo',
      r.codigo_rol                     AS 'Código SIAL',
      r.situacion_revista              AS 'Situación de Revista',
      p.cuil                           AS 'CUIL',
      p.nombre_apellido                AS 'Nombre y Apellido',
      p.fecha_nacimiento               AS 'Nacimiento',
      p.edad                           AS 'Edad',
      p.sexo                           AS 'Sexo',
      r.descripcion_reparticion        AS 'Repartición',
      r.escalafon                      AS 'Escalafón',
      r.literal_puesto                 AS 'Puesto',
      r.literal_codigo_registro        AS 'Carrera',
      r.agrupador                      AS 'Agrupamiento',
      p.especialidad                   AS 'Especialidad',
      r.dia                            AS 'Día',
      r.cargo_desde                    AS 'Cargo Desde',
      r.jefaturas                      AS 'Jefatura',
      r.doc_respaldatoria_j_categoria  AS 'Documentación Jefatura',
      p.telefono                       AS 'Teléfono',
      p.mail_personal                  AS 'Mail Personal',
      p.mail_laboral                   AS 'Mail Laboral',
      r.fecha_bloqueo                  AS 'Fecha de Bloqueo',
      r.bloqueo_comentario             AS 'Comentario de Bloqueo',
      r.bloqueo_motivo                 AS 'Motivo de Bloqueo',
      r.estado                         AS '_estado',
      r.unificador_puesto              AS '_unificador_puesto',
      r.codigo_registro                AS '_codigo_registro',
      p.antiguedad                     AS '_antiguedad'
    ${FROM_JOINS}
    WHERE r.periodo = ?
  `, [periodo]);

  cache.set(periodo, { rows, builtAt: Date.now() });
  logger.info(`[DotacionCache] Caché construida: ${rows.length} filas en ${Date.now() - t}ms`);
  return rows;
}

async function getRows(AppDataSource, periodo) {
  const cached = cache.get(periodo);
  if (cached && Date.now() - cached.builtAt < TTL_MS) return cached.rows;

  // Si ya hay un build en curso para este período, esperarlo
  if (building.has(periodo)) return building.get(periodo);

  const promise = buildCache(AppDataSource, periodo).finally(() => building.delete(periodo));
  building.set(periodo, promise);
  return promise;
}

function invalidate(periodo) {
  if (periodo) cache.delete(periodo);
  else cache.clear();
}

module.exports = { getRows, invalidate };
