/**
 * audit-cargos-duplicados.js
 *
 * Detecta errores de datos de origen en el padrón (dot_resultado):
 * una persona con DOS ROLES ACTIVOS del mismo tipo de jefatura CPH.
 *
 * Lógica del id_sial: formato XXXXXXXXX-N
 *   - XXXXXXXXX = código de la persona en SIAL
 *   - N          = número de rol (cargo)
 *
 * Rol válido:    codigo_jefaturas IS NOT NULL  (tiene código de jefatura asignado)
 * Rol a eliminar: codigo_jefaturas IS NULL      (duplicado sin código — error de origen)
 *
 * Scope: JEFES CPH (agrupador = 'JEFES CPH')
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { AppDataSource } = require('../src/config/data-source');

async function main() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  // Traer todos los roles activos duplicados con detalle de codigo_jefaturas
  const filas = await db.query(`
    SELECT
      a.cuil,
      a.ayn,
      a.siglas,
      a.literal_puesto,
      a.especialidad,
      a.id_sial,
      a.codigo_jefaturas
    FROM dot_resultado a
    JOIN (
      SELECT cuil, siglas, literal_puesto
      FROM dot_resultado
      WHERE agrupador = 'JEFES CPH'
        AND situacion_de_revista = 'Activo'
      GROUP BY cuil, siglas, literal_puesto
      HAVING COUNT(*) > 1
    ) dup ON dup.cuil = a.cuil
          AND dup.siglas = a.siglas
          AND dup.literal_puesto = a.literal_puesto
    WHERE a.agrupador = 'JEFES CPH'
      AND a.situacion_de_revista = 'Activo'
    ORDER BY a.siglas, a.cuil, a.id_sial
  `);

  // Agrupar por persona+efector+puesto
  const grupos = {};
  filas.forEach(r => {
    const key = `${r.cuil}||${r.siglas}||${r.literal_puesto}`;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(r);
  });

  const casos = Object.values(grupos);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`JEFES CPH — ROLES DUPLICADOS CON IDENTIFICACIÓN DE ERROR (${casos.length} casos)`);
  console.log('='.repeat(70));
  console.log('Rol válido = tiene codigo_jefaturas | Rol a eliminar = codigo_jefaturas NULL\n');

  casos.forEach(roles => {
    const { ayn, cuil, siglas, literal_puesto, especialidad } = roles[0];
    console.log(`  [${siglas}] ${literal_puesto} — ${especialidad ?? '(sin especialidad)'}`);
    console.log(`  Persona: ${ayn} (CUIL: ${cuil})`);
    roles.forEach(r => {
      const valido = r.codigo_jefaturas !== null;
      const tag = valido ? '✓ VÁLIDO  ' : '✗ ELIMINAR';
      console.log(`    [${tag}] ${r.id_sial}  codigo_jefaturas: ${r.codigo_jefaturas ?? 'NULL'}`);
    });
    console.log();
  });

  // Resumen
  const porSigla = {};
  casos.forEach(roles => {
    const sigla = roles[0].siglas;
    porSigla[sigla] = (porSigla[sigla] || 0) + 1;
  });
  const resumen = Object.entries(porSigla).sort((a, b) => b[1] - a[1]);

  console.log('='.repeat(70));
  console.log('RESUMEN POR EFECTOR');
  console.log('='.repeat(70));
  resumen.forEach(([sigla, n]) => {
    console.log(`  ${sigla.padEnd(20)} ${n} caso(s)`);
  });
  console.log(`\n  TOTAL: ${casos.length} casos — ${casos.length} roles a eliminar en SIAL`);

  await AppDataSource.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
