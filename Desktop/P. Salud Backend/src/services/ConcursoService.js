const { AppDataSource } = require('../config/data-source');
const { Concurso } = require('../entities-class');
const logger = require('../utils/logger');

/**
 * ConcursoService - Gestión de procesos concursales
 *
 * Responsabilidades:
 * - CRUD de concursos
 * - Filtrado y búsqueda avanzada
 * - Gestión de estados
 * - Auditoría de cambios
 *
 * Patrón: Inyección de dependencias (concursoRepository inyectado)
 */
class ConcursoService {
  constructor(concursoRepository = null) {
    this.concursoRepository =
      concursoRepository || AppDataSource.getRepository(Concurso);
  }

  /**
   * Obtener todos los concursos con paginación y filtros
   * @param {Object} options - Opciones de filtrado y paginación
   * @param {string} options.sigla - Filtrar por hospital (FK)
   * @param {string} options.estado - Filtrar por estado del proceso
   * @param {number} options.limit - Cantidad de registros (default: 50, max: 200)
   * @param {number} options.offset - Salto de registros (default: 0)
   * @param {string} options.sort - Campo para ordenar (default: id_concurso)
   * @param {string} options.order - Dirección de orden: ASC o DESC (default: ASC)
   * @returns {Promise<{rows: Concurso[], count: number}>}
   */
  async list(options = {}) {
    const {
      sigla = null,
      estado = null,
      limit = 50,
      offset = 0,
      sort = 'id_concurso',
      order = 'ASC',
    } = options;

    const queryBuilder = this.concursoRepository.createQueryBuilder('c');

    // Aplicar filtros
    if (sigla) {
      queryBuilder.andWhere('c.sigla = :sigla', { sigla });
    }

    if (estado) {
      queryBuilder.andWhere('c.estado = :estado', { estado });
    }

    // Ordenar y paginar
    queryBuilder.orderBy(`c.${sort}`, order === 'DESC' ? 'DESC' : 'ASC');
    queryBuilder.skip(offset).take(limit);

    const [rows, count] = await queryBuilder.getManyAndCount();

    logger.info(`[ConcursoService] Listed ${count} concursos`, {
      filters: { sigla, estado },
      pagination: { limit, offset },
    });

    return { rows, count };
  }

  /**
   * Obtener un concurso por ID
   * @param {number} id_concurso - ID del concurso
   * @returns {Promise<Concurso|null>}
   */
  async getById(id_concurso) {
    if (!id_concurso) {
      throw new Error('id_concurso is required');
    }

    const concurso = await this.concursoRepository.findOne({
      where: { id_concurso },
    });

    if (!concurso) {
      logger.warn(`[ConcursoService] Concurso not found: ${id_concurso}`);
      return null;
    }

    return concurso;
  }

  /**
   * Crear un nuevo concurso
   * @param {Partial<Concurso>} data - Datos del concurso
   * @returns {Promise<Concurso>}
   */
  async create(data) {
    if (!data.id_concurso) {
      throw new Error('id_concurso is required');
    }

    if (!data.sigla) {
      throw new Error('sigla (hospital) is required');
    }

    // Verificar duplicados
    const existing = await this.concursoRepository.findOne({
      where: { id_concurso: data.id_concurso },
    });

    if (existing) {
      throw new Error(`Concurso ${data.id_concurso} already exists`);
    }

    const concurso = this.concursoRepository.create(data);
    const saved = await this.concursoRepository.save(concurso);

    logger.info(`[ConcursoService] Created concurso: ${saved.id_concurso}`, {
      sigla: saved.sigla,
      estado: saved.estado,
    });

    return saved;
  }

  /**
   * Actualizar un concurso existente
   * @param {number} id_concurso - ID del concurso
   * @param {Partial<Concurso>} data - Datos a actualizar
   * @returns {Promise<Concurso>}
   */
  async update(id_concurso, data) {
    if (!id_concurso) {
      throw new Error('id_concurso is required');
    }

    const concurso = await this.getById(id_concurso);

    if (!concurso) {
      throw new Error(`Concurso ${id_concurso} not found`);
    }

    // Actualizar campos permitidos (evitar sobrescribir id_concurso)
    const allowedFields = [
      'sigla',
      'sub_estado',
      'estado',
      'ee_baja',
      'cuil_baja',
      'nombre_baja',
      'fecha_baja',
      'escalafon_baja',
      'puesto_baja',
      'especialidad_baja',
      'ee_concurso',
      'fecha_ee_concurso',
      'escalafon_concurso',
      'puesto_alta',
      'especialidad_solicitada_de_alta',
      'fecha_autorizacion',
      'sorteo_de_jurado',
      'disposicion_concurso',
      'fecha_desde',
      'fecha_hasta',
      'fecha_examen',
      'orden_merito',
      'fecha_orden_merito',
      'expediente_designacion',
      'fecha_expediente_designacion',
      'nombre_designacion',
      'cuil_designacion',
      'fecha_apto_medico',
      'resolucion_designacion',
      'fecha_resolucion',
      'observaciones',
      'codigo_cargo',
      'recorridas',
      'origen',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        concurso[field] = data[field];
      }
    }

    const updated = await this.concursoRepository.save(concurso);

    logger.info(`[ConcursoService] Updated concurso: ${id_concurso}`, {
      fields: Object.keys(data),
    });

    return updated;
  }

  /**
   * Eliminar un concurso
   * @param {number} id_concurso - ID del concurso
   * @returns {Promise<boolean>}
   */
  async delete(id_concurso) {
    if (!id_concurso) {
      throw new Error('id_concurso is required');
    }

    const result = await this.concursoRepository.delete({
      id_concurso,
    });

    if (result.affected === 0) {
      logger.warn(`[ConcursoService] Concurso not found for deletion: ${id_concurso}`);
      return false;
    }

    logger.info(`[ConcursoService] Deleted concurso: ${id_concurso}`);
    return true;
  }

  /**
   * Búsqueda textual en campos principales
   * @param {string} query - Término de búsqueda
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<{rows: Concurso[], count: number}>}
   */
  async search(query, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const queryBuilder = this.concursoRepository.createQueryBuilder('c');

    // Buscar en múltiples campos
    queryBuilder
      .where('c.nombre_baja LIKE :query', { query: `%${query}%` })
      .orWhere('c.nombre_designacion LIKE :query', { query: `%${query}%` })
      .orWhere('c.especialidad_baja LIKE :query', { query: `%${query}%` })
      .orWhere('c.especialidad_solicitada_de_alta LIKE :query', {
        query: `%${query}%`,
      });

    queryBuilder.skip(offset).take(limit);

    const [rows, count] = await queryBuilder.getManyAndCount();

    logger.info(`[ConcursoService] Search found ${count} matches`, {
      query,
    });

    return { rows, count };
  }

  /**
   * Obtener estadísticas de concursos por hospital
   * @returns {Promise<Array>}
   */
  async getStatsByHospital() {
    const stats = await this.concursoRepository
      .createQueryBuilder('c')
      .select('c.sigla', 'hospital')
      .addSelect('c.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('c.sigla')
      .addGroupBy('c.estado')
      .orderBy('c.sigla', 'ASC')
      .getRawMany();

    logger.info(`[ConcursoService] Retrieved stats for ${stats.length} hospital-estado combinations`);

    return stats;
  }

  /**
   * Obtener estados únicos de concursos
   * @returns {Promise<string[]>}
   */
  async getUniqueStates() {
    const states = await this.concursoRepository
      .createQueryBuilder('c')
      .select('DISTINCT c.estado', 'estado')
      .where('c.estado IS NOT NULL')
      .orderBy('c.estado', 'ASC')
      .getRawMany();

    return states.map((s) => s.estado);
  }

  /**
   * Bulk create - Importar múltiples concursos (útil para carga masiva desde CSV)
   * @param {Partial<Concurso>[]} concursos - Array de concursos
   * @param {Object} options - Opciones
   * @param {boolean} options.skipDuplicates - Si true, saltar IDs duplicados
   * @returns {Promise<{created: number, skipped: number, errors: Array}>}
   */
  async bulkCreate(concursos, options = {}) {
    const { skipDuplicates = true } = options;

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const concursoData of concursos) {
      try {
        // Verificar duplicados
        const existing = await this.concursoRepository.findOne({
          where: { id_concurso: concursoData.id_concurso },
        });

        if (existing) {
          if (skipDuplicates) {
            skipped++;
            continue;
          } else {
            throw new Error(
              `Duplicate id_concurso: ${concursoData.id_concurso}`
            );
          }
        }

        await this.create(concursoData);
        created++;
      } catch (err) {
        errors.push({
          id_concurso: concursoData.id_concurso,
          error: err.message,
        });
      }
    }

    logger.info(`[ConcursoService] Bulk import completed`, {
      created,
      skipped,
      errors: errors.length,
    });

    return { created, skipped, errors };
  }
}

module.exports = ConcursoService;
