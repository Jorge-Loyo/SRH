/**
 * Handler para DotacionTotal - filtra y pagina en memoria desde caché.
 * La primera request construye el caché (~5s), las siguientes son instantáneas.
 */

const { normalizeSpanishText } = require('../../utils/text');
const logger = require('../../utils/logger');
const dotacionCache = require('./dotacion-cache');

const ALLOWED_SORT_COLUMNS = [
  'Hospital','Código de Cargo','Código SIAL','Situación de Revista','CUIL',
  'Nombre y Apellido','Nacimiento','Edad','Sexo','Repartición','Escalafón',
  'Puesto','Carrera','Agrupamiento','Especialidad','Día','Cargo Desde',
  'Jefatura','Teléfono','Mail Personal','Mail Laboral','Fecha de Bloqueo',
  'Comentario de Bloqueo','Motivo de Bloqueo',
];

const MULTI_FILTERS = [
  { key: 'unificador_puesto',       col: 'Agrupamiento',      internalCol: '_unificador_puesto' },
  { key: 'especialidad',            col: 'Especialidad' },
  { key: 'literal_puesto',          col: 'Puesto' },
  { key: 'literal_codigo_registro', col: 'Carrera' },
  { key: 'escalafon',               col: 'Escalafón' },
  { key: 'situacion_revista',       col: 'Situación de Revista' },
  { key: 'agrupador',               col: 'Agrupamiento' },
  { key: 'sexo',                    col: 'Sexo' },
  { key: 'reparticion',             col: 'Repartición' },
];

const SIGLAS_FILTERS = [
  { key: 'sigla',                col: 'Hospital' },
  { key: 'universo_totalizador', col: '_universo_totalizador' },
  { key: 'tipo_hospital_sigla',  col: '_tipo_hospital_sigla' },
  { key: 'monovalencia',         col: '_monovalencia' },
];

// Exportar para uso en dotacion-pages.js (endpoint /filtros)
module.exports.MULTI_FILTERS = MULTI_FILTERS;
module.exports.SIGLAS_FILTERS = SIGLAS_FILTERS;

function applyFilters(allRows, query) {
  let rows = allRows;

  // Filtros multi-valor
  for (const { key, col, internalCol } of MULTI_FILTERS) {
    if (!query[key]) continue;
    const vals = query[key].split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    if (!vals.length) continue;
    const field = internalCol || col;
    rows = rows.filter(r => {
      const v = (r[field] || '').toLowerCase();
      return vals.includes(v);
    });
  }

  // Filtros siglas (Hospital ya está en la fila como 'Hospital')
  if (query.sigla) {
    const vals = query.sigla.split(',').map(v => v.trim().toLowerCase());
    rows = rows.filter(r => vals.includes((r['Hospital'] || '').toLowerCase()));
  }

  // Búsquedas de texto
  if (query.codigo_cargo)    rows = rows.filter(r => (r['Código de Cargo'] || '').toLowerCase().includes(query.codigo_cargo.toLowerCase()));
  if (query.nombre_apellido) rows = rows.filter(r => (r['Nombre y Apellido'] || '').toLowerCase().includes(query.nombre_apellido.toLowerCase()));
  if (query.cuil)            rows = rows.filter(r => (r['CUIL'] || '').includes(query.cuil));
  if (query.codigo_rol)      rows = rows.filter(r => (r['Código SIAL'] || '').includes(query.codigo_rol));

  // Edad
  if (query.edad_min) rows = rows.filter(r => parseInt(r['Edad'] || 0) >= parseInt(query.edad_min));
  if (query.edad_max) rows = rows.filter(r => parseInt(r['Edad'] || 0) <= parseInt(query.edad_max));

  // Antigüedad
  if (query.antiguedad_min || query.antiguedad_max) {
    const currentYear = new Date().getFullYear();
    if (query.antiguedad_min) {
      const maxYear = currentYear - parseInt(query.antiguedad_min);
      rows = rows.filter(r => {
        const y = parseInt((r['_antiguedad'] || '').substring(0, 4));
        return !isNaN(y) && y <= maxYear;
      });
    }
    if (query.antiguedad_max) {
      const minYear = currentYear - parseInt(query.antiguedad_max);
      rows = rows.filter(r => {
        const y = parseInt((r['_antiguedad'] || '').substring(0, 4));
        return !isNaN(y) && y >= minYear;
      });
    }
  }

  // Estado
  if (query.estado) {
    const norm = normalizeSpanishText(query.estado).toLowerCase();
    rows = rows.filter(r => normalizeSpanishText(r['_estado'] || '').toLowerCase().includes(norm));
  }

  // Código registro
  if (query.codigo_registro) {
    rows = rows.filter(r => String(r['_codigo_registro'] || '') === String(query.codigo_registro));
  }

  return rows;
}

function sortRows(rows, sortBy, sortDir) {
  if (!sortBy || !ALLOWED_SORT_COLUMNS.includes(sortBy)) return rows;
  const dir = sortDir === 'DESC' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = a[sortBy] ?? '';
    const vb = b[sortBy] ?? '';
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

// Columnas visibles (sin las internas _*)
const PUBLIC_COLUMNS = [
  'Hospital','Código de Cargo','Código SIAL','Situación de Revista','CUIL',
  'Nombre y Apellido','Nacimiento','Edad','Sexo','Repartición','Escalafón',
  'Puesto','Carrera','Agrupamiento','Especialidad','Día','Cargo Desde',
  'Jefatura','Documentación Jefatura','Teléfono','Mail Personal','Mail Laboral',
  'Fecha de Bloqueo','Comentario de Bloqueo','Motivo de Bloqueo',
];

module.exports.handleDotacionTotal = async function handleDotacionTotal({ AppDataSource, req }) {
  try {
    const query = req.query || {};
    const periodo  = query.periodo || '';
    const page     = Math.max(1, parseInt(query.page) || 1);
    const perPage  = Math.min(500, Math.max(1, parseInt(query.perPage) || 50));
    const sortBy   = query.sortBy;
    const sortDir  = (query.sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (!periodo) return {
      columns: [], rows: [], total: 0,
      kpis: { total: 0, activos: 0, bloqueados: 0, comision: 0, retencion: 0 },
    };

    // Obtener todos los datos del período (desde caché o BD)
    const allRows = await dotacionCache.getRows(AppDataSource, periodo);

    // Filtrar en memoria
    const filtered = applyFilters(allRows, query);

    // KPIs
    const kpis = { total: filtered.length, activos: 0, bloqueados: 0, comision: 0, retencion: 0 };
    for (const r of filtered) {
      const n = normalizeSpanishText(r['_estado'] || '').toLowerCase().trim();
      if (n === 'activo' || n === 'activos')              kpis.activos    += 1;
      else if (n === 'bloqueado' || n === 'bloqueados')   kpis.bloqueados += 1;
      else if (n === 'comision')                          kpis.comision   += 1;
      else if (n.includes('retencion'))                   kpis.retencion  += 1;
    }

    // Ordenar y paginar
    const sorted = sortRows(filtered, sortBy, sortDir);
    const offset = (page - 1) * perPage;
    const pageRows = sorted.slice(offset, offset + perPage).map(r => {
      const out = {};
      for (const col of PUBLIC_COLUMNS) out[col] = r[col] ?? null;
      return out;
    });

    return {
      columns: PUBLIC_COLUMNS,
      rows: pageRows,
      total: filtered.length,
      kpis,
      distinctValues: {},
      siglasDistinctValues: {},
      page,
      perPage,
    };
  } catch (error) {
    logger.error('[handleDotacionTotal] Error:', { error: error.message });
    return {
      columns: [], rows: [], total: 0,
      kpis: { total: 0, activos: 0, bloqueados: 0, comision: 0, retencion: 0 },
      error: error.message,
    };
  }
};

// Exportar para el endpoint /filtros
module.exports.buildWhere = () => ({ params: [], whereSQL: '' }); // no-op, ya no se usa
module.exports.FROM_JOINS = '';
