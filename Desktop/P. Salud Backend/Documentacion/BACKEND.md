# Backend - Organización y Convenciones

## Estructura General

```
src/
├── server.js                    # Entry point (26 líneas)
├── app.js                       # Express app factory
├── bootstrap.js                 # Lifecycle manager (init DB, start server)
├── config/
│   ├── data-source.js          # TypeORM DataSource
│   └── env.js                  # Variables de entorno centralizadas
├── entities-class/             # Entidades TypeORM (TypeScript)
│   ├── Persona.ts
│   ├── Cargo.ts
│   ├── Rol.ts
│   ├── Sigla.ts
│   ├── BajaConcurso.ts
│   ├── User.ts
│   ├── Permission.ts
│   ├── RefreshToken.ts
│   ├── AuditLog.ts
│   ├── Recorrida.ts            # 🆕 Enero 2026 - Seguimientos/recorridas
│   └── index.js                # Exporta todas las entidades
├── services/                   # Lógica de negocio
│   ├── PersonaService.js
│   ├── CargoService.js
│   ├── RolService.js
│   ├── SiglaService.js
│   ├── BajaConcursoService.js
│   ├── UserService.js
│   ├── PeriodoService.js
│   └── RecorridaService.js    # 🆕 Enero 2026 - Seguimientos/Recorridas
├── controllers/                # Manejo de HTTP
│   ├── personasController.js
│   ├── cargosController.js
│   ├── rolesController.js
│   ├── siglasController.js
│   ├── bajasConcursosController.js
│   ├── authController.js
│   ├── usersController.js
│   ├── periodosController.js
│   ├── auditController.js
│   └── recorridasController.js # 🆕 Enero 2026 - CRUD de recorridas
├── routes/                     # Definición de rutas
│   ├── index.js                # Router principal (monta todos los módulos)
│   ├── personasRoutes.js
│   ├── cargosRoutes.js
│   ├── rolesRoutes.js
│   ├── siglasRoutes.js
│   ├── bajasConcursosRoutes.js
│   ├── authRoutes.js
│   ├── usersRoutes.js
│   ├── periodosRoutes.js
│   ├── auditRoutes.js
│   ├── organigramaRoutes.js
│   ├── recorridasRoutes.js    # 🆕 Enero 2026 - Rutas de recorridas
│   └── adminRoutes.js         # 🆕 Enero 2026 - Rutas administrativas (cache management)
├── schemas/                    # Validación Zod
│   ├── personaSchema.js
│   ├── cargoSchema.js
│   ├── rolSchema.js
│   └── userSchema.js
├── middlewares/                # Middlewares reutilizables
│   ├── auth.js                 # JWT authentication & authorization
│   ├── audit.js                # Auditoría automática
│   ├── validators.js           # Validación genérica
│   ├── validateBody.js         # Middleware de Zod
│   └── rateLimiters.js         # Rate limiting por tipo de endpoint
├── utils/                      # Utilidades transversales
│   ├── logger.js               # Winston logger
│   ├── jwtHelpers.js           # Generación/validación JWT
│   ├── csv.js                  # Exportación CSV
│   ├── pagination.js           # Paginación estándar
│   ├── rls.js                  # Row-Level Security helpers
│   ├── passwordHelpers.js      # 🆕 Centralización bcrypt (hashPassword, comparePassword)
│   └── envValidator.js         # Validación de variables de entorno
├── admin/                      # AdminJS modularizado
│   ├── index.js                # Orquestador principal
│   ├── config.js               # Opciones de AdminJS
│   ├── auth.js                 # Login/logout
│   ├── middleware.js           # Sesión y permisos
│   ├── dashboard.js            # Dashboard con métricas
│   ├── pages.js                # Páginas personalizadas
│   ├── resources.js            # Recursos CRUD (+ fix de serialización)
│   ├── exports.js              # Exportación CSV desde AdminJS
│   ├── seguridad-api.js        # API de seguridad (tokens, audit)
│   └── record-serialization-fix.js  # 🆕 Previene [object Object] en URLs de AdminJS
├── hospitals/                  # Módulo hospitales (hospital piloto HGACA)
│   ├── common/
│   │   └── params.js           # Parser HTTP params reutilizable
│   ├── pages.js                # Dispatcher de hospitales
│   ├── handlers/
│   │   └── hgaca.js            # Router Express HGACA
│   └── hgaca/
│       ├── dotacion-total.js   # (Legacy) Query dotación
│       ├── filters-dotacion-total.js  # (Legacy) Config filtros
│       └── pages/
│           ├── organizacion-tabla.jsx  # Frontend React
│           └── organizacion-tabla-nueva.js  # Handler principal
└── migrations/                 # Migraciones TypeORM
    ├── 20260102-PerformanceIndexesComplete.ts
    └── ...
```

---

## Capas y Responsabilidades

### 1. Entry Point (server.js)
**Qué hace:**
- Configura `ts-node` y `reflect-metadata` (para decoradores TypeScript)
- Maneja errores no capturados (`unhandledRejection`, `uncaughtException`)
- Invoca `bootstrap()`

**Qué NO hace:**
- No configura Express (eso es en `app.js`)
- No inicializa BD (eso es en `bootstrap.js`)
- No monta rutas (eso es en `app.js`)

**Líneas:** 26 (antes era 561 líneas monolíticas)

---

### 2. Bootstrap (bootstrap.js)
**Qué hace:**
- Inicializa TypeORM con entidades centralizadas
- Crea app vía `createApp()` factory
- Monta AdminJS si `ADMIN_ENABLED=true`
- Inicia servidor HTTP en puerto configurado
- Configura graceful shutdown

**Flujo:**
```javascript
bootstrap()
├─ Registrar entidades (TypeScript + JavaScript)
├─ AppDataSource.initialize()
├─ createApp() → Express app
├─ setupAdmin(app) [condicional]
└─ app.listen(PORT)
```

---

### 3. App Factory (app.js)
**Qué hace:**
- Configura middleware global (Helmet, compresión, logging)
- Sirve assets estáticos (`/admin-static`)
- Expone health check (`/health`)
- Monta rutas API (`/api`)
- Configura error handlers (404, 500)

**Qué NO hace:**
- No arranca servidor (eso es en `bootstrap.js`)
- No inicializa BD (eso es en `bootstrap.js`)
- No es singleton (es factory, puede crear múltiples apps para testing)

**Por qué es factory:** Permite crear instancias separadas en tests sin side effects globales.

---

### 4. Controllers
**Responsabilidad:** Manejar HTTP (request/response), no lógica de negocio.

**Patrón estándar:**
```javascript
const service = new PersonaService(AppDataSource.getRepository(Persona));

async function list(req, res) {
  try {
    // 1. Parsear y validar query params
    const { limit, offset } = getPagination(req.query);
    const order = getOrder(req.query, ['id_persona', 'nombre_apellido']);
    const where = buildWhere(req.query);
    
    // 2. Llamar al service (sin lógica de negocio aquí)
    const result = await service.list({ where, order, skip: offset, take: limit });
    
    // 3. Formatear respuesta HTTP
    res.json({ 
      data: result.rows, 
      meta: { count: result.count, limit, offset } 
    });
  } catch (err) {
    // 4. Manejo de errores HTTP
    res.status(500).json({ error: 'Error al obtener personas', details: err.message });
  }
}
```

**Qué hace:**
- ✅ Parsea `req.query`, `req.params`, `req.body`
- ✅ Valida límites (max 200 registros por página)
- ✅ Invoca service con opciones validadas
- ✅ Formatea respuesta JSON con estructura estándar
- ✅ Retorna status codes apropiados (200, 400, 404, 500)

**Qué NO hace:**
- ❌ No accede directamente a `AppDataSource` (usa services)
- ❌ No ejecuta queries SQL (eso es en services/repositories)
- ❌ No valida lógica de negocio (eso es en services)

---

### 5. Services
**Responsabilidad:** Lógica de negocio pura, sin conocimiento de HTTP.

**Patrón estándar:**
```javascript
class PersonaService {
  constructor(personaRepository) {
    this.personaRepository = personaRepository;
  }
  
  async list({ where, order, skip, take }) {
    // Lógica de negocio (ej: aplicar RLS)
    if (req.user?.role === 'director') {
      where.sigla = req.user.hospital_code;
    }
    
    const [rows, count] = await this.personaRepository.findAndCount({
      where, order, skip, take
    });
    
    return { rows, count };
  }
  
  async getById(id, periodo) {
    const persona = await this.personaRepository.findOne({
      where: { id_persona: id, periodo }
    });
    if (!persona) throw new Error('Persona no encontrada');
    return persona;
  }
}
```

**Qué hace:**
- ✅ Recibe datos validados desde controllers
- ✅ Aplica reglas de negocio (RLS, validaciones, transformaciones)
- ✅ Orquesta múltiples operaciones si es necesario
- ✅ Interactúa con repositorios (TypeORM)
- ✅ Retorna datos o lanza excepciones de negocio

**Qué NO hace:**
- ❌ No maneja `req`, `res` (no conoce HTTP)
- ❌ No retorna status codes (retorna datos o lanza Error)
- ❌ No accede a `AppDataSource` directamente (recibe repo inyectado)

**Por qué inyección de dependencias:**
- Testeable: podemos mockear repositorios
- Flexible: cambiar ORM no requiere modificar services
- Limpio: service solo conoce la interfaz del repositorio

---

### 6. Routes
**Responsabilidad:** Mapear URLs a controllers y aplicar middlewares específicos.

**Patrón estándar:**
```javascript
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validateBody');
const { personaSchema } = require('../schemas/personaSchema');
const controller = require('../controllers/personasController');

// Rutas públicas (sin auth)
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Rutas protegidas
router.get('/', authenticateJWT, controller.list);
router.get('/:id', authenticateJWT, controller.getById);
router.post('/', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor'),
  validateBody(personaSchema),
  controller.create
);

module.exports = router;
```

**Convenciones:**
- Rutas van de menos a más restrictivas
- Middlewares se aplican en orden: auth → authorization → validation → controller
- Rutas relacionadas se agrupan en un archivo

---

### 7. Middlewares

#### auth.js
```javascript
// Valida JWT y carga usuario en req.user
authenticateJWT(req, res, next)

// Valida que usuario tenga uno de los roles permitidos
authorizeRoles('admin', 'editor')(req, res, next)

// Valida permisos específicos desde tabla permissions
requirePermission('can_create')(req, res, next)
```

#### audit.js
```javascript
// Captura todas las peticiones API y las guarda en audit_log
auditMiddleware(req, res, next)
```

#### validateBody.js
```javascript
// Valida req.body con schema Zod, retorna 400 si falla
validateBody(schema)(req, res, next)
```

#### rateLimiters.js
```javascript
// Limitadores específicos por tipo de endpoint
heavyEndpointsLimiter   // 10 req/min (exports, organigrama)
distinctQueriesLimiter  // 30 req/min (filtros DISTINCT)
apiLimiter              // 100 req/min (API general)
```

---

### 8. Schemas (Zod)
**Responsabilidad:** Validar estructura y tipos de entrada.

**Ejemplo:**
```javascript
const { z } = require('zod');

const personaSchema = z.object({
  id_persona: z.number().int().positive(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  nombre_apellido: z.string().min(1).max(255),
  cuil: z.string().regex(/^\d{11}$/),
  edad: z.number().int().min(0).max(120).optional(),
  sexo: z.enum(['M', 'F', 'O']).optional()
});

module.exports = { personaSchema };
```

**Por qué Zod:**
- Validación en runtime (TypeScript solo en compile-time)
- Mensajes de error descriptivos
- Parsing y validación en un solo paso

---

### 9. Utils

#### logger.js (Winston)
```javascript
logger.info('Mensaje informativo', { user: 'admin' });
logger.error('Error grave', { error: err.message, stack: err.stack });
```

#### jwtHelpers.js
```javascript
// Genera accessToken JWT (15 min)
generateAccessToken(user)

// Valida JWT y carga usuario desde BD
validateJWTAndLoadUser(token)
```

#### pagination.js
```javascript
// Parsea query params de paginación
getPagination(req.query) → { limit, offset }

// Parsea ordenamiento
getOrder(req.query, allowedFields) → { campo: 'ASC' }
```

#### rls.js
```javascript
// Aplica filtro de hospital si usuario es director
applyHospitalFilter(where, user)
```

---

## 8. Utilidades Transversales (13 módulos)

Las utilidades en `src/utils/` son módulos reutilizables que cortan transversalmente toda la aplicación.

### Utilidades de Seguridad

#### tokenCleanupScheduler.js
**Propósito:** Purga automática de refresh tokens expirados y revocados.

```javascript
const { startCleanupScheduler, stopCleanupScheduler } = require('./utils/tokenCleanupScheduler');

// En bootstrap.js
startCleanupScheduler(AppDataSource);  // Se ejecuta cada 4 horas

// Qué elimina:
// - Tokens con expires_at < NOW()
// - Tokens revocados con revoked_reason = 'compromised'
// - Mantiene historial de tokens rotados (replaced_by_jti) por 24h
```

**Configuración:**
- Intervalo: cada 4 horas
- Batch size: 1000 registros por query (evita locks prolongados)
- Logging: INFO/ERROR en Winston

**Impacto:** Evita crecimiento indefinido de tabla `refresh_tokens` (prevención de ataque DoS)

#### auditCleanupScheduler.js
**Propósito:** Purga automática de logs de auditoría antiguos.

```javascript
const { startAuditCleanupScheduler } = require('./utils/auditCleanupScheduler');

// En bootstrap.js
startAuditCleanupScheduler(AppDataSource);  // Se ejecuta cada 24 horas

// Qué elimina:
// - Logs con timestamp > 90 días atrás
// - Preserva último login/logout de cada usuario
```

**Configuración:**
- Intervalo: cada 24 horas
- Retención: 90 días
- Logging: INFO/ERROR en Winston

**Impacto:** Cumplimiento de GDPR/privacidad, optimización de BD

#### envValidator.js
**Propósito:** Valida variables de entorno críticas al iniciar.

```javascript
const { validateEnvironment } = require('./utils/envValidator');

// En config/env.js (se ejecuta automáticamente)
validateEnvironment();  // Lanza error si falta variable crítica

// Valida:
// - NODE_ENV está definida
// - DATABASE variables completadas
// - JWT_SECRET tiene mínimo 32 caracteres (producción)
// - SESSION_SECRET existe
```

**Consecuencia:** Evita inicios silenciosos con configuración incompleta

#### permissionCache.js
**Propósito:** Caché en memoria de permisos por rol (TTL 5 minutos).

```javascript
const { permissionCache } = require('./utils/permissionCache');

// En middleware/auth.js
const permissions = await permissionCache.get(user.role);
// Si no está cacheado, fetch BD y cache

// Métodos:
permissionCache.get(role)           // Fetch con auto-caché
permissionCache.invalidate(role)    // Fuerza reload
permissionCache.clear()             // Limpia todo caché
```

**Impacto:** -70% queries a tabla `permissions` (una consulta de ~1KB por request sin caché)

### Utilidades de Datos

#### csv.js
**Propósito:** Exportación a formato CSV con sanitización.

```javascript
const { toCsv, toCsvBase64, escapeCsvValue } = require('./utils/csv');

// Uso en controllers
const csvContent = toCsv(data, ['id', 'nombre', 'email']);
const base64 = toCsvBase64(data, columns);

res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
res.send(csvContent);
```

**Características:**
- Escaping automático de quotes, comas, saltos de línea
- Conversión a Base64 para transmisión en JSON
- Manejo de valores NULL/undefined

#### rls.js
**Propósito:** Row-Level Security helpers para filtrar datos por usuario.

```javascript
const { applyHospitalFilter, getRLSScope } = require('./utils/rls');

// En services
function list({ where, user }) {
  where = applyHospitalFilter(where, user);  // Si director → filtra por hospital_code
  return this.repository.findAndCount({ where });
}

// Métodos:
applyHospitalFilter(where, user)     // Inyecta sigla si director
getRLSScope(user)                    // Retorna { sigla: user.hospital_code } si aplica
```

**Regla:** Solo directores tienen RLS; otros ven todos los datos

#### query.js
**Propósito:** Utilidades para construcción de queries.

```javascript
const { buildWhere, getOrder } = require('./utils/query');

// Construir WHERE desde query params
const where = buildWhere(req.query, {
  allowed: ['periodo', 'sexo', 'estado_cargo'],
  exclude: ['limit', 'offset', 'order']
});

// Construir ORDER BY
const order = getOrder(req.query, ['id', 'nombre', 'created_at']);
// Valida que campos solicitados estén permitidos
```

### Utilidades de Autenticación

#### jwtHelpers.js
**Propósito:** Generación y validación de JWT.

```javascript
const { generateJWT, validateJWTAndLoadUser } = require('./utils/jwtHelpers');

// Generar accessToken (15 min)
const token = generateJWT({
  sub: user.id,
  email: user.email,
  role: user.role,
  expiresIn: '15m'
});

// Validar token y cargar usuario
try {
  const user = await validateJWTAndLoadUser(token);
  req.user = user;
} catch (err) {
  res.status(401).json({ error: 'Token inválido' });
}
```

**Características:**
- Firma con HS256 (HMAC-SHA256)
- Payload: sub, email, role, iat, exp
- Error handling: payload corruptos, expirados, firmados con otro secret

#### errorHandler.js
**Propósito:** Factory de middleware para manejo centralizado de errores.

```javascript
const { createErrorHandler } = require('./utils/errorHandler');

// En routes
router.get('/', controller.list);
router.use(createErrorHandler());  // Catch-all para errores no manejados

// Mapea errores a status codes:
// - TypeError, RangeError → 400 Bad Request
// - "Not found" → 404
// - "Unauthorized" → 401
// - Otros → 500 Internal Server Error
```

### Utilidades de Logging

#### logger.js
**Propósito:** Winston logger configurado con niveles y transports.

```javascript
const logger = require('./utils/logger');

// Niveles (de menor a mayor severidad)
logger.debug('Mensaje de debug');
logger.info('Operación normal', { user: 'admin', action: 'create' });
logger.warn('Situación anómala', { token_attempts: 5 });
logger.error('Error grave', { error: err.message, stack: err.stack });

// Output en desarrollo: consola
// Output en producción: archivo /logs/app.log
```

**Integración:**
- Middleware Morgan para requests HTTP
- Error logging en catch blocks
- Startup/shutdown messages
- Audit trail en `auditMiddleware`

### Utilidades de Frontend

#### LazyLoader.jsx
**Propósito:** React wrapper para code splitting con Suspense.

```jsx
const { LazyLoader } = require('./utils/LazyLoader');

// Crear componente lazy-loadable
const HeavyComponent = LazyLoader(() => import('./components/Heavy'));

// Uso en JSX
<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent props={...} />
</Suspense>
```

**Ventajas:**
- Reduce bundle inicial (separar chunks)
- Fallback loading automático
- Error boundary compatible

**Casos de uso:**
- Componentes pesados (organigramas, tablas grandes)
- Páginas de bajo acceso frecuente

#### text.js
**Propósito:** Utilidades de manipulación de strings.

```javascript
const { truncate, slugify, capitalize } = require('./utils/text');

truncate('Lorem ipsum dolor sit...', 20)  // 'Lorem ipsum dolor...'
slugify('Mi Título Aquí')                 // 'mi-titulo-aqui'
capitalize('hola mundo')                  // 'Hola mundo'
```

#### serviceFactory.js
**Propósito:** Factory para instanciar services con inyección de dependencias.

```javascript
const { ServiceFactory } = require('./utils/serviceFactory');

// En bootstrap
const services = ServiceFactory.createAll(AppDataSource);

// Crea automáticamente:
// - PersonaService(AppDataSource.getRepository(Persona))
// - CargoService(...)
// - RolService(...)
// - etc.

// Uso
const personas = await services.PersonaService.list({ where, skip, take });
```

**Beneficio:** Centraliza instanciación evitando duplicación en cada controller

---

## 9. Admin Panel (src/admin/)

AdminJS es un framework de UI para administración que proporciona CRUD automático para entidades. Se modulariza en 9 archivos para mantener claridad.

### Estructura de Admin Panel

```
src/admin/
├── index.js              # Orquestador principal (setupAdmin)
├── config.js             # Opciones de AdminJS (themes, locale, branding)
├── auth.js               # Login/logout con rate limiting
├── middleware.js         # Session, redirect, permissions middleware
├── dashboard.js          # Dashboard personalizado con métricas
├── pages.js              # Dispatcher de páginas custom (/admin/pages/*)
├── resources.js          # Configuración CRUD de entidades
├── exports.js            # Plugin de exportación CSV
├── seguridad-api.js      # Validación CORS, headers, etc.
└── pages/                # Carpeta para páginas renderizadas
    └── (pages custom)
```

### Inicialización en Bootstrap

**Archivo: bootstrap.js**
```javascript
// 1. Inicializar BD
await AppDataSource.initialize();

// 2. Crear app Express
const app = createApp();

// 3. Si ADMIN_ENABLED=true
if (config.admin.enabled) {
  await setupAdmin(app);  // setupAdmin viene de src/admin/index.js
}

// 4. Montar app.listen()
```

**Archivo: src/admin/index.js**
```javascript
async function setupAdmin(app) {
  // 1. Require AdminJS
  const AdminJS = require('adminjs');
  const AdminJSExpress = require('@adminjs/express');
  
  // 2. Registrar adapter TypeORM
  const { Database, Resource } = require('@adminjs/typeorm');
  AdminJS.registerAdapter({ Database, Resource });
  
  // 3. Build resources (CRUD automático)
  const adminResources = buildAdminResources({ AppDataSource });
  
  // 4. Build dashboard
  const dashboardConf = buildDashboard({ AdminJS });
  
  // 5. Build opciones AdminJS
  const adminOptions = buildAdminOptions({
    AdminJS,
    adminResources,
    dashboardConf
  });
  
  // 6. Crear instancia AdminJS
  const admin = new AdminJS(adminOptions);
  
  // 7. Inicializar (bundling de componentes React)
  await admin.initialize();
  
  // 8. Montar rutas
  app.use('/admin', AdminJSExpress.buildRouter(admin));
}
```

### Resources (CRUD Automático)

**Archivo: src/admin/resources.js**

Configura qué entidades aparecen en AdminJS y con qué opciones.

```javascript
const buildAdminResources = ({ AppDataSource }) => [
  {
    resource: Persona,
    options: {
      parent: { name: 'Data', icon: 'Database' },
      properties: {
        id_persona: { isVisible: { list: false, filter: true, show: true } },
        nombre_apellido: { type: 'string' },
        cuil: { type: 'string', isTitle: true },
        edad: { type: 'number' },
        // ... más propiedades
      },
      actions: {
        new: { isAccessible: canCreate },
        edit: { isAccessible: canEdit },
        delete: { isAccessible: canDelete }
      },
      isAccessible: canViewNavigation  // ← Controla visibilidad en sidebar
    }
  },
  // ... más entidades
];
```

**Permisos por rol:**
```javascript
const canCreate = ({ currentAdmin }) => {
  return currentAdmin?.permissions?.can_create === true;
};

const canViewNavigation = ({ currentAdmin }) => {
  return currentAdmin?.role === 'admin' || currentAdmin?.role === 'editor';
};
```

### Pages (Páginas Personalizadas)

**Archivo: src/admin/pages.js**

Renderiza páginas custom fuera del CRUD automático.

```javascript
const buildAdminOptions = ({ AdminJS, adminResources, dashboardConf }) => ({
  resources: adminResources,
  
  pages: {
    // Página de personas en tabla full (no CRUD default)
    PersonasFull: {
      component: require('./pages/personas-full.jsx'),  // Componente React
      icon: 'Table',
      isAccessible: canViewTablePages
    },
    
    // Página de organigrama con árbol D3
    OrganigramaHome: {
      component: require('./pages/organigrama.jsx'),
      icon: 'Tree',
      isAccessible: canViewOrganigramas
    },
    
    // Panel exclusivo para directores
    Director: {
      component: require('./pages/director-home.jsx'),
      icon: 'User',
      isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'director'
    },
    
    // Recorridas (nuevo enero 2026)
    RecorridasHospitales: {
      component: require('./pages/recorridas-hospitales.jsx'),
      icon: 'FileText',
      isAccessible: canViewRecorridas
    },
    // ... más páginas
  }
});
```

**Cómo agregar página nueva:**

1. Crear componente React en `src/components/` (ej: MiPagina.jsx)
2. En `src/admin/pages.js`, agregar entrada en `pages`:
```javascript
MiPagina: {
  component: require('../components/mi-pagina.jsx'),
  icon: 'SomeIcon',
  isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin'
}
```
3. Componente tendrá acceso a `currentAdmin`, `AppDataSource`, `match` props

### Dashboard

**Archivo: src/admin/dashboard.js**

Dashboard de inicio con KPIs y estadísticas.

```javascript
const buildDashboard = ({ AdminJS }) => ({
  handler: async (req, res) => {
    // Fetch métricas
    const totalUsers = await getUserCount();
    const recentLogins = await getRecentLogins(10);
    const tokenStats = await getRefreshTokenStats();
    
    // Renderizar dashboard personalizado
    res.json({
      totalUsers,
      recentLogins,
      tokenStats,
      // ...
    });
  },
  component: require('../components/dashboard.jsx')  // React component
});
```

### Auth AdminJS

**Archivo: src/admin/auth.js**

Login/logout específico para AdminJS (usa sesiones).

```javascript
router.post('/login', rateLimiters.loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Validar credenciales
  const user = await UserService.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  // 2. Crear sesión
  req.session.adminUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    hospital_code: user.hospital_code
  };
  
  // 3. Auditar
  await auditLog('login_success', user.id, req);
  
  // 4. Redirigir según rol
  const redirectUrl = user.role === 'director'
    ? '/admin/pages/Director'
    : '/admin';
  
  res.json({ redirect: redirectUrl });
});
```

### Middleware AdminJS

**Archivo: src/admin/middleware.js**

Valida sesión y permisos en cada request a /admin.

```javascript
// 1. Restaurar sesión
app.use(sessionMiddleware);

// 2. Validar que está logueado
app.use('/admin', (req, res, next) => {
  if (!req.session.adminUser) {
    return res.redirect('/admin/login');
  }
  req.currentAdmin = req.session.adminUser;
  next();
});

// 3. Cargar permisos desde BD
app.use('/admin', async (req, res, next) => {
  const permissions = await permissionCache.get(req.currentAdmin.role);
  req.currentAdmin.permissions = permissions;
  next();
});

// 4. Redirigir directores a su panel
app.use('/admin', (req, res, next) => {
  if (req.currentAdmin.role === 'director' && req.path === '/admin') {
    return res.redirect('/admin/pages/Director');
  }
  next();
});
```

---

## 10. Migraciones TypeORM

Las migraciones versionan cambios en la BD de forma reproducible y reversible.

### Estructura de Migración

**Archivo: src/migrations/20260107-AddRevokedAtToRefreshTokens.ts**

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRevokedAtToRefreshTokens1704633600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Qué hace: Agregar columna
    await queryRunner.addColumn(
      "refresh_tokens",
      new TableColumn({
        name: "revoked_at",
        type: "datetime",
        isNullable: true,
        comment: "Timestamp cuando el token fue revocado"
      })
    );
    
    // Agregar índice
    await queryRunner.createIndex(
      "refresh_tokens",
      {
        name: "IDX_refresh_tokens_revoked_at",
        columnNames: ["revoked_at"]
      }
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cómo deshacer
    await queryRunner.dropIndex("refresh_tokens", "IDX_refresh_tokens_revoked_at");
    await queryRunner.dropColumn("refresh_tokens", "revoked_at");
  }
}
```

### Cómo Crear Nueva Migración

**Paso 1:** Crear archivo en `src/migrations/`

**Naming:** `YYYYMMDDHHmmss-DescripcionCambio.ts`

Ejemplo: `20260114150000-CreateHospitalesTable.ts`

**Paso 2:** Implementar `up()` y `down()`

```typescript
export class CreateHospitalesTable1705238400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implementar cambio
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implementar reversa
  }
}
```

**Paso 3:** Ejecutar

```powershell
npm run migrate
```

### Comandos de Migraciones

```powershell
# Ver todas las migraciones (ejecutadas y pendientes)
npm run migrate:show

# Ejecutar migraciones pendientes
npm run migrate

# Revertir última migración
npm run migrate:revert

# Diagnosticar problemas
npm run migrate:diag
```

### Migraciones Realizadas (Enero 2026)

| Fecha | Migración | Cambio |
|-------|-----------|--------|
| 2025-11-04 | CreateUsersAndRefreshTokens | Tablas de autenticación |
| 2025-11-04 | InitAuditAndRefreshFamily | Índices de auditoría |
| 2025-11-04 | RefreshTokenLastUsedNoOnUpdate | Trigger de timestamp |
| 2025-11-19 | PeriodIndexesOptimization | Índices por periodo |
| 2025-11-29 | AddHospitalCodeToUsers | Hospital por usuario |
| 2025-12-23 | CreatePermissionsTable | Tabla de permisos |
| 2026-01-02 | AdditionalCriticalIndexes | 8 índices críticos |
| 2026-01-02 | PerformanceIndexesComplete | Consolidación de índices |
| 2026-01-06 | CreateRecorridasTable | Tabla de recorridas |
| 2026-01-07 | AddRevokedAtToRefreshTokens | Timestamp de revocación |

### Troubleshooting Migraciones

**Problema:** Migration se quedó a mitad

**Solución:**
```powershell
npm run migrate:diag
# Ver qué está roto, arreglarlo manualmente si es necesario
```

**Problema:** No se ejecutan migraciones nuevas

**Solución:**
1. Verificar archivos en `src/migrations/`
2. Verificar names en `AppDataSource`
3. Ejecutar: `npm run migrate:show`

---

## Convenciones de Código

### Naming
- **Archivos:** camelCase (personasController.js)
- **Clases:** PascalCase (PersonaService)
- **Funciones:** camelCase (getUserById)
- **Constantes:** UPPER_SNAKE_CASE (MAX_EXPORT_BATCH)
- **Variables:** camelCase (userData)

### Estructura de Funciones
```javascript
// 1. JSDoc explicativo
/**
 * Lista personas con filtros y paginación
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function list(req, res) {
  try {
    // 2. Validar entrada
    const { limit, offset } = getPagination(req.query);
    
    // 3. Lógica principal
    const result = await service.list({ limit, offset });
    
    // 4. Respuesta exitosa
    res.json({ data: result.rows, meta: { count: result.count } });
  } catch (err) {
    // 5. Manejo de errores
    logger.error('Error listando personas', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}
```

### Manejo de Errores
- **Controllers:** Capturar excepciones y retornar status HTTP apropiado
- **Services:** Lanzar `Error` con mensaje descriptivo
- **Async/Await:** Siempre usar try-catch en funciones async

### Testing
- **Unit tests (services):** Mockear repositorios con Jest
- **Integration tests (controllers):** Usar Supertest con BD en memoria (SQLite)
- Archivos de test: `tests/<modulo>.test.js`

---

## Abstractions Existentes

### 1. Capa de Servicios
**Por qué existe:** Separar lógica de negocio de HTTP.

**Migración completa:**
- ✅ PersonaService
- ✅ CargoService
- ✅ RolService
- ✅ SiglaService
- ✅ BajaConcursoService
- ✅ UserService

**Estado:** Refactorización completada en Diciembre 2025.

#### 🆕 Centralización de Manejo de Passwords (Enero 2026)
**Ubicación:** `src/utils/passwordHelpers.js`

**Problema que resuelve:**
- Bcryptjs estaba importado y usado directamente en 4 archivos (UserService, AuthService, admin/auth.js, admin/seguridad-api.js)
- Cambiar algoritmo de contraseñas requería editar 4 archivos

**Solución:**
```javascript
// src/utils/passwordHelpers.js
export async function hashPassword(plainPassword)
// Genera hash bcrypt con costo 10

export async function comparePassword(plainPassword, hash)
// Verifica si plainPassword coincide con hash

export const PASSWORD_SALT_ROUNDS = 10
```

**Refactorizado en:**
- ✅ UserService.js - Reemplazó 3 llamadas a bcrypt.hashSync
- ✅ AuthService.js - Reemplazó 2 llamadas a bcrypt.compareSync
- ✅ admin/auth.js - Reemplazó bcrypt.compareSync
- ✅ admin/seguridad-api.js - Reemplazó 2 llamadas a bcrypt.hashSync

**Antes:**
```javascript
// ❌ Repetido en 4 archivos
const bcrypt = require('bcryptjs')
const hash = bcrypt.hashSync(password, 10)
const isValid = bcrypt.compareSync(password, hash)
```

**Después:**
```javascript
// ✅ Centralizado
const { hashPassword, comparePassword } = require('../utils/passwordHelpers')
const hash = await hashPassword(password)
const isValid = await comparePassword(password, hash)
```

**Beneficio:**
- Cambiar a Argon2: editar 1 archivo
- Cambiar costo: editar 1 archivo
- Auditoría de cambios: centralizado

### 2. Inyección de Repositorios
**Por qué existe:** Testabilidad y flexibilidad para cambiar ORM.

**Patrón:**
```javascript
// En controller:
const service = new PersonaService(AppDataSource.getRepository(Persona));

// En service:
class PersonaService {
  constructor(personaRepository) { ... }
}
```

### 3. Middleware Chain Estandarizado
**Por qué existe:** Reutilizar lógica transversal sin repetición.

**Orden estándar:**
```
Request
  → Rate Limiter
    → JWT Auth
      → Role Authorization
        → Permission Check
          → Body Validation
            → Audit
              → Controller
                → Service
                  → Repository
                    → Database
```

---

## 🆕 Módulo de Recorridas (Enero 2026)

### Descripción
Nuevo módulo para documentar y rastrear recorridas, seguimientos e inspecciones operativas por hospital. Permite crear registros de texto enriquecido (HTML) con auditoría completa.

### Estructura

**Entidad:**
```typescript
// src/entities-class/Recorrida.ts
@Entity('recorridas')
@Index(['hospital_code', 'created_at'])
@Index(['user_id'])
export class Recorrida {
  id: number
  hospital_code: string        // Filtro principal
  titulo: string               // Títulos de 0-200 caracteres
  contenido_html: string       // HTML sanitizado (prevención XSS)
  user_id: number             // Auditoría (quién lo creó)
  user: User                  // Relación con User
  created_at: Date            // Timestamp de creación
  updated_at: Date            // Timestamp de última actualización
}
```

**Service:**
```javascript
// src/services/RecorridaService.js
class RecorridaService {
  async list({ hospital_code, page, limit })        // Listar con paginación
  async getOne(id)                                   // Obtener por ID
  async create(data, userId)                         // Crear + sanitizar HTML
  async update(id, data)                             // Actualizar
  async delete(id)                                   // Eliminar
  async deleteByUser(userId)                         // Cascada: eliminar de usuario
}
```

**Controller:**
```javascript
// src/controllers/recorridasController.js
async list(req, res)         // GET /api/recorridas
async getOne(req, res)       // GET /api/recorridas/:id
async create(req, res)       // POST /api/recorridas
async update(req, res)       // PUT /api/recorridas/:id
async delete(req, res)       // DELETE /api/recorridas/:id
```

**Rutas:**
```javascript
// src/routes/recorridasRoutes.js
GET    /api/recorridas                    # Listar (admin, editor, viewer)
GET    /api/recorridas/:id                # Obtener (admin, editor, viewer)
POST   /api/recorridas                    # Crear (admin, editor, viewer)
PUT    /api/recorridas/:id                # Actualizar (admin, editor, viewer)
DELETE /api/recorridas/:id                # Eliminar (admin, editor solo)
```

### Características
- ✅ Sanitización HTML contra XSS (librería `sanitize-html`)
- ✅ Índices compuestos: `(hospital_code, created_at)` para listar rápido
- ✅ Auditoría automática: captura usuario creador y timestamps
- ✅ Paginación estándar: 50 registros por página (customizable)
- ✅ Ordenamiento: por fecha de creación (DESC)
- ✅ Excluido para directores: no tienen acceso (según permisos)

### Permiso de Datos
- **Acceso:** admin, editor, viewer
- **Creación:** admin, editor, viewer (cualquiera puede crear)
- **Edición:** admin, editor, viewer (cualquiera puede editar su contenido)
- **Eliminación:** admin, editor (viewer solo consulta)
- **Excluido:** director (no tiene acceso)

### Frontend Integration
Tres componentes React nuevos en `src/components/vista_recorrida/`:
- `RecorridasHospitales.jsx` - Listado de recorridas por hospital
- `RecorridasDetalle.jsx` - Vista detallada con editor WYSIWYG
- `RecorridaModal.jsx` - Modal para crear/editar con previsualización HTML

---

## Legacy Code y Áreas Parciales

### 1. Módulo Hospitales (`hospitals/`)
**Estado:** Sistema funcional pero no replicado.

- Solo HGACA está implementado
- Contiene código legacy (dotacion-total.js) y código nuevo (organizacion-tabla-nueva.js)
- Diseñado para replicar a 32 hospitales restantes

**Qué hacer:** Al agregar hospital nuevo, duplicar estructura HGACA y ajustar rutas.

### 2. AdminJS Auth Dual
**Estado:** Funcional pero no óptimo.

- AdminJS usa express-session (cookie-based)
- API REST usa JWT
- Dos sistemas de auth conviviendo

**Qué hacer:** Eventual unificación a JWT (baja prioridad).

### 3. TypeScript Parcial
**Estado:** Solo entidades en TS, resto en JS.

- `strict: false` en tsconfig.json
- Sin type safety en controllers/services
- Funcional pero podría mejorar

**Qué hacer:** Migración incremental a TS strict (si hay tiempo).

---

## Cambios Implementados - Enero 2026

### 🔐 Seguridad

#### Migración AdminJS a JWT (Enero 14, 2026)
**Cambio:**
- Eliminado: express-session middleware global (src/app.js líneas 33-47)
- Eliminada: función `createSessionMiddleware()` muerta (src/admin/middleware.js)
- Resultado: AdminJS ahora usa JWT exclusivamente (ya estaba implementado en src/admin/auth.js)

**Archivos modificados:**
- `src/app.js` - Removidas 15 líneas de session middleware
- `src/admin/middleware.js` - Removidas 18 líneas de función muerta

**Impacto:**
- ✅ Sistema es ahora stateless completo (facilita escalado horizontal)
- ✅ Eliminada dependencia de express-session
- ✅ Unificación de autenticación JWT en API + AdminJS

#### Validaciones Estrictas en Producción (Enero 14, 2026)
**Archivo:** `src/utils/envValidator.js` (+25 líneas)

**Cambio:**
```javascript
if (isProduction) {
  // SESSION_SECURE debe ser "true" en producción (HTTPS obligatorio)
  if (process.env.SESSION_SECURE !== 'true')
    errors.push('PRODUCCIÓN: SESSION_SECURE debe ser "true"');
  
  // JWT_SECRET mínimo 32 caracteres (HS256 seguro)
  if ((process.env.JWT_SECRET || '').length < 32)
    errors.push('PRODUCCIÓN: JWT_SECRET debe tener al menos 32 caracteres');
  
  // SESSION_SECRET mínimo 32 caracteres
  if ((process.env.SESSION_SECRET || '').length < 32)
    errors.push('PRODUCCIÓN: SESSION_SECRET debe tener al menos 32 caracteres');
  
  // TRUST_PROXY advertencia (crítico para IPs en audit logs)
  if (!process.env.TRUST_PROXY)
    logger.warn('⚠️ TRUST_PROXY no configurado. IPs en audit logs pueden ser incorrectas');
}
```

**Impacto:**
- ✅ Fail-fast: Servidor RECHAZA startup con config insegura
- ✅ Previene deployment accidental con secretos débiles
- ✅ Obliga HTTPS en producción

### 📊 Operaciones

#### Monitoring en Schedulers (Enero 14, 2026)
**Archivos:** 
- `src/utils/tokenCleanupScheduler.js` (+30 líneas)
- `src/utils/auditCleanupScheduler.js` (+30 líneas)

**Cambio:**
```javascript
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

// En runCleanup():
try {
  /* cleanup logic */
  consecutiveFailures = 0; // Reset en éxito
} catch (error) {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    logger.error('[Cleanup] 🔴 CRÍTICO: Demasiados fallos consecutivos', {
      consecutiveFailures,
      threshold: MAX_CONSECUTIVE_FAILURES,
      action: 'VERIFICAR: BD disponible, permisos, espacio en disco'
    });
  }
}
```

**Impacto:**
- ✅ Detecta fallos silenciosos en limpieza automática
- ✅ Alertas críticas después de 3 fallos (BD caída, permisos, disco lleno)
- ✅ Preparado para integración con alertas (email, Slack, PagerDuty)

#### Rotación Automática de Logs (Enero 14, 2026)
**Archivo:** `src/utils/logger.js` (+40 líneas)

**Cambio:**
```javascript
// Nuevo: require winston-daily-rotate-file
require('winston-daily-rotate-file');

// En transports (producción):
transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',        // Rotar si supera 100MB
    maxFiles: '14d',        // Retener 14 días
    zippedArchive: true     // Comprimir logs antiguos
  })
);

// Archivo separado para errores
transports.push(
  new winston.transports.DailyRotateFile({
    filename: 'logs/errors-%DATE%.log',
    maxFiles: '30d',        // Errores: 30 días
    level: 'error'
  })
);
```

**Impacto:**
- ✅ Logs rotados automáticamente cada 24h
- ✅ Logs comprimidos después de rotación (ahorro de espacio)
- ✅ Disco nunca se llena (rotación configurable)
- ✅ Dependencia: npm install winston-daily-rotate-file

#### Versionado Dinámico de ETag (Enero 14, 2026)
**Archivo:** `src/app.js` (+8 líneas)

**Cambio:**
```javascript
// Leer versión de package.json
const packageJson = require('../package.json');
const bundleVersion = packageJson.version || '1.0.0';

// En middleware de caché de bundles:
res.setHeader('ETag', `W/"adminjs-bundle-v${bundleVersion}"`);
// Antes: res.setHeader('ETag', 'W/"adminjs-bundle-v1"');
```

**Impacto:**
- ✅ ETag se actualiza automáticamente con cada version bump
- ✅ Cache auto-invalidado en deployments (sin "CTRL+SHIFT+DEL")
- ✅ Usuarios siempre reciben bundles actualizados
- ✅ Previene bugs por JavaScript stale en navegador

### 📊 Resumen de Cambios

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| src/app.js | Eliminar session + ETag dinámico + headers seguridad | -15 / +12 |
| src/admin/middleware.js | Eliminar createSessionMiddleware | -18 |
| src/utils/envValidator.js | Validaciones producción | +25 |
| src/utils/tokenCleanupScheduler.js | Monitoring fallos | +30 |
| src/utils/auditCleanupScheduler.js | Monitoring fallos | +30 |
| src/utils/logger.js | Rotación de logs | +40 |
| src/middlewares/audit.js | Excluir /health de auditoría | +3 |
| package.json | Especificar npm version | +1 |
| **TOTAL** | | **+108 neto** |

---

## Cambios Fase 3 - Backlog Seguro (Enero 14, 2026)

### 🟢 Seguridad Adicional

#### Excluir /health de Auditoría (Enero 14, 2026)
**Archivo:** `src/middlewares/audit.js` (+3 líneas)

**Cambio:**
```javascript
// 🟢 FASE 3: Excluir /health de auditoría (ruido, sin valor operacional)
const path = req.originalUrl || req.url || '';
if (path.startsWith('/health') || path === '/health') {
  return next();
}
```

**Impacto:**
- ✅ Logs de auditoría más limpios (sin ruido de health checks)
- ✅ Health check no consume espacio en BD de auditoría
- ✅ Mejora performance de auditoría (menos registros)

#### Headers de Seguridad Adicionales (Enero 14, 2026)
**Archivo:** `src/app.js` (+4 líneas)

**Cambio:**
```javascript
// 🟢 FASE 3: Agregar headers de seguridad adicionales
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Remover header X-Powered-By (info leak - no exponer que es Express)
app.disable('x-powered-by');
```

**Impacto:**
- ✅ Cross-Origin Resource Policy agregada (previene embedding no autorizado)
- ✅ Header X-Powered-By removido (reduce surface de ataque)
- ✅ No expone que es Express directamente

### 📦 Configuración

#### Especificar npm Version (Enero 14, 2026)
**Archivo:** `package.json` (+1 línea)

**Cambio:**
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

**Impacto:**
- ✅ npm rechaza instalación con npm <9.0.0
- ✅ Evita problemas de compatibilidad con lockfile package-lock.json
- ✅ Garantiza workspace correctos en npm

### ✅ FIX: Prevención de [object Object] en URLs de AdminJS (Fase 4 - Enero 14, 2026)

**Problema:** AdminJS v6 serializa automáticamente objetos complejos como `[object Object]` en URLs cuando:
- Los handlers `before`/`after` reciben el objeto `record` completo
- El objeto no se simplifica a un ID primitivo antes de ser usado en URLs
- Resultado: URLs como `/admin/resources/personas/records/[object Object]`

**Solución:** Nuevo archivo `src/admin/record-serialization-fix.js` (126 líneas)

```javascript
// Intercepcia todos los handlers before/after de AdminJS
function wrapRecordIdHandler(originalHandler, actionName) {
  return async (response, request, context) => {
    // ✅ Extraer solo el ID del record complejo
    if (context?.record) {
      const recordId = extractRecordId(context.record);
      // Reemplazar object completo con primitivo
      context.record = { id: recordId };
    }
    // Llamar al handler original con record simplificado
    return await originalHandler(response, request, context);
  };
}

// Aplicar fix a TODOS los recursos
return fixAdminJSRecordSerialization(resources);
```

**Integración:**
1. **resources.js** llama `fixAdminJSRecordSerialization(resources)` al exportar
2. Todos los handlers (new, edit, delete) están envueltos automáticamente
3. Los registros se transforman de objetos completos a IDs primitivos

**Resultado:**
- ✅ URLs ahora son `/admin/resources/personas/records/123` (correcto)
- ✅ Ya NO generan `[object Object]` desde AdminJS
- ✅ Middleware defensivo en app.js aún bloquea si alguien intenta acceder así

**Debugging:**
```bash
# Si quedan registros rotos en BD, buscar por IDs null/undefined
SELECT * FROM personas WHERE id IS NULL;

# Monitorear logs para ver si el fix se activa
tail -f logs/app-*.log | grep "RecordSerializationFix"
```

---

### ✅ Nuevas Rutas Administrativas - Admin Cache Management (Fase 4 - Enero 14, 2026)

**Archivo:** `src/routes/adminRoutes.js` (55 líneas)  
**Integración:** Montado en `src/routes/index.js` en path `/admin`

**Endpoints:**

#### 1. POST `/api/admin/cache/invalidate-permissions`
**Propósito:** Invalidar caché de permisos manualmente (sin esperar TTL de 5 min)

**Autenticación:** JWT requerido + role admin  
**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Casos de Uso:**
```bash
# Invalidar caché para un role específico
curl -X POST http://localhost:3000/api/admin/cache/invalidate-permissions \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{ "role": "editor" }'
# Respuesta: { "message": "Cache invalidated for role: editor" }

# Limpiar TODO el caché (campo role omitido o vacío)
curl -X POST http://localhost:3000/api/admin/cache/invalidate-permissions \
  -H "Authorization: Bearer {admin_token}" \
  -d '{}'
# Respuesta: { "message": "All permission caches cleared" }
```

**Cuándo usar:**
- Después de actualizar permisos en BD (tabla `permissions`)
- Cuando necesitas cambios efectivos inmediatamente (no esperar 5 min)
- Admin quiere asegurar que cierto usuario vea permisos actualizados

**Auditoría:** Se registra en logs:
```
[AdminAPI] Permission cache invalidated for role {"role":"editor","user":"admin"}
```

#### 2. GET `/api/admin/cache/stats`
**Propósito:** Obtener estadísticas de uso del caché de permisos

**Autenticación:** JWT requerido + role admin  
**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Respuesta:**
```json
{
  "hits": 45,
  "misses": 12,
  "hitRate": "78.95%",
  "size": 4,
  "ttlMinutes": 5
}
```

**Explicación:**
- `hits`: Cuántas veces se sirvió desde caché (sin query a BD)
- `misses`: Cuántas veces no estaba en caché (tuvo que consultar BD)
- `hitRate`: Porcentaje de hits. Meta: >75% = caché funciona bien
- `size`: Cuántos roles distintos están actualmente en caché
- `ttlMinutes`: Tiempo de vida del caché (5 minutos)

**Caso de Uso - Monitoreo:**
```bash
curl -X GET http://localhost:3000/api/admin/cache/stats \
  -H "Authorization: Bearer {admin_token}"
```

Si `hitRate` es bajo (<50%), puede indicar:
- Muchos roles distintos accediendo (pedir caché global en lugar de por-role)
- TTL muy corto (vencimiento frecuente)
- Necesidad de pre-warming del caché

---

## 🆕 Scripts Centralizados (Enero 20, 2026)

### scripts/lib/init-db.js
**Propósito:** Centralizar boilerplate de inicialización de BD en todos los scripts

**Problema que resuelve:**
- 14 scripts duplicaban 10 líneas de ts-node, reflect-metadata, dotenv setup
- ~155 líneas de boilerplate eliminadas

**Ubicación:** `scripts/lib/init-db.js` (48 líneas)

**Exports:**
```javascript
export async function initDatabase()
// Retorna: AppDataSource (conectado a BD)
// Hace: Registra decoradores TS, carga .env, conecta a BD

export async function closeDatabase(dataSource)
// Parámetro: dataSource del initDatabase()
// Hace: Cierra conexión limpiamente
```

**Uso en Scripts:**
```javascript
// Antes (boilerplate repetido):
require('reflect-metadata')
require('dotenv').config()
const ts = require('ts-node')
ts.register({ transpileOnly: true })
const { AppDataSource } = require('../src/config/data-source')
async function main() {
  await AppDataSource.initialize()
  // ... lógica del script
  await AppDataSource.destroy()
}
main()

// Después (centralizado):
const { initDatabase, closeDatabase } = require('./lib/init-db')
async function main() {
  const db = await initDatabase()
  // ... lógica del script
  await closeDatabase(db)
}
main()
```

**Scripts Refactorizados:**
- ✅ seed-users.js (52 → 28 líneas, ahorro: 24)
- ✅ seed-permissions.js (99 → 30 líneas, ahorro: 69)
- ✅ audit-purge.js (38 → 15 líneas, ahorro: 23)
- ✅ run-migrations.js (66 → 45 líneas, ahorro: 21)
- ✅ load-concursos.js (~20 líneas de boilerplate refactorizadas)

**Scripts Eliminados (no-esenciales):**
- ❌ activate-users.js
- ❌ check-audit-logs.js
- ❌ check-recorridas.js
- ❌ diagnose-migrations.js
- ❌ diagnose-timezone.js
- ❌ list-all-recorridas.js
- ❌ register-manual-migrations.js
- ❌ test-audit-endpoint.js
- ❌ update-user-emails.js

**Scripts Mantenidos (esenciales):**
- ✅ audit-purge.js - Purga de logs antiguos
- ✅ load-concursos.js - Carga datos de concursos
- ✅ run-migrations.js - Ejecuta migraciones
- ✅ seed-permissions.js - Inicializa permisos
- ✅ seed-users.js - Crea usuarios iniciales

**Beneficio:**
- Cambios a AppDataSource/ts-node: editar 1 archivo en lugar de 5
- Menos mantenimiento de boilerplate
- Reducción de errores por inconsistencia
- Fácil escalar a más scripts sin repetición

---

## ✅ Ya Implementado (Fase 3)

**Lazy Load AdminJS:**
- ✅ Ya estaba implementado (solo se carga si ADMIN_ENABLED=true)
- ✅ No requiere cambios adicionales

---

## Qué NO Hacer Sin Discusión Previa

1. ❌ **No modificar estructura de carpetas** sin consenso
2. ❌ **No eliminar capa de servicios** (volver a controllers con AppDataSource directo)
3. ❌ **No crear nuevas abstracciones** sin justificación clara
4. ❌ **No cambiar ORM** (TypeORM está profundamente integrado)
5. ❌ **No agregar dependencias pesadas** sin analizar alternativas
6. ❌ **No hacer queries SQL raw** sin validar compatibilidad MySQL/Oracle
7. ❌ **No eliminar auditoría** de ningún endpoint crítico
8. ❌ **No cambiar formato de respuestas API** (breaking changes para frontend)
9. ❌ **No deshabilitar rate limiters** en producción
10. ❌ **No commitear secrets** (.env debe estar en .gitignore)
