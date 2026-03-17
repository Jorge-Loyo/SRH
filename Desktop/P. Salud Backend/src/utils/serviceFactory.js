const { AppDataSource } = require('../config/data-source');

/**
 * Factory para instanciar servicios con repositorios inyectados
 * 
 * Evita repetir en cada controller:
 *   const repo = AppDataSource.getRepository(Entity);
 *   const service = new EntityService(repo);
 * 
 * Uso:
 *   // Servicio con un solo repositorio
 *   const service = ServiceFactory.getService(PersonaService, Persona);
 * 
 *   // Servicio con múltiples repositorios
 *   const service = ServiceFactory.getService(RecorridaService, Recorrida, User);
 * 
 * Beneficios:
 * - DRY: Código de inyección centralizado
 * - Fácil modificación: cambios en 1 lugar
 * - Testeable: ServiceFactory puede mockearse
 */
class ServiceFactory {
  /**
   * Instancia un servicio con sus repositorios inyectados
   * @param {Class} ServiceClass - Clase del servicio (ej: PersonaService)
   * @param {...Entity} Entities - Entidades TypeORM (ej: Persona, User)
   * @returns {Service} Instancia del servicio lista para usar
   */
  static getService(ServiceClass, ...Entities) {
    const repos = Entities.map(Entity => AppDataSource.getRepository(Entity));
    return new ServiceClass(...repos);
  }
}

module.exports = { ServiceFactory };
