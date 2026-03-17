const { hashPassword, comparePassword } = require('../utils/passwordHelpers');

/**
 * UserService
 * 
 * Capa de servicio para gestión de Usuarios.
 * Encapsula lógica de negocio incluyendo:
 * - Hashing de passwords con bcrypt (centralizado en passwordHelpers)
 * - Validación de duplicados (username, email)
 * - Sanitización de respuestas (sin password_hash)
 * 
 * IMPORTANTE: 
 * - NO maneja HTTP (status codes, res.json, etc)
 * - NO accede a AppDataSource directamente
 * - Repositorio inyectado por constructor (Dependency Injection)
 * - Solo retorna datos o lanza excepciones
 * - NUNCA retorna password_hash en respuestas
 */
class UserService {
  /**
   * @param {Repository<User>} userRepository - Repositorio de TypeORM inyectado
   */
  constructor(userRepository) {
    if (!userRepository) {
      throw new Error('UserService requiere un repositorio de User');
    }
    this.userRepository = userRepository;
  }

  /**
   * Sanitiza usuario removiendo password_hash
   * 
   * @private
   * @param {User|null} user - Usuario a sanitizar
   * @returns {Object|null} Usuario sin password_hash
   */
  sanitize(user) {
    if (!user) return user;
    const { password_hash, ...rest } = user;
    return rest;
  }

  /**
   * Lista todos los usuarios
   * 
   * @returns {Promise<User[]>} Array de usuarios (sin password_hash)
   * 
   * @example
   * const users = await userService.list();
   * // [{ id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', ... }]
   */
  async list() {
    const rows = await this.userRepository.find();
    return rows.map(u => this.sanitize(u));
  }

  /**
   * Obtiene un usuario por ID
   * 
   * @param {number} userId - ID del usuario
   * 
   * @returns {Promise<User|null>} Usuario sin password_hash, o null si no existe
   * 
   * @example
   * const user = await userService.getById(1);
   * if (!user) throw new Error('Usuario no encontrado');
   */
  async getById(userId) {
    const user = await this.userRepository.findOne({ 
      where: { id: Number(userId) } 
    });
    return this.sanitize(user);
  }

  /**
   * Crea un nuevo usuario
   * 
   * @param {Object} data - Datos del usuario
   * @param {string} data.username - Nombre de usuario (único)
   * @param {string} [data.email] - Email (único, opcional)
   * @param {string} data.password - Password en texto plano (será hasheado)
   * @param {string} [data.role='viewer'] - Rol (admin, editor, viewer, director)
   * @param {boolean} [data.is_active=true] - Si está activo
   * @param {string} [data.hospital_code] - Código de hospital
   * 
   * @returns {Promise<User>} Usuario creado (sin password_hash)
   * 
   * @throws {Error} Si username o email ya existen
   * 
   * @example
   * const newUser = await userService.create({
   *   username: 'jgarcia',
   *   email: 'jgarcia@example.com',
   *   password: 'securePass123',
   *   role: 'editor',
   *   hospital_code: 'HGA'
   * });
   */
  async create({ username, email = null, password, role = 'viewer', is_active = true, hospital_code = null }) {
    // Validar username único
    const existsUser = await this.userRepository.findOne({ where: { username } });
    if (existsUser) {
      throw new Error('USERNAME_EXISTS');
    }
    
    // Validar email único si se proporciona
    if (email) {
      const existsEmail = await this.userRepository.findOne({ where: { email } });
      if (existsEmail) {
        throw new Error('EMAIL_EXISTS');
      }
    }
    
    // Hash del password (centralizado en passwordHelpers)
    const password_hash = hashPassword(password);
    
    // Crear usuario
    const created = await this.userRepository.save({
      username,
      email,
      password_hash,
      role,
      is_active,
      hospital_code
    });
    
    return this.sanitize(created);
  }

  /**
   * Actualiza un usuario existente
   * 
   * @param {number} userId - ID del usuario
   * @param {Object} data - Datos a actualizar (parcial)
   * @param {string} [data.username] - Nuevo username (debe ser único)
   * @param {string} [data.email] - Nuevo email (debe ser único)
   * @param {string} [data.password] - Nuevo password (será hasheado)
   * @param {string} [data.role] - Nuevo rol
   * @param {boolean} [data.is_active] - Nuevo estado activo
   * @param {string} [data.hospital_code] - Nuevo código de hospital
   * 
   * @returns {Promise<User|null>} Usuario actualizado (sin password_hash), o null si no existe
   * 
   * @throws {Error} Si username o email ya existen (en otro usuario)
   * 
   * @example
   * const updated = await userService.update(1, {
   *   role: 'admin',
   *   password: 'newSecurePass456'
   * });
   */
  async update(userId, { username, email, password, role, is_active, hospital_code }) {
    // Buscar usuario existente
    const user = await this.userRepository.findOne({ 
      where: { id: Number(userId) } 
    });
    
    if (!user) {
      return null;
    }
    
    // Validar username único si se cambia
    if (username && username !== user.username) {
      const existsUser = await this.userRepository.findOne({ where: { username } });
      if (existsUser) {
        throw new Error('USERNAME_EXISTS');
      }
      user.username = username;
    }
    
    // Validar email único si se cambia
    if (typeof email !== 'undefined' && email !== user.email) {
      if (email) {
        const existsEmail = await this.userRepository.findOne({ where: { email } });
        if (existsEmail) {
          throw new Error('EMAIL_EXISTS');
        }
      }
      user.email = email ?? null;
    }
    
    // Actualizar campos opcionales
    if (typeof role === 'string') user.role = role;
    if (typeof is_active === 'boolean') user.is_active = is_active;
    if (typeof hospital_code !== 'undefined') user.hospital_code = hospital_code ?? null;
    
    // Hash nuevo password si se proporciona (centralizado en passwordHelpers)
    if (password) {
      user.password_hash = hashPassword(password);
    }
    
    const saved = await this.userRepository.save(user);
    return this.sanitize(saved);
  }

  /**
   * Elimina un usuario
   * 
   * @param {number} userId - ID del usuario
   * 
   * @returns {Promise<boolean>} true si fue eliminado, false si no existía
   * 
   * @example
   * const deleted = await userService.remove(1);
   * if (!deleted) throw new Error('Usuario no encontrado');
   */
  async remove(userId) {
    const result = await this.userRepository.delete({ 
      id: Number(userId) 
    });
    return result.affected > 0;
  }

  /**
   * Valida password contra hash almacenado
   * 
   * @param {string} plainPassword - Password en texto plano
   * @param {string} hash - Hash almacenado
   * 
   * @returns {boolean} true si coincide, false si no
   * 
   * @example
   * const isValid = userService.validatePassword('myPass123', user.password_hash);
   */
  validatePassword(plainPassword, hash) {
    return comparePassword(plainPassword, hash);
  }

  /**
   * Encuentra usuario por username (útil para autenticación)
   * ⚠️ ATENCIÓN CRÍTICA: Retorna con password_hash para validación
   * ❌ NUNCA serializar/retornar en respuestas HTTP
   * ✅ Solo usar en AuthService para validar login
   * 
   * @param {string} username - Username a buscar
   * 
   * @returns {Promise<User|null>} Usuario completo (CON password_hash) o null
   * 
   * @example
   * const user = await userService.findByUsername('admin');
   * if (user && userService.validatePassword('password123', user.password_hash)) {
   *   // Login exitoso
   * }
   */
  async findByUsername(username) {
    return await this.userRepository.findOne({ where: { username } });
  }

  /**
   * Encuentra usuario por email (útil para autenticación)
   * ⚠️ ATENCIÓN CRÍTICA: Retorna con password_hash para validación
   * ❌ NUNCA serializar/retornar en respuestas HTTP
   * ✅ Solo usar en AuthService para validar login
   * 
   * @param {string} email - Email a buscar
   * 
   * @returns {Promise<User|null>} Usuario completo (CON password_hash) o null
   */
  async findByEmail(email) {
    return await this.userRepository.findOne({ where: { email } });
  }
}

// Exportar la clase (NO singleton)
module.exports = UserService;
