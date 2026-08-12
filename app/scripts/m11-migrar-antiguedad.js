/**
 * M11 — Migrar antiguedad desde new_cargo → cargo_dotacion
 *
 * 1. Agrega columna `antiguedad` a cargo_dotacion (si no existe)
 * 2. Copia new_cargo.antiguedad → cargo_dotacion.antiguedad para ocupantes activos
 * 3. Verifica resultado
 */
const { AppDataSource } = require('../src/config/data-source');

async function main() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  // 1. Agregar columna si no existe
  const [cols] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'dotacion_db' AND TABLE_NAME = 'cargo_dotacion' AND COLUMN_NAME = 'antiguedad'`
  );
  if (!cols) {
    await db.query(`ALTER TABLE cargo_dotacion ADD COLUMN antiguedad DATE NULL AFTER desde`);
    console.log('✅ Columna antiguedad agregada a cargo_dotacion');
  } else {
    console.log('ℹ️  Columna antiguedad ya existe');
  }

  // 2. Migrar: copiar new_cargo.antiguedad → cargo_dotacion.antiguedad (ocupantes activos)
  const result = await db.query(`
    UPDATE cargo_dotacion cd
    JOIN new_cargo nc ON nc.id = cd.id_cargo
    SET cd.antiguedad = nc.antiguedad
    WHERE cd.hasta IS NULL
      AND nc.antiguedad IS NOT NULL
      AND cd.antiguedad IS NULL
  `);
  console.log(`✅ ${result.affectedRows} registros migrados (cargo_dotacion.antiguedad)`);

  // 3. Verificación
  const [stats] = await db.query(`
    SELECT
      COUNT(*) AS total_activos,
      SUM(cd.antiguedad IS NOT NULL) AS con_antiguedad,
      SUM(cd.antiguedad IS NULL) AS sin_antiguedad
    FROM cargo_dotacion cd WHERE cd.hasta IS NULL
  `);
  console.log('📊 Estado cargo_dotacion activos:', stats);

  const [sinAnt] = await db.query(`
    SELECT COUNT(*) AS cnt FROM cargo_dotacion cd
    JOIN new_cargo nc ON nc.id = cd.id_cargo
    WHERE cd.hasta IS NULL AND nc.antiguedad IS NOT NULL AND cd.antiguedad IS NULL
  `);
  console.log(`🔍 Pendientes sin migrar: ${sinAnt.cnt}`);

  await AppDataSource.destroy();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
