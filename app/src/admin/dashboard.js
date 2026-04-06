const path = require('path');
const { config } = require('../config/env');
const { AppDataSource } = require('../config/data-source');
const logger = require('../utils/logger');

/**
 * Builds dashboard configuration with caching
 * @param {Object} options - Configuration options
 * @param {Object} options.AdminJS - AdminJS instance
 * @returns {Object|null} Dashboard configuration or null if disabled
 */
function buildDashboard({ AdminJS }) {
  let dashboardConf;
  try {
    const { User, AuditLog, RefreshToken } = require('../entities-class');

    dashboardConf = {
      // Home en /admin
      component: AdminJS.bundle('../components/vista_usuario/home.jsx'),
      // Director NO debe ver el dashboard (solo su página personalizada)
      // Solo admin, editor, viewer pueden ver el dashboard con métricas
      isAccessible: ({ currentAdmin }) => {
        try {
          const role = currentAdmin?.role;
          const result = role === 'admin' || role === 'editor' || role === 'viewer' || role === 'gerencia';
          return result === true;
        } catch (e) {
          return false;
        }
      },
      handler: async (_req, _res, ctx) => {
        try {
          const userRepo = AppDataSource.getRepository(User);
          const auditRepo = AppDataSource.getRepository(AuditLog);
          const rtRepo = AppDataSource.getRepository(RefreshToken);
          const now = new Date();
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const [usersCount, auditToday, activeTokens, recent] = await Promise.all([
            userRepo.count(),
            auditRepo.createQueryBuilder('a').where('a.created_at >= :start', { start }).getCount(),
            rtRepo.createQueryBuilder('r').where('r.revoked = false AND r.expires_at > :now', { now }).getCount(),
            auditRepo.createQueryBuilder('a').orderBy('a.created_at', 'DESC').limit(10).getMany(),
          ]);
          // Uptime del proceso (para mostrar en la banda superior del panel)
          const uptimeSec = Math.floor(process.uptime());
          const hours = Math.floor(uptimeSec / 3600);
          const minutes = Math.floor((uptimeSec % 3600) / 60);
          const uptimeHuman = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          // Estado de entorno y app
          const envName = process.env.NODE_ENV || 'development';
          const dbDialect = config.db.dialect;
          const dbName = config.db.name;
          let appVersion = '0.0.0';
          try {
            // Cargar versión desde package.json
            appVersion = require(path.resolve(__dirname, '..', '..', 'package.json')).version || appVersion;
          } catch {}
          const serverTime = new Date().toISOString();
          return { usersCount, auditToday, activeTokens, recent, uptimeHuman, envName, dbDialect, dbName, appVersion, serverTime };
        } catch (e) {
          return { error: e.message };
        }
      },
    };

    // Cachear la respuesta del dashboard por 5s (reduce consultas en recargas rápidas)
    const metrics = { dashboard: { cacheHits: 0, cacheMiss: 0 } };
    const withCache = (handler, ttlMs = 5000) => {
      let cached = null;
      let ts = 0;
      return async (req, res, ctx) => {
        const now = Date.now();
        if (cached && (now - ts) < ttlMs) { metrics.dashboard.cacheHits++; return cached; }
        const data = await handler(req, res, ctx);
        cached = data;
        ts = now;
        metrics.dashboard.cacheMiss++;
        return data;
      };
    };
    dashboardConf.handler = withCache(dashboardConf.handler, 5000);
  } catch (e) {
    return null;
  }

  return dashboardConf;
}

module.exports = { buildDashboard };
