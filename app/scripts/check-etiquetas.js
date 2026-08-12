require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { AppDataSource } = require('../src/config/data-source');
AppDataSource.initialize().then(async () => {
  const r = await AppDataSource.query('SELECT id, codigo, descripcion FROM cargo_etiquetas ORDER BY codigo');
  console.log('Etiquetas:', JSON.stringify(r, null, 2));
  await AppDataSource.destroy();
}).catch(e => { console.error(e.message); process.exit(1); });
