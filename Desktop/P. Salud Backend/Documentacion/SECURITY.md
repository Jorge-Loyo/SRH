# Seguridad - Autenticación, Autorización y Amenazas

## Autenticación

### Sistema Unificado: JWT (Enero 2026)

El sistema ahora usa **JWT exclusivamente** tanto en API REST como en AdminJS:

```
┌─────────────────────────────────────────────┐
│  API REST: JWT + Refresh Tokens            │
│  - Stateless                                │
│  - Access token: 15 minutos                 │
│  - Refresh token: 30 días (rotativo)       │
│  - HttpOnly cookies                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  AdminJS: JWT (Migrado Enero 2026)         │
│  - Stateless (sincronizado con API)        │
│  - AccessToken: 15 minutos                  │
│  - RefreshToken: 30 días (rotativo)        │
│  - HttpOnly cookies                        │
└─────────────────────────────────────────────┘
```

**Cambio de Enero 2026:**
- ✅ AdminJS migrado de express-session a JWT
- ✅ Eliminado session middleware global innecesario
- ✅ Sistema ahora es stateless completo
- ✅ Simplifica escalado horizontal (sin state en memoria)

---

### Autenticación API REST (JWT)

#### Flujo de Login
```
POST /api/auth/login
Body: { email, password }

1. Validar formato de entrada
2. Buscar User en BD por email
3. Comparar password con bcrypt.compare(password, user.password_hash)
4. Si válido:
   a. Generar accessToken (JWT, 15 min, firmado con JWT_SECRET)
   b. Generar refreshToken (crypto.randomBytes, 30 días)
   c. Hashear refreshToken (SHA-256) y guardar en tabla refresh_tokens
   d. Auditar login_success
   e. Retornar { accessToken, refreshToken, user }
5. Si inválido:
   a. Auditar login_fail
   b. Retornar 401 Unauthorized
```

**Payload del JWT (accessToken):**
```json
{
  "sub": 123,              // user.id
  "email": "user@example.com",
  "role": "editor",
  "hospital_code": "HGACA",
  "iat": 1704153600,       // issued at
  "exp": 1704154500        // expires (15 min después)
}
```

#### Flujo de Refresh
```
POST /api/auth/refresh
Body: { refreshToken }

1. Hashear refreshToken recibido (SHA-256)
2. Buscar en tabla refresh_tokens por token_hash
3. Validar:
   - Existe
   - No está revocado
   - No está expirado
   - Pertenece a usuario activo
4. Detectar reuso (ver sección "Detección de Robo")
5. Si válido:
   a. Generar nuevo accessToken (15 min)
   b. Generar nuevo refreshToken (rotación)
   c. Revocar token viejo (reason='rotated', replaced_by_jti=nuevo)
   d. Guardar nuevo token en BD
   e. Retornar { accessToken, refreshToken }
6. Si inválido/reusado:
   a. Revocar toda la familia de tokens (reason='compromised')
   b. Retornar 401 Unauthorized
```

#### Detección de Robo de Tokens
**Problema:** Si un atacante roba un refreshToken, puede generar accessTokens indefinidamente.

**Solución:** Rotación + Detección de reuso

**Cómo funciona:**
1. Cada refresh genera un **nuevo** refreshToken y revoca el anterior
2. Cada token tiene `family_id` (UUID generado al login)
3. Si un token **ya rotado** es reusado:
   - ⚠️ Alerta: El token antiguo debería estar descartado
   - 🚨 Conclusión: Alguien tiene acceso no autorizado
   - 🔒 Acción: Revocar toda la familia de tokens (`WHERE family_id = X`)

**Ejemplo:**
```
Login → Token A (family_id=abc)
Refresh válido → Token B (A revocado, reason='rotated')
Refresh válido → Token C (B revocado, reason='rotated')
⚠️ Intento de usar Token A → DETECTADO
   → Revocar A, B, C (family_id=abc, reason='compromised')
   → Usuario debe re-autenticarse
```

#### Idle Timeout
**Problema:** Sesión abierta pero sin actividad → ventana para atacante.

**Solución:** `last_used` tracking

**Implementación:**
- Cada request actualiza `refresh_tokens.last_used`
- Middleware verifica: `Date.now() - last_used < AUTH_IDLE_MINUTES * 60 * 1000`
- Si excede timeout → 401 Unauthorized

**Configurable:** `AUTH_IDLE_MINUTES` (default: 15 minutos)

---

### Autenticación AdminJS (Session)

#### Flujo de Login
```
POST /admin/login
Body: { email, password }

1. Rate limiting: 5 intentos por 15 min
2. Validar credenciales contra tabla User
3. Si válido:
   a. Crear sesión en memoria (express-session)
   b. Guardar req.session.adminUser = { id, email, role, hospital_code }
   c. Auditar login_success
   d. Redirigir según role:
      - admin/editor → /admin
      - director → /admin/pages/Director
      - viewer → /admin
4. Si inválido:
   a. Auditar login_fail
   b. Mostrar error en formulario
```

#### Middleware de Sesión
```javascript
// Orden crítico de middlewares AdminJS:
1. express-session (crea/restaura sesión)
2. Auth routes (login/logout)
3. Redirect middleware (director → /pages/Director)
4. Protection middleware (require session si no público)
5. Permissions middleware (valida permisos desde BD)
6. AdminJS router
```

#### Diferencias con JWT
| Característica | JWT | Express Session |
|----------------|-----|-----------------|
| Storage | Cliente (token) | Servidor (memoria) |
| Stateless | ✅ Sí | ❌ No |
| Escalabilidad | ✅ Alta | ⚠️ Media (sticky sessions) |
| Complejidad | Alta (refresh, rotación) | Baja |
| Seguridad | Alta (si bien implementado) | Media |

---

## Autorización

### Modelo de Permisos: 4 Roles

| Rol | CRUD | Ver Todos | Filtrado | DDL | Auditoría | UI |
|-----|------|-----------|----------|-----|-----------|-----|
| **admin** | ✅✅✅✅ | ✅ | ❌ | ✅ | ✅ | Nav + Pages |
| **editor** | ✅✅✅✅ | ✅ | ❌ | ❌ | ❌ | Solo Nav |
| **viewer** | ✅❌❌❌ | ✅ | ❌ | ❌ | ❌ | Ninguno |
| **director** | ✅❌❌❌ | ❌ | ✅ (su hospital) | ❌ | ❌ | Ninguno |

### Tabla `permissions`
```sql
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role VARCHAR(50) UNIQUE NOT NULL,
  can_create BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_read_all BOOLEAN DEFAULT TRUE,
  filter_by_hospital BOOLEAN DEFAULT FALSE,
  can_execute_ddl BOOLEAN DEFAULT FALSE,
  can_view_audit BOOLEAN DEFAULT FALSE
);
```

**Carga en autenticación:**
```javascript
// En authController.login y authenticateJWT
const permissions = await AppDataSource
  .getRepository(Permission)
  .findOne({ where: { role: user.role } });

req.user.permissions = permissions;
```

---

### Row-Level Security (RLS)

**Qué es:** Filtrado automático de datos según usuario.

**Aplica solo a:** role `director`

**Implementación:**
```javascript
// utils/rls.js
function applyHospitalFilter(where, user) {
  if (user.role === 'director') {
    where.sigla = user.hospital_code; // Forzar hospital del director
  }
  return where;
}

// En services
async list({ where, order, skip, take }, user) {
  where = applyHospitalFilter(where, user);
  return await this.repository.findAndCount({ where, order, skip, take });
}
```

**Validación en múltiples capas:**
1. **Backend (Service):** Filtro inyectado en query
2. **Backend (Controller):** Valida que director no acceda a otros hospitales
3. **Frontend:** UI solo muestra su hospital (no puede cambiar en URL)

**Ejemplo:**
```
Director de HGACA intenta: GET /api/personas?sigla=OTRO_HOSPITAL
→ Backend ignora query param y fuerza: WHERE sigla = 'HGACA'
→ Retorna solo personas de HGACA
```

---

### Control de UI por Rol

**Decisión arquitectónica:** Separación limpia

- **Permisos CRUD:** En BD (tabla `permissions`)
- **Control de UI:** En código (lógica de `role`)

#### Navigation (Sidebar)
```javascript
// src/admin/resources.js
const canViewNavigation = ({ currentAdmin }) => {
  return currentAdmin?.role === 'admin' || currentAdmin?.role === 'editor';
};

// Aplicado a cada recurso:
{
  resource: Persona,
  options: {
    isAccessible: canViewNavigation,
    // ...
  }
}
```

#### Pages Personalizadas
```javascript
// src/admin/config.js
const canViewTablePages = ({ currentAdmin }) => {
  return currentAdmin?.role === 'admin' || currentAdmin?.role === 'editor';
};

adminOptions.pages = {
  PersonasFull: {
    isAccessible: canViewTablePages,
    // ...
  }
};
```

#### Recursos de Seguridad (Admin-only)
```javascript
const adminOnly = ({ currentAdmin }) => {
  return currentAdmin?.role === 'admin';
};

{
  resource: AuditLog,
  options: {
    isAccessible: adminOnly,
    // ...
  }
}
```

---

## Amenazas Mitigadas

### 1. ✅ Fuerza Bruta en Login
**Amenaza:** Atacante intenta miles de contraseñas.

**Mitigación:**
- Rate limiting: 5 intentos por 15 min (login)
- Rate limiting: 10 intentos por 15 min (refresh)
- Auditoría de intentos fallidos

**Limitación actual:** Rate limit por IP, no por usuario (puede bypassearse con múltiples IPs).

---

### 2. ✅ Robo de Refresh Tokens
**Amenaza:** Atacante obtiene refreshToken válido.

**Mitigación:**
- Rotación automática (token se invalida después de usar)
- Detección de reuso (revoca familia completa)
- Tokens hasheados en BD (SHA-256)
- Expiración corta de accessToken (15 min)

---

### 3. ✅ XSS (Cross-Site Scripting)
**Amenaza:** Inyección de JavaScript malicioso.

**Mitigación:**
- Helmet (headers CSP, X-XSS-Protection)
- React escapa automáticamente JSX
- HttpOnly cookies (no accesibles desde JS)

**Limitación actual:** CSP deshabilitado para AdminJS (bundle requiere inline scripts).

---

### 4. ✅ SQL Injection
**Amenaza:** Inyección de SQL en queries.

**Mitigación:**
- TypeORM usa prepared statements (parameterized queries)
- Ninguna query raw sin sanitización
- Validación Zod en entrada

---

### 5. ✅ Sesión Idle
**Amenaza:** Usuario deja sesión abierta en computadora compartida.

**Mitigación:**
- Idle timeout configurable (15 min default)
- Tracking de `last_used`

---

### 6. ✅ CSRF (Cross-Site Request Forgery)
**Amenaza:** Sitio malicioso envía request autenticado.

**Mitigación:**
- SameSite cookies
- Tokens CSRF en formularios críticos (AdminJS built-in)

---

### 7. ✅ FIXED: Malformed URLs with Serialized Objects (Enero 14, 2026)
**Amenaza:** Requests con `[object Object]` en URL pueden causar:
- Ruido en logs y debugging
- Potencial confusión en AdminJS
- Dificultad para trazar problemas

**Causa Raíz (IDENTIFICADA Y RESUELTA):**
- AdminJS v6 serializa automáticamente objetos complejos cuando los pasa como parámetros
- Los handlers `before`/`after` en AdminJS reciben el objeto `record` completo
- Si ese objeto no se simplifica a su ID primitivo, AdminJS lo convierte a `[object Object]` en URLs

**Solución Implementada (Enero 14, 2026):**

**Archivo 1: `src/admin/record-serialization-fix.js` (NEW)**
```javascript
// Intercepta y transforma records complejos en IDs primitivos
// Evita que AdminJS intente serializar objetos completos en URLs
function wrapRecordIdHandler(originalHandler, actionName) {
  return async (response, request, context) => {
    if (context?.record) {
      const recordId = extractRecordId(context.record);
      // Reemplazar object completo con solo el ID
      context.record = { id: recordId };
    }
    return await originalHandler(response, request, context);
  };
}
```

**Archivo 2: `src/admin/resources.js` (MODIFICADO)**
- Agregado: `const { fixAdminJSRecordSerialization } = require('./record-serialization-fix');`
- En el return: Se aplica `fixAdminJSRecordSerialization(resources)` a todos los recursos
- Efecto: Todos los handlers before/after de AdminJS están protegidos

**Archivo 3: `src/app.js` (YA EXISTÍA)**
```javascript
// Middleware defensivo que bloquea requests con [object Object]
if (req.path.includes('[object%20Object]') || req.path.includes('[object Object]')) {
  logger.critical('[SECURITY] [object Object] detected in URL', {...});
  return res.status(400).json({ error: 'Invalid URL - serialized objects not allowed' });
}
```

**Resultado:**
- ✅ **Prevención:** El fix en resources.js previene que se generen URLs con [object Object]
- ✅ **Detección:** El middleware en app.js detecta si alguien intenta acceder así de todas formas
- ✅ **Logging:** Ambos registran eventos críticos para debugging

**Limitación:** Esto NO afecta a requests directas del frontend. Si el frontend envía `?id=[object Object]`, el middleware lo bloqueará igualmente.

**Debugging (si aparecen casos excepcionales):**
```bash
# Ver logs de detección
tail -f logs/app-*.log | grep "object Object"

# Ver estadísticas de calls que fueron transformadas
curl -X GET http://localhost:3000/api/admin/cache/stats \
  -H "Authorization: Bearer {admin_token}"
```

---

### 8. ✅ Acceso No Autorizado a Datos
**Amenaza:** Usuario accede a datos fuera de su scope.

**Mitigación:**
- RLS para directores (filtro en query)
- Validación de permisos en múltiples capas
- Middleware de authorization (`authorizeRoles`, `requirePermission`)

---

## Amenazas NO Mitigadas (Conocidas)

### 1. ⚠️ Rate Limit Bypasseable
**Amenaza:** Atacante usa múltiples IPs para bypass.

**Estado actual:** Rate limit solo por IP.

**Mitigación futura:** Rate limit por usuario + CAPTCHA después de N intentos.

---

### 2. ⚠️ In-Memory Sessions No Persistentes
**Amenaza:** Restart del servidor invalida todas las sesiones AdminJS.

**Estado actual:** Sesiones en memoria (MemoryStore).

**Mitigación futura:** Redis session store para persistencia.

---

### 3. ⚠️ No Hay 2FA (Two-Factor Authentication)
**Amenaza:** Password comprometido = acceso total.

**Estado actual:** Solo password.

**Mitigación futura:** TOTP (Google Authenticator) o SMS.

---

### 4. ⚠️ Logs No Protegidos Contra Tampering
**Amenaza:** Atacante con acceso a BD puede modificar audit_log.

**Estado actual:** No hay firma criptográfica en logs.

**Mitigación futura:** HMAC o append-only log store.

---

### 5. ⚠️ No Hay Detección de Anomalías
**Amenaza:** Actividad sospechosa no detectada (ej: 1000 queries en 1 min).

**Estado actual:** Solo rate limiting básico.

**Mitigación futura:** ML-based anomaly detection o reglas heurísticas.

---

## Almacenamiento de Secretos

### Variables de Entorno
```bash
# .env (NUNCA commitear)
JWT_SECRET=<min 32 caracteres, aleatorio>
SESSION_SECRET=<min 32 caracteres, aleatorio>
DB_PASSWORD=<password seguro>
```

**Recomendaciones:**
- Usar generador de secrets: `openssl rand -base64 32`
- Rotar secrets cada 90 días
- Diferentes secrets para dev/prod

### Contraseñas en BD
```javascript
// Hashing con bcrypt (salt rounds: 10)
const hash = await bcrypt.hash(password, 10);

// Verificación
const isValid = await bcrypt.compare(password, user.password_hash);
```

**Nunca:**
- ❌ Almacenar passwords en claro
- ❌ Loggear passwords (ni siquiera hasheados)
- ❌ Enviar passwords por email

---

## Auditoría y Trazabilidad

### Tabla `audit_log`
**Qué se audita:**
- Todos los `POST`, `PUT`, `DELETE` en API REST (middleware)
- Login exitosos/fallidos (AdminJS + API)
- Cambios en usuarios y permisos
- Accesos a recursos sensibles (AuditLog, Users, Permissions)

**Campos clave:**
```sql
CREATE TABLE audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50),          -- create, update, delete, login, logout
  resource VARCHAR(50),         -- personas, cargos, users, etc.
  resource_id VARCHAR(255),     -- ID del registro afectado
  details JSON,                 -- { before, after, changes }
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Retención:** 90 días (purga automática con `npm run audit:purge`)

---

## Alcance Real de RLS

**Qué SÍ hace RLS:**
- ✅ Filtra queries automáticamente para directores
- ✅ Impide que director vea otros hospitales en API REST
- ✅ Impide que director vea otros hospitales en AdminJS

**Qué NO hace RLS:**
- ❌ No protege contra SQL injection (eso es TypeORM)
- ❌ No protege contra acceso directo a BD (firewall de BD necesario)
- ❌ No aplica a admin/editor (ven todos los hospitales)
- ❌ No es multi-tenant completo (es filtro, no separación física)

---

## Checklist de Seguridad para Producción

### Pre-Deploy
- [ ] `JWT_SECRET` único y seguro (min 32 chars)
- [ ] `SESSION_SECRET` único y seguro
- [ ] `SESSION_SECURE=true` (HTTPS obligatorio)
- [ ] `TRUST_PROXY=true` si detrás de proxy
- [ ] Auditar usuarios con role `admin` (solo los necesarios)
- [ ] Cambiar passwords default (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- [ ] Firewall de BD (solo localhost o IPs específicas)
- [ ] Backups automáticos de BD

### Post-Deploy
- [ ] Monitorear logs de `login_fail` (intentos de fuerza bruta)
- [ ] Monitorear tabla `refresh_tokens` con `revoked_reason='compromised'`
- [ ] Revisar `audit_log` semanalmente (acciones sospechosas)
- [ ] Rotar secrets cada 90 días
- [ ] Actualizar dependencias con vulnerabilidades (`npm audit`)

---

## Resumen Ejecutivo

**Fortalezas:**
- ✅ JWT + refresh tokens con rotación robusta
- ✅ Detección de robo de tokens
- ✅ RLS funcional para directores
- ✅ Auditoría completa
- ✅ Rate limiting en endpoints críticos
- ✅ Passwords hasheados con bcrypt

**Debilidades conocidas:**
- ⚠️ Sesiones AdminJS en memoria (no persistentes)
- ⚠️ No hay 2FA
- ⚠️ Rate limit bypasseable con múltiples IPs
- ⚠️ Logs no protegidos contra tampering

**Recomendaciones futuras:**
1. Unificar autenticación (JWT único para API + AdminJS)
2. Implementar 2FA para usuarios admin
3. Migrar sesiones a Redis
4. Agregar anomaly detection
5. Implementar signed/encrypted audit logs
