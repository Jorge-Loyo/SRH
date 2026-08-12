require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { AppDataSource } = require('../src/config/data-source');
const CargoDotacionSyncService = require('../src/modules/dotacion/CargoDotacionSyncService');

AppDataSource.initialize().then(async () => {
  console.log('Iniciando sincronización...');
  const svc = new CargoDotacionSyncService(AppDataSource);
  const resultado = await svc.sincronizar();
  console.log('\n=== RESULTADO ===');
  console.log(JSON.stringify(resultado, null, 2));

  const estado = await svc.getEstado();
  console.log('\n=== ESTADO FINAL ===');
  console.log(JSON.stringify(estado, null, 2));

  await AppDataSource.destroy();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
