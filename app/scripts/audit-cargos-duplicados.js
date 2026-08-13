/**
 * audit-cargos-duplicados.js
 *
 * Detecta errores de datos de origen en el padrón (dot_resultado):
 * una persona con DOS ROLES ACTIVOS del mismo tipo de jefatura CPH.
 *
 * Lógica del id_sial: formato XXXXXXXXX-N
 *   - XXXXXXXXX = código de la persona en SIAL
 *   - N          = número de rol (cargo)
 * Una persona puede tener múltiples roles (cargos). El error es tener
 * dos roles ACTIVOS con el mismo literal_puesto en el mismo efector.
 *
 * Scope: JEFES CPH (agrupador = 'JEFES CPH')
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { AppDataSource } = require('../src/config/data-source');

async function main() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  // ── Personas con 2+ roles ACTIVOS del mismo literal_puesto en el mismo efector ──
  const duplicados = await db.query(`
    SELECT
      cuil,
      MIN(ayn)                                                          AS ayn,
      siglas,
      literal_puesto,
      MIN(especialidad)                                                 AS especialidad,
      COUNT(*)                                                          AS roles_activos,
      GROUP_CONCAT(id_sial ORDER BY id_sial SEPARATOR ' | ')           AS id_sials
    FROM dot_resultado
    WHERE agrupador = 'JEFES CPH'
      AND situacion_de_revista = 'Activo'
    GROUP BY cuil, siglas, literal_puesto
    HAVING COUNT(*) > 1
    ORDER BY siglas, literal_puesto, MIN(ayn)
  `);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`JEFES CPH — PERSONA CON 2+ ROLES ACTIVOS EN EL MISMO CARGO (${duplicados.length} casos)`);
  console.log('='.repeat(70));
  console.log('Criterio: mismo CUIL + mismo efector + mismo tipo de jefatura + situación Activo\n');

  if (duplicados.length === 0) {
    console.log('  Sin errores detectados.');
  } else {
    duplicados.forEach(r => {
      console.log(`  [${r.siglas}] ${r.literal_puesto} — ${r.especialidad ?? '(sin especialidad)'}`);
      console.log(`    Persona:    ${r.ayn} (CUIL: ${r.cuil})`);
      console.log(`    Roles (${r.roles_activos}): ${r.id_sials}`);
    });
  }

  // ── Resumen por efector ──────────────────────────────────────────────────────
  if (duplicados.length > 0) {
    const porSigla = {};
    duplicados.forEach(r => {
      porSigla[r.siglas] = (porSigla[r.siglas] || 0) + 1;
    });
    const filas = Object.entries(porSigla).sort((a, b) => b[1] - a[1]);

    console.log(`\n${'='.repeat(70)}`);
    console.log('RESUMEN POR EFECTOR');
    console.log('='.repeat(70));
    filas.forEach(([sigla, n]) => {
      console.log(`  ${sigla.padEnd(20)} ${n} persona(s) con roles duplicados`);
    });
    console.log(`\n  TOTAL: ${duplicados.length} casos`);
  }

  await AppDataSource.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
