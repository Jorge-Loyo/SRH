/**
 * audit-cargos-duplicados.js
 * Detecta cargos con más de una persona asignada en el padrón (dot_resultado).
 * Fuente: dot_resultado — padrón crudo de SIAL, donde están los errores de origen.
 * Scope: JEFES CPH (agrupador) + CPH ejecución (MEDICO / NO MEDICO).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { AppDataSource } = require('../src/config/data-source');

// Un "cargo" en el padrón se identifica por sigla + puesto + especialidad
const CLAVE_CARGO = `CONCAT(siglas, '||', literal_puesto, '||', COALESCE(especialidad,''))`;

async function queryDuplicados(db, agrupadores) {
  const placeholders = agrupadores.map(() => '?').join(',');
  return db.query(`
    SELECT
      siglas,
      literal_puesto                                                    AS puesto,
      COALESCE(especialidad, '(sin especialidad)')                      AS especialidad,
      COUNT(*)                                                          AS personas_asignadas,
      GROUP_CONCAT(ayn            ORDER BY ayn SEPARATOR ' | ')        AS personas,
      GROUP_CONCAT(cuil           ORDER BY ayn SEPARATOR ' | ')        AS cuils,
      GROUP_CONCAT(situacion_de_revista ORDER BY ayn SEPARATOR ' | ')  AS situaciones,
      GROUP_CONCAT(id_sial        ORDER BY ayn SEPARATOR ' | ')        AS id_sials
    FROM dot_resultado
    WHERE agrupador IN (${placeholders})
    GROUP BY siglas, literal_puesto, especialidad
    HAVING COUNT(*) > 1
    ORDER BY siglas, COUNT(*) DESC, literal_puesto
  `, agrupadores);
}

async function main() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  // ── 1. JEFES CPH ───────────────────────────────────────────────────────────
  const dupJefes = await queryDuplicados(db, ['JEFES CPH']);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`JEFES CPH — CARGOS CON >1 PERSONA EN EL PADRÓN (${dupJefes.length} casos)`);
  console.log('='.repeat(70));

  if (dupJefes.length === 0) {
    console.log('  Sin duplicados.');
  } else {
    dupJefes.forEach(r => {
      console.log(`\n  [${r.siglas}] ${r.puesto} — ${r.especialidad}`);
      console.log(`    Personas (${r.personas_asignadas}): ${r.personas}`);
      console.log(`    CUILs:      ${r.cuils}`);
      console.log(`    Situación:  ${r.situaciones}`);
      console.log(`    IDs SIAL:   ${r.id_sials}`);
    });
  }

  // ── 2. CPH Ejecución (MEDICO + NO MEDICO) ──────────────────────────────────
  const dupEjecucion = await queryDuplicados(db, ['MEDICO', 'NO MEDICO']);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`CPH EJECUCIÓN — CARGOS CON >1 PERSONA EN EL PADRÓN (${dupEjecucion.length} casos)`);
  console.log('='.repeat(70));

  if (dupEjecucion.length === 0) {
    console.log('  Sin duplicados.');
  } else {
    dupEjecucion.forEach(r => {
      console.log(`\n  [${r.siglas}] ${r.puesto} — ${r.especialidad}`);
      console.log(`    Personas (${r.personas_asignadas}): ${r.personas}`);
      console.log(`    CUILs:      ${r.cuils}`);
      console.log(`    Situación:  ${r.situaciones}`);
      console.log(`    IDs SIAL:   ${r.id_sials}`);
    });
  }

  // ── 3. Resumen por efector ──────────────────────────────────────────────────
  const todos = [...dupJefes, ...dupEjecucion];
  if (todos.length > 0) {
    const porSigla = {};
    todos.forEach(r => {
      if (!porSigla[r.siglas]) porSigla[r.siglas] = { cargos: 0, excedentes: 0 };
      porSigla[r.siglas].cargos++;
      porSigla[r.siglas].excedentes += (r.personas_asignadas - 1);
    });

    const filas = Object.entries(porSigla).sort((a, b) => b[1].cargos - a[1].cargos);

    console.log(`\n${'='.repeat(70)}`);
    console.log('RESUMEN POR EFECTOR');
    console.log('='.repeat(70));
    console.log('  Sigla                | Cargos duplicados | Personas excedentes');
    console.log('  ---------------------|-------------------|--------------------');
    filas.forEach(([sigla, d]) => {
      console.log(`  ${sigla.padEnd(20)} | ${String(d.cargos).padStart(17)} | ${String(d.excedentes).padStart(18)}`);
    });
    console.log(`\n  TOTAL: ${todos.length} cargos duplicados, ${filas.reduce((s,[,d])=>s+d.excedentes,0)} personas excedentes`);
  }

  await AppDataSource.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
