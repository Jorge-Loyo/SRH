/**
 * src/utils/auditCleanupScheduler.js
 * Programador para limpiar logs de auditoría automáticamente
 * Se ejecuta cada 24 horas
 * 
 * Elimina registros de auditoría más antiguos que AUDIT_RETENTION_DAYS
 */

const logger = require('./logger');
const { config } = require('../config/env');

let cleanupInterval = null;
let consecutiveFailures = 0; // 🔴 Monitoreo de fallos consecutivos
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_CONSECUTIVE_FAILURES = 3; // 🔴 Alertar después de 3 fallos consecutivos

async function runAuditCleanup(AppDataSource) {
  try {
    if (!AppDataSource || !AppDataSource.isInitialized) {
      logger.warn('[AuditCleanup] AppDataSource not initialized, skipping cleanup');
      consecutiveFailures++;
      checkFailureThreshold();
      return;
    }

    const { AuditLog } = require('../entities-class/AuditLog');
    const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 🔴 TRANSACCIÓN EXPLÍCITA: Evitar race conditions en modo cluster
    // Ejecutar limpieza dentro de transacción para garantizar idempotencia
    const result = await AppDataSource.transaction(async (transactionEntityManager) => {
      const repo = transactionEntityManager.getRepository(AuditLog);
      
      // Eliminar logs más antiguos que el cutoff date
      return await repo
        .createQueryBuilder()
        .delete()
        .from(AuditLog)
        .where('created_at < :cutoffDate', { cutoffDate })
        .execute();
    });

    if ((result.affected || 0) > 0) {
      logger.info('[AuditCleanup] Audit logs cleanup executed', {
        deleted: result.affected,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        transactional: true
      });
    }
    
    // ✅ Limpieza exitosa - resetear contador de fallos
    consecutiveFailures = 0;
  } catch (error) {
    consecutiveFailures++;
    logger.error('[AuditCleanup] Error during cleanup', {
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
    logger.error('[AuditCleanup] 🔴 CRÍTICO: Demasiados fallos consecutivos en cleanup', {
      consecutiveFailures,
      threshold: MAX_CONSECUTIVE_FAILURES,
      action: 'VERIFICAR: BD disponible, permisos, espacio en disco'
    });
    // TODO: Integrar con sistema de alertas (email, Slack, PagerDuty, etc.)
  }
}

function startAuditCleanupScheduler(AppDataSource) {
  if (cleanupInterval) {
    logger.warn('[AuditCleanup] Scheduler already running');
    return;
  }

  const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '30', 10);
  logger.info('[AuditCleanup] Starting cleanup scheduler', {
    interval: '24 hours',
    retentionDays
  });

  // Ejecutar limpieza inmediatamente al iniciar (después de 30 segundos de retraso)
  setTimeout(() => runAuditCleanup(AppDataSource), 30000);

  // Ejecutar limpieza cada 24 horas
  cleanupInterval = setInterval(() => runAuditCleanup(AppDataSource), CLEANUP_INTERVAL_MS);
}

function stopAuditCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[AuditCleanup] Scheduler stopped');
  }
}

module.exports = {
  startAuditCleanupScheduler,
  stopAuditCleanupScheduler,
  runAuditCleanup
};
