// Crea la tabla `carreras` e inserta los registros iniciales.
// Usage: node scripts/seed-carreras.js

const { initDatabase, closeDatabase } = require('./lib/init-db');

const CARRERAS = [
  { codigo: 'CPH', nombre: 'CPH' },
  { codigo: 'ENF', nombre: 'Enfermería' },
  { codigo: 'TEC', nombre: 'Técnico' },
];

async function main() {
  const dataSource = await initDatabase();

  // Recrear tabla con estructura correcta
  await dataSource.query(`DROP TABLE IF EXISTS carreras`);
  await dataSource.query(`
    CREATE TABLE carreras (
      id_carrera  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      codigo      VARCHAR(10)  NOT NULL UNIQUE,
      nombre      VARCHAR(100) NOT NULL,
      activo      TINYINT(1)   NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('Tabla carreras: OK');

  for (const c of CARRERAS) {
    await dataSource.query(
      `INSERT INTO carreras (codigo, nombre, activo) VALUES (?, ?, 1)`,
      [c.codigo, c.nombre]
    );
    console.log(`  Insert: ${c.codigo} — ${c.nombre}`);
  }

  await closeDatabase(dataSource);
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
