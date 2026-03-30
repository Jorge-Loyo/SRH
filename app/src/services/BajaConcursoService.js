/**
 * BajaConcursoService
 * 
 * Capa de servicio para gestión de Bajas y Concursos.
 * Encapsula lógica de negocio y acceso a datos.
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Repositorio inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 */
class BajaConcursoService {
  /**
   * @param {Repository<BajaConcurso>} bajaConcursoRepository - Repositorio de TypeORM inyectado
   */
  constructor(bajaConcursoRepository) {
    if (!bajaConcursoRepository) {
      throw new Error('BajaConcursoService requiere un repositorio de BajaConcurso');
    }
    this.bajaConcursoRepository = bajaConcursoRepository;
  }

  /**
   * Lista bajas/concursos con paginación, filtros y ordenamiento
   * 
   * @param {Object} options - Opciones de consulta
   * @param {Object} options.where - Condiciones WHERE de TypeORM
   * @param {Object} options.order - Ordenamiento (ej: { id_baja: 'ASC' })
   * @param {number} options.skip - Offset para paginación
   * @param {number} options.take - Límite de resultados
   * @param {Object} [options.relations] - Relaciones a cargar
   * 
   * @returns {Promise<{ rows: BajaConcurso[], count: number }>}
   * 
   * @example
   * const result = await bajaConcursoService.list({
   *   where: { periodo: '2024-11' },
   *   order: { id_baja: 'DESC' },
   *   skip: 0,
   *   take: 50,
   *   relations: { cargo: true }
   * });
   */
  async list({ where = {}, order = {}, skip = 0, take = 50, relations = {} }) {
    const [rows, count] = await this.bajaConcursoRepository.findAndCount({
      where,
      order,
      skip,
      take,
      relations
    });
    return { rows, count };
  }

  /**
   * Obtiene una baja/concurso por ID y periodo
   * 
   * @param {number} idBaja - ID de la baja
   * @param {string} periodo - Periodo (ej: '2024-11')
   * @param {Object} [relations] - Relaciones a cargar
   * 
   * @returns {Promise<BajaConcurso|null>}
   * 
   * @example
   * const baja = await bajaConcursoService.getById(123, '2024-11', { cargo: true });
   * if (!baja) throw new Error('Baja no encontrada');
   */
  async getById(idBaja, periodo, relations = {}) {
    return await this.bajaConcursoRepository.findOne({
      where: {
        id_baja: Number(idBaja),
        periodo
      },
      relations
    });
  }

  /**
   * Crea una nueva baja/concurso
   * 
   * @param {Object} data - Datos de la baja/concurso
   * @param {number} data.id_baja - ID único
   * @param {string} data.periodo - Periodo
   * @param {number} data.id_cargo - ID del cargo relacionado
   * @param {string} [data.motivo_baja] - Motivo de la baja
   * @param {string} [data.nombre_apellido] - Nombre y apellido
   * @param {...} data - Otros campos opcionales
   * 
   * @returns {Promise<BajaConcurso>} Baja/concurso creado con ID
   * 
   * @throws {Error} Si hay error de constraint (duplicado, FK, etc)
   * 
   * @example
   * const nueva = await bajaConcursoService.create({
   *   id_baja: 999,
   *   periodo: '2024-11',
   *   id_cargo: 456,
   *   motivo_baja: 'Renuncia',
   *   nombre_apellido: 'García, Juan'
   * });
   */
  async create(data) {
    return await this.bajaConcursoRepository.save(data);
  }

  /**
   * Actualiza una baja/concurso existente
   * 
   * @param {number} idBaja - ID de la baja
   * @param {string} periodo - Periodo
   * @param {Object} data - Datos a actualizar (parcial)
   * 
   * @returns {Promise<BajaConcurso|null>} Baja/concurso actualizado o null si no existe
   * 
   * @example
   * const updated = await bajaConcursoService.update(123, '2024-11', {
   *   motivo_baja: 'Jubilación'
   * });
   */
  async update(idBaja, periodo, data) {
    // Buscar baja/concurso existente
    const existing = await this.bajaConcursoRepository.findOne({
      where: {
        id_baja: Number(idBaja),
        periodo
      }
    });
    
    if (!existing) {
      return null;
    }
    
    // Merge data preservando PK
    const updated = await this.bajaConcursoRepository.save({
      ...existing,
      ...data,
      id_baja: existing.id_baja,
      periodo: existing.periodo
    });
    
    return updated;
  }

  /**
   * Elimina una baja/concurso
   * 
   * @param {number} idBaja - ID de la baja
   * @param {string} periodo - Periodo
   * 
   * @returns {Promise<boolean>} true si fue eliminada, false si no existía
   * 
   * @example
   * const deleted = await bajaConcursoService.remove(123, '2024-11');
   * if (!deleted) throw new Error('Baja no encontrada');
   */
  async remove(idBaja, periodo) {
    const result = await this.bajaConcursoRepository.delete({
      id_baja: Number(idBaja),
      periodo
    });
    return result.affected > 0;
  }
}

// Exportar la clase (NO singleton)
module.exports = BajaConcursoService;
