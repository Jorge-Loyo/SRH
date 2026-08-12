const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Desarrollo/SRH/Automatización Dotación/Cargos_salud_20260802.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
console.log('Total filas:', rows.length);
console.log('Headers:', Object.keys(rows[0]));
console.log('\nMuestra fila 1:', JSON.stringify(rows[0], null, 2));
console.log('\nMuestra fila 2:', JSON.stringify(rows[1], null, 2));

// Ver valores únicos de ID SIAL para entender el formato
const sials = [...new Set(rows.slice(0, 20).map(r => r['ID SIAL']))];
console.log('\nMuestra ID SIAL:', sials);

// Ver si hay columna de código de cargo
const codigoCargo = [...new Set(rows.slice(0, 5).map(r => r['ID CARGO'] || r['CODIGO CARGO']))];
console.log('Muestra ID CARGO:', codigoCargo);
