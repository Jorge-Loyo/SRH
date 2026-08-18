require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const tables = ['personas', 'situacion_revista', 'dot_resultado', 'new_cargo'];
  for (const t of tables) {
    const [rows] = await c.query(`DESCRIBE ${t}`);
    console.log(`\n=== ${t} ===`);
    rows.forEach(r => console.log(`  ${r.Field.padEnd(30)} ${r.Type.padEnd(30)} NULL:${r.Null} KEY:${r.Key}`));
  }

  const counts = ['dot_resultado', 'personas', 'new_cargo'];
  for (const t of counts) {
    const [[row]] = await c.query(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`\nCOUNT ${t}: ${row.cnt}`);
  }

  // Muestra de dot_resultado
  const [sample] = await c.query('SELECT * FROM dot_resultado LIMIT 1');
  console.log('\n=== dot_resultado sample ===');
  if (sample.length) console.log(JSON.stringify(sample[0], null, 2));
  else console.log('  (vacía)');

  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
