/**
 * DotacionSyncService
 * Sincroniza dot_resultado → dotacion cruzando por id_sial con new_cargo.
 */
class DotacionSyncService {
  constructor(dataSource) {
    this.ds = dataSource;
  }

  async sincronizar() {
    const [{ cnt }] = await this.ds.query('SELECT COUNT(*) AS cnt FROM dot_resultado');
    if (cnt === 0) throw new Error('dot_resultado está vacía — ejecutá el Dotaneitor primero');

    const [{ periodo, fecha_proceso }] = await this.ds.query(
      `SELECT DATE_FORMAT(MAX(fecha_proceso), '%Y-%m') AS periodo,
              MAX(fecha_proceso) AS fecha_proceso
       FROM dot_resultado`
    );

    const padron = await this.ds.query(`
      SELECT
        dr.id_sial,
        nc.id                    AS id_cargo,
        dr.cuil,
        dr.cuil_y_rol,
        dr.ayn,
        dr.siglas,
        dr.escalafon,
        dr.literal_cr,
        dr.literal_puesto,
        dr.especialidad,
        dr.agrupador,
        dr.unificador_de_puestos,
        dr.jefe_escalafon,
        dr.universo_totalizador,
        dr.tipo_hospital_sigla,
        dr.situacion_de_revista,
        dr.estado,
        dr.fecha_proceso
      FROM dot_resultado dr
      LEFT JOIN new_cargo nc ON nc.id_sial = dr.id_sial
    `);

    const sinMatch = padron.filter(r => !r.id_cargo);
    const conMatch = padron.filter(r =>  r.id_cargo);

    const dotActual = await this.ds.query(
      `SELECT id, id_sial, id_cargo, cuil, estado, situacion_revista,
              agrupador, unificador_de_puestos, jefe_escalafon, especialidad
       FROM dotacion WHERE hasta IS NULL`
    );
    const dotActualMap = new Map(dotActual.map(r => [r.id_sial, r]));
    const padronSialSet = new Set(conMatch.map(r => r.id_sial));

    let insertados = 0, actualizados = 0, bajas = 0;

    // Bajas: activos en dotacion que ya no están en el padrón
    const sialBajas = dotActual
      .filter(r => r.id_sial && !padronSialSet.has(r.id_sial))
      .map(r => r.id_sial);

    if (sialBajas.length) {
      await this.ds.query(
        `UPDATE dotacion SET hasta = CURDATE() WHERE id_sial IN (?) AND hasta IS NULL`,
        [sialBajas]
      );
      bajas = sialBajas.length;
    }

    // Altas y actualizaciones
    for (const row of conMatch) {
      const existing = dotActualMap.get(row.id_sial);
      const sitRev   = this._mapSitRev(row.situacion_de_revista);

      if (!existing) {
        await this.ds.query(`
          INSERT INTO dotacion
            (id_cargo, id_sial, cuil, cuil_y_rol, ayn, periodo, desde,
             situacion_revista, estado, siglas, escalafon, literal_cr,
             literal_puesto, especialidad, agrupador, unificador_de_puestos,
             jefe_escalafon, universo_totalizador, tipo_hospital_sigla, fecha_proceso)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
          row.id_cargo, row.id_sial, row.cuil, row.cuil_y_rol, row.ayn,
          periodo, null, sitRev, row.estado,
          row.siglas, row.escalafon, row.literal_cr, row.literal_puesto,
          row.especialidad, row.agrupador, row.unificador_de_puestos,
          row.jefe_escalafon, row.universo_totalizador, row.tipo_hospital_sigla,
          row.fecha_proceso,
        ]);
        insertados++;
      } else {
        const hayCambio =
          existing.estado                !== row.estado ||
          existing.situacion_revista     !== sitRev ||
          existing.agrupador             !== row.agrupador ||
          existing.unificador_de_puestos !== row.unificador_de_puestos ||
          existing.jefe_escalafon        !== row.jefe_escalafon ||
          existing.especialidad          !== row.especialidad;

        if (hayCambio) {
          await this.ds.query(`
            UPDATE dotacion SET
              estado = ?, situacion_revista = ?, agrupador = ?,
              unificador_de_puestos = ?, jefe_escalafon = ?, especialidad = ?,
              cuil = ?, ayn = ?, fecha_proceso = ?, fecha_actualizacion = NOW()
            WHERE id = ?
          `, [
            row.estado, sitRev, row.agrupador,
            row.unificador_de_puestos, row.jefe_escalafon, row.especialidad,
            row.cuil, row.ayn, row.fecha_proceso, existing.id,
          ]);
          actualizados++;
        }
      }
    }

    return {
      periodo,
      fecha_proceso,
      total_padron:  padron.length,
      sin_match:     sinMatch.length,
      sin_match_ids: sinMatch.slice(0, 20).map(r => r.id_sial),
      insertados,
      actualizados,
      bajas,
    };
  }

  _mapSitRev(valor) {
    if (!valor) return null;
    const v = valor.toLowerCase().replace(/[áàä]/g, 'a').replace(/[óòö]/g, 'o');
    if (v.includes('retencion')) return 'retencion_cargo';
    if (v.includes('comision'))  return 'comision';
    if (v.includes('activo'))    return 'activo';
    return null;
  }

  async getEstado() {
    const [ultima] = await this.ds.query(
      `SELECT MAX(fecha_proceso) AS ultima_sincronizacion,
              COUNT(*) AS total_activos
       FROM dotacion WHERE hasta IS NULL`
    );
    const [{ total_padron }] = await this.ds.query(
      'SELECT COUNT(*) AS total_padron FROM dot_resultado'
    );
    return { ...ultima, total_padron };
  }
}

module.exports = DotacionSyncService;
