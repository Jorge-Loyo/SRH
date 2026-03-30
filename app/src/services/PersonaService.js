/**
 * PersonaService
 * 
 * Capa de servicio para gestión de Personas.
 * Encapsula lógica de negocio y acceso a datos.
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Repositorio inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 */
class PersonaService {
  /**
   * @param {Repository<Persona>} personaRepository - Repositorio de TypeORM inyectado
   */
  constructor(personaRepository) {
    if (!personaRepository) {
      throw new Error('PersonaService requiere un repositorio de Persona');
    }
    this.personaRepository = personaRepository;
  }

  /**
   * Lista personas con paginación, filtros y ordenamiento
   * 
   * @param {Object} options - Opciones de consulta
   * @param {Object} options.where - Condiciones WHERE de TypeORM
   * @param {Object} options.order - Ordenamiento (ej: { id_persona: 'ASC' })
   * @param {number} options.skip - Offset para paginación
   * @param {number} options.take - Límite de resultados
   * 
   * @returns {Promise<{ rows: Persona[], count: number }>}
   * 
   * @example
   * const result = await personaService.list({
   *   where: { periodo: '2024-11' },
   *   order: { nombre_apellido: 'ASC' },
   *   skip: 0,
   *   take: 50
   * });
   */
  async list({ where = {}, order = {}, skip = 0, take = 50 }) {
    const [rows, count] = await this.personaRepository.findAndCount({
      where,
      order,
      skip,
      take
    });
    return { rows, count };
  }

  /**
   * Obtiene una persona por ID y periodo
   * 
   * @param {number} idPersona - ID de la persona
   * @param {string} periodo - Periodo (ej: '2024-11')
   * 
   * @returns {Promise<Persona|null>}
   * 
   * @example
   * const persona = await personaService.getById(123, '2024-11');
   * if (!persona) throw new Error('Persona no encontrada');
   */
  async getById(idPersona, periodo) {
    return await this.personaRepository.findOne({
      where: {
        id_persona: Number(idPersona),
        periodo
      }
    });
  }

  /**
   * Crea una nueva persona
   * 
   * @param {Object} data - Datos de la persona
   * @param {number} data.id_persona - ID único
   * @param {string} data.periodo - Periodo
   * @param {string} data.nombre_apellido - Nombre completo
   * @param {string} data.cuil - CUIL
   * @param {string} data.tipo_doc - Tipo documento
   * @param {string} data.numero_doc - Número documento
   * @param {...} data - Otros campos opcionales
   * 
   * @returns {Promise<Persona>} Persona creada con ID
   * 
   * @throws {Error} Si hay error de constraint (duplicado, etc)
   * 
   * @example
   * const nueva = await personaService.create({
   *   id_persona: 999,
   *   periodo: '2024-11',
   *   nombre_apellido: 'García, Juan',
   *   cuil: '20123456789',
   *   tipo_doc: 'DNI',
   *   numero_doc: '12345678',
   *   edad: 35
   * });
   */
  async create(data) {
    return await this.personaRepository.save(data);
  }

  /**
   * Actualiza una persona existente
   * 
   * @param {number} idPersona - ID de la persona
   * @param {string} periodo - Periodo
   * @param {Object} data - Datos a actualizar (parcial)
   * 
   * @returns {Promise<Persona|null>} Persona actualizada o null si no existe
   * 
   * @example
   * const updated = await personaService.update(123, '2024-11', {
   *   mail_laboral: 'nuevo@email.com',
   *   telefono: '123456789'
   * });
   */
  async update(idPersona, periodo, data) {
    // Buscar persona existente
    const existing = await this.personaRepository.findOne({
      where: {
        id_persona: Number(idPersona),
        periodo
      }
    });
    
    if (!existing) {
      return null;
    }
    
    // Merge data preservando PK
    const updated = await this.personaRepository.save({
      ...existing,
      ...data,
      id_persona: existing.id_persona,
      periodo: existing.periodo
    });
    
    return updated;
  }

  /**
   * Elimina una persona
   * 
   * @param {number} idPersona - ID de la persona
   * @param {string} periodo - Periodo
   * 
   * @returns {Promise<boolean>} true si fue eliminada, false si no existía
   * 
   * @example
   * const deleted = await personaService.remove(123, '2024-11');
   * if (!deleted) throw new Error('Persona no encontrada');
   */
  async remove(idPersona, periodo) {
    const result = await this.personaRepository.delete({
      id_persona: Number(idPersona),
      periodo
    });
    return result.affected > 0;
  }
}

// Exportar la clase (NO singleton)
module.exports = PersonaService;
