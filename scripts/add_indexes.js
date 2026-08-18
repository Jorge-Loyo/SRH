const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../app/.env'), override: false });

// Credenciales desde variables de entorno
const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

mysql.createConnection({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  ssl: { rejectUnauthorized: false }
}).then(async c => {
  const sqls = [
    // Índice compuesto para filtros combinados más comunes
    'ALTER TABLE new_cargo ADD INDEX idx_nc_estado_carrera (estado, carrera)',
    'ALTER TABLE new_cargo ADD INDEX idx_nc_modalidad_estado (modalidad, estado)',
    // Índice en cargo_dotacion para acelerar los subqueries de dot_ocupacion
    'ALTER TABLE cargo_dotacion ADD INDEX idx_cd_cargo_hasta_sit (id_cargo, hasta, situacion_revista)',
  ];
  for (const sql of sqls) {
    try {
      await c.execute(sql);
      console.log('OK:', sql.slice(0, 70));
    } catch (e) {
      console.log('SKIP (ya existe?):', e.message.slice(0, 80));
    }
  }
  // Verificar índices resultantes
  const [idx] = await c.execute("SHOW INDEX FROM new_cargo WHERE Key_name NOT IN ('PRIMARY','codigo','uq_id_sial')");
  console.log('\nÍndices en new_cargo:');
  idx.forEach(x => console.log(' ', x.Key_name, '->', x.Column_name));
  await c.end();
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
