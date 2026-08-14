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

  // Migración: tabla puesto_especialidades
  try {
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS puesto_especialidades (
        id_puesto      INT NOT NULL,
        id_especialidad INT UNSIGNED NOT NULL,
        PRIMARY KEY (id_puesto, id_especialidad),
        FOREIGN KEY (id_puesto)       REFERENCES puestos_cargo(id)  ON DELETE CASCADE,
        FOREIGN KEY (id_especialidad) REFERENCES especialidades(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const [{ n }] = await AppDataSource.query('SELECT COUNT(*) as n FROM puesto_especialidades');
    if (parseInt(n, 10) === 0) {
      const MAPEO = {
        'BIOLOGO':                    [79,80,81,82,83,84,85],
        'BIOQUIMICO':                 [79,80,81,82,83,84,85],
        'FARMACEUTICO':               [88],
        'FONOAUDIOLOGO':              [89],
        'KINESIOLOGO':                [90],
        'FISIOTERAPEUTA':             [90],
        'NUTRICIONISTA DIETISTA':     [91],
        'OBSTETRICA':                 [93],
        'ODONTOLOGO':                 [87,94,95,96,97],
        'PSICOLOGO':                  [98,99],
        'PSICOPEDAGOGO':              [100],
        'SOCIOLOGO':                  [102],
        'TERAPEUTA OCUPACIONAL':      [103],
        'TRABAJADOR SOCIAL':          [101,104],
        'MUSICOTERAPEUTA':            [92],
        'LIC. EN CIENCIAS EDUC.':     [86],
        'LIC. EN COMUNICACION SOCIAL':[102],
      };
      const puestos = await AppDataSource.query("SELECT id, nombre FROM puestos_cargo WHERE carrera='cph' AND es_medico=0");
      for (const p of puestos) {
        const esps = MAPEO[p.nombre];
        if (!esps || !esps.length) continue;
        for (const eid of esps) {
          await AppDataSource.query('INSERT IGNORE INTO puesto_especialidades (id_puesto, id_especialidad) VALUES (?, ?)', [p.id, eid]);
        }
      }
      logger.info('[DB] Seed puesto_especialidades completado');
    }
  } catch (err) {
    logger.error('[DB] Error en migración puesto_especialidades:', { error: err.message });
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
