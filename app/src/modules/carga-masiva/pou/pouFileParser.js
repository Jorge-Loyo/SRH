const ExcelJS = require('exceljs');
const { SHEET_NAME, COLUMN_MAPPING } = require('./pouColumnMapping');

// Varias columnas de "Base" son fórmulas de Excel (ej. Dotación Total =
// Dotación Diaria * 7) — exceljs devuelve { formula, result } para esas
// celdas en vez del valor plano. Se toma el resultado ya calculado.
function unwrapFormula(value) {
  if (value && typeof value === 'object' && 'result' in value) return value.result;
  return value;
}

function normalizeValue(rawValue, type) {
  const value = unwrapFormula(rawValue);
  if (value === null || value === undefined) return null;
  if (type === 'int') {
    const n = parseInt(String(value).trim(), 10);
    return Number.isNaN(n) ? null : n;
  }
  const str = String(value).trim();
  return str === '' ? null : str;
}

// Resuelve, para cada campo del mapeo, en qué número de columna está en este
// archivo — usando "ocurrencia N del header" en vez de nombre puro, porque
// "Vacantes" aparece dos veces en la hoja y hay que poder elegir cuál.
function resolveColumns(headerByColumn) {
  const columnsByHeader = new Map(); // header -> [colIndex, colIndex, ...] en orden
  for (const [colIndex, header] of Object.entries(headerByColumn)) {
    if (!columnsByHeader.has(header)) columnsByHeader.set(header, []);
    columnsByHeader.get(header).push(Number(colIndex));
  }

  return COLUMN_MAPPING.map((mapping) => {
    const occurrence = mapping.occurrence || 1;
    let columnIndex = null;
    for (const header of mapping.headers) {
      const matches = columnsByHeader.get(header);
      if (matches && matches.length >= occurrence) {
        columnIndex = matches[occurrence - 1];
        break;
      }
    }
    return { mapping, columnIndex };
  });
}

async function parsePouFile(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new Error(`El archivo no tiene una hoja llamada "${SHEET_NAME}" (hojas encontradas: ${workbook.worksheets.map((w) => w.name).join(', ')})`);
  }

  const headerByColumn = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = String(cell.value || '').trim();
    if (header) headerByColumn[colNumber] = header;
  });

  const resolved = resolveColumns(headerByColumn);
  const missingHeaders = resolved.filter((r) => r.columnIndex === null).map((r) => r.mapping.headers[0]);

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const pou = {};
    for (const { mapping, columnIndex } of resolved) {
      pou[mapping.field] = columnIndex ? normalizeValue(row.getCell(columnIndex).value, mapping.type) : null;
    }

    if (!pou.sigla && !pou.perfil && !pou.especialidad) return; // fila vacía

    rows.push({ rowNumber, pou });
  });

  return { rows, missingHeaders };
}

module.exports = { parsePouFile, unwrapFormula };
