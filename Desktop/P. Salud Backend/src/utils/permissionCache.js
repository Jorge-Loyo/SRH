const { AppDataSource } = require('../config/data-source');
const { Permission } = require('../entities-class/Permission');
const logger = require('./logger');

/**
 * Permission Cache Service
 * 
 * Cachea permisos por role en memoria para evitar N+1 queries
 * repetitivas en cada request de AdminJS.
 * 
 * PROBLEMA RESUELTO:
 * - Antes: 3-5 queries de permisos por cada navegación
 * - Después: 1 query inicial, resto desde caché
 * - Reducción estimada: -80% queries = -1.5s a -2s en respuesta
 * 
 * TTL: 5 minutos (suficiente para permisos que cambian raramente)
 */

class PermissionCacheService {
  constructor() {
    this.cache = new Map();
    this.TTL = 5 * 60 * 1000; // 5 minutos en ms
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Obtiene permisos por role, desde caché o BD
   * @param {string} role - Role del usuario (admin, editor, viewer, director)
   * @returns {Promise<Object|null>} Permisos o null si no existen
   */
  async getPermissions(role) {
    if (!role) return null;

    // 1. Intentar obtener desde caché
    const cached = this.cache.get(role);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      this.stats.hits++;
      return cached.data;
    }

    // 2. Cache miss - consultar BD
    this.stats.misses++;
    try {
      const permRepo = AppDataSource.getRepository(Permission);
      const permissions = await permRepo.findOne({ where: { role } });

      // 3. Guardar en caché (incluso si es null para evitar re-queries)
      this.cache.set(role, {
        data: permissions,
        timestamp: Date.now()
      });

      return permissions;
    } catch (error) {
      logger.error('[PermissionCache] Error fetching permissions', { 
        role, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Invalida caché de un role específico
   * Usar cuando se actualizan permisos en BD
   * @param {string} role - Role a invalidar
   */
  invalidate(role) {
    if (role) {
      this.cache.delete(role);
      // ✅ Silenciado: debug verbose no necesario
    }
  }

  /**
   * Limpia todo el caché (NO afecta stats)
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    // ✅ Silenciado: debug verbose no necesario
  }

  /**
   * Limpia caché Y estadísticas
   * Usado cuando se invalida todo sin role específico
   */
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    // ✅ Silenciado: debug verbose no necesario
  }

  /**
   * Limpia las estadísticas del caché
   * Separado de clear() para permitir limpiar datos sin afectar stats
   */
  clearStats() {
    this.stats = { hits: 0, misses: 0 };
    // ✅ Silenciado: debug verbose no necesario
  }

  /**
   * Limpia todo: caché + stats
   * Usado en invalidación completa (admin endpoint)
   */
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    // ✅ Silenciado: debug verbose no necesario
  }

  /**
   * Obtiene estadísticas de uso del caché
   * @returns {Object} Stats con hits, misses, hitRate, size
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      ttlMinutes: this.TTL / 60000
    };
  }
}

// Singleton instance
const permissionCache = new PermissionCacheService();

// Log stats cada 5 minutos
setInterval(() => {
  const stats = permissionCache.getStats();
  if (stats.hits > 0 || stats.misses > 0) {
    logger.info('[PermissionCache] Stats', stats);
  }
}, 5 * 60 * 1000);

module.exports = { permissionCache };
