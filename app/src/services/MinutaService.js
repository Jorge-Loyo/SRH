/**
 * MinutaService
 * 
 * Lógica de negocio para la gestión de Minutas (hojas de cálculo dinámicas).
 * Responsable de:
 * - CRUD de minutas
 * - Validación de estructura JSON de datos_tabla
 * - Paginación y ordenamiento
 * - Filtrado por hospital
 */
class MinutaService {
  /**
   * @param {import('typeorm').Repository} minutaRepository - Repository de Minuta
   * @param {import('typeorm').Repository} userRepository - Repository de User
   */
  constructor(minutaRepository, userRepository) {
    this.minutaRepository = minutaRepository;
    this.userRepository = userRepository;
  }

  /**
   * Listar minutas con filtros y paginación
   * @param {Object} options - Opciones de listado
   * @param {string} [options.hospital_code] - Código del hospital (filtro opcional)
   * @param {number} [options.page=1] - Página actual
   * @param {number} [options.limit=50] - Registros por página
   * @returns {Promise<{rows: Array, total: number, page: number, limit: number}>}
   */
  async list({ hospital_code, page = 1, limit = 50 }) {
    const queryBuilder = this.minutaRepository.createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user')
      .orderBy('m.created_at', 'DESC');
    
    if (hospital_code) {
      queryBuilder.andWhere('m.hospital_code = :code', { code: hospital_code });
    }
    
    const total = await queryBuilder.getCount();
    const rows = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    
    return { rows, total, page, limit };
  }

  /**
   * Obtener una minuta por ID
   * @param {number} id - ID de la minuta
   * @returns {Promise<Object|null>} Minuta con usuario relacionado
   */
  async getOne(id) {
    return await this.minutaRepository.findOne({
      where: { id },
      relations: ['user']
    });
  }

  /**
   * Crear nueva minuta
   * @param {Object} data - Datos de la minuta
   * @param {string} data.hospital_code - Código del hospital
   * @param {string} data.titulo - Título de la minuta
   * @param {Object} data.datos_tabla - Estructura de tabla (columns + rows)
   * @param {number} userId - ID del usuario creador
   * @returns {Promise<Object>} Minuta creada
   */
  async create(data, userId) {
    // Validar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Validar estructura de datos_tabla
    this.validateTablaStructure(data.datos_tabla);
    
    // Validar tamaño de datos_tabla (máx 1MB para tabla completa)
    const MAX_SIZE = 1024 * 1024; // 1MB en bytes
    const dataSizeInBytes = Buffer.byteLength(JSON.stringify(data.datos_tabla), 'utf8');
    if (dataSizeInBytes > MAX_SIZE) {
      const sizeMB = (dataSizeInBytes / (1024 * 1024)).toFixed(2);
      throw new Error(`Tabla muy grande: ${sizeMB}MB (máx: 1MB)`);
    }
    
    const minuta = this.minutaRepository.create({
      hospital_code: data.hospital_code,
      titulo: data.titulo,
      datos_tabla: data.datos_tabla,
      user_id: userId
    });
    
    return await this.minutaRepository.save(minuta);
  }

  /**
   * Actualizar minuta existente
   * @param {number} id - ID de la minuta
   * @param {Object} data - Datos a actualizar
   * @param {string} [data.titulo] - Nuevo título
   * @param {Object} [data.datos_tabla] - Nueva estructura de tabla
   * @returns {Promise<Object>} Minuta actualizada
   */
  async update(id, data) {
    const minuta = await this.minutaRepository.findOne({ where: { id } });
    if (!minuta) {
      throw new Error('Minuta no encontrada');
    }

    // Validar estructura si se actualiza datos_tabla
    if (data.datos_tabla) {
      this.validateTablaStructure(data.datos_tabla);
      
      // Validar tamaño de datos_tabla (máx 1MB para tabla completa)
      const MAX_SIZE = 1024 * 1024; // 1MB en bytes
      const dataSizeInBytes = Buffer.byteLength(JSON.stringify(data.datos_tabla), 'utf8');
      if (dataSizeInBytes > MAX_SIZE) {
        const sizeMB = (dataSizeInBytes / (1024 * 1024)).toFixed(2);
        throw new Error(`Tabla muy grande: ${sizeMB}MB (máx: 1MB)`);
      }
      
      minuta.datos_tabla = data.datos_tabla;
    }

    // Actualizar solo campos permitidos
    if (data.titulo !== undefined) {
      minuta.titulo = data.titulo;
    }

    return await this.minutaRepository.save(minuta);
  }

  /**
   * Eliminar minuta
   * @param {number} id - ID de la minuta
   * @returns {Promise<void>}
   */
  async remove(id) {
    const minuta = await this.minutaRepository.findOne({ where: { id } });
    if (!minuta) {
      throw new Error('Minuta no encontrada');
    }

    await this.minutaRepository.remove(minuta);
  }

  /**
   * Validar estructura de datos_tabla
   * 
   * Estructura esperada:
   * {
   *   columns: [
   *     { id: string, name: string, type: 'text'|'number'|'date'|'select', options?: string[] }
   *   ],
   *   rows: [
   *     { [columnId]: value, ... }
   *   ]
   * }
   * 
   * @param {Object} datos_tabla - Estructura de tabla a validar
   * @throws {Error} Si la estructura es inválida
   */
  validateTablaStructure(datos_tabla) {
    if (!datos_tabla || typeof datos_tabla !== 'object') {
      throw new Error('datos_tabla debe ser un objeto');
    }

    // Validar columns
    if (!Array.isArray(datos_tabla.columns)) {
      throw new Error('datos_tabla.columns debe ser un array');
    }

    const validTypes = ['text', 'number', 'date', 'select'];
    const columnIds = new Set();

    for (const col of datos_tabla.columns) {
      if (!col.id || typeof col.id !== 'string') {
        throw new Error('Cada columna debe tener un id (string)');
      }
      if (columnIds.has(col.id)) {
        throw new Error(`ID de columna duplicado: ${col.id}`);
      }
      columnIds.add(col.id);

      if (!col.name || typeof col.name !== 'string') {
        throw new Error('Cada columna debe tener un name (string)');
      }

      if (!validTypes.includes(col.type)) {
        throw new Error(`Tipo de columna inválido: ${col.type}. Debe ser: ${validTypes.join(', ')}`);
      }

      // Validar options para select
      if (col.type === 'select') {
        if (!Array.isArray(col.options) || col.options.length === 0) {
          throw new Error(`Columna tipo select "${col.name}" debe tener options (array no vacío)`);
        }
      }
    }

    // Validar rows
    if (!Array.isArray(datos_tabla.rows)) {
      throw new Error('datos_tabla.rows debe ser un array');
    }

    // Validar que cada row tiene solo columnas válidas
    for (const row of datos_tabla.rows) {
      if (!row || typeof row !== 'object') {
        throw new Error('Cada fila debe ser un objeto');
      }

      for (const key of Object.keys(row)) {
        if (!columnIds.has(key)) {
          throw new Error(`Fila contiene columna inválida: ${key}`);
        }
      }
    }
  }
}

module.exports = MinutaService;
