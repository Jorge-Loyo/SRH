require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { AppDataSource } = require('../src/config/data-source');

AppDataSource.initialize().then(async () => {
  const q = sql => AppDataSource.query(sql);

  // Total new_cargo
  const [{ total_nc }] = await q('SELECT COUNT(*) AS total_nc FROM new_cargo');
  console.log('Total new_cargo:', total_nc);

  // new_cargo con id_sial NULL (no tienen referencia al Excel)
  const [{ sin_sial }] = await q('SELECT COUNT(*) AS sin_sial FROM new_cargo WHERE id_sial IS NULL');
  console.log('new_cargo sin id_sial (NULL):', sin_sial);

  // new_cargo con id_sial que NO está en dot_resultado
  const [{ fuera_padron }] = await q(`
    SELECT COUNT(*) AS fuera_padron FROM new_cargo nc
    LEFT JOIN dot_resultado dr ON dr.id_sial = nc.id_sial
    WHERE nc.id_sial IS NOT NULL AND dr.id_sial IS NULL
  `);
  console.log('new_cargo con id_sial que NO está en dot_resultado:', fuera_padron);

  // Muestra de los que están fuera del padrón
  const muestra = await q(`
    SELECT nc.id, nc.id_sial, nc.codigo, nc.carrera, nc.sigla, nc.estado
    FROM new_cargo nc
    LEFT JOIN dot_resultado dr ON dr.id_sial = nc.id_sial
    WHERE nc.id_sial IS NOT NULL AND dr.id_sial IS NULL
    LIMIT 10
  `);
  console.log('\nMuestra fuera del padrón:', JSON.stringify(muestra, null, 2));

  // new_cargo con id_sial NULL — muestra
  const muestra_null = await q(`
    SELECT nc.id, nc.codigo, nc.carrera, nc.sigla, nc.estado, nc.id_alta
    FROM new_cargo nc WHERE nc.id_sial IS NULL LIMIT 10
  `);
  console.log('\nMuestra sin id_sial:', JSON.stringify(muestra_null, null, 2));

  // Vacantes: new_cargo vigente sin fila activa en cargo_dotacion
  const [{ vacantes }] = await q(`
    SELECT COUNT(*) AS vacantes FROM new_cargo nc
    LEFT JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
    WHERE nc.estado = 'vigente' AND cd.id IS NULL
  `);
  console.log('\nVacantes (vigente sin dotacion activa):', vacantes);

  // Ocupados
  const [{ ocupados }] = await q(`
    SELECT COUNT(*) AS ocupados FROM new_cargo nc
    INNER JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
    WHERE nc.estado = 'vigente'
  `);
  console.log('Ocupados (vigente con dotacion activa):', ocupados);

  await AppDataSource.destroy();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
