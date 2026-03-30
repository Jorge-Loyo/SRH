/**
 * SiglaService
 * 
 * Capa de servicio para gestión de Siglas.
 * Encapsula lógica de negocio y acceso a datos.
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Repositorio inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 */
class SiglaService {
  /**
   * @param {Repository<Sigla>} siglaRepository - Repositorio de TypeORM inyectado
   */
  constructor(siglaRepository) {
    if (!siglaRepository) {
      throw new Error('SiglaService requiere un repositorio de Sigla');
    }
    this.siglaRepository = siglaRepository;
  }

  /**
   * Lista siglas con paginación, filtros y ordenamiento
   * 
   * @param {Object} options - Opciones de consulta
   * @param {Object} options.where - Condiciones WHERE de TypeORM
   * @param {Object} options.order - Ordenamiento (ej: { id_sigla: 'ASC' })
   * @param {number} options.skip - Offset para paginación
   * @param {number} options.take - Límite de resultados
   * 
   * @returns {Promise<{ rows: Sigla[], count: number }>}
   * 
   * @example
   * const result = await siglaService.list({
   *   where: { universo_totalizador: 'HOSPITALES' },
   *   order: { sigla: 'ASC' },
   *   skip: 0,
   *   take: 50
   * });
   */
  async list({ where = {}, order = {}, skip = 0, take = 50 }) {
    const [rows, count] = await this.siglaRepository.findAndCount({
      where,
      order,
      skip,
      take
    });
    return { rows, count };
  }

  /**
   * Obtiene una sigla por ID
   * 
   * @param {number} idSigla - ID de la sigla
   * 
   * @returns {Promise<Sigla|null>}
   * 
   * @example
   * const sigla = await siglaService.getById(1);
   * if (!sigla) throw new Error('Sigla no encontrada');
   */
  async getById(idSigla) {
    return await this.siglaRepository.findOne({
      where: {
        id_sigla: Number(idSigla)
      }
    });
  }

  /**
   * Crea una nueva sigla
   * 
   * @param {Object} data - Datos de la sigla
   * @param {number} data.id_sigla - ID único
   * @param {string} data.sigla - Sigla
   * @param {string} data.universo_totalizador - Universo totalizador
   * @param {string} data.tipo_hospital_sigla - Tipo de hospital
   * @param {string} [data.monovalencia] - Monovalencia (opcional)
   * 
   * @returns {Promise<Sigla>} Sigla creada con ID
   * 
   * @throws {Error} Si hay error de constraint (duplicado, etc)
   * 
   * @example
   * const nueva = await siglaService.create({
   *   id_sigla: 10,
   *   sigla: 'HGA',
   *   universo_totalizador: 'HOSPITALES',
   *   tipo_hospital_sigla: 'GENERAL'
   * });
   */
  async create(data) {
    return await this.siglaRepository.save(data);
  }

  /**
   * Actualiza una sigla existente
   * 
   * @param {number} idSigla - ID de la sigla
   * @param {Object} data - Datos a actualizar (parcial)
   * 
   * @returns {Promise<Sigla|null>} Sigla actualizada o null si no existe
   * 
   * @example
   * const updated = await siglaService.update(1, {
   *   tipo_hospital_sigla: 'ESPECIALIZADO'
   * });
   */
  async update(idSigla, data) {
    // Buscar sigla existente
    const existing = await this.siglaRepository.findOne({
      where: {
        id_sigla: Number(idSigla)
      }
    });
    
    if (!existing) {
      return null;
    }
    
    // Merge data preservando PK
    const updated = await this.siglaRepository.save({
      ...existing,
      ...data,
      id_sigla: existing.id_sigla
    });
    
    return updated;
  }

  /**
   * Elimina una sigla
   * 
   * @param {number} idSigla - ID de la sigla
   * 
   * @returns {Promise<boolean>} true si fue eliminada, false si no existía
   * 
   * @example
   * const deleted = await siglaService.remove(1);
   * if (!deleted) throw new Error('Sigla no encontrada');
   */
  async remove(idSigla) {
    const result = await this.siglaRepository.delete({
      id_sigla: Number(idSigla)
    });
    return result.affected > 0;
  }
}

// Exportar la clase (NO singleton)
module.exports = SiglaService;
