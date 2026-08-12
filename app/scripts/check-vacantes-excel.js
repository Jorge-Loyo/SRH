require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { AppDataSource } = require('../src/config/data-source');
const { parseDotacionFile } = require('../src/modules/carga-masiva/dotacionFileParser');
const fs = require('fs');

AppDataSource.initialize().then(async () => {
  const filePath = 'C:/Desarrollo/SRH/Automatización Dotación/Cargos_salud_20260802.xlsx';
  const buffer = fs.readFileSync(filePath);
  const { rows } = await parseDotacionFile(buffer);
  console.log('Total filas Excel:', rows.length);

  // ID SIAL de los 16 cargos vacantes
  const vacantes = await AppDataSource.query(`
    SELECT nc.id, nc.codigo, nc.carrera, nc.sigla, nc.id_sial
    FROM new_cargo nc
    LEFT JOIN cargo_dotacion cd ON cd.id_cargo = nc.id AND cd.hasta IS NULL
    WHERE nc.estado = 'vigente' AND cd.id_cargo IS NULL
  `);
  console.log('\n16 cargos vacantes en BD:');
  vacantes.forEach(v => console.log(' ', v.codigo, '| id_sial:', v.id_sial));

  // Verificar cuáles de esos id_sial están en el Excel
  const excelSials = new Set(rows.map(r => r.rol?.codigo_rol).filter(Boolean));
  console.log('\nTotal id_sial únicos en Excel:', excelSials.size);

  console.log('\nVerificación vacantes vs Excel:');
  vacantes.forEach(v => {
    const enExcel = v.id_sial ? excelSials.has(v.id_sial) : false;
    console.log(' ', v.codigo, '| id_sial:', v.id_sial ?? 'NULL', '|', enExcel ? '✓ EN EXCEL' : '✗ NO ESTÁ');
  });

  await AppDataSource.destroy();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
