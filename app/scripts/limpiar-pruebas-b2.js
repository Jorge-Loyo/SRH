require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // IDs a eliminar: vigentes sin id_sial (todos son pruebas del Bloque 2)
    const [candidatos] = await c.query(`
      SELECT nc.id, nc.codigo, nc.id_alta
      FROM new_cargo nc WHERE nc.id_sial IS NULL
    `);
    console.log('Cargos a eliminar:', candidatos.length);
    candidatos.forEach(r => console.log(' ', r.codigo, '| id:', r.id, '| id_alta:', r.id_alta));

    if (candidatos.length === 0) { console.log('Nada que eliminar.'); return; }

    const ids     = candidatos.map(r => r.id);
    const altaIds = [...new Set(candidatos.map(r => r.id_alta).filter(Boolean))];

    // 1. cargo_dotacion
    const [d1] = await c.query('DELETE FROM cargo_dotacion WHERE id_cargo IN (?)', [ids]);
    console.log('\ncargo_dotacion eliminados:', d1.affectedRows);

    // 2. registros de alta
    const [r1] = await c.query('DELETE FROM registro_cph     WHERE id_alta IN (?)', [altaIds]);
    const [r2] = await c.query('DELETE FROM registro_enf     WHERE id_alta IN (?)', [altaIds]);
    const [r3] = await c.query('DELETE FROM registro_tec_pof WHERE id_alta IN (?)', [altaIds]);
    const [r4] = await c.query('DELETE FROM registro_tec_pou WHERE id_alta IN (?)', [altaIds]);
    console.log('registro_cph:', r1.affectedRows, '| registro_enf:', r2.affectedRows,
                '| registro_tec_pof:', r3.affectedRows, '| registro_tec_pou:', r4.affectedRows);

    // 3. new_cargo
    const [nc] = await c.query('DELETE FROM new_cargo WHERE id IN (?)', [ids]);
    console.log('new_cargo eliminados:', nc.affectedRows);

    // 4. cargos_alta huérfanos
    const [ca] = await c.query(`
      DELETE FROM cargos_alta
      WHERE id IN (?)
        AND NOT EXISTS (SELECT 1 FROM new_cargo nc2 WHERE nc2.id_alta = cargos_alta.id)
    `, [altaIds]);
    console.log('cargos_alta eliminados:', ca.affectedRows);

    // Verificación final
    const [[{ total }]] = await c.query('SELECT COUNT(*) AS total FROM new_cargo');
    console.log('\nTotal new_cargo restante:', total);

  } finally {
    await c.end();
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
