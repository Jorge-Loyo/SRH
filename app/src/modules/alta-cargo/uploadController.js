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

function mapEstado(estado) {
  const e = (estado || '').trim().toLowerCase();
  if (e === 'activo')    return 'activo';
  if (e === 'bloqueado') return 'bloqueado';
  if (e === 'comision')  return 'comision';
  return 'retencion';
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
      const unificador    = String(row.getCell(24).value || '').trim();
      const jefeEscalafon  = String(row.getCell(27).value || '').trim();
      const litPuesto      = String(row.getCell(22).value || '').trim() || null;
      const especialidad   = String(row.getCell(23).value || '').trim() || null;
      const estado         = String(row.getCell(58).value || '').trim();
      const { carrera, modalidad, tipoCph } = mapCarrera(unificador, jefeEscalafon);
      rows.push({ id_sial, sigla, carrera, modalidad, tipoCph, puesto: litPuesto, especialidad, estado: mapEstado(estado) });
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
            `UPDATE new_cargo SET sigla=?, carrera=?, modalidad=?, puesto=?, especialidad=?, estado=? WHERE id_sial=?`,
            [r.sigla, r.carrera, r.modalidad, r.puesto, r.especialidad, r.estado, r.id_sial]
          );
          updated++;
        } else {
          const codigo = await getNextSeq(manager, r.carrera, r.modalidad, r.tipoCph);
          await manager.query(
            `INSERT INTO new_cargo (id_sial, codigo, sigla, carrera, modalidad, puesto, especialidad, estado, id_alta)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
            [r.id_sial, codigo, r.sigla, r.carrera, r.modalidad, r.puesto, r.especialidad, r.estado]
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
