/**
 * fix-situacion-revista.js
 * Lee col 20 (SITUACION DE REVISTA) y col 1 (ID SIAL) del Excel
 * y actualiza situacion_revista en new_cargo solo para jefes/directores.
 */

const ExcelJS = require('exceljs');
const { AppDataSource } = require('../src/config/data-source');

const EXCEL_PATH = process.argv[2] ||
  'C:/Desarrollo/Documentacion/8 - Dotacion Agosto MSGC (03-08-26).xlsx';

function mapSituacionRevista(val) {
  const v = (val || '').trim().toLowerCase();
  if (v === 'activo')        return 'activo';
  if (v.includes('retenci')) return 'retencion_cargo';
  if (v.includes('comisi'))  return 'comision';
  return null;
}

function esJefeDirector(unificador) {
  const u = (unificador || '').trim().toLowerCase();
  return u.startsWith('jefe/a') || u.startsWith('director') || u.startsWith('subdirector');
}

async function run() {
  await AppDataSource.initialize();
  console.log('Conectado a la BD.');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.worksheets[0];
  console.log(`Excel leído.`);

  const rows = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const id_sial     = String(row.getCell(1).value  || '').trim();
    const unificador  = String(row.getCell(24).value || '').trim();
    const sitRevista  = String(row.getCell(20).value || '').trim();
    if (!id_sial || !esJefeDirector(unificador)) return;
    const sr = mapSituacionRevista(sitRevista);
    if (sr) rows.push({ id_sial, sr });
  });

  console.log(`Registros a actualizar: ${rows.length}`);

  let updated = 0, notFound = 0;
  await AppDataSource.transaction(async (manager) => {
    for (const r of rows) {
      const result = await manager.query(
        `UPDATE new_cargo SET situacion_revista = ? WHERE id_sial = ?`,
        [r.sr, r.id_sial]
      );
      if (result.affectedRows > 0) updated++;
      else notFound++;
    }
  });

  console.log(`\nFinalizado:`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  No encontrados: ${notFound}`);

  await AppDataSource.destroy();
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
