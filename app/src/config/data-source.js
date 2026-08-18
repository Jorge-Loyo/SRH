const path = require('path');
// Load env from project root .env (../.. from src/config)
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), override: false });
const { DataSource } = require('typeorm');
const { config } = require('./env');

// Build DataSource options based on dialect to avoid invalid fields for in-memory drivers
const isSqljs = config.db.dialect === 'sqljs';
const dsOptions = {
  type: config.db.dialect,
  // Entities are loaded explicitly in server.js/tests to avoid glob issues on Windows
  entities: [],
  logging: false, // ✅ Silenciado: No loguear queries SQL (demasiado ruido en consola)
  migrations: [],
  migrationsTableName: 'typeorm_migrations',
};

if (isSqljs) {
  // Do not pass RDBMS connection fields; configure sql.js wasm locator for Node
  dsOptions.autoSave = false;
  dsOptions.synchronize = false;
  dsOptions.dropSchema = false;
  // Start with an empty in-memory database buffer
  dsOptions.database = new Uint8Array();
  dsOptions.sqlJsConfig = {
    locateFile: (file) => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  };
} else {
  dsOptions.host = config.db.host;
  dsOptions.port = config.db.port;
  dsOptions.username = config.db.user;
  dsOptions.password = config.db.password;
  dsOptions.database = config.db.name;
  if (config.db.ssl) {
    dsOptions.ssl = { rejectUnauthorized: false };
  }
  
  // Connection pool configurado para 50+ usuarios concurrentes y queries frecuentes de 33 hospitales
  dsOptions.extra = {
    // Pool de conexiones aumentado para soportar concurrencia
    connectionLimit: 50, // Aumentado de 25 a 50 para mejor concurrencia (50+ usuarios simultáneos)
    
    // Límite de cola para evitar cuellos de botella
    queueLimit: 100, // Limita requests en espera
    
    // Esperar por conexiones disponibles
    waitForConnections: true,
    
    // Timeouts optimizados
    connectTimeout: 10000, // 10 segundos para conectar
    
    // Tiempo antes de cerrar conexiones idle (aumentado a 10min para evitar churn)
    idleTimeout: 600000, // 10 minutos de inactividad
    
    // Habilitar keep-alive para evitar conexiones muertas
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    
    // Configuración adicional de MySQL para mejor performance
    ...(config.db.dialect === 'mysql' && {
      // Habilitar múltiples statements (útil para migraciones)
      multipleStatements: false,
      
      // 🔄 Timezone: ESTANDARIZADO A UTC (Z)
      // Antes: timezone: '-03:00' causaba desfase en comparaciones de fechas
      // Ahora: UTC interno, conversión a hora local en UI (recomendación best-practice)
      // Beneficios: 
      //   - Compatible con Oracle (migraciones más fáciles)
      //   - Estándar internacional (ISO 8601)
      //   - Mejor para logs distribuidos (múltiples zonas horarias)
      // UI: Mostrar hora local Argentina (UTC-3) en frontend donde sea necesario
      timezone: 'Z',
      
      // Character set
      charset: 'utf8mb4',
      
      // Habilitar compresión para queries grandes
      compress: true,
    })
  };
}

const AppDataSource = new DataSource(dsOptions);

module.exports = { AppDataSource };
