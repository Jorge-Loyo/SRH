/**
 * RolService
 * 
 * Capa de servicio para gestión de Roles.
 * Encapsula lógica de negocio y acceso a datos.
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Repositorio inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 * - Maneja relaciones con Cargo, Persona, Sigla
 * - Soporta query builder para filtros complejos (RLS)
 */
class RolService {
  /**
   * @param {Repository<Rol>} rolRepository - Repositorio de TypeORM inyectado
   */
  constructor(rolRepository) {
    if (!rolRepository) {
      throw new Error('RolService requiere un repositorio de Rol');
    }
    this.rolRepository = rolRepository;
  }

  /**
   * Lista roles con paginación, filtros y ordenamiento
   * Soporta dos modos:
   * 1. Query normal con relations
   * 2. Query builder para filtros complejos (ej: RLS por hospital)
   * 
   * @param {Object} options - Opciones de consulta
   * @param {Object} options.where - Condiciones WHERE de TypeORM
   * @param {Object} options.order - Ordenamiento (ej: { id_rol: 'ASC' })
   * @param {number} options.skip - Offset para paginación
   * @param {number} options.take - Límite de resultados
   * @param {Object} [options.relations] - Relaciones a cargar
   * @param {boolean} [options.useQueryBuilder] - Si true, usa query builder
   * @param {string} [options.hospitalFilter] - Código de hospital para filtro RLS
   * 
   * @returns {Promise<{ rows: Rol[], count: number }>}
   * 
   * @example
   * // Query normal
   * const result = await rolService.list({
   *   where: { periodo: '2024-11' },
   *   order: { id_rol: 'ASC' },
   *   skip: 0,
   *   take: 50,
   *   relations: { cargo: true, persona: true, sigla: true }
   * });
   * 
   * @example
   * // Query con filtro de hospital (RLS)
   * const result = await rolService.list({
   *   where: { periodo: '2024-11' },
   *   order: { id_rol: 'ASC' },
   *   skip: 0,
   *   take: 50,
   *   useQueryBuilder: true,
   *   hospitalFilter: 'HGA'
   * });
   */
  async list({ where = {}, order = {}, skip = 0, take = 50, relations = {}, useQueryBuilder = false, hospitalFilter = null }) {
    // Modo 1: Query builder para filtros complejos (RLS)
    if (useQueryBuilder && hospitalFilter) {
      const qb = this.rolRepository.createQueryBuilder('rol')
        .leftJoinAndSelect('rol.cargo', 'cargo')
        .leftJoinAndSelect('rol.persona', 'persona')
        .leftJoinAndSelect('rol.sigla', 'sigla')
        .where('sigla.sigla = :hospital', { hospital: hospitalFilter });
      
      // Aplicar otros filtros del where
      Object.keys(where).forEach(key => {
        if (where[key] !== undefined) {
          qb.andWhere(`rol.${key} = :${key}`, { [key]: where[key] });
        }
      });
      
      // Aplicar ordenamiento
      const orderEntries = Object.entries(order);
      if (orderEntries.length > 0) {
        const [field, direction] = orderEntries[0];
        qb.orderBy(`rol.${field}`, direction);
      }
      
      qb.skip(skip).take(take);
      
      const [rows, count] = await qb.getManyAndCount();
      return { rows, count };
    }
    
    // Modo 2: Query normal con findAndCount
    const [rows, count] = await this.rolRepository.findAndCount({
      where,
      relations,
      order,
      skip,
      take
    });
    return { rows, count };
  }

  /**
   * Obtiene un rol por ID y periodo
   * 
   * @param {number} idRol - ID del rol
   * @param {string} periodo - Periodo (ej: '2024-11')
   * @param {Object} [relations] - Relaciones a cargar
   * 
   * @returns {Promise<Rol|null>}
   * 
   * @example
   * const rol = await rolService.getById(123, '2024-11', { 
   *   cargo: true, 
   *   persona: true, 
   *   sigla: true 
   * });
   * if (!rol) throw new Error('Rol no encontrado');
   */
  async getById(idRol, periodo, relations = {}) {
    return await this.rolRepository.findOne({
      where: {
        id_rol: Number(idRol),
        periodo
      },
      relations
    });
  }

  /**
   * Crea un nuevo rol
   * 
   * @param {Object} data - Datos del rol
   * @param {number} data.id_rol - ID único
   * @param {string} data.periodo - Periodo
   * @param {number} [data.id_cargo] - ID del cargo relacionado
   * @param {number} [data.id_persona] - ID de la persona relacionada
   * @param {number} [data.id_sigla] - ID de la sigla relacionada
   * @param {number} data.codigo_reparticion - Código de repartición
   * @param {string} data.descripcion_reparticion - Descripción
   * @param {string} data.escalafon - Escalafón
   * @param {string} data.situacion_revista - Situación de revista
   * @param {string} data.literal_puesto - Literal del puesto
   * @param {string} data.unificador_puesto - Unificador del puesto
   * @param {string} data.agrupador - Agrupador
   * @param {...} data - Otros campos opcionales
   * 
   * @returns {Promise<Rol>} Rol creado con ID
   * 
   * @throws {Error} Si hay error de constraint (duplicado, FK, etc)
   * 
   * @example
   * const nuevo = await rolService.create({
   *   id_rol: 999,
   *   periodo: '2024-11',
   *   id_cargo: 456,
   *   id_persona: 789,
   *   id_sigla: 1,
   *   codigo_reparticion: 12345,
   *   descripcion_reparticion: 'HOSPITAL GENERAL',
   *   escalafon: 'PROFESIONAL',
   *   situacion_revista: 'PLANTA PERMANENTE',
   *   literal_puesto: 'MEDICO',
   *   unificador_puesto: 'MEDICO',
   *   agrupador: 'SALUD'
   * });
   */
  async create(data) {
    return await this.rolRepository.save(data);
  }

  /**
   * Actualiza un rol existente
   * 
   * @param {number} idRol - ID del rol
   * @param {string} periodo - Periodo
   * @param {Object} data - Datos a actualizar (parcial)
   * 
   * @returns {Promise<Rol|null>} Rol actualizado o null si no existe
   * 
   * @example
   * const updated = await rolService.update(123, '2024-11', {
   *   situacion_revista: 'LICENCIA'
   * });
   */
  async update(idRol, periodo, data) {
    // Buscar rol existente
    const existing = await this.rolRepository.findOne({
      where: {
        id_rol: Number(idRol),
        periodo
      }
    });
    
    if (!existing) {
      return null;
    }
    
    // Merge data preservando PK
    const updated = await this.rolRepository.save({
      ...existing,
      ...data,
      id_rol: existing.id_rol,
      periodo: existing.periodo
    });
    
    return updated;
  }

  /**
   * Elimina un rol
   * 
   * @param {number} idRol - ID del rol
   * @param {string} periodo - Periodo
   * 
   * @returns {Promise<boolean>} true si fue eliminado, false si no existía
   * 
   * @example
   * const deleted = await rolService.remove(123, '2024-11');
   * if (!deleted) throw new Error('Rol no encontrado');
   */
  async remove(idRol, periodo) {
    const result = await this.rolRepository.delete({
      id_rol: Number(idRol),
      periodo
    });
    return result.affected > 0;
  }
}

// Exportar la clase (NO singleton)
module.exports = RolService;
