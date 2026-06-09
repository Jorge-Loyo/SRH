const { AppDataSource } = require('../config/data-source');

function maskSecrets(obj) {
  try {
    const secretKeys = new Set(['password', 'password_hash', 'token', 'refreshToken', 'authorization']);
    if (obj && typeof obj === 'object') {
      const clone = Array.isArray(obj) ? obj.map((v) => maskSecrets(v)) : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, secretKeys.has(k) ? '***' : (typeof v === 'object' ? maskSecrets(v) : v)]));
      return clone;
    }
  } catch {}
  return obj;
}

function safeJson(value, maxLen = 4000) {
  try {
    const s = JSON.stringify(maskSecrets(value));
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  } catch {
    return null;
  }
}

function detectAuthAction(path) {
  if (!path) return null;
  if (path.endsWith('/auth/login')) return 'login';
  if (path.endsWith('/auth/refresh')) return 'refresh';
  if (path.endsWith('/auth/logout')) return 'logout';
  return null;
}

// Middleware to record API write operations and auth events
function auditMiddleware(req, res, next) {
  // ✅ Skip audit for GET/HEAD/OPTIONS (reads don't need auditing)
  const method = (req.method || '').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  
  // 🟢 FASE 3: Excluir /health de auditoría (ruido, sin valor operacional)
  const path = req.originalUrl || req.url || '';
  if (path.startsWith('/health') || path === '/health') {
    return next();
  }
  
  // Attach listener to run after response is sent
  res.on('finish', async () => {
    // ✅ MEDIO FIX: Agregar timeout explícito (5s max para audit)
    const timeout = new Promise((_, rej) => 
      setTimeout(() => rej(new Error('Audit save timeout')), 5000)
    );
    
    try {
      const path = req.originalUrl || req.url || '';
      const status = res.statusCode;
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const authAction = detectAuthAction(path);
      if (!isWrite && !authAction) return;

      // Para eventos de login, distinguir éxito vs falla por status HTTP
      let resolvedAction = authAction || (method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update');
      if (authAction === 'login') {
        resolvedAction = status >= 400 ? 'login_fail' : 'login_success';
      }

      // Lazy import to avoid circulars at startup
      const { AuditLog } = require('../entities-class/AuditLog');
      const repo = AppDataSource.getRepository(AuditLog);
      const user = req.user || null;
      const entry = repo.create({
        user_username: user?.username || user?.email || null,
        user_role: user?.role || null,
        source: authAction ? 'auth' : 'api',
        action: resolvedAction,
        resource: path.split('?')[0],
        record_id: null,
        method,
        path,
        status,
        changes: isWrite ? safeJson(req.body) : null,
        ip: (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim(),
        user_agent: req.headers['user-agent'] || null,
      });
      // Con timeout: si audit tarda >5s, continuar igual
      await Promise.race([repo.save(entry), timeout]);
    } catch (e) {
      // Never crash due to audit failure
    }
  });
  next();
}

module.exports = { auditMiddleware };
