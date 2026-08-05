// Formateo de celdas para tablas dinámicas (columnas que llegan como texto
// crudo desde la base, sin metadata de tipo por columna).

// Nombres de columna que casi con certeza son fechas — se usa cuando no hay
// metadata de tipo explícita para la tabla (ver formatCellValue).
const DATE_NAME_HINTS = ['fecha', 'nacimiento', 'desde', 'hasta', 'bloqueo', 'antig'];

export function looksLikeDateColumnName(name) {
  const n = String(name || '').toLowerCase();
  return DATE_NAME_HINTS.some(hint => n.includes(hint));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Serial de fecha de Excel (días desde 1899-12-30, con el bug del año bisiesto
// 1900 ya incorporado en el offset 25569 = días hasta 1970-01-01) -> Date UTC.
function excelSerialToDate(serial) {
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(utcMs);
}

/**
 * Normaliza un valor de fecha a DD/MM/AAAA sin importar en qué formato haya
 * quedado guardado (ISO, DD/MM/AAAA, MM/DD/AAAA, serial de Excel como texto).
 * Si no lo reconoce como fecha, devuelve el valor tal cual (nunca inventa datos).
 */
export function formatFlexibleDate(raw) {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  if (!str) return '';

  // ISO 'AAAA-MM-DD' (con o sin hora/T al final)
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
  }

  // 'D/M/AAAA' o 'DD-MM-AAAA' (separador / o -)
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    let day = Number(m[1]);
    let month = Number(m[2]);
    const y = m[3];
    // Si el 2do campo no puede ser mes, en realidad vino como MM/DD (EEUU) -> invertir.
    // Si el 1er campo no puede ser mes, ya está en DD/MM (el día sólo puede ir ahí).
    // Si ambos son <=12 es ambiguo: se asume DD/MM (convención del sistema).
    if (month > 12 && day <= 12) { [day, month] = [month, day]; }
    if (day < 1 || day > 31 || month < 1 || month > 12) return str;
    return `${pad2(day)}/${pad2(month)}/${y}`;
  }

  // Serial numérico de Excel (rango plausible de fechas ~1970-2130)
  if (/^\d{5}$/.test(str)) {
    const serial = Number(str);
    if (serial > 25569 && serial < 95000) {
      const d = excelSerialToDate(serial);
      if (!isNaN(d.getTime())) {
        return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
      }
    }
  }

  return str;
}

/**
 * Formatea el valor de una celda de una tabla dinámica para mostrar.
 * `isDateColumn` es opcional: puede ser un Set/array de nombres de columna
 * exactos, o una función predicate(columnName) -> boolean. Si no se pasa,
 * usa la heurística por nombre (looksLikeDateColumnName).
 */
export function formatCellValue(value, columnName, isDateColumn) {
  if (value === null || value === undefined) return '';
  let matchesDate;
  if (typeof isDateColumn === 'function') {
    matchesDate = isDateColumn(columnName);
  } else if (isDateColumn instanceof Set) {
    matchesDate = isDateColumn.has(columnName);
  } else if (Array.isArray(isDateColumn)) {
    matchesDate = isDateColumn.includes(columnName);
  } else {
    matchesDate = looksLikeDateColumnName(columnName);
  }
  return matchesDate ? formatFlexibleDate(value) : String(value);
}
