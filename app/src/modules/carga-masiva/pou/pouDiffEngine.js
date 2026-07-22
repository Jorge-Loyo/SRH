const { Pou } = require('../../../entities-class/Pou');
const { COLUMN_MAPPING } = require('./pouColumnMapping');

const FIELDS = COLUMN_MAPPING.map((m) => m.field);

function normalizeForCompare(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim();
}

function diffFields(existing, incoming) {
  const diffs = [];
  for (const field of FIELDS) {
    const oldValue = normalizeForCompare(existing[field]);
    const newValue = normalizeForCompare(incoming[field]);
    if (oldValue !== newValue) {
      diffs.push({ field, oldValue: existing[field] ?? null, newValue: incoming[field] ?? null });
    }
  }
  return diffs;
}

// Clave natural de una fila POU: no hay ID de fila en el archivo origen, así
// que se identifica por la combinación sigla+perfil+especialidad (verificado
// sin duplicados en el archivo real).
function rowKey(pou) {
  return `${pou.sigla}::${pou.perfil}::${pou.especialidad}`;
}

async function buildPouDiff({ manager, periodo, rows }) {
  const existing = await manager.getRepository(Pou).find({ where: { periodo } });
  const existingByKey = new Map(existing.map((p) => [rowKey(p), p]));

  const nuevos = [];
  const modificados = [];
  const sinCambios = [];
  const seenKeys = new Set();

  for (const { pou } of rows) {
    const key = rowKey(pou);
    seenKeys.add(key);
    const existingRow = existingByKey.get(key);

    if (!existingRow) {
      nuevos.push({ pou, key });
      continue;
    }

    const fieldDiffs = diffFields(existingRow, pou);
    if (fieldDiffs.length === 0) {
      sinCambios.push({ pou, key, existingRow });
    } else {
      modificados.push({ pou, key, existingRow, fieldDiffs });
    }
  }

  const eliminados = [];
  for (const [key, existingRow] of existingByKey.entries()) {
    if (!seenKeys.has(key)) eliminados.push({ key, existingRow });
  }

  return { nuevos, modificados, sinCambios, eliminados };
}

module.exports = { buildPouDiff, rowKey, diffFields, FIELDS };
