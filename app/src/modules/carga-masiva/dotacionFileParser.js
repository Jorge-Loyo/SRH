const ExcelJS = require('exceljs');
const { COLUMN_MAPPING, IGNORED_HEADERS, NATURAL_KEY_HEADER } = require('./dotacionColumnMapping');

const KNOWN_HEADERS = new Set([
  ...COLUMN_MAPPING.flatMap((m) => m.headers),
  ...IGNORED_HEADERS,
  NATURAL_KEY_HEADER,
]);

// Para cada campo del mapeo, determina cuál de sus alias de header aparece en
// este archivo (el primero que matchee). Se resuelve una sola vez por archivo
// -- no por fila -- porque el nombre de columna no cambia entre filas.
function resolveActiveHeaders(fileHeaders) {
  const fileHeaderSet = new Set(fileHeaders);
  return COLUMN_MAPPING.map((mapping) => ({
    mapping,
    activeHeader: mapping.headers.find((h) => fileHeaderSet.has(h)) || null,
  }));
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(value).trim();
  if (!str) return null;
  // 'YYYY-MM-DD[ HH:mm:ss]' -> tomar solo la fecha
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  // 'D/M/YYYY', 'DD/MM/YYYY' o con guiones 'D-M-YYYY'
  const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    let day = Number(slashMatch[1]);
    let month = Number(slashMatch[2]);
    const y = slashMatch[3];
    // Si el 2do campo no puede ser mes, en realidad vino como M/D (EEUU) -> invertir.
    if (month > 12 && day <= 12) { [day, month] = [month, day]; }
    if (day < 1 || day > 31 || month < 1 || month > 12) return str;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // Serial de fecha de Excel guardado como texto (rango plausible ~1970-2130)
  if (/^\d{5}$/.test(str)) {
    const serial = Number(str);
    if (serial > 25569 && serial < 95000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
  }
  return str;
}

function applyTransform(str, transform) {
  if (!transform) return str;
  let result = str;
  if (transform.strip) {
    for (const char of transform.strip) result = result.split(char).join('');
  }
  if (transform.slice) {
    const [from, to] = transform.slice; // 1-indexado, inclusive (como "recorte" del proceso manual)
    result = result.slice(from - 1, to);
  }
  return result;
}

function normalizeValue(rawValue, type, transform) {
  if (rawValue === null || rawValue === undefined) return null;
  if (type === 'date') return normalizeDate(rawValue);
  if (type === 'int') {
    const n = parseInt(String(rawValue).trim(), 10);
    return Number.isNaN(n) ? null : n;
  }
  const str = applyTransform(String(rawValue).trim(), transform);
  return str === '' ? null : str;
}

/**
 * Parsea el archivo de dotación (buffer xlsx) y devuelve las filas crudas
 * mapeadas a sub-registros sigla/cargo/persona/rol, más metadata de columnas
 * no reconocidas en el archivo (drift respecto al mapeo esperado).
 */
async function parseDotacionFile(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('El archivo no tiene hojas');

  const headerRow = sheet.getRow(1);
  const headerByColumn = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = String(cell.value || '').trim();
    if (header) headerByColumn[colNumber] = header;
  });

  const fileHeaders = Object.values(headerByColumn);
  const resolved = resolveActiveHeaders(fileHeaders);
  // "Falta" sólo si NINGUNO de los alias del campo está en el archivo.
  const missingHeaders = resolved
    .filter((r) => !r.activeHeader)
    .map((r) => r.mapping.headers[0]);
  if (!fileHeaders.includes(NATURAL_KEY_HEADER)) missingHeaders.push(NATURAL_KEY_HEADER);
  const unknownHeaders = fileHeaders.filter((h) => !KNOWN_HEADERS.has(h));

  const rows = [];
  const errors = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const raw = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headerByColumn[colNumber];
      if (header) raw[header] = cell.value;
    });

    const cuil = String(raw[NATURAL_KEY_HEADER] || '').trim();
    if (!cuil) {
      errors.push({ row: rowNumber, motivo: 'CUIL vacío' });
      return;
    }

    const entities = { sigla: {}, cargo: {}, persona: {}, rol: {} };
    for (const { mapping, activeHeader } of resolved) {
      const { entity, field, type, transform } = mapping;
      entities[entity][field] = activeHeader ? normalizeValue(raw[activeHeader], type, transform) : null;
    }

    rows.push({ rowNumber, cuil, ...entities });
  });

  return { rows, errors, missingHeaders, unknownHeaders };
}

module.exports = { parseDotacionFile, normalizeDate, normalizeValue };
