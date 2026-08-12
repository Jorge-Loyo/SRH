require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { AppDataSource } = require('../src/config/data-source');

AppDataSource.initialize().then(async () => {
  const q = (sql) => AppDataSource.query(sql);

  const [{ total }] = await q('SELECT COUNT(*) AS total FROM dot_resultado');
  console.log('Total padron dot_resultado:', total);

  const [{ con_sial }] = await q('SELECT COUNT(*) AS con_sial FROM dot_resultado dr INNER JOIN new_cargo nc ON nc.id_sial = dr.id_sial');
  console.log('Match id_sial exacto:', con_sial);

  const [{ sin_sial }] = await q('SELECT COUNT(*) AS sin_sial FROM dot_resultado dr LEFT JOIN new_cargo nc ON nc.id_sial = dr.id_sial WHERE nc.id IS NULL');
  console.log('Sin match id_sial:', sin_sial);

  // Muestra de id_sial sin match
  const muestras = await q('SELECT dr.id_sial, dr.siglas, dr.escalafon, dr.literal_puesto FROM dot_resultado dr LEFT JOIN new_cargo nc ON nc.id_sial = dr.id_sial WHERE nc.id IS NULL LIMIT 5');
  console.log('Muestra sin match:', JSON.stringify(muestras, null, 2));

  const [{ con_repa }] = await q('SELECT COUNT(*) AS con_repa FROM dot_resultado dr INNER JOIN organigramas o ON o.codigo_reparticion = CAST(dr.codigo_repa AS UNSIGNED)');
  console.log('\nMatch codigo_repa -> organigramas:', con_repa);

  const [{ sin_repa }] = await q('SELECT COUNT(*) AS sin_repa FROM dot_resultado dr LEFT JOIN organigramas o ON o.codigo_reparticion = CAST(dr.codigo_repa AS UNSIGNED) WHERE o.codigo_reparticion IS NULL');
  console.log('Sin match codigo_repa:', sin_repa);

  // Muestra de codigo_repa sin match
  const muestras2 = await q('SELECT DISTINCT dr.codigo_repa, dr.descripcion_repa, dr.siglas FROM dot_resultado dr LEFT JOIN organigramas o ON o.codigo_reparticion = CAST(dr.codigo_repa AS UNSIGNED) WHERE o.codigo_reparticion IS NULL LIMIT 5');
  console.log('Muestra sin match repa:', JSON.stringify(muestras2, null, 2));

  // Cruce siglas dot_resultado -> siglas tabla
  const [{ con_sigla }] = await q('SELECT COUNT(*) AS con_sigla FROM dot_resultado dr INNER JOIN siglas s ON s.sigla = dr.siglas');
  console.log('\nMatch siglas -> tabla siglas:', con_sigla);

  // Cruce siglas dot_resultado -> new_cargo (cuantos cargos tienen esa sigla)
  const [{ nc_siglas }] = await q('SELECT COUNT(DISTINCT nc.sigla) AS nc_siglas FROM new_cargo nc INNER JOIN dot_resultado dr ON dr.siglas = nc.sigla');
  console.log('Siglas en comun new_cargo <-> dot_resultado:', nc_siglas);

  // Muestra de id_sial format en ambas tablas
  const sample_nc = await q('SELECT id_sial FROM new_cargo WHERE id_sial IS NOT NULL LIMIT 3');
  console.log('\nFormato id_sial en new_cargo:', sample_nc.map(r => r.id_sial));
  const sample_dr = await q('SELECT id_sial FROM dot_resultado LIMIT 3');
  console.log('Formato id_sial en dot_resultado:', sample_dr.map(r => r.id_sial));

  await AppDataSource.destroy();
}).catch(e => { console.error(e.message); process.exit(1); });
