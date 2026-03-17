/**
 * src/utils/tokenCleanupScheduler.js
 * Programador para limpiar tokens automáticamente
 * Se ejecuta cada 4 horas
 * 
 * Elimina TODOS los tokens (revocados y activos) más antiguos que TOKEN_RETENTION_DAYS
 * Esto invalida tokens viejos por seguridad y evita que la BD crezca indefinidamente
 */

const logger = require('./logger');
const { config } = require('../config/env');

let cleanupInterval = null;
let consecutiveFailures = 0; // 🔴 Monitoreo de fallos consecutivos
const CLEANUP_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 horas
const MAX_CONSECUTIVE_FAILURES = 3; // 🔴 Alertar después de 3 fallos consecutivos

async function runCleanup(AppDataSource) {
  try {
    if (!AppDataSource || !AppDataSource.isInitialized) {
      logger.warn('[TokenCleanup] AppDataSource not initialized, skipping cleanup');
      consecutiveFailures++;
      checkFailureThreshold();
      return;
    }

    const { RefreshToken } = require('../entities-class/RefreshToken');
    const retentionDays = parseInt(process.env.TOKEN_RETENTION_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 🔴 TRANSACCIÓN EXPLÍCITA: Evitar race conditions en modo cluster
    // Ejecutar limpieza dentro de transacción para garantizar idempotencia
    const result = await AppDataSource.transaction(async (transactionEntityManager) => {
      const repo = transactionEntityManager.getRepository(RefreshToken);
      
      // ✅ Eliminar SOLO los tokens REVOCADOS más antiguos que el cutoff date
      return await repo
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('revoked = :revoked AND created_at < :cutoffDate', { 
          revoked: true,
          cutoffDate 
        })
        .execute();
    });

    if ((result.affected || 0) > 0) {
      logger.info('[TokenCleanup] Token cleanup executed (revoked only)', {
        deleted: result.affected,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        transactional: true,
        note: 'Only revoked tokens deleted, active tokens preserved'
      });
    }
    
    // ✅ Limpieza exitosa - resetear contador de fallos
    consecutiveFailures = 0;
  } catch (error) {
    consecutiveFailures++;
    logger.error('[TokenCleanup] Error during cleanup', {
      error: error.message,
      stack: error.stack,
      consecutiveFailures
    });
    checkFailureThreshold();
  }
}

/**
 * 🔴 MONITOREO: Alertar si hay demasiados fallos consecutivos
 * Indica problemas críticos (BD caída, permisos, disk full, etc.)
 */
function checkFailureThreshold() {
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    logger.error('[TokenCleanup] 🔴 CRÍTICO: Demasiados fallos consecutivos en cleanup', {
      consecutiveFailures,
      threshold: MAX_CONSECUTIVE_FAILURES,
      action: 'VERIFICAR: BD disponible, permisos, espacio en disco'
    });
    // TODO: Integrar con sistema de alertas (email, Slack, PagerDuty, etc.)
  }
}

function startCleanupScheduler(AppDataSource) {
  if (cleanupInterval) {
    logger.warn('[TokenCleanup] Scheduler already running');
    return;
  }

  const retentionDays = parseInt(process.env.TOKEN_RETENTION_DAYS || '30', 10);
  logger.info('[TokenCleanup] Starting cleanup scheduler', {
    interval: '4 hours',
    retentionDays,
    note: 'Eliminates both revoked and active tokens older than retention days'
  });

  // Ejecutar limpieza inmediatamente al iniciar (después de 30 segundos de retraso)
  setTimeout(() => runCleanup(AppDataSource), 30000);

  // Ejecutar limpieza cada 4 horas
  cleanupInterval = setInterval(() => runCleanup(AppDataSource), CLEANUP_INTERVAL_MS);
}

function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[TokenCleanup] Scheduler stopped');
  }
}

module.exports = {
  startCleanupScheduler,
  stopCleanupScheduler,
  runCleanup
};
