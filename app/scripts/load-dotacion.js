/**
 * load-dotacion.js
 * Carga el Excel de dotación a la tabla new_cargo.
 *
 * Lógica de mapeo (por UNIFICADOR DE PUESTOS col 24):
 *   CPH de Planta                          → CPH / planta
 *   CPH de Guardia                         → CPH / guardia
 *   Jefe/a de UNIDAD|SECCION|DIVISION|DEPARTAMENTO → CPH / planta
 *   Suplente de Guardia                    → SG  / guardia
 *   Enfermero/a  (esc 87 o esc 85)         → ENF / planta
 *   Tecnico/a de la salud                  → TEC / planta
 *   Administrativo/a                       → GEN / planta
 *   Servicios Generales                    → GEN / planta
 *   Promotores/as de Salud                 → GEN / planta
 *   Residencias Básicas|Post-Básicas|Jefes → RES / null
 *   Docente                                → DOC / null
 *   Resto                                  → GEN / planta
 *
 * Sigla: col 12 (SIGLAS). Si es vacío/null → null en BD.
 * Estado: col 58 (ESTADO) → activo | bloqueado | retencion | comision
 * id_sial: col 1 (ID SIAL) — guardado para futuras actualizaciones.
 * Upsert por id_sial: si ya existe actualiza, si no inserta.
 */

const path    = require('path');
const ExcelJS = require('exceljs');
const { AppDataSource } = require('../src/config/data-source');

const EXCEL_PATH = process.argv[2] ||
  'C:/Desarrollo/Documentacion/8 - Dotacion Agosto MSGC (03-08-26).xlsx';

// ─── Mapeo UNIFICADOR → { carrera, modalidad, tipoCph } ───────────────────────────────
function mapCarrera(unificador, escalafon, jefeEscalafon) {
  const u = (unificador || '').trim().toLowerCase();
  const j = (jefeEscalafon || '').trim().toLowerCase();

  if (u === 'cph de planta')                    return { carrera: 'CPH', modalidad: 'planta',  tipoCph: 'comun'    };
  if (u === 'cph de guardia')                   return { carrera: 'CPH', modalidad: 'guardia', tipoCph: 'comun'    };
  if (u.startsWith('jefe/a de')) {
    // POU = guardia, POF = planta (vacío → planta por defecto)
    const modalidad = j.includes('pou') ? 'guardia' : 'planta';
    return { carrera: 'CPH', modalidad, tipoCph: 'jefe' };
  }
  if (u === 'director/a medico/a' || u === 'subdirector/a medico/a')
                                                return { carrera: 'CPH', modalidad: 'planta',  tipoCph: 'director' };
  if (u === 'suplente de guardia')              return { carrera: 'SG',  modalidad: 'guardia', tipoCph: null };
  if (u === 'enfermero/a' || u === 'enfermero/a atp') return { carrera: 'ENF', modalidad: 'planta', tipoCph: null };
  if (u === 'tecnico/a de la salud')            return { carrera: 'TEC', modalidad: 'planta',  tipoCph: null };
  if (u === 'administrativo/a')                 return { carrera: 'GEN', modalidad: 'planta',  tipoCph: null };
  if (u.includes('servicios generales'))        return { carrera: 'GEN', modalidad: 'planta',  tipoCph: null };
  if (u.includes('promotores'))                 return { carrera: 'GEN', modalidad: 'planta',  tipoCph: null };
  if (u.startsWith('residencias') || u.startsWith('residente')) return { carrera: 'RES', modalidad: null, tipoCph: null };
  if (u === 'docente')                          return { carrera: 'DOC', modalidad: null,       tipoCph: null };
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

// ─── Normalizar situación de revista (col 20) ───────────────────────────────
function mapSituacionRevista(val, tipoCph) {
  if (!tipoCph || tipoCph === 'comun') return null;
  const v = (val || '').trim().toLowerCase();
  if (v === 'activo')              return 'activo';
  if (v.includes('retenci'))       return 'retencion_cargo';
  if (v.includes('comisi'))        return 'comision';
  return 'activo';
}

// ─── Normalizar estado ────────────────────────────────────────────────────────
function mapEstado(estado) {
  const e = (estado || '').trim().toLowerCase();
  if (e === 'bloqueado') return 'bloqueado';
  return 'activo';
}

// ─── Generar código único por prefijo ─────────────────────────────────────────
async function nextCodigo(manager, carrera, modalidad) {
  const prefix = modalidad
    ? `${carrera}-${modalidad[0].toUpperCase()}`
    : carrera;
  const [{ total }] = await manager.query(
    `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE ?`,
    [`${prefix}-%`]
  );
  const seq = (parseInt(total, 10) + 1).toString().padStart(6, '0');
  return `${prefix}-${seq}`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function run() {
  await AppDataSource.initialize();
  console.log('Conectado a la BD.');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.worksheets[0];
  console.log(`Excel leído: ${ws.rowCount - 1} filas de datos.`);

  // Precargar contadores de código por prefijo para no hacer COUNT en cada fila
  const counters = {};
  const getNextSeq = async (manager, carrera, modalidad, tipoCph) => {
    // Prefijo: CPH-J-P, CPH-D-P, CPH-P, ENF, etc.
    let prefix;
    if (carrera === 'CPH' && tipoCph && tipoCph !== 'comun') {
      const sufijo = tipoCph === 'jefe' ? 'J' : 'D';
      prefix = modalidad ? `CPH-${sufijo}-${modalidad[0].toUpperCase()}` : `CPH-${sufijo}`;
    } else {
      prefix = modalidad ? `${carrera}-${modalidad[0].toUpperCase()}` : carrera;
    }
    if (counters[prefix] === undefined) {
      const [{ total }] = await manager.query(
        `SELECT COUNT(*) as total FROM new_cargo WHERE codigo LIKE ?`,
        [`${prefix}-%`]
      );
      counters[prefix] = parseInt(total, 10);
    }
    counters[prefix]++;
    return `${prefix}-${counters[prefix].toString().padStart(6, '0')}`;
  };

  let inserted = 0, updated = 0, skipped = 0;
  const BATCH = 500;
  const rows  = [];

  ws.eachRow((row, i) => {
    if (i === 1) return; // header

    const id_sial   = String(row.getCell(1).value  || '').trim();
    const sigla     = String(row.getCell(12).value || '').trim() || null;
    const escalafon    = String(row.getCell(16).value || '').trim();
    const unificador   = String(row.getCell(24).value || '').trim();
    const jefeEscalafon= String(row.getCell(27).value || '').trim();
    const litPuesto     = String(row.getCell(22).value || '').trim() || null;
    const especialidad  = String(row.getCell(23).value || '').trim() || null;
    const cargoDesde    = parseDate(row.getCell(53).value);
    const cargoHasta    = parseDate(row.getCell(54).value);
    const antiguedad    = parseDate(row.getCell(57).value);
    const estado        = String(row.getCell(58).value || '').trim();
    const sitRevista    = String(row.getCell(20).value || '').trim();

    if (!id_sial) { skipped++; return; }

    const { carrera, modalidad, tipoCph } = mapCarrera(unificador, escalafon, jefeEscalafon);

    rows.push({ id_sial, sigla, carrera, modalidad, tipoCph, puesto: litPuesto, especialidad, cargoDesde, cargoHasta, antiguedad, estado: mapEstado(estado), situacionRevista: mapSituacionRevista(sitRevista, tipoCph) });
  });

  console.log(`Filas a procesar: ${rows.length} | Saltadas (sin id_sial): ${skipped}`);

  // Procesar en batches dentro de una transacción
  await AppDataSource.transaction(async (manager) => {
    for (const r of rows) {
      // Verificar si ya existe por id_sial
      const [existing] = await manager.query(
        `SELECT id, codigo FROM new_cargo WHERE id_sial = ? LIMIT 1`,
        [r.id_sial]
      );

      if (existing) {
        await manager.query(
          `UPDATE new_cargo SET sigla=?, carrera=?, modalidad=?, puesto=?, especialidad=?, estado=?, cargo_desde=?, cargo_hasta=?, antiguedad=?, situacion_revista=?,
             id_carrera=(SELECT id_carrera FROM carreras WHERE codigo=? LIMIT 1),
             id_modalidad=(SELECT id FROM modalidades WHERE nombre=? LIMIT 1),
             id_especialidad=(SELECT id FROM especialidades WHERE nombre=? LIMIT 1),
             id_puesto_tec=CASE WHEN ?='TEC' THEN (SELECT id FROM puestos_tec WHERE nombre=? LIMIT 1) ELSE NULL END,
             fecha_actualizacion=NOW()
           WHERE id_sial=?`,
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
        // Poblar FKs de normalización
        await manager.query(
          `UPDATE new_cargo SET
             id_carrera     = (SELECT id_carrera FROM carreras WHERE codigo = carrera LIMIT 1),
             id_modalidad   = (SELECT id FROM modalidades WHERE nombre = modalidad LIMIT 1),
             id_especialidad= (SELECT id FROM especialidades WHERE nombre = especialidad LIMIT 1),
             id_puesto_tec  = CASE WHEN carrera = 'TEC' THEN (SELECT id FROM puestos_tec WHERE nombre = puesto LIMIT 1) ELSE NULL END
           WHERE id_sial = ?`,
          [r.id_sial]
        );
        inserted++;
      }

      if ((inserted + updated) % 1000 === 0)
        console.log(`  Procesados: ${inserted + updated}...`);
    }
  });

  console.log(`\nFinalizado:`);
  console.log(`  Insertados: ${inserted}`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Saltados: ${skipped}`);

  await AppDataSource.destroy();
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
