const ExcelJS = require('exceljs');
const { AppDataSource } = require('../../config/data-source');
const logger = require('../../utils/logger');

function mapCarrera(unificador, jefeEscalafon) {
  const u = (unificador || '').trim().toLowerCase();
  const j = (jefeEscalafon || '').trim().toLowerCase();
  if (u === 'cph de planta')                         return { carrera: 'CPH', modalidad: 'planta',  tipoCph: 'comun'    };
  if (u === 'cph de guardia')                        return { carrera: 'CPH', modalidad: 'guardia', tipoCph: 'comun'    };
  if (u.startsWith('jefe/a de')) {
    const modalidad = j.includes('pou') ? 'guardia' : 'planta';
    return { carrera: 'CPH', modalidad, tipoCph: 'jefe' };
  }
  if (u === 'director/a medico/a' || u === 'subdirector/a medico/a')
                                                     return { carrera: 'CPH', modalidad: 'planta',  tipoCph: 'director' };
  if (u === 'suplente de guardia')                   return { carrera: 'SG',  modalidad: 'guardia', tipoCph: null };
  if (u === 'enfermero/a' || u === 'enfermero/a atp') return { carrera: 'ENF', modalidad: 'planta', tipoCph: null };
  if (u === 'tecnico/a de la salud')                 return { carrera: 'TEC', modalidad: 'planta',  tipoCph: null };
  if (u === 'administrativo/a')                      return { carrera: 'GEN', modalidad: 'planta',  tipoCph: null };
  if (u.includes('servicios generales'))             return { carrera: 'GEN', modalidad: 'planta',  tipoCph: null };
  if (u.includes('promotores'))                      return { carrera: 'GEN', modalidad: 'planta',  tipoCph: null };
  if (u.startsWith('residencias') || u.startsWith('residente')) return { carrera: 'RES', modalidad: null, tipoCph: null };
  if (u === 'docente')                               return { carrera: 'DOC', modalidad: null,       tipoCph: null };
  return { carrera: 'GEN', modalidad: 'planta', tipoCph: null };
}

// ─── Parsear fecha DD/MM/YYYY → YYYY-MM-DD (o null) ─────────────────────────
function parseDate(val) {
  const s = String(val || '').trim();
  if (!s) return null;
  const [d, m, y] = s.split('/');
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function mapSituacionRevista(val, tipoCph) {
  if (!tipoCph || tipoCph === 'comun') return null;
  const v = (val || '').trim().toLowerCase();
  if (v === 'activo')        return 'activo';
  if (v.includes('retenci')) return 'retencion_cargo';
  if (v.includes('comisi'))  return 'comision';
  return 'activo';
}

function mapEstado(estado) {
  const e = (estado || '').trim().toLowerCase();
  if (e === 'bloqueado' || e === 'no_vigente') return 'no_vigente';
  return 'vigente';
}

async function uploadDotacion(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];

    const rows = [];
    ws.eachRow((row, i) => {
      if (i === 1) return;
      const id_sial    = String(row.getCell(1).value  || '').trim();
      if (!id_sial) return;
      const sigla      = String(row.getCell(12).value || '').trim() || null;
      const sitRevista     = String(row.getCell(20).value || '').trim();
      const unificador    = String(row.getCell(24).value || '').trim();
      const jefeEscalafon  = String(row.getCell(27).value || '').trim();
      const litPuesto      = String(row.getCell(22).value || '').trim() || null;
      const especialidad   = String(row.getCell(23).value || '').trim() || null;
      const cargoDesde     = parseDate(row.getCell(53).value);
      const cargoHasta     = parseDate(row.getCell(54).value);
      const antiguedad     = parseDate(row.getCell(57).value);
      const estado         = String(row.getCell(58).value || '').trim();
      const { carrera, modalidad, tipoCph } = mapCarrera(unificador, jefeEscalafon);
      rows.push({ id_sial, sigla, carrera, modalidad, tipoCph, puesto: litPuesto, especialidad, cargoDesde, cargoHasta, antiguedad, estado: mapEstado(estado), situacionRevista: mapSituacionRevista(sitRevista, tipoCph) });
    });

    // Contadores de código por prefijo
    const counters = {};
    const getNextSeq = async (manager, carrera, modalidad, tipoCph) => {
      let prefix;
      if (carrera === 'CPH' && tipoCph && tipoCph !== 'comun') {
        const sufijo = tipoCph === 'jefe' ? 'J' : 'D';
        prefix = modalidad ? `CPH-${sufijo}-${modalidad[0].toUpperCase()}` : `CPH-${sufijo}`;
      } else {
        prefix = modalidad ? `${carrera}-${modalidad[0].toUpperCase()}` : carrera;
      }
      if (counters[prefix] === undefined) {
        const [{ total }] = await manager.query(
          `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE ?`, [`${prefix}-%`]
        );
        counters[prefix] = parseInt(total, 10);
      }
      counters[prefix]++;
      return `${prefix}-${counters[prefix].toString().padStart(6, '0')}`;
    };

    let inserted = 0, updated = 0;

    await AppDataSource.transaction(async (manager) => {
      for (const r of rows) {
        const [existing] = await manager.query(
          `SELECT id FROM new_cargo WHERE id_sial = ? LIMIT 1`, [r.id_sial]
        );
        if (existing) {
          await manager.query(
            `UPDATE new_cargo SET sigla=?, carrera=?, modalidad=?, puesto=?, especialidad=?, estado=?, cargo_desde=?, cargo_hasta=?, antiguedad=?, situacion_revista=?,
             id_carrera=(SELECT id_carrera FROM carreras WHERE codigo=? LIMIT 1),
             id_modalidad=(SELECT id FROM modalidades WHERE nombre=? LIMIT 1),
             id_especialidad=(SELECT id FROM especialidades WHERE nombre=? LIMIT 1),
             id_puesto=CASE WHEN ?='TEC' THEN (SELECT id FROM puestos_cargo WHERE nombre=? AND carrera='tec' LIMIT 1) ELSE NULL END,
             fecha_actualizacion=NOW() WHERE id_sial=?`,
            [r.sigla, r.carrera, r.modalidad, r.puesto, r.especialidad, r.estado, r.cargoDesde, r.cargoHasta, r.antiguedad, r.situacionRevista,
             r.carrera, r.modalidad, r.especialidad, r.carrera, r.puesto, r.id_sial]
          );
          updated++;
        } else {
          const codigo = await getNextSeq(manager, r.carrera, r.modalidad, r.tipoCph);
          await manager.query(
            `INSERT INTO new_cargo (id_sial, codigo, sigla, carrera, modalidad, puesto, especialidad, estado, cargo_desde, cargo_hasta, antiguedad, situacion_revista, id_alta)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
            [r.id_sial, codigo, r.sigla, r.carrera, r.modalidad, r.puesto, r.especialidad, r.estado, r.cargoDesde, r.cargoHasta, r.antiguedad, r.situacionRevista]
          );
          await manager.query(
            `UPDATE new_cargo SET
               id_carrera=(SELECT id_carrera FROM carreras WHERE codigo=carrera LIMIT 1),
               id_modalidad=(SELECT id FROM modalidades WHERE nombre=modalidad LIMIT 1),
               id_especialidad=(SELECT id FROM especialidades WHERE nombre=especialidad LIMIT 1),
               id_puesto=CASE WHEN carrera='TEC' THEN (SELECT id FROM puestos_cargo WHERE nombre=puesto AND carrera='tec' LIMIT 1) ELSE NULL END
             WHERE id_sial=?`,
            [r.id_sial]
          );
          inserted++;
        }
      }
    });

    logger.info('[uploadDotacion] Carga completada', { inserted, updated, total: rows.length });
    res.json({ ok: true, inserted, updated, total: rows.length });

  } catch (err) {
    logger.error('[uploadDotacion] Error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { uploadDotacion };
