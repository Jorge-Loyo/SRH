/**
 * PeriodoService
 * 
 * Capa de servicio para gestión de Periodos.
 * Encapsula lógica de negocio compleja incluyendo:
 * - Consulta de periodos con datos reales
 * - Generación de periodos faltantes hasta el mes actual
 * - Filtrado por hospital
 * - Metadata sobre disponibilidad de datos
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Manager de TypeORM inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 */
class PeriodoService {
  /**
   * @param {EntityManager} entityManager - Manager de TypeORM inyectado para queries raw
   */
  constructor(entityManager) {
    if (!entityManager) {
      throw new Error('PeriodoService requiere un EntityManager');
    }
    this.entityManager = entityManager;
  }

  /**
   * Genera array de periodos (YYYY-MM) desde startPeriod hasta endPeriod (inclusive)
   * 
   * @private
   * @param {string} startPeriod - Periodo inicial (ej: '2024-01')
   * @param {string} endPeriod - Periodo final (ej: '2024-12')
   * @returns {string[]} Array de periodos
   * 
   * @example
   * generatePeriodRange('2024-10', '2024-12')
   * // → ['2024-10', '2024-11', '2024-12']
   */
  generatePeriodRange(startPeriod, endPeriod) {
    const result = [];
    let [startYear, startMonth] = startPeriod.split('-').map(Number);
    const [endYear, endMonth] = endPeriod.split('-').map(Number);
    
    while (startYear < endYear || (startYear === endYear && startMonth <= endMonth)) {
      result.push(`${startYear}-${String(startMonth).padStart(2, '0')}`);
      startMonth++;
      if (startMonth > 12) {
        startMonth = 1;
        startYear++;
      }
    }
    return result;
  }

  /**
   * Lista periodos disponibles con metadata
   * Incluye periodos faltantes hasta el mes actual, marcando cuáles tienen datos
   * 
   * @param {Object} options - Opciones de consulta
   * @param {number} [options.limit=12] - Límite de periodos a retornar (1-60)
   * @param {string} [options.hospital] - Código de hospital (sigla) para filtrar
   * 
   * @returns {Promise<Object>} Objeto con periodos y metadata
   * @returns {string[]} .items - Array de periodos (YYYY-MM) ordenados desc
   * @returns {Object[]} .periodsMetadata - Metadata por periodo
   * @returns {string} .periodsMetadata[].periodo - Periodo (YYYY-MM)
   * @returns {boolean} .periodsMetadata[].hasData - Si tiene datos reales
   * @returns {boolean} .periodsMetadata[].isCurrent - Si es el mes actual
   * @returns {string|null} .latest - Último periodo con datos
   * @returns {number} .total - Total de periodos disponibles
   * @returns {string|null} .hospital - Código de hospital usado para filtrar
   * @returns {string} .currentPeriod - Periodo actual (YYYY-MM)
   * @returns {boolean} .hasCurrent - Si el periodo actual tiene datos
   * @returns {string|null} .recommended - Periodo recomendado (último con datos)
   * 
   * @example
   * const result = await periodoService.list({ limit: 12, hospital: 'HGA' });
   * // {
   * //   items: ['2024-12', '2024-11', ...],
   * //   periodsMetadata: [
   * //     { periodo: '2024-12', hasData: false, isCurrent: true },
   * //     { periodo: '2024-11', hasData: true, isCurrent: false },
   * //     ...
   * //   ],
   * //   latest: '2024-11',
   * //   total: 12,
   * //   hospital: 'HGA',
   * //   currentPeriod: '2024-12',
   * //   hasCurrent: false,
   * //   recommended: '2024-11'
   * // }
   */
  async list({ limit = 12, hospital = null }) {
    // Validar y normalizar limit
    const normalizedLimit = Math.min(60, Math.max(1, limit));
    
    // Calcular periodo actual
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Obtener periodos con datos reales
    let sqlRoles = 'SELECT DISTINCT r.periodo FROM roles r';
    const values = [];
    
    if (hospital) {
      sqlRoles += ' INNER JOIN siglas s ON r.id_sigla = s.id_sigla WHERE s.sigla = ?';
      values.push(hospital);
    }
    
    // LIMIT sin placeholder para compatibilidad con SQL.js (in-memory tests)
    // Safe because normalizedLimit is sanitized above (Math.min/max)
    sqlRoles += ` ORDER BY r.periodo DESC LIMIT ${normalizedLimit + 10}`;
    
    const rowsRoles = await this.entityManager.query(sqlRoles, values);
    
    // Procesar periodos con datos
    let periodsWithData = rowsRoles.map(r => r.periodo).filter(p => !!p);
    periodsWithData = Array.from(new Set(periodsWithData));
    periodsWithData.sort((a, b) => (a === b ? 0 : a > b ? -1 : 1));
    
    // Generar periodos faltantes hasta el mes actual
    let allPeriods = [];
    const periodsWithDataSet = new Set(periodsWithData);
    
    if (periodsWithData.length > 0) {
      const latestWithData = periodsWithData[0]; // Último periodo con datos
      
      // Si el mes actual es posterior al último con datos, generar rango
      if (currentPeriod > latestWithData) {
        // Generar todos los periodos desde el último con datos hasta el actual
        const generated = this.generatePeriodRange(latestWithData, currentPeriod);
        // Combinar: primero generados (del más reciente al más antiguo), luego el resto con datos
        const generatedReversed = generated.slice().reverse();
        const olderPeriods = periodsWithData.filter(p => p < latestWithData);
        allPeriods = [...generatedReversed, ...olderPeriods];
      } else {
        // El mes actual ya está en los datos o es anterior, usar solo datos reales
        allPeriods = periodsWithData;
      }
    } else {
      // Sin datos, solo mostrar el mes actual
      allPeriods = [currentPeriod];
    }
    
    // Limitar a la cantidad solicitada
    const items = allPeriods.slice(0, normalizedLimit);
    
    // Crear metadata por periodo (indica si tiene datos o no)
    const periodsMetadata = items.map(p => ({
      periodo: p,
      hasData: periodsWithDataSet.has(p),
      isCurrent: p === currentPeriod
    }));
    
    const hasCurrent = periodsWithDataSet.has(currentPeriod);
    const recommended = periodsWithData[0] || null;
    
    return {
      items,
      periodsMetadata,
      latest: periodsWithData[0] || null,
      total: allPeriods.length,
      hospital: hospital || null,
      currentPeriod,
      hasCurrent,
      recommended
    };
  }
}

// Exportar la clase (NO singleton)
module.exports = PeriodoService;
