// Load .env from project root before reading process.env anywhere
const path = require('path');
try { require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') }); } catch {}
// .env.local overrides .env — usar para desarrollo local sin Docker (ej: DB_HOST=localhost)
try { require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env.local'), override: true }); } catch {}

// ✅ BLOQUEANTE: Validar environment crítico
const { validateEnvironment } = require('../utils/envValidator');
validateEnvironment();

function toBool(v, def = false) {
  if (typeof v === 'string') {
    const val = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(val)) return true;
    if (['false', '0', 'no', 'n'].includes(val)) return false;
  }
  return def;
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: {
    dialect: (process.env.DB_DIALECT || 'mysql').toLowerCase(),
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || (process.env.DB_DIALECT === 'oracle' ? 1521 : 3306)),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'salud_db',
  },
  // Credenciales del admin estático (solo usadas cuando AUTH_MODE=env)
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD,
  },
  auth: {
    mode: (process.env.AUTH_MODE || 'env').toLowerCase(),
    jwtSecret: process.env.JWT_SECRET,  // ⚠️ Requerido (validado en envValidator, mínimo 32 chars)
    usersJson: process.env.USERS_JSON || '[]',
    cookies: toBool(process.env.AUTH_COOKIES, false),
    idleMinutes: Number(process.env.AUTH_IDLE_MINUTES || 30),
  },
  export: {
    maxBatch: Number(process.env.MAX_EXPORT_BATCH || 20000),
  },
  heavyQueryTimeout: Number(process.env.HEAVY_QUERY_TIMEOUT || 10000),
};

function getDbTestQuery(dialect) {
  return dialect === 'oracle' ? 'SELECT 1 FROM DUAL' : 'SELECT 1';
}

module.exports = { config, toBool, getDbTestQuery };
