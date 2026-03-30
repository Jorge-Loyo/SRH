// Utilidades compartidas para handlers de páginas AdminJS
const NodeCache = require('node-cache');

// ============= OPTIMIZACIÓN: Caché en memoria para queries DISTINCT =============
// Reduce carga de BD cuando múltiples usuarios consultan mismos filtros
// TTL de 5 minutos para balance entre performance y datos actuales
const distinctCache = new NodeCache({ 
  stdTTL: 300, // 5 minutos
  checkperiod: 60, // Verificar expirados cada 60 segundos
  useClones: false, // No clonar objetos para mejor performance
  maxKeys: 1000 // Máximo 1000 entradas en caché
});

// Estadísticas de caché (útil para monitoreo)
let cacheStats = { hits: 0, misses: 0, keys: 0 };

function getEntityColumns(AppDataSource, Entity, { exclude = [] } = {}) {
  try {
    const meta = AppDataSource?.getMetadata(Entity)
    const cols = meta?.columns?.map(c => c.databaseName) || []
    const filtered = cols.filter(col => !excludeColumns?.includes(col))
    return filtered
  } catch (e) {
    console.error(`[getEntityColumns] ERROR:`, e.message)
    return []
  }
}

function parsePagePerSort(req){
  const page = Math.max(1, parseInt((req?.query?.page || '1'), 10))
  const perPage = Math.min(200, Math.max(1, parseInt((req?.query?.perPage || '50'), 10)))
  const sortByRaw = (req?.query?.sortBy || '').toString().trim()
  const sortDirRaw = ((req?.query?.sortDir || '') + '').toUpperCase()
  return { page, perPage, sortByRaw, sortDirRaw }
}

function getUrlParamArrays(req, columns){
  const reqUrl = (()=>{ try { return new URL(req?.originalUrl, 'http://x') } catch { return null } })()
  const getAll = (k) => {
    if (!reqUrl) return []
    const values = reqUrl.searchParams.getAll(k)
    // Si no hay valores múltiples, verificar si viene como string separado por comas
    if (values.length === 0 || (values.length === 1 && values[0].includes(','))) {
      const single = reqUrl.searchParams.get(k)
      if (single && single.includes(',')) {
        return single.split(',').map(v => v.trim()).filter(v => v !== '')
      }
    }
    return values
  }
  return Object.fromEntries(columns.map((c) => [c, getAll(c)]))
}

function applyMultiWhere(qb, alias, multi, isNullToken){
  for (const [k, arr] of Object.entries(multi)) {
    if (!arr || arr.length === 0) continue
    const vals = arr.map(v => (isNullToken(v) ? null : v)).filter(v => v !== undefined)
    if (vals.some(v => v === null)) {
      const named = vals.filter(v => v !== null)
      if (named.length) qb.andWhere(`(${alias}.${k} IN (:...v_${k}) OR ${alias}.${k} IS NULL OR ${alias}.${k} = '')`, { [`v_${k}`]: named })
      else qb.andWhere(`(${alias}.${k} IS NULL OR ${alias}.${k} = '')`)
    } else {
      qb.andWhere(`${alias}.${k} IN (:...v_${k})`, { [`v_${k}`]: vals })
    }
  }
}

async function buildDistinctValues({ repo, alias, columns, req, isNullToken, applyExtraWhere, distinctCol, limit = 500, nullLabel = 'null' }){
  if (!distinctCol) {
    return { distinct: { column: distinctCol, values: [], total: 0, error: 'distinctCol is required' } }
  }
  
  // Verificar si el campo existe en columns
  if (!columns.includes(distinctCol)) {
    const error = `distinctCol='${distinctCol}' not in columns: [${columns.join(', ')}]`;
    // NO retornar error inmediatamente - intentar de todas formas
  }
  
  try {
    // ============= OPTIMIZACIÓN: Caché de queries DISTINCT =============
    // Generar clave única basada en columna, filtros y límite
    const multiForCache = getUrlParamArrays(req, columns);
    delete multiForCache[distinctCol]; // No incluir la columna distinct en la clave
    const cacheKey = `${alias}_${distinctCol}_${limit}_${JSON.stringify(multiForCache)}`;
    
    // Intentar obtener del caché
    const cached = distinctCache.get(cacheKey);
    if (cached) {
      cacheStats.hits++;
      return cached;
    }
    cacheStats.misses++;
    
    // Si no está en caché, ejecutar query
    const clone = repo.createQueryBuilder(alias)
    // CRÍTICO: applyExtraWhere es async y DEBE ser awaiteado para aplicar filtros antes de ejecutar query
    if (typeof applyExtraWhere === 'function') {
      await applyExtraWhere(clone)
    }
    const multiD = getUrlParamArrays(req, columns)
    // Evitar auto-filtrarse por la misma columna del distinct
    delete multiD[distinctCol]
    applyMultiWhere(clone, alias, multiD, isNullToken)
    
    const raws = await clone.select(`DISTINCT ${alias}.${distinctCol}`, 'val').orderBy(`${alias}.${distinctCol}`, 'ASC').getRawMany()
    const values = raws.map(r => (r.val == null || r.val === '' ? nullLabel : r.val))
    const result = { distinct: { column: distinctCol, values: values, total: values.length, hasMore: false } };
    
    // Guardar en caché
    distinctCache.set(cacheKey, result);
    
    return result;
  } catch (e) {
    console.error(`[buildDistinctValues] Error querying column '${distinctCol}':`, e.message);
    return { distinct: { column: distinctCol, values: [], error: e.message } }
  }
}

async function isAllSelectedGeneric({ AppDataSource, Entity, alias, req, columns, col, selectedArr, isNullToken, applyExtraWhere }){
  if (!selectedArr || selectedArr.length === 0) return false
  const repo = AppDataSource.getRepository(Entity)
  const base = repo.createQueryBuilder(alias)
  if (typeof applyExtraWhere === 'function') await applyExtraWhere(base)
  const multi = getUrlParamArrays(req, columns)
  for (const [k, arr] of Object.entries(multi)) {
    if (k === col) continue
    if (!arr || !arr.length) continue
    const vals = arr.map(v => (isNullToken(v) ? null : v)).filter(v => v !== undefined)
    if (vals.some(v => v === null)) {
      const named = vals.filter(v => v !== null)
      if (named.length) base.andWhere(`(${alias}.${k} IN (:...vB_${k}) OR ${alias}.${k} IS NULL OR ${alias}.${k} = '')`, { [`vB_${k}`]: named })
      else base.andWhere(`(${alias}.${k} IS NULL OR ${alias}.${k} = '')`)
    } else {
      base.andWhere(`${alias}.${k} IN (:...vB_${k})`, { [`vB_${k}`]: vals })
    }
  }
  const allRaw = await base.select(`DISTINCT ${alias}.${col}`, 'val').getRawMany()
  const allValues = allRaw.map(r => (r.val == null || r.val === '' ? null : r.val))
  const normalizedSelected = selectedArr.map(v => (isNullToken(v) ? null : v))
  if (allValues.length === 0) return false
  const setAll = new Set(allValues.map(v => v === null ? '__NULL__' : v))
  const setSel = new Set(normalizedSelected.map(v => v === null ? '__NULL__' : v))
  if (setAll.size !== setSel.size) return false
  for (const val of setAll) if (!setSel.has(val)) return false
  return true
}

// Función para obtener estadísticas de caché (útil para monitoreo/debugging)
function getCacheStats() {
  return {
    ...cacheStats,
    keys: distinctCache.keys().length,
    ttl: 300 // segundos
  };
}

// Función para limpiar caché manualmente (útil en desarrollo o después de importaciones masivas)
function clearDistinctCache() {
  distinctCache.flushAll();
  cacheStats = { hits: 0, misses: 0, keys: 0 };
}

module.exports = { 
  getEntityColumns, 
  parsePagePerSort, 
  getUrlParamArrays, 
  applyMultiWhere, 
  buildDistinctValues, 
  isAllSelectedGeneric,
  getCacheStats,
  clearDistinctCache
}
