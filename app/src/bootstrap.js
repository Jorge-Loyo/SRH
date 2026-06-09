const { config } = require('./config/env');
const { AppDataSource } = require('./config/data-source');
const { createApp } = require('./app');
const logger = require('./utils/logger');
const { startCleanupScheduler, stopCleanupScheduler } = require('./utils/tokenCleanupScheduler');
const { startAuditCleanupScheduler, stopAuditCleanupScheduler } = require('./utils/auditCleanupScheduler');

/**
 * Bootstraps the application: initializes DB, sets up app and admin panel
 * @returns {Promise<void>}
 */
async function bootstrap() {
  const PORT = config.port || 3000;

  // Registrar todas las entidades centralizadas
  const { entities } = require('./entities-class');
  AppDataSource.setOptions({ entities });

  try {
    await AppDataSource.initialize();
    logger.info('[DB] TypeORM DataSource inicializado');
  } catch (error) {
    logger.error('[DB] Error inicializando TypeORM:', { error: error.message, stack: error.stack });
    throw error;
  }

  // Create Express app
  const { toCsvBase64 } = require('./utils/csv');
  const app = createApp({ AppDataSource, toCsvBase64 });

  // Los routers de hospital se registran dentro de createApp() (antes del SPA catch-all)

  // Start token cleanup scheduler (every 4 hours)
  startCleanupScheduler(AppDataSource);

  // Start audit cleanup scheduler (every 24 hours)
  startAuditCleanupScheduler(AppDataSource);

  // Start server
  const server = app.listen(PORT, () => {
    logger.info(`[Server] Listening on http://localhost:${PORT}`);
    logger.info(`[SPA]    Frontend en http://localhost:${PORT}/`);
  });

  // Graceful shutdown handler
  const shutdown = async (signal) => {
    logger.info(`[Server] ${signal} received, closing gracefully...`);
    
    // Stop cleanup schedulers
    stopCleanupScheduler();
    stopAuditCleanupScheduler();
    
    server.close(async () => {
      logger.info('[Server] HTTP server closed');
      
      try {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          logger.info('[DB] Database connections closed');
        }
      } catch (err) {
        logger.error('[DB] Error closing database:', { error: err.message });
      }
      
      process.exit(0);
    });

    // Force close after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { bootstrap };
