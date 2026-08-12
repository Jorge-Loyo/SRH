/**
 * CargoDotacionSyncService
 * Sincroniza dot_resultado → personas_dotacion + cargo_dotacion.
 *
 * Flujo:
 *   1. Lee dot_resultado cruzado con new_cargo por id_sial (100% match confirmado)
 *   2. UPSERT personas_dotacion por cuil
 *   3. Cierra filas activas en cargo_dotacion que desaparecieron del padrón
 *   4. Inserta nuevas ocupaciones o actualiza cambios en las activas
 *
 * INVARIANTE CRÍTICA:
 *   - dot_resultado.estado ('Activo'/'Bloqueado'/'Comision') es el estado de la PERSONA,
 *     NO del cargo. Un cargo con persona 'Bloqueada' sigue siendo vigente si tiene codigo_repa.
 *   - Este servicio NUNCA modifica new_cargo.estado. El estado del cargo se gestiona
 *     exclusivamente a través de la interfaz de edición manual.
 *   - cargo_dotacion.estado almacena el estado de la persona (para trazabilidad),
 *     no el estado del cargo.
 */
class CargoDotacionSyncService {
  constructor(dataSource) {
    this.ds = dataSource;
  }

  async sincronizar() {
    const [{ cnt }] = await this.ds.query('SELECT COUNT(*) AS cnt FROM dot_resultado');
    if (cnt === 0) throw new Error('dot_resultado está vacía — ejecutá el Dotaneitor primero');

    const [{ periodo, fecha_proceso }] = await this.ds.query(`
      SELECT DATE_FORMAT(MAX(fecha_proceso), '%Y-%m') AS periodo,
             MAX(fecha_proceso) AS fecha_proceso
      FROM dot_resultado
    `);

    // Guardia: detectar cargos no_vigente que tienen codigo_repa en el padrón
    // (estado de la persona ≠ estado del cargo — ver invariante en el header)
    const [{ inconsistentes }] = await this.ds.query(`
      SELECT COUNT(*) AS inconsistentes
      FROM dot_resultado dr
      INNER JOIN new_cargo nc ON nc.id_sial = dr.id_sial
      WHERE nc.estado = 'no_vigente'
        AND dr.codigo_repa IS NOT NULL AND dr.codigo_repa != ''
    `);
    if (inconsistentes > 0) {
      // Corregir automáticamente: si tiene codigo_repa en el padrón, el cargo está vigente
      await this.ds.query(`
        UPDATE new_cargo nc
        INNER JOIN dot_resultado dr ON dr.id_sial = nc.id_sial
        SET nc.estado = 'vigente'
        WHERE nc.estado = 'no_vigente'
          AND dr.codigo_repa IS NOT NULL AND dr.codigo_repa != ''
      `);
    }

    const padron = await this.ds.query(`
      SELECT
        dr.id_sial,
        nc.id                     AS id_cargo,
        dr.cuil,
        dr.cuil_y_rol,
        dr.ayn,
        dr.fecha_nacimiento,
        dr.sexo,
        dr.tipo_doc,
        dr.numero_doc,
        dr.especialidad,
        dr.codigo_repa,
        dr.situacion_de_revista,
        dr.estado,
        dr.fecha_proceso,
        nc.antiguedad
      FROM dot_resultado dr
      INNER JOIN new_cargo nc ON nc.id_sial = dr.id_sial
    `);

    // ── 1. UPSERT personas_dotacion ──────────────────────────────────────────
    let personasInsertadas = 0, personasActualizadas = 0;

    for (const row of padron) {
      const [existing] = await this.ds.query(
        'SELECT id FROM personas_dotacion WHERE cuil = ?', [row.cuil]
      );
      if (!existing) {
        await this.ds.query(`
          INSERT INTO personas_dotacion
            (cuil, numero_doc, tipo_doc, ayn, fecha_nacimiento, sexo, especialidad)
          VALUES (?,?,?,?,?,?,?)
        `, [row.cuil, row.numero_doc, row.tipo_doc, row.ayn,
            row.fecha_nacimiento ? row.fecha_nacimiento.toISOString().slice(0, 10) : null,
            row.sexo, row.especialidad]);
        personasInsertadas++;
      } else {
        // Actualiza solo campos que pueden cambiar (especialidad, nombre)
        await this.ds.query(`
          UPDATE personas_dotacion
          SET ayn = ?, especialidad = ?, fecha_actualizacion = NOW()
          WHERE cuil = ?
            AND (ayn != ? OR IFNULL(especialidad,'') != IFNULL(?,''))
        `, [row.ayn, row.especialidad, row.cuil, row.ayn, row.especialidad]);
        personasActualizadas++;
      }
    }

    // ── 2. Bajas: activos en cargo_dotacion que ya no están en el padrón ────
    const padronSialSet = new Set(padron.map(r => r.id_sial));

    const activos = await this.ds.query(
      'SELECT id, id_sial FROM cargo_dotacion WHERE hasta IS NULL'
    );
    const sialBajas = activos.filter(r => !padronSialSet.has(r.id_sial)).map(r => r.id_sial);

    let bajas = 0;
    if (sialBajas.length) {
      await this.ds.query(
        'UPDATE cargo_dotacion SET hasta = CURDATE() WHERE id_sial IN (?) AND hasta IS NULL',
        [sialBajas]
      );
      bajas = sialBajas.length;
    }

    // ── 3. Altas y actualizaciones en cargo_dotacion ─────────────────────────
    const activosMap = new Map(activos.map(r => [r.id_sial, r]));

    // Mapa cuil → id_persona para evitar N queries
    const personasRows = await this.ds.query('SELECT id, cuil FROM personas_dotacion');
    const personaMap = new Map(personasRows.map(r => [String(r.cuil), r.id]));

    let insertados = 0, actualizados = 0;

    for (const row of padron) {
      const id_persona = personaMap.get(String(row.cuil));
      if (!id_persona) continue; // no debería ocurrir

      const sitRev = this._mapSitRev(row.situacion_de_revista);
      const existing = activosMap.get(row.id_sial);

      const ncAnt = row.antiguedad ? row.antiguedad.toISOString?.().slice(0,10) ?? row.antiguedad : null;

      if (!existing) {
        await this.ds.query(`
          INSERT INTO cargo_dotacion
            (id_cargo, id_persona, id_sial, cuil_y_rol, codigo_repa,
             periodo, antiguedad, situacion_revista, estado, fecha_proceso)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `, [row.id_cargo, id_persona, row.id_sial, row.cuil_y_rol,
            row.codigo_repa ? parseInt(row.codigo_repa) : null,
            periodo, ncAnt, sitRev, row.estado, row.fecha_proceso]);
        insertados++;
      } else {
        const [cur] = await this.ds.query(
          'SELECT situacion_revista, estado, codigo_repa, antiguedad FROM cargo_dotacion WHERE id = ?',
          [existing.id]
        );
        const hayCambio =
          cur.situacion_revista !== sitRev ||
          cur.estado            !== row.estado ||
          String(cur.codigo_repa) !== String(row.codigo_repa);

        if (hayCambio) {
          await this.ds.query(`
            UPDATE cargo_dotacion
            SET situacion_revista = ?, estado = ?, codigo_repa = ?,
                fecha_proceso = ?, fecha_actualizacion = NOW()
            WHERE id = ?
          `, [sitRev, row.estado,
              row.codigo_repa ? parseInt(row.codigo_repa) : null,
              row.fecha_proceso, existing.id]);
          actualizados++;
        }
      }
    }

    return {
      periodo,
      fecha_proceso,
      total_padron:          padron.length,
      personas_insertadas:   personasInsertadas,
      personas_actualizadas: personasActualizadas,
      insertados,
      actualizados,
      bajas,
      cargos_corregidos:     parseInt(inconsistentes, 10), // no_vigente con codigo_repa → forzados a vigente
    };
  }

  _mapSitRev(valor) {
    if (!valor) return null;
    const v = valor.toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[óòö]/g, 'o');
    if (v.includes('retencion')) return 'retencion_cargo';
    if (v.includes('comision'))  return 'comision';
    if (v.includes('activo'))    return 'activo';
    return null;
  }

  async getEstado() {
    const [totales] = await this.ds.query(`
      SELECT
        COUNT(*) AS total_activos,
        MAX(fecha_proceso) AS ultima_sincronizacion
      FROM cargo_dotacion WHERE hasta IS NULL
    `);
    const [{ total_personas }] = await this.ds.query(
      'SELECT COUNT(*) AS total_personas FROM personas_dotacion'
    );
    const [{ total_padron }] = await this.ds.query(
      'SELECT COUNT(*) AS total_padron FROM dot_resultado'
    );
    return { ...totales, total_personas, total_padron };
  }
}

module.exports = CargoDotacionSyncService;
