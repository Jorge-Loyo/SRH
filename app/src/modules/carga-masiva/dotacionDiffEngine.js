const { Persona } = require('../../entities-class/Persona');
const { Cargo } = require('../../entities-class/Cargo');
const { Rol } = require('../../entities-class/Rol');
const { Sigla } = require('../../entities-class/Sigla');
const { COLUMN_MAPPING } = require('./dotacionColumnMapping');

const FIELDS_BY_ENTITY = { sigla: [], cargo: [], persona: [], rol: [] };
for (const { entity, field } of COLUMN_MAPPING) FIELDS_BY_ENTITY[entity].push(field);

function normalizeForCompare(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim();
}

function diffEntityFields(entity, existing, incoming) {
  const diffs = [];
  if (!existing) return diffs;
  for (const field of FIELDS_BY_ENTITY[entity]) {
    const oldValue = normalizeForCompare(existing[field]);
    const newValue = normalizeForCompare(incoming[field]);
    if (oldValue !== newValue) {
      diffs.push({ entity, field, oldValue: existing[field] ?? null, newValue: incoming[field] ?? null });
    }
  }
  return diffs;
}

// ID SIAL (Rol.codigo_rol) es el identificador que no se puede repetir: lo
// asigna el sistema origen (GCBA) y es la clave real de "un puesto ocupado".
// Se usa como clave fuerte de identidad de fila. Como respaldo se usa
// (CUIL, código de cargo) — necesario para períodos cargados ANTES de que
// este importador existiera, donde codigo_rol nunca se completó (queda null).
function strongKey(codigoRol) {
  return codigoRol ? `sial:${codigoRol}` : null;
}
function weakKey(cuil, codigoCargo) {
  return `cuil:${cuil}::${codigoCargo || ''}`;
}

async function loadPeriodoSnapshot(manager, periodo) {
  const [personas, cargos, roles] = await Promise.all([
    manager.getRepository(Persona).find({ where: { periodo } }),
    manager.getRepository(Cargo).find({ where: { periodo } }),
    manager.getRepository(Rol).find({ where: { periodo } }),
  ]);

  const cargoById = new Map(cargos.map((c) => [c.id_cargo, c]));
  const rolByPersonaId = new Map(roles.filter((r) => r.id_persona != null).map((r) => [r.id_persona, r]));

  const entries = personas.map((persona) => {
    const rol = rolByPersonaId.get(persona.id_persona) || null;
    const cargo = rol && rol.id_cargo != null ? cargoById.get(rol.id_cargo) || null : null;
    return { persona, cargo, rol };
  });

  const byStrongKey = new Map();
  const byWeakKey = new Map();
  for (const entry of entries) {
    const sKey = strongKey(entry.rol?.codigo_rol);
    if (sKey) byStrongKey.set(sKey, entry);
    // Clave débil de respaldo: si hay más de una fila igual (dato legacy sin
    // codigo_rol), sólo se puede matchear una — el resto queda como "nuevo".
    const wKey = weakKey(String(entry.persona.cuil), entry.cargo?.codigo_cargo);
    if (!byWeakKey.has(wKey)) byWeakKey.set(wKey, entry);
  }

  return {
    allEntries: entries,
    byStrongKey,
    byWeakKey,
    cargoByCodigo: new Map(cargos.filter((c) => c.codigo_cargo).map((c) => [c.codigo_cargo, c])),
  };
}

function findExisting(snapshot, row) {
  const sKey = strongKey(row.rol.codigo_rol);
  if (sKey && snapshot.byStrongKey.has(sKey)) return snapshot.byStrongKey.get(sKey);
  const wKey = weakKey(row.cuil, row.cargo.codigo_cargo);
  return snapshot.byWeakKey.get(wKey) || null;
}

async function loadSiglasById(manager) {
  const siglas = await manager.getRepository(Sigla).find();
  return new Map(siglas.map((s) => [s.id_sigla, s]));
}

// Determina contra qué período comparar el archivo: si el período que se está
// subiendo YA tiene datos (re-carga/corrección de un período ya cargado), se
// compara contra sí mismo (como siempre). Si es un período nuevo (la carga
// mensual normal), no hay nada cargado ahí todavía — comparar contra sí mismo
// daría todo "nuevo" siempre, así que se compara contra el período anterior
// más reciente que sí tenga datos, para poder mostrar quién sigue, quién
// cambió y quién ya no está respecto al mes pasado.
async function resolveComparisonPeriodo(manager, periodo) {
  const exact = await manager.query('SELECT 1 FROM personas WHERE periodo = ? LIMIT 1', [periodo]);
  if (exact.length > 0) return periodo;
  const prev = await manager.query(
    'SELECT DISTINCT periodo FROM personas WHERE periodo < ? ORDER BY periodo DESC LIMIT 1',
    [periodo],
  );
  return prev[0]?.periodo || null;
}

const EMPTY_SNAPSHOT = { allEntries: [], byStrongKey: new Map(), byWeakKey: new Map(), cargoByCodigo: new Map() };

/**
 * Compara las filas parseadas del archivo contra el período de referencia
 * (ver resolveComparisonPeriodo) y las clasifica en nuevos / modificados /
 * sin cambios / eliminados. También arma el diff de Siglas (tabla global,
 * sin período).
 */
async function buildDiff({ manager, periodo, rows }) {
  const comparisonPeriodo = await resolveComparisonPeriodo(manager, periodo);
  const snapshot = comparisonPeriodo ? await loadPeriodoSnapshot(manager, comparisonPeriodo) : EMPTY_SNAPSHOT;
  const siglasById = await loadSiglasById(manager);

  const nuevos = [];
  const modificados = [];
  const sinCambios = [];
  const matchedPersonaIds = new Set();

  const siglaSeen = new Map(); // id_sigla -> payload (dedupe entre filas)

  for (const row of rows) {
    const existing = findExisting(snapshot, row);
    const existingPersona = existing?.persona;
    const existingCargo = existing?.cargo || snapshot.cargoByCodigo.get(row.cargo.codigo_cargo);
    const existingRol = existing?.rol;

    const idSigla = row.sigla.id_sigla;
    if (idSigla != null && !siglaSeen.has(idSigla)) siglaSeen.set(idSigla, row.sigla);

    if (!existingPersona) {
      nuevos.push({ row, existingCargo: existingCargo || null });
      continue;
    }

    matchedPersonaIds.add(existingPersona.id_persona);
    const key = strongKey(row.rol.codigo_rol) || weakKey(row.cuil, row.cargo.codigo_cargo);

    const fieldDiffs = [
      ...diffEntityFields('persona', existingPersona, row.persona),
      ...diffEntityFields('cargo', existingCargo, row.cargo),
      ...diffEntityFields('rol', existingRol, row.rol),
    ];

    if (fieldDiffs.length === 0) {
      sinCambios.push({ row, existingPersona, existingCargo, existingRol });
    } else {
      modificados.push({ row, key, existingPersona, existingCargo, existingRol, fieldDiffs });
    }
  }

  const eliminados = [];
  for (const entry of snapshot.allEntries) {
    if (!matchedPersonaIds.has(entry.persona.id_persona)) {
      const key = strongKey(entry.rol?.codigo_rol) || weakKey(String(entry.persona.cuil), entry.cargo?.codigo_cargo);
      eliminados.push({ key, persona: entry.persona, cargo: entry.cargo, rol: entry.rol });
    }
  }

  const siglaNuevas = [];
  const siglaModificadas = [];
  for (const [idSigla, payload] of siglaSeen.entries()) {
    const existing = siglasById.get(idSigla);
    if (!existing) {
      siglaNuevas.push({ payload });
      continue;
    }
    const diffs = diffEntityFields('sigla', existing, payload);
    if (diffs.length > 0) siglaModificadas.push({ existing, payload, fieldDiffs: diffs });
  }

  return {
    comparisonPeriodo,
    nuevos,
    modificados,
    sinCambios,
    eliminados,
    siglas: { nuevas: siglaNuevas, modificadas: siglaModificadas },
  };
}

module.exports = { buildDiff, diffEntityFields, FIELDS_BY_ENTITY, strongKey, weakKey };
