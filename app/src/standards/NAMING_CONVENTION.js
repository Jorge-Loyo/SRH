/**
 * src/standards/NAMING_CONVENTION.js
 * Guía de estándares de naming para el proyecto
 * 
 * OBJETIVO: Consistencia en todo el codebase
 * APLICABILIDAD: API REST, Database, Services, Controllers
 */

module.exports = {
  /**
   * URLS / ENDPOINTS - kebab-case
   * Ejemplos válidos: /api/bajas-concursos, /api/admin/cache/invalidate-permissions
   * RAZÓN: Estándar REST, legible en URLs
   */
  endpoints: {
    valid: [
      '/api/bajas-concursos',
      '/api/usuarios-roles', 
      '/api/admin/cache/invalidate-permissions',
      '/api/schema'
    ],
    invalid: [
      '/api/bajasConcursos',        // ❌ camelCase
      '/api/bajas_concursos',       // ❌ snake_case
      '/api/BajasConcursos'         // ❌ PascalCase
    ]
  },

  /**
   * REQUEST/RESPONSE BODIES - camelCase
   * Ejemplos válidos: { userId, firstName, createdAt }
   * RAZÓN: Estándar JavaScript/JSON, fácil para frontend
   * NOTA: Si la BD tiene snake_case, convertir en controllers/services
   */
  jsonFields: {
    valid: [
      { userId: 1, firstName: 'Juan', email: 'juan@example.com' },
      { bajaId: 5, periodoId: 2, motivo: 'Renuncia' }
    ],
    invalid: [
      { user_id: 1, first_name: 'Juan' },      // ❌ snake_case
      { UserID: 1, FirstName: 'Juan' }         // ❌ PascalCase
    ]
  },

  /**
   * DATABASE FIELDS - snake_case
   * Ejemplos válidos: user_id, first_name, created_at
   * RAZÓN: Estándar SQL/Database
   * NOTA: ORM (TypeORM) puede mapear automáticamente camelCase ↔ snake_case
   */
  databaseFields: {
    valid: [
      'user_id, first_name, email, created_at',
      'baja_id, periodo_id, motivo'
    ],
    invalid: [
      'userId, firstName',    // ❌ camelCase
      'UserID, FirstName'     // ❌ PascalCase
    ]
  },

  /**
   * CLASES / INTERFACES - PascalCase
   * Ejemplos válidos: UserService, BajaConcursoController, PermissionCache
   * RAZÓN: Convención JavaScript para clases
   */
  classes: {
    valid: [
      'UserService',
      'BajaConcursoController', 
      'PermissionCacheService',
      'AuthMiddleware'
    ],
    invalid: [
      'userService',              // ❌ camelCase
      'user_service',             // ❌ snake_case
      'USERSERVICE'               // ❌ UPPERCASE
    ]
  },

  /**
   * VARIABLES / CONSTANTES - camelCase
   * Ejemplos válidos: userId, bajasConcursos, isAdmin, CONSTANT_VALUE
   * RAZÓN: Convención JavaScript
   */
  variables: {
    valid: [
      'const userId = 1;',
      'const bajasConcursos = [];',
      'let isAdmin = true;',
      'const MAX_RETRIES = 3;'
    ],
    invalid: [
      'const user_id = 1;',       // ❌ snake_case para variables
      'const UserID = 1;',        // ❌ PascalCase para variables
    ]
  },

  /**
   * ARCHIVOS - kebab-case (archivos de rutas) o camelCase (clases)
   * Ejemplos válidos: user-routes.js, userService.js, BajasConcursos.js
   * RAZÓN: Consistencia con nombre del contenido
   */
  files: {
    routes: 'kebab-case: user-routes.js, bajas-concursos-routes.js',
    services: 'camelCase: userService.js, baja ConcursoService.js',
    controllers: 'camelCase: userController.js, bajasConcursosController.js',
    entities: 'PascalCase: User.js, BajaConcurso.js',
    schemas: 'camelCase: userSchema.js, bajasConcursoSchema.js'
  },

  /**
   * CONVERSIÓN AUTOMÁTICA (TypeORM)
   * Si BD usa snake_case pero API usa camelCase, TypeORM puede hacerlo automáticamente
   * 
   * Ejemplo en Entity:
   * @Entity('users')
   * class User {
   *   @Column('first_name')        // BD: first_name
   *   firstName: string;           // API: firstName
   * }
   */
  typeormMapping: {
    database_field: 'first_name',
    dto_field: 'firstName',
    decoratorExample: "@Column('first_name') firstName: string;"
  },

  /**
   * RESUMEN DE CONVENCIONES ACTUALES EN PROYECTO
   * ✅ Endpoints: kebab-case (correcto)
   * ✅ JSON Fields: camelCase (correcto) 
   * ⚠️  Clases: mayormente PascalCase (correcto)
   * ✅ Variables: camelCase (correcto)
   * ✅ Database: snake_case (correcto)
   * 
   * CONCLUSIÓN: Proyecto ya es CONSISTENTE. No requiere refactorización masiva.
   */
};
