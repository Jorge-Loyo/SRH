// Dispatcher para la página de Dotación Total

const logger = require('../utils/logger')

// Caché de período por defecto global (TTL 5 minutos)
const periodoCache = new Map();
const PERIODO_CACHE_TTL = 5 * 60 * 1000;

// Etiquetas legibles para los filtros de exportación
const DOTACION_FILTER_LABELS = {
  unificador_puesto:        'Unificador Puesto',
  especialidad:             'Especialidad',
  literal_puesto:           'Puesto',
  literal_codigo_registro:  'Carrera',
  escalafon:                'Escalafón',
  situacion_revista:        'Situación de Revista',
  agrupador:                'Agrupamiento',
  sexo:                     'Sexo',
  reparticion:              'Repartición',
  estado:                   'Estado',
  codigo_cargo:             'Código de Cargo',
  nombre_apellido:          'Nombre y Apellido',
  cuil:                     'CUIL',
  codigo_rol:               'Código SIAL',
  mail_laboral:             'Mail Laboral',
  telefono:                 'Teléfono',
  edad_min:                 'Edad mínima',
  edad_max:                 'Edad máxima',
  antiguedad:               'Antigüedad',
  hospital_filter:          'Hospital',
}

/**
 * Obtener período más reciente global (sin filtrar por hospital)
 */
async function getLatestPeriodoGlobal(AppDataSource) {
  const cacheKey = 'periodo_global';
  const cached = periodoCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < PERIODO_CACHE_TTL) {
    return cached.periodo;
  }
  
  try {
    const sql = `
      SELECT r.periodo AS periodo
      FROM roles r
      GROUP BY r.periodo
      ORDER BY r.periodo DESC
      LIMIT 1
    `;
    const rows = await AppDataSource.query(sql);
    const periodo = rows?.[0]?.periodo || null;
    
    periodoCache.set(cacheKey, {
      periodo,
      timestamp: Date.now()
    });
    
    return periodo;
  } catch (e) {
    logger.warn('[getLatestPeriodoGlobal] Error al obtener período:', { error: e?.message });
    return null;
  }
}

async function handleDotacionTotalPage({ AppDataSource, req }){
  // Si falta el período, obtener el más reciente disponible (con caché)
  if (!req.query.periodo || String(req.query.periodo).trim() === '') {
    const latest = await getLatestPeriodoGlobal(AppDataSource);
    if (latest) {
      req.query.periodo = latest;
    }
  }

  // Usar el handler de dotación total (sin hospital)
  const { handleDotacionTotal } = require('./common/dotacion-total-handler')
  let result = await handleDotacionTotal({ AppDataSource, req })

  // Export Excel si se solicita
  if (req.query.export === 'xlsx' || req.query.export === 'csv') {
    try {
      const { toExcelBase64 } = require('../utils/excel')
      const tipo = 'dotacion'
      const exportFilters = {
        'Vista':   'Dotación Total (todos los hospitales)',
        'Período': req.query.periodo || '-',
        'Tipo':    'Dotación',
      }
      for (const [k, label] of Object.entries(DOTACION_FILTER_LABELS)) {
        const v = (req.query[k] || '').toString().trim()
        if (v) exportFilters[label] = v
      }
      result.xlsxBase64 = await toExcelBase64(result.rows || [], result.columns || [], { filters: exportFilters })
      result.filename = `dotacion_total_${req.query.periodo}_p${req.query.page || 1}.xlsx`
    } catch (e) {
      const cols = result.columns || []
      const rowsData = result.rows || []
      const lines = [cols.join(','), ...rowsData.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))]
      result.xlsxBase64 = Buffer.from(lines.join('\n'), 'utf8').toString('base64')
      result.filename = `dotacion_total_${req.query.periodo}_p${req.query.page || 1}.xlsx`
    }
  }

  return result
}

async function handleDotacionTotalFiltros({ AppDataSource, req }) {
  if (!req.query.periodo) return { distinctValues: {}, siglasDistinctValues: {} };

  const { MULTI_FILTERS, SIGLAS_FILTERS } = require('./common/dotacion-total-handler');
  const dotacionCache = require('./common/dotacion-cache');
  const periodo = req.query.periodo;

  // Usar el caché — si ya está construido es instantáneo
  const allRows = await dotacionCache.getRows(AppDataSource, periodo);

  const distinctValues = {};
  const siglasDistinctValues = {};

  for (const { key, col, internalCol } of MULTI_FILTERS) {
    const field = internalCol || col;
    const vals = [...new Set(allRows.map(r => r[field]).filter(Boolean))].sort();
    distinctValues[key] = vals;
  }

  // Siglas: Hospital ya está en la fila
  siglasDistinctValues['sigla'] = [...new Set(allRows.map(r => r['Hospital']).filter(Boolean))].sort();
  // universo, tipo, monovalencia no están en el caché actual — devolver vacío por ahora
  siglasDistinctValues['universo_totalizador'] = [];
  siglasDistinctValues['tipo_hospital_sigla']  = [];
  siglasDistinctValues['monovalencia']         = [];

  return { distinctValues, siglasDistinctValues };
}

module.exports = { handleDotacionTotalPage, handleDotacionTotalFiltros }
