/**
 * CargoService
 * 
 * Capa de servicio para gestión de Cargos.
 * Encapsula lógica de negocio y acceso a datos.
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Repositorio inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 */
class CargoService {
  /**
   * @param {Repository<Cargo>} cargoRepository - Repositorio de TypeORM inyectado
   */
  constructor(cargoRepository) {
    if (!cargoRepository) {
      throw new Error('CargoService requiere un repositorio de Cargo');
    }
    this.cargoRepository = cargoRepository;
  }

  /**
   * Lista cargos con paginación, filtros y ordenamiento
   * 
   * @param {Object} options - Opciones de consulta
   * @param {Object} options.where - Condiciones WHERE de TypeORM
   * @param {Object} options.order - Ordenamiento (ej: { id_cargo: 'ASC' })
   * @param {number} options.skip - Offset para paginación
   * @param {number} options.take - Límite de resultados
   * 
   * @returns {Promise<{ rows: Cargo[], count: number }>}
   * 
   * @example
   * const result = await cargoService.list({
   *   where: { periodo: '2024-11' },
   *   order: { codigo_cargo: 'ASC' },
   *   skip: 0,
   *   take: 50
   * });
   */
  async list({ where = {}, order = {}, skip = 0, take = 50 }) {
    const [rows, count] = await this.cargoRepository.findAndCount({
      where,
      order,
      skip,
      take
    });
    return { rows, count };
  }

  /**
   * Obtiene un cargo por ID y periodo
   * 
   * @param {number} idCargo - ID del cargo
   * @param {string} periodo - Periodo (ej: '2024-11')
   * 
   * @returns {Promise<Cargo|null>}
   * 
   * @example
   * const cargo = await cargoService.getById(123, '2024-11');
   * if (!cargo) throw new Error('Cargo no encontrado');
   */
  async getById(idCargo, periodo) {
    return await this.cargoRepository.findOne({
      where: {
        id_cargo: Number(idCargo),
        periodo
      }
    });
  }

  /**
   * Crea un nuevo cargo
   * 
   * @param {Object} data - Datos del cargo
   * @param {number} data.id_cargo - ID único
   * @param {string} data.periodo - Periodo
   * @param {string} [data.codigo_cargo] - Código del cargo
   * @param {string} [data.estado_cargo] - Estado del cargo
   * 
   * @returns {Promise<Cargo>} Cargo creado con ID
   * 
   * @throws {Error} Si hay error de constraint (duplicado, etc)
   * 
   * @example
   * const nuevo = await cargoService.create({
   *   id_cargo: 999,
   *   periodo: '2024-11',
   *   codigo_cargo: 'CARGO001',
   *   estado_cargo: 'ACTIVO'
   * });
   */
  async create(data) {
    return await this.cargoRepository.save(data);
  }

  /**
   * Actualiza un cargo existente
   * 
   * @param {number} idCargo - ID del cargo
   * @param {string} periodo - Periodo
   * @param {Object} data - Datos a actualizar (parcial)
   * 
   * @returns {Promise<Cargo|null>} Cargo actualizado o null si no existe
   * 
   * @example
   * const updated = await cargoService.update(123, '2024-11', {
   *   estado_cargo: 'INACTIVO'
   * });
   */
  async update(idCargo, periodo, data) {
    // Buscar cargo existente
    const existing = await this.cargoRepository.findOne({
      where: {
        id_cargo: Number(idCargo),
        periodo
      }
    });
    
    if (!existing) {
      return null;
    }
    
    // Merge data preservando PK
    const updated = await this.cargoRepository.save({
      ...existing,
      ...data,
      id_cargo: existing.id_cargo,
      periodo: existing.periodo
    });
    
    return updated;
  }

  /**
   * Elimina un cargo
   * 
   * @param {number} idCargo - ID del cargo
   * @param {string} periodo - Periodo
   * 
   * @returns {Promise<boolean>} true si fue eliminado, false si no existía
   * 
   * @example
   * const deleted = await cargoService.remove(123, '2024-11');
   * if (!deleted) throw new Error('Cargo no encontrado');
   */
  async remove(idCargo, periodo) {
    const result = await this.cargoRepository.delete({
      id_cargo: Number(idCargo),
      periodo
    });
    return result.affected > 0;
  }
}

// Exportar la clase (NO singleton)
module.exports = CargoService;
