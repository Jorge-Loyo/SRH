// ============================================================================
// HANDLER BACKEND GENÉRICO PARA TABLAS FULL
// ============================================================================
// Este handler centraliza toda la lógica de consultas, filtros, ordenamiento,
// paginación y exportación para todas las tablas del sistema
// ============================================================================

const { getEntityColumns, parsePagePerSort, getUrlParamArrays, buildDistinctValues, isAllSelectedGeneric } = require('./shared')
const { getTableConfig, FILTER_TYPES } = require('../../components/tablas_full/tables-config')
const { getEntityClass } = require('./tables-config-backend')

/**
 * Crea un handler genérico para una tabla específica
 * @param {string} tableKey - Key de la tabla en tables-config.js
 * @param {Object} dependencies - { AppDataSource, toCsvBase64 }
 * @returns {Function} Handler de la tabla
 */
function buildGenericTableFull(tableKey, { AppDataSource, toCsvBase64 }) {
  const config = getTableConfig(tableKey)
  
  if (!config) {
    throw new Error(`Configuración de tabla no encontrada: ${tableKey}`)
  }

  return async function genericTableFullHandler(req) {
    const { page, perPage, sortByRaw, sortDirRaw } = parsePagePerSort(req)
    
    // Obtener la clase de entidad desde el mapeo
    const Entity = getEntityClass(config.entityName)
    
    const repo = AppDataSource.getRepository(Entity)
    const qb = repo.createQueryBuilder(config.alias)
    let columns = getEntityColumns(AppDataSource, Entity, { exclude: config.excludeColumns })
    const isNullToken = (v) => (v === 'null' || v === '(vacío)')
    
    // Validar que columns no esté vacío - si TypeORM falla, construir desde config
    if (columns.length === 0) {
      // Fallback: obtener del config
      columns = Array.from(new Set([
        config.defaultSort.column,
        ...config.filters.map(f => f.dbField || f.field)
      ])).filter(c => c && typeof c === 'string')
    }

    // ============================================================================
    // APLICAR FILTROS DINÁMICAMENTE
    // ============================================================================
    const appliedFilters = {}
    
    for (const filter of config.filters) {
      const dbField = filter.dbField || filter.field
      
      switch (filter.type) {
        case FILTER_TYPES.TEXT: {
          const value = (req?.query?.[filter.field] || '').toString().trim()
          if (value) {
            const intValue = parseInt(value, 10)
            if (Number.isFinite(intValue)) {
              qb.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: intValue })
            } else {
              qb.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: value })
            }
            appliedFilters[filter.field] = value
          }
          break
        }

        case FILTER_TYPES.LIKE: {
          const value = (req?.query?.[filter.field] || '').toString().trim()
          if (value) {
            qb.andWhere(`${config.alias}.${dbField} LIKE :${filter.field}`, { [filter.field]: `%${value}%` })
            appliedFilters[filter.field] = value
          }
          break
        }

        case FILTER_TYPES.NUMBER: {
          const value = (req?.query?.[filter.field] || '').toString().trim()
          const numValue = parseInt(value, 10)
          if (Number.isFinite(numValue)) {
            qb.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: numValue })
            appliedFilters[filter.field] = value
          }
          break
        }

        case FILTER_TYPES.NUMBER_RANGE: {
          const minRaw = (req?.query?.[`${filter.field}Min`] || '').toString().trim()
          const maxRaw = (req?.query?.[`${filter.field}Max`] || '').toString().trim()
          const min = minRaw ? parseInt(minRaw, 10) : undefined
          const max = maxRaw ? parseInt(maxRaw, 10) : undefined
          
          if (Number.isFinite(min)) {
            qb.andWhere(`${config.alias}.${dbField} >= :${filter.field}Min`, { [`${filter.field}Min`]: min })
            appliedFilters[`${filter.field}Min`] = minRaw
          }
          if (Number.isFinite(max)) {
            qb.andWhere(`${config.alias}.${dbField} <= :${filter.field}Max`, { [`${filter.field}Max`]: max })
            appliedFilters[`${filter.field}Max`] = maxRaw
          }
          break
        }

        case FILTER_TYPES.DATE: {
          const value = (req?.query?.[filter.field] || '').toString().trim()
          if (value) {
            qb.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: value })
            appliedFilters[filter.field] = value
          }
          break
        }

        case FILTER_TYPES.DATE_RANGE: {
          const desde = (req?.query?.[`${filter.field}Desde`] || '').toString().trim()
          const hasta = (req?.query?.[`${filter.field}Hasta`] || '').toString().trim()
          
          if (desde) {
            qb.andWhere(`${config.alias}.${dbField} >= :${filter.field}Desde`, { [`${filter.field}Desde`]: desde })
            appliedFilters[`${filter.field}Desde`] = desde
          }
          if (hasta) {
            qb.andWhere(`${config.alias}.${dbField} <= :${filter.field}Hasta`, { [`${filter.field}Hasta`]: hasta })
            appliedFilters[`${filter.field}Hasta`] = hasta
          }
          break
        }

        case FILTER_TYPES.BOOLEAN: {
          const value = (req?.query?.[filter.field] || '').toString().trim().toLowerCase()
          if (value) {
            if (["true","1","si","sí","x","ok","yes"].includes(value)) {
              qb.andWhere(`${config.alias}.${dbField} IS NOT NULL AND ${config.alias}.${dbField} <> ''`)
            } else if (["false","0","no","n"].includes(value)) {
              qb.andWhere(`(${config.alias}.${dbField} IS NULL OR ${config.alias}.${dbField} = '')`)
            }
            appliedFilters[filter.field] = value
          }
          break
        }

        // MULTI_SELECT se maneja después con getUrlParamArrays
        default:
          break
      }
    }

    // ============================================================================
    // MANEJO DE DISTINCT
    // ============================================================================
    const distinctCol = (req?.query?.distinct || '').toString().trim()
    
    // Validar que el campo solicitado sea uno de los campos configurados
    const configuredDistinctFields = config.filters
      .filter(f => f.fetchDistinct === true)
      .map(f => f.field)
    
    if (distinctCol) {
      const limitRaw = (req?.query?.distinctLimit || '').toString().trim()
      const limitParsed = parseInt(limitRaw || '10000', 10)
      const limit = Number.isFinite(limitParsed) ? Math.min(50000, Math.max(1, limitParsed)) : 500

      // Procesar filtros multi-select ANTES de buildDistinctValues para filtros encadenados
      const multiSelectFields = config.filters
        .filter(f => f.type === FILTER_TYPES.MULTI_SELECT)
        .map(f => f.field)
      const multiForDistinct = getUrlParamArrays(req, multiSelectFields)

      const distinct = await buildDistinctValues({
        repo,
        alias: config.alias,
        columns,
        req,
        isNullToken,
        distinctCol,
        limit,
        nullLabel: 'null',
        applyExtraWhere: async (clone) => {
          // Re-aplicar todos los filtros excepto multi-select
          for (const filter of config.filters) {
            if (filter.type === FILTER_TYPES.MULTI_SELECT) continue
            
            const dbField = filter.dbField || filter.field
            
            switch (filter.type) {
              case FILTER_TYPES.TEXT: {
                const value = (req?.query?.[filter.field] || '').toString().trim()
                if (value) {
                  const intValue = parseInt(value, 10)
                  if (Number.isFinite(intValue)) {
                    clone.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: intValue })
                  } else {
                    clone.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: value })
                  }
                }
                break
              }

              case FILTER_TYPES.LIKE: {
                const value = (req?.query?.[filter.field] || '').toString().trim()
                if (value) {
                  clone.andWhere(`${config.alias}.${dbField} LIKE :${filter.field}`, { [filter.field]: `%${value}%` })
                }
                break
              }

              case FILTER_TYPES.NUMBER: {
                const value = (req?.query?.[filter.field] || '').toString().trim()
                const numValue = parseInt(value, 10)
                if (Number.isFinite(numValue)) {
                  clone.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: numValue })
                }
                break
              }

              case FILTER_TYPES.NUMBER_RANGE: {
                const minRaw = (req?.query?.[`${filter.field}Min`] || '').toString().trim()
                const maxRaw = (req?.query?.[`${filter.field}Max`] || '').toString().trim()
                const min = minRaw ? parseInt(minRaw, 10) : undefined
                const max = maxRaw ? parseInt(maxRaw, 10) : undefined
                
                if (Number.isFinite(min)) {
                  clone.andWhere(`${config.alias}.${dbField} >= :${filter.field}Min`, { [`${filter.field}Min`]: min })
                }
                if (Number.isFinite(max)) {
                  clone.andWhere(`${config.alias}.${dbField} <= :${filter.field}Max`, { [`${filter.field}Max`]: max })
                }
                break
              }

              case FILTER_TYPES.DATE: {
                const value = (req?.query?.[filter.field] || '').toString().trim()
                if (value) {
                  clone.andWhere(`${config.alias}.${dbField} = :${filter.field}`, { [filter.field]: value })
                }
                break
              }

              case FILTER_TYPES.DATE_RANGE: {
                const desde = (req?.query?.[`${filter.field}Desde`] || '').toString().trim()
                const hasta = (req?.query?.[`${filter.field}Hasta`] || '').toString().trim()
                
                if (desde) {
                  clone.andWhere(`${config.alias}.${dbField} >= :${filter.field}Desde`, { [`${filter.field}Desde`]: desde })
                }
                if (hasta) {
                  clone.andWhere(`${config.alias}.${dbField} <= :${filter.field}Hasta`, { [`${filter.field}Hasta`]: hasta })
                }
                break
              }

              case FILTER_TYPES.BOOLEAN: {
                const value = (req?.query?.[filter.field] || '').toString().trim().toLowerCase()
                if (value === 'true') {
                  clone.andWhere(`${config.alias}.${dbField} IS NOT NULL AND ${config.alias}.${dbField} <> ''`)
                } else if (value === 'false') {
                  clone.andWhere(`(${config.alias}.${dbField} IS NULL OR ${config.alias}.${dbField} = '')`)
                }
                break
              }
            }
          }

          // Aplicar filtros multi-select EXCEPTO el que se está consultando
          for (const [k, arr] of Object.entries(multiForDistinct)) {
            if (!arr || arr.length === 0) continue
            if (k === distinctCol) continue // No filtrar por la columna que estamos consultando
            
            const vals = arr.map(v => (isNullToken(v) ? null : v)).filter(v => v !== undefined)
            if (vals.some(v => v === null)) {
              const named = vals.filter(v => v !== null)
              if (named.length) {
                clone.andWhere(`(${config.alias}.${k} IN (:...v_${k}) OR ${config.alias}.${k} IS NULL OR ${config.alias}.${k} = '')`, { [`v_${k}`]: named })
              } else {
                clone.andWhere(`(${config.alias}.${k} IS NULL OR ${config.alias}.${k} = '')`)
              }
            } else {
              clone.andWhere(`${config.alias}.${k} IN (:...v_${k})`, { [`v_${k}`]: vals })
            }
          }
        }
      })
      
      return distinct
    }

    // ============================================================================
    // FILTROS MULTI-SELECT
    // ============================================================================
    // Obtener SOLO los campos que son MULTI_SELECT en la configuración
    const multiSelectFields = config.filters
      .filter(f => f.type === FILTER_TYPES.MULTI_SELECT)
      .map(f => f.field)
    
    const multi = getUrlParamArrays(req, multiSelectFields)
    
    for (const [k, arr] of Object.entries(multi)) {
      if (!arr || arr.length === 0) continue
      
      // Verificar si todos están seleccionados (optimización)
      const allSelected = await isAllSelectedGeneric({
        AppDataSource,
        Entity,
        alias: config.alias,
        req,
        columns,
        col: k,
        selectedArr: arr,
        isNullToken,
        applyExtraWhere: (base) => {
          // Re-aplicar filtros no multi-select
          for (const filter of config.filters) {
            if (filter.type === FILTER_TYPES.MULTI_SELECT) continue
            
            const dbField = filter.dbField || filter.field
            const value = (req?.query?.[filter.field] || '').toString().trim()
            
            if (filter.type === FILTER_TYPES.LIKE && value) {
              base.andWhere(`${config.alias}.${dbField} LIKE :${filter.field}_all`, { [`${filter.field}_all`]: `%${value}%` })
            } else if (filter.type === FILTER_TYPES.TEXT && value) {
              base.andWhere(`${config.alias}.${dbField} = :${filter.field}_all`, { [`${filter.field}_all`]: value })
            }
          }
        }
      })
      
      if (allSelected) continue
      
      // Aplicar filtro
      const vals = arr.map(v => (isNullToken(v) ? null : v)).filter(v => v !== undefined)
      if (vals.some(v => v === null)) {
        const named = vals.filter(v => v !== null)
        if (named.length) {
          qb.andWhere(`(${config.alias}.${k} IN (:...v_${k}) OR ${config.alias}.${k} IS NULL OR ${config.alias}.${k} = '')`, { [`v_${k}`]: named })
        } else {
          qb.andWhere(`(${config.alias}.${k} IS NULL OR ${config.alias}.${k} = '')`)
        }
      } else {
        qb.andWhere(`${config.alias}.${k} IN (:...v_${k})`, { [`v_${k}`]: vals })
      }
      
      appliedFilters[k] = arr
    }

    // ============================================================================
    // TOTAL Y ORDENAMIENTO
    // ============================================================================
    const total = await qb.getCount()
    const safeSortBy = columns.includes(sortByRaw) ? sortByRaw : config.defaultSort.column
    const safeSortDir = sortDirRaw === 'DESC' ? 'DESC' : 'ASC'
    
    if (safeSortBy) {
      qb.orderBy(`${config.alias}.${safeSortBy}`, safeSortDir)
    }

    // ============================================================================
    // PAGINACIÓN Y RESULTADOS
    // ============================================================================
    const rows = await qb.skip((page - 1) * perPage).take(perPage).getMany()

    // ============================================================================
    // EXPORTACIÓN EXCEL
    // ============================================================================
    const exportParam = (req?.query?.export || '').toString().toLowerCase()
    if (exportParam === 'xlsx' || exportParam === 'csv') {
      const { toExcelBase64 } = require('../../utils/excel')
      // Construir filtros con etiquetas legibles usando la configuración de la tabla
      const labelMap = Object.fromEntries(config.filters.map(f => [f.field, f.label]))
      const labeledFilters = {}
      for (const [k, v] of Object.entries(appliedFilters)) {
        const val = Array.isArray(v) ? v.join(', ') : String(v ?? '')
        if (val) labeledFilters[labelMap[k] || k] = val
      }
      const filters = Object.keys(labeledFilters).length ? labeledFilters : null
      const base64 = await toExcelBase64(rows, columns, { filters })
      return {
        xlsxBase64: base64,
        filename: `${config.key}_${Date.now()}.xlsx`,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        count: rows.length,
        total,
        sortBy: safeSortBy,
        sortDir: safeSortDir
      }
    }

    // ============================================================================
    // RESPUESTA NORMAL
    // ============================================================================
    return {
      page,
      perPage,
      total,
      columns,
      rows,
      filters: appliedFilters,
      options: {},
      sortBy: safeSortBy,
      sortDir: safeSortDir
    }
  }
}

module.exports = { buildGenericTableFull }
