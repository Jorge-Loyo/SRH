/**
 * scripts/lib/init-db.js
 * 
 * Centraliza la inicialización de la base de datos para todos los scripts
 * Evita duplicación de ~10 líneas en cada script
 */

require('reflect-metadata');
const path = require('path');

// Configurar ts-node si está disponible
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
try {
  require('ts-node/register');
} catch (e) {
  // ts-node no disponible, pero no es crítico
}

// Cargar .env si existe
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { AppDataSource } = require('../../src/config/data-source');
const { entities } = require('../../src/entities-class');

/**
 * Inicializa la conexión a base de datos
 * @returns {Promise<AppDataSource>} DataSource inicializado y listo para usar
 * 
 * @example
 * const dataSource = await initDatabase();
 * const userRepo = dataSource.getRepository(User);
 * // ... usar dataSource
 */
async function initDatabase() {
  try {
    AppDataSource.setOptions({ entities });
    
    // Destruir conexión previa si existe
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    // Inicializar nueva conexión
    await AppDataSource.initialize();
    
    return AppDataSource;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    process.exit(1);
  }
}

/**
 * Cierra la conexión a base de datos (para cleanup al final del script)
 * @param {AppDataSource} dataSource - DataSource a cerrar
 */
async function closeDatabase(dataSource) {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

module.exports = { initDatabase, closeDatabase };
