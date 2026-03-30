// Enable loading of TypeScript entity classes at runtime
process.env.TS_NODE_TRANSPILE_ONLY = process.env.TS_NODE_TRANSPILE_ONLY || 'true';
try { require('ts-node/register'); } catch {}
require('reflect-metadata');

const { bootstrap } = require('./bootstrap');
const logger = require('./utils/logger');

// Global error handlers for unhandled errors
process.on('unhandledRejection', (err) => {
  logger.error('[Fatal] Unhandled Promise Rejection:', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('[Fatal] Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Start application
bootstrap()
  .then(() => logger.info('[Server] Application started successfully'))
  .catch((err) => {
    logger.error('[Server] Failed to start:', { error: err.message, stack: err.stack });
    process.exit(1);
  });
