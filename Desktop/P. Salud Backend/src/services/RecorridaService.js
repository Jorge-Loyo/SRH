const sanitizeHtml = require('sanitize-html');

/**
 * RecorridaService
 * 
 * Lógica de negocio para la gestión de Recorridas/Seguimientos.
 * Responsable de:
 * - CRUD de recorridas
 * - Sanitización de contenido HTML (prevención XSS)
 * - Paginación y ordenamiento
 * - Filtrado por hospital
 */
class RecorridaService {
  /**
   * @param {import('typeorm').Repository} recorridaRepository - Repository de Recorrida
   * @param {import('typeorm').Repository} userRepository - Repository de User
   */
  constructor(recorridaRepository, userRepository) {
    this.recorridaRepository = recorridaRepository;
    this.userRepository = userRepository;
  }

  /**
   * Listar recorridas con filtros y paginación
   * @param {Object} options - Opciones de listado
   * @param {string} [options.hospital_code] - Código del hospital (filtro opcional)
   * @param {number} [options.page=1] - Página actual
   * @param {number} [options.limit=50] - Registros por página
   * @returns {Promise<{rows: Array, total: number, page: number, limit: number}>}
   */
  async list({ hospital_code, page = 1, limit = 50 }) {
    const queryBuilder = this.recorridaRepository.createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .orderBy('r.created_at', 'DESC');
    
    if (hospital_code) {
      queryBuilder.andWhere('r.hospital_code = :code', { code: hospital_code });
    }
    
    const total = await queryBuilder.getCount();
    const rows = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    
    return { rows, total, page, limit };
  }

  /**
   * Obtener una recorrida por ID
   * @param {number} id - ID de la recorrida
   * @returns {Promise<Object|null>} Recorrida con usuario relacionado
   */
  async getOne(id) {
    return await this.recorridaRepository.findOne({
      where: { id },
      relations: ['user']
    });
  }

  /**
   * Crear nueva recorrida
   * @param {Object} data - Datos de la recorrida
   * @param {string} data.hospital_code - Código del hospital
   * @param {string} data.titulo - Título de la recorrida
   * @param {string} data.contenido_html - Contenido HTML (sin sanitizar)
   * @param {number} userId - ID del usuario creador
   * @returns {Promise<Object>} Recorrida creada
   */
  async create(data, userId) {
    // Validar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Validar tamaño de contenido (máx 100KB)
    const MAX_SIZE = 100 * 1024; // 100KB en bytes
    const contentSizeInBytes = Buffer.byteLength(data.contenido_html, 'utf8');
    if (contentSizeInBytes > MAX_SIZE) {
      const sizeMB = (contentSizeInBytes / 1024).toFixed(2);
      throw new Error(`Contenido muy grande: ${sizeMB}KB (máx: 100KB)`);
    }

    // Sanitizar HTML para prevenir XSS
    const sanitizedHtml = this.sanitizeHtml(data.contenido_html);
    
    const recorrida = this.recorridaRepository.create({
      hospital_code: data.hospital_code,
      titulo: data.titulo,
      contenido_html: sanitizedHtml,
      user_id: userId
    });
    
    return await this.recorridaRepository.save(recorrida);
  }

  /**
   * Actualizar recorrida existente
   * @param {number} id - ID de la recorrida
   * @param {Object} data - Datos a actualizar
   * @param {string} [data.titulo] - Nuevo título
   * @param {string} [data.contenido_html] - Nuevo contenido HTML
   * @returns {Promise<Object>} Recorrida actualizada
   */
  async update(id, data) {
    const recorrida = await this.recorridaRepository.findOne({ where: { id } });
    if (!recorrida) {
      throw new Error('Recorrida no encontrada');
    }

    // Sanitizar HTML si se actualiza contenido
    if (data.contenido_html) {
      // Validar tamaño de contenido (máx 100KB)
      const MAX_SIZE = 100 * 1024; // 100KB en bytes
      const contentSizeInBytes = Buffer.byteLength(data.contenido_html, 'utf8');
      if (contentSizeInBytes > MAX_SIZE) {
        const sizeMB = (contentSizeInBytes / 1024).toFixed(2);
        throw new Error(`Contenido muy grande: ${sizeMB}KB (máx: 100KB)`);
      }
      data.contenido_html = this.sanitizeHtml(data.contenido_html);
    }

    // Actualizar solo campos permitidos
    if (data.titulo !== undefined) recorrida.titulo = data.titulo;
    if (data.contenido_html !== undefined) recorrida.contenido_html = data.contenido_html;

    return await this.recorridaRepository.save(recorrida);
  }

  /**
   * Eliminar recorrida
   * @param {number} id - ID de la recorrida
   * @returns {Promise<void>}
   */
  async remove(id) {
    const recorrida = await this.recorridaRepository.findOne({ where: { id } });
    if (!recorrida) {
      throw new Error('Recorrida no encontrada');
    }

    await this.recorridaRepository.remove(recorrida);
  }

  /**
   * Sanitiza contenido HTML para prevenir ataques XSS
   * 
   * Permite solo tags seguros necesarios para formato de texto enriquecido:
   * - Formato: <strong>, <em>, <u>, <br>, <p>
   * - Listas: <ul>, <ol>, <li>
   * - Alineación: style="text-align: left|center|right"
   * 
   * Bloquea:
   * - Scripts: <script>, onclick, onerror, etc.
   * - Objetos externos: <iframe>, <object>, <embed>
   * - Estilos peligrosos: position, display complejos
   * 
   * @param {string} html - HTML sin sanitizar
   * @returns {string} HTML sanitizado y seguro
   */
  sanitizeHtml(html) {
    return sanitizeHtml(html, {
      allowedTags: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'pre', 'code'
      ],
      allowedAttributes: {
        'p': ['style'],
        'span': ['style'],
        'h1': ['style'],
        'h2': ['style'],
        'h3': ['style'],
        'h4': ['style'],
        'h5': ['style'],
        'h6': ['style'],
        'blockquote': ['style']
      },
      allowedStyles: {
        '*': {
          'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
          'color': [/^#[0-9a-fA-F]{3,6}$/],
          'background-color': [/^#[0-9a-fA-F]{3,6}$/]
        }
      },
      // Transformar tags potencialmente peligrosos a seguros
      transformTags: {
        'script': 'pre', // Scripts se convierten en texto pre-formateado
        'iframe': 'div',
        'object': 'div',
        'embed': 'div'
      }
    });
  }
}

module.exports = RecorridaService;
