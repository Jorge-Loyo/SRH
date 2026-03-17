# Guía de Contribución

**Versión:** 2.0 (Enero 2026)  
**Último update:** Auditoría de consistencia arquitectónica

## Filosofía del Proyecto

Este sistema prioriza:
1. **Mantenibilidad** sobre cleverness
2. **Simplicidad** sobre abstracción prematura
3. **Documentación** sobre código auto-explicativo (porque no siempre lo es)
4. **Convenciones** sobre configuración
5. **Progreso incremental** sobre perfección paralizante

---

## 🏗️ Arquitectura (Resumen)

### Separación de Responsabilidades

```
Controllers (HTTP)  → Parseo, validación, status codes
    ↓
Services (Logic)    → Business logic, transformaciones, sanitización
    ↓
Repositories (Data) → Queries, persistencia (TypeORM)
```

**Regla de oro:** Código nunca cruza dos capas sin pasar por una interfaz clara.

### Inyección de Dependencias

✅ **CORRECTO:**
```javascript
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
}
// En controller:
const service = ServiceFactory.getService(UserService, User);
```

❌ **INCORRECTO:**
```javascript
class UserService {
  list() {
    const repo = AppDataSource.getRepository(User);  // ❌ Acoplamiento
  }
}
```

---

## Convenciones de Código

### Estilo General
- **Indentación:** 2 espacios (no tabs)
- **Comillas:** Simples `'string'` (no dobles, excepto JSON)
- **Punto y coma:** Obligatorio al final de statements
- **Largo de línea:** Máximo 120 caracteres (soft limit, no bloqueante)

### Naming Conventions

#### JavaScript/TypeScript
```javascript
// Variables y funciones: camelCase
const userName = 'John';
function getUserById(id) { }

// Clases y constructores: PascalCase
class PersonaService { }
class UserController { }

// Constantes: UPPER_SNAKE_CASE
const MAX_EXPORT_BATCH = 20000;
const JWT_SECRET = process.env.JWT_SECRET;

// Archivos: camelCase o kebab-case según contexto
personasController.js      // Módulos backend
periodo-selector.jsx        // Componentes React
PersonaService.js           // Clases exportadas
```

#### Entidades TypeORM
```typescript
// Archivos: PascalCase
Persona.ts
RefreshToken.ts

// Clases: PascalCase (match nombre de archivo)
@Entity('personas')
export class Persona { }
```

### Estructura de Funciones

#### Controllers
```javascript
/**
 * Lista personas con filtros y paginación
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function list(req, res) {
  try {
    // 1. Parsear y validar entrada
    const { limit, offset } = getPagination(req.query);
    
    // 2. Llamar service (sin lógica de negocio aquí)
    const result = await service.list({ limit, offset });
    
    // 3. Formatear respuesta
    res.json({ data: result.rows, meta: { count: result.count } });
  } catch (err) {
    // 4. Manejo de errores
    logger.error('Error listando personas', { error: err.message });
    res.status(500).json({ error: 'Error interno' });
  }
}
```

#### Services
```javascript
/**
 * Lista personas con filtros
 * @param {Object} options - Opciones de consulta
 * @param {Object} options.where - Condiciones WHERE de TypeORM
 * @param {number} options.skip - Offset para paginación
 * @param {number} options.take - Límite de resultados
 * @returns {Promise<{ rows: Persona[], count: number }>}
 */
async list({ where = {}, order = {}, skip = 0, take = 50 }) {
  const [rows, count] = await this.repository.findAndCount({
    where, order, skip, take
  });
  return { rows, count };
}
```

### Comentarios

**Cuándo comentar:**
- ✅ Por qué existe el código (no qué hace)
- ✅ Decisiones no obvias
- ✅ Workarounds temporales (con ticket de seguimiento)
- ✅ Lógica de negocio compleja

**Cuándo NO comentar:**
- ❌ Código obvio (`// Suma 1 a counter`)
- ❌ Parafrasear código (`// Loop through users`)
- ❌ Código comentado (eliminarlo, Git lo guarda)

**Ejemplos:**

```javascript
// ✅ BIEN: Explica POR QUÉ
// Usamos SHA-256 porque bcrypt es muy lento para tokens de alta frecuencia
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// ❌ MAL: Repite lo obvio
// Crea un hash del token
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// ✅ BIEN: Documenta decisión no obvia
// AdminJS requiere CSP deshabilitado para bundle inline scripts
app.use(helmet({ contentSecurityPolicy: false }));

// ✅ BIEN: Workaround temporal
// FIXME(#123): Reemplazar con caché distribuido cuando implementemos cluster
const cache = new NodeCache({ stdTTL: 300 });
```

---

## Workflow de Desarrollo

### 1. Crear Rama
```powershell
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/bug-a-resolver
```

**Convención de ramas:**
- `feature/*` - Nueva funcionalidad
- `fix/*` - Bug fix
- `refactor/*` - Refactoring sin cambio de funcionalidad
- `docs/*` - Solo documentación

### 2. Desarrollar
- Commits pequeños y frecuentes
- Un cambio lógico por commit
- Ejecutar tests antes de commitear

### 3. Commit Message
```
<tipo>: <descripción corta>

<descripción extendida opcional>

<referencias opcionales>
```

**Tipos:**
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `refactor:` - Refactoring sin cambio de comportamiento
- `perf:` - Mejora de performance
- `docs:` - Solo documentación
- `test:` - Agregar o modificar tests
- `chore:` - Cambios de build, configs, etc.

**Ejemplos:**
```
feat: agregar filtro por rango de edad en personas

Permite filtrar personas por edad mínima y máxima.
Backend valida rango [0-120], frontend muestra slider.

Relacionado: #45

---

fix: corregir race condition en refresh token

Si dos requests concurrentes usan mismo refresh token,
ambos podían obtener nuevos tokens (violando rotación).

Solución: UPDATE con WHERE token_hash + revoked = false.

Fixes: #78
```

### 4. Tests
```powershell
# Ejecutar todos los tests
npm test

# Ejecutar test específico
npm test -- personas.test.js

# Watch mode (desarrollo)
npm run test:watch
```

**Regla:** Todo endpoint nuevo debe tener tests (mínimo happy path + 1 error case).

### 5. Code Review (si aplica)
- Crear Pull Request con descripción clara
- Incluir screenshots si hay cambios UI
- Mencionar breaking changes si aplica

---

## Criterios para Agregar Features

### Checklist Antes de Implementar

- [ ] **¿Es necesaria?** ¿Resuelve problema real de usuarios?
- [ ] **¿Es simple?** ¿Puede implementarse sin abstracciones complejas?
- [ ] **¿Es mantenible?** ¿Equipo puede mantenerla en 6 meses?
- [ ] **¿Es testeable?** ¿Puede escribirse test sin mockear medio sistema?
- [ ] **¿Es escalable?** ¿Funciona con 10x de datos?

Si alguna respuesta es "no", reconsiderar diseño.

### Red Flags (🚩)

Estas señales indican que algo debe revisarse:

🚩 **Abstracción sin 3+ usos reales**
- No crear abstracción hasta que código se repita 3 veces
- YAGNI (You Aren't Gonna Need It)

🚩 **Dependencia >10MB**
- Considerar alternativas más ligeras
- Ejemplo: Evitar Lodash si solo usas 2 funciones

🚩 **Query N+1**
- Detectar loops con queries adentro
- Usar `findWithRelations` o JOINs

🚩 **Endpoint sin paginación**
- Todo listado debe paginar (default: 50, max: 200)

🚩 **Endpoint sin rate limiting**
- Endpoints costosos necesitan limiter dedicado

🚩 **Secrets en código**
- Passwords, tokens → siempre `.env`

---

## Patrones a Seguir

### 1. Controllers Solo HTTP
```javascript
// ✅ BIEN: Controller delega lógica
async function create(req, res) {
  const service = new PersonaService(repo);
  const persona = await service.create(req.body);
  res.status(201).json({ data: persona });
}

// ❌ MAL: Lógica de negocio en controller
async function create(req, res) {
  const repo = AppDataSource.getRepository(Persona);
  if (req.user.role === 'director' && req.body.sigla !== req.user.hospital_code) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const persona = repo.create(req.body);
  await repo.save(persona);
  res.status(201).json({ data: persona });
}
```

### 2. Services Inyección de Dependencias
```javascript
// ✅ BIEN: Repository inyectado
class PersonaService {
  constructor(personaRepository) {
    this.personaRepository = personaRepository;
  }
}

// ❌ MAL: Acceso directo a AppDataSource
class PersonaService {
  async list() {
    const repo = AppDataSource.getRepository(Persona);
    // ...
  }
}
```

### 3. Validación Zod en Entrada
```javascript
// ✅ BIEN: Validar antes de service
router.post('/', 
  validateBody(personaSchema),
  controller.create
);

// ❌ MAL: Service valida y retorna HTTP
async create(data) {
  if (!data.cuil || data.cuil.length !== 11) {
    throw new HttpError(400, 'CUIL inválido');
  }
  // ...
}
```

### 4. Errores HTTP en Controllers
```javascript
// ✅ BIEN: Controller maneja HTTP
try {
  const persona = await service.getById(id);
  res.json({ data: persona });
} catch (err) {
  if (err.message === 'Not found') {
    return res.status(404).json({ error: 'Persona no encontrada' });
  }
  res.status(500).json({ error: 'Error interno' });
}

// ❌ MAL: Service lanza status HTTP
async getById(id) {
  const persona = await this.repo.findOne({ where: { id } });
  if (!persona) throw new HttpError(404, 'Not found');
  return persona;
}
```

---

## Qué NO Hacer Sin Discusión

### Cambios Estructurales
1. ❌ **No cambiar estructura de carpetas** sin consenso de equipo
2. ❌ **No eliminar capa de servicios** (volver a controllers con DB directo)
3. ❌ **No cambiar ORM** (TypeORM está profundamente integrado)
4. ❌ **No migrar a ESM** sin plan completo (40+ horas, breaking changes)

### Cambios de Librerías
5. ❌ **No reemplazar AdminJS** sin POC completo
6. ❌ **No cambiar bcrypt por otra lib** (cambio requiere re-hash de passwords)
7. ❌ **No cambiar JWT lib** (cambio requiere re-generar todos los tokens)

### Cambios de Seguridad
8. ❌ **No deshabilitar rate limiters** en producción
9. ❌ **No eliminar auditoría** de endpoints críticos
10. ❌ **No cambiar lógica de permisos** sin actualizar documentación

### Cambios de API
11. ❌ **No cambiar formato de responses** (breaking change para frontend)
12. ❌ **No cambiar estructura de tablas** sin migration
13. ❌ **No hacer queries SQL raw** sin validar compatibilidad MySQL/Oracle

---

## Agregar Nuevo Módulo (Ejemplo: Licencias)

### 1. Backend

#### Entidad TypeORM
```typescript
// src/entities-class/Licencia.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Persona } from './Persona';

@Entity('licencias')
export class Licencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_persona: number;

  @Column()
  tipo: string;

  @Column()
  fecha_inicio: Date;

  @Column()
  fecha_fin: Date;

  @ManyToOne(() => Persona)
  persona: Persona;
}

// No olvidar exportar en entities-class/index.js
```

#### Service
```javascript
// src/services/LicenciaService.js
class LicenciaService {
  constructor(licenciaRepository) {
    this.licenciaRepository = licenciaRepository;
  }

  async list({ where, order, skip, take }) {
    const [rows, count] = await this.licenciaRepository.findAndCount({
      where, order, skip, take
    });
    return { rows, count };
  }

  async getById(id) {
    return await this.licenciaRepository.findOne({ where: { id } });
  }

  async create(data) {
    const licencia = this.licenciaRepository.create(data);
    return await this.licenciaRepository.save(licencia);
  }

  async update(id, data) {
    await this.licenciaRepository.update(id, data);
    return await this.getById(id);
  }

  async delete(id) {
    const result = await this.licenciaRepository.delete(id);
    return result.affected > 0;
  }
}

module.exports = { LicenciaService };
```

#### Controller
```javascript
// src/controllers/licenciasController.js
const { AppDataSource } = require('../config/data-source');
const { Licencia } = require('../entities-class');
const { LicenciaService } = require('../services/LicenciaService');
const { getPagination, getOrder } = require('../utils/pagination');

const service = new LicenciaService(AppDataSource.getRepository(Licencia));

async function list(req, res) {
  try {
    const { limit, offset } = getPagination(req.query);
    const order = getOrder(req.query, ['id', 'fecha_inicio']);
    const where = {}; // Construir filtros desde req.query
    
    const result = await service.list({ where, order, skip: offset, take: limit });
    res.json({ data: result.rows, meta: { count: result.count, limit, offset } });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener licencias', details: err.message });
  }
}

// Implementar getById, create, update, remove...

module.exports = { list, /* ... */ };
```

#### Schema Zod
```javascript
// src/schemas/licenciaSchema.js
const { z } = require('zod');

const licenciaSchema = z.object({
  id_persona: z.number().int().positive(),
  tipo: z.enum(['Médica', 'Vacaciones', 'Particular']),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

module.exports = { licenciaSchema };
```

#### Routes
```javascript
// src/routes/licenciasRoutes.js
const router = require('express').Router();
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validateBody');
const { licenciaSchema } = require('../schemas/licenciaSchema');
const controller = require('../controllers/licenciasController');

router.get('/', authenticateJWT, controller.list);
router.get('/:id', authenticateJWT, controller.getById);
router.post('/', 
  authenticateJWT,
  authorizeRoles('admin', 'editor'),
  validateBody(licenciaSchema),
  controller.create
);
router.put('/:id',
  authenticateJWT,
  authorizeRoles('admin', 'editor'),
  validateBody(licenciaSchema),
  controller.update
);
router.delete('/:id',
  authenticateJWT,
  authorizeRoles('admin'),
  controller.remove
);

module.exports = router;

// Montar en src/routes/index.js:
// router.use('/licencias', require('./licenciasRoutes'));
```

#### Migration
```typescript
// src/migrations/20260103-CreateLicenciasTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLicenciasTable20260103 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'licencias',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'id_persona', type: 'int' },
          { name: 'tipo', type: 'varchar', length: '50' },
          { name: 'fecha_inicio', type: 'date' },
          { name: 'fecha_fin', type: 'date' }
        ],
        foreignKeys: [
          {
            columnNames: ['id_persona'],
            referencedTableName: 'personas',
            referencedColumnNames: ['id_persona'],
            onDelete: 'CASCADE'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('licencias');
  }
}
```

### 2. Tests
```javascript
// tests/licencias.test.js
const request = require('supertest');
const { createTestApp } = require('./test-app-factory');

describe('Licencias API', () => {
  let app, token;

  beforeAll(async () => {
    app = await createTestApp();
    // Login para obtener token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });
    token = res.body.accessToken;
  });

  test('GET /api/licencias retorna lista', async () => {
    const res = await request(app)
      .get('/api/licencias')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/licencias crea licencia', async () => {
    const res = await request(app)
      .post('/api/licencias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_persona: 1,
        tipo: 'Médica',
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-01-10'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });
});
```

---

## Debugging

### Logs
```javascript
// Usar logger en lugar de console.log
const logger = require('./utils/logger');

logger.info('Usuario autenticado', { userId: user.id });
logger.warn('Límite de export alcanzado', { limit: MAX_EXPORT_BATCH });
logger.error('Error en query', { error: err.message, stack: err.stack });
```

### Queries TypeORM
```javascript
// Habilitar logs de queries en desarrollo
// src/config/data-source.js
{
  // ...
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error']
}
```

### Debugging Node.js
```powershell
# Iniciar con inspector
node --inspect src/server.js

# Abrir Chrome DevTools:
chrome://inspect
```

---

## Scripts de Soporte

La carpeta `scripts/` contiene utilidades para tareas administrativas, migraciones y diagnósticos.

### Estructura y Propósito

| Script | Propósito | Uso |
|--------|-----------|-----|
| **run-migrations.js** | Ejecutar/revertir migraciones | `npm run migrate` |
| **seed-users.js** | Crear usuarios iniciales | `npm run seed:users` |
| **seed-permissions.js** | Crear permisos por rol | `node scripts/seed-permissions.js` |
| **audit-purge.js** | Limpiar logs >90 días | `npm run audit:purge` |
| **activate-users.js** | Activar usuarios desactivados | `node scripts/activate-users.js` |
| **update-user-emails.js** | Actualizar emails masivamente | `node scripts/update-user-emails.js` |
| **check-audit-logs.js** | Auditar acciones sospechosas | `node scripts/check-audit-logs.js` |
| **check-recorridas.js** | Verificar integridad de recorridas | `node scripts/check-recorridas.js` |
| **list-all-recorridas.js** | Listar todas las recorridas | `node scripts/list-all-recorridas.js` |
| **diagnose-migrations.js** | Diagnosticar estado de migraciones | `node scripts/diagnose-migrations.js` |
| **diagnose-timezone.js** | Verificar timezone BD | `node scripts/diagnose-timezone.js` |
| **register-manual-migrations.js** | Marcar migración como ejecutada | `node scripts/register-manual-migrations.js` |
| **test-audit-endpoint.js** | Testear endpoint de auditoría | `node scripts/test-audit-endpoint.js` |

### Scripts Críticos

#### run-migrations.js
Orquestador de migraciones TypeORM.

```powershell
# Ver estado
npm run migrate:show

# Ejecutar nuevas migraciones
npm run migrate

# Revertir última
npm run migrate:revert

# Diagnosticar problemas
npm run migrate:diag
```

**Qué hace:**
- Lee migraciones en `src/migrations/`
- Ejecuta `up()` de nuevas migraciones
- Registra en tabla `migrations` de BD
- En rollback, ejecuta `down()` en orden inverso

**Ejemplo de salida:**
```
✓ Migration 20260107-AddRevokedAtToRefreshTokens executed
✓ Migration 20260106-CreateRecorridasTable executed
✓ All migrations completed successfully
```

#### seed-users.js
Crea usuario admin inicial.

```powershell
npm run seed:users
```

**Crea:**
- Usuario: `admin@localhost`
- Contraseña: `admin123` (CAMBIAR en producción)
- Role: `admin`

**Prerequisito:** `seed-permissions.js` debe ejecutarse primero

#### seed-permissions.js
Crea tabla `permissions` con 4 roles.

```powershell
node scripts/seed-permissions.js
```

**Crea:**
```
admin   | can_create=true, can_update=true, can_delete=true, can_read_all=true
editor  | can_create=true, can_update=true, can_delete=true, can_read_all=true
viewer  | can_create=false, can_update=false, can_delete=false, can_read_all=true
director| can_create=false, can_update=false, can_delete=false, can_read_all=false (RLS)
```

**Ejecutar:** Después de migraciones, antes de seed-users

#### audit-purge.js
Limpia logs de auditoría antiguos (>90 días).

```powershell
npm run audit:purge
```

**Elimina:**
- Logs más antiguos de 90 días
- Preserva último login/logout de cada usuario
- Impacto: Reduce tabla AuditLog a 100k registros (desde 500k+)

**Schedule:**
Recomendado ejecutar semanalmente en cron:
```bash
# crontab -e
0 3 * * 0 cd /ruta/proyecto && npm run audit:purge
```

### Scripts de Diagnóstico

#### diagnose-migrations.js
Verifica qué migraciones están ejecutadas vs pendientes.

```powershell
node scripts/diagnose-migrations.js
```

**Output:**
```
Executed migrations:
✓ 20251104-CreateUsersAndRefreshTokens
✓ 20251104-InitAuditAndRefreshFamily
✓ 20260102-PerformanceIndexesComplete

Pending migrations:
✗ 20260114-CreateNewTable

Issues:
⚠ Migration 20251119 failed halfway - manual intervention needed
```

#### check-audit-logs.js
Busca patrones sospechosos en auditoría.

```powershell
node scripts/check-audit-logs.js
```

**Detecta:**
- Múltiples login_fail consecutivos (fuerza bruta)
- Cambios masivos sin usuario
- Accesos desde IP sospechosa
- Eliminaciones masivas

#### check-recorridas.js
Verifica integridad de tabla `recorridas`.

```powershell
node scripts/check-recorridas.js
```

**Valida:**
- HTML no sanitizado (XSS risk)
- Usuarios orfos (deleted users sin referencia)
- Timestamps inconsistentes

### Cómo Crear Nuevo Script

**Template:**

```javascript
// scripts/mi-script.js
const { AppDataSource } = require('../src/config/data-source');
const logger = require('../src/utils/logger');

async function main() {
  try {
    // Conectar BD
    await AppDataSource.initialize();
    logger.info('[Script] Conectado a BD');
    
    // Tu lógica aquí
    const result = await AppDataSource.query('SELECT COUNT(*) FROM usuarios');
    logger.info('[Script] Resultado:', result);
    
    // Desconectar
    await AppDataSource.destroy();
    logger.info('[Script] Completado exitosamente');
  } catch (err) {
    logger.error('[Script] Error:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();
```

**Ejecutar:**
```powershell
node scripts/mi-script.js
```

---

## Estructura de Tests

Tests están en `tests/` y usan Jest + Supertest para integración.

### Anatomía de un Test

```javascript
// tests/personas.test.js
describe('Personas API', () => {
  let app, request;

  // Setup: ejecuta una vez antes de todos los tests
  beforeAll(async () => {
    app = createApp();
    request = supertest(app);
    // Inicializar BD de test (SQLite en memoria)
  });

  // Cleanup: ejecuta después de cada test
  afterEach(async () => {
    // Limpiar datos (rollback)
  });

  // Teardown: ejecuta al final
  afterAll(async () => {
    // Cerrar conexiones
    await AppDataSource.destroy();
  });

  describe('GET /api/personas', () => {
    it('debe listar personas con paginación', async () => {
      // Arrange (preparar)
      await insertTestData();

      // Act (ejecutar)
      const res = await request
        .get('/api/personas')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${testToken}`);

      // Assert (verificar)
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta.count).toBe(100);
    });

    it('debe retornar 401 si no está autenticado', async () => {
      const res = await request.get('/api/personas');
      expect(res.status).toBe(401);
    });
  });
});
```

### Estructura de Directorios

```
tests/
├── setup.js                    # Setup global (DB, fixtures)
├── fixtures.js                 # Datos de test reutilizables
├── test-app-factory.js         # Crear app con BD de test
├── personas.test.js            # Tests de personas
├── cargos.test.js
├── roles.test.js
├── auth.test.js                # Tests de autenticación JWT
├── auth-refresh.test.js        # Tests de refresh token
├── auth-reuse.test.js          # Tests de detección de robo
├── auth-idle.test.js           # Tests de idle timeout
├── audit-logs.test.js
├── audit-purge.test.js
├── recorridas.test.js          # Tests de recorridas (nuevo)
├── schema.test.js              # Tests de validación Zod
└── health.test.js              # Tests de health check
```

### Fixtures (Datos de Test)

**tests/fixtures.js**

```javascript
const fixtures = {
  user: {
    admin: {
      id: 1,
      email: 'admin@test.com',
      role: 'admin',
      is_active: true
    },
    director: {
      id: 2,
      email: 'director@test.com',
      role: 'director',
      hospital_code: 'HGACA'
    }
  },
  
  personas: [
    {
      id_persona: 1,
      periodo: '2025-01',
      nombre_apellido: 'Juan García',
      cuil: '12345678901',
      edad: 35
    },
    // ...
  ]
};

module.exports = fixtures;
```

**Uso en tests:**

```javascript
const { fixtures } = require('./fixtures');

it('admin debe poder crear persona', async () => {
  const adminToken = generateTestToken(fixtures.user.admin);
  
  const res = await request
    .post('/api/personas')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      periodo: '2025-01',
      nombre_apellido: 'Pedro López',
      cuil: '98765432109'
    });

  expect(res.status).toBe(201);
});
```

### Setup Global

**tests/setup.js**

```javascript
const { AppDataSource } = require('../src/config/data-source');

// Configurar AppDataSource para tests (SQLite en memoria)
module.exports = {
  setupDB: async () => {
    AppDataSource.setOptions({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      logging: false
    });
    await AppDataSource.initialize();
  },

  teardownDB: async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};
```

### Convenciones de Tests

#### Naming
```javascript
// ✅ BIEN: describe+it forman oración
describe('Personas API', () => {
  describe('POST /api/personas', () => {
    it('debe crear persona con datos válidos', () => {});
    it('debe rechazar si CUIL está duplicado', () => {});
    it('debe validar edad mínima (18 años)', () => {});
  });
});

// ❌ MAL
describe('personas', () => {
  it('test1', () => {});
  it('falla si ...', () => {});
});
```

#### Estructura AAA (Arrange-Act-Assert)
```javascript
// ✅ BIEN
it('debe filtrar por período', async () => {
  // Arrange
  const testData = await insertPersonas('2025-01', ['Juan', 'María']);

  // Act
  const res = await request
    .get('/api/personas')
    .query({ periodo: '2025-01' });

  // Assert
  expect(res.body.data).toHaveLength(2);
  expect(res.body.data[0].nombre_apellido).toBe('Juan');
});

// ❌ MAL (mezclado)
it('filtro período', async () => {
  await insertPersonas('2025-01', ['Juan']);
  const res = await request.get('/api/personas?periodo=2025-01');
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0].nombre_apellido).toBe('Juan');
  // No está claro qué es cada parte
});
```

### Ejecutar Tests

```powershell
# Todos los tests
npm test

# Tests específicos
npm test -- personas.test.js

# Watch mode (re-ejecutar al cambiar archivos)
npm run test:watch

# Con coverage
npm test -- --coverage

# Solo tests que matchean patrón
npm test -- --testNamePattern="auth"
```

### Cómo Escribir Nuevo Test

**1. Crear archivo:** `tests/mi-feature.test.js`

**2. Estructura básica:**
```javascript
const supertest = require('supertest');
const { createApp } = require('../src/app');
const { setupDB, teardownDB } = require('./setup');
const { fixtures } = require('./fixtures');

describe('Mi Feature', () => {
  let app, request;

  beforeAll(async () => {
    await setupDB();
    app = createApp();
    request = supertest(app);
  });

  afterAll(teardownDB);

  describe('GET /api/mi-ruta', () => {
    it('debe retornar datos', async () => {
      const res = await request.get('/api/mi-ruta');
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });
});
```

**3. Ejecutar:** `npm test -- mi-feature.test.js`

---

## Recursos Útiles

### Documentación Interna
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Decisiones arquitectónicas
- [BACKEND.md](./BACKEND.md) - Estructura del backend
- [SECURITY.md](./SECURITY.md) - Sistema de autenticación y permisos
- [DECISIONS.md](./DECISIONS.md) - ADRs con contexto de decisiones

### Documentación Externa
- [TypeORM Docs](https://typeorm.io/)
- [Express Guide](https://expressjs.com/en/guide/routing.html)
- [AdminJS Docs](https://docs.adminjs.co/)
- [Zod Documentation](https://zod.dev/)

---

## Changelog - Cambios Implementados Recientes

### Enero 14, 2026 - Correcciones Pre-Producción Fase 1, 2 & 3

#### Fase 1: Bloqueantes Críticos
- **AdminJS a JWT:** Eliminado express-session global, AdminJS ahora usa JWT exclusivamente
  - Archivos: src/app.js (-15 líneas), src/admin/middleware.js (-18 líneas)
- **Validaciones Producción:** SESSION_SECURE=true, JWT_SECRET≥32, SESSION_SECRET≥32 requerido
  - Archivo: src/utils/envValidator.js (+25 líneas)
  - Efecto: Fail-fast si config insegura

#### Fase 2: Recomendados con Valor
- **Monitoring Schedulers:** Contador de fallos, alertas después de 3 fallos consecutivos
  - Archivos: src/utils/tokenCleanupScheduler.js (+30), src/utils/auditCleanupScheduler.js (+30)
- **Rotación Logs:** winston-daily-rotate-file, 14d general / 30d errores
  - Archivo: src/utils/logger.js (+40 líneas)
  - Efecto: Disco nunca se llena
- **ETag Dinámico:** Cache auto-invalidado con versión de package.json
  - Archivo: src/app.js (+8 líneas)
- **Rate Limiting:** Verificado en refresh token (60 req/5min) ✅

#### Fase 3: Backlog Seguro
- **Excluir /health de Auditoría:** Sin auditar health checks (ruido)
  - Archivo: src/middlewares/audit.js (+3 líneas)
- **Headers Seguridad:** Cross-Origin Resource Policy, remover X-Powered-By
  - Archivo: src/app.js (+4 líneas)
- **npm Version:** Requerido >=9.0.0
  - Archivo: package.json (+1 línea)

#### Dependencias Agregadas
- `winston-daily-rotate-file` - Rotación automática de logs

#### Estadísticas Finales
- Archivos modificados: 8
- Líneas neto: +108
- Errores: 0
- Compatibilidad: 100% hacia atrás

---

## Checklist Pre-Deployment (Enero 2026)

Antes de deployar cambios a producción:

### ✅ Código
- [ ] Sin errores de compilación (`npm start` exitoso)
- [ ] npm install exitoso (todas las dependencias)
- [ ] npm test ejecutado sin fallos
- [ ] Sin console.log() o debug leftovers
- [ ] JSDoc actualizado si hay cambios en API

### ✅ Seguridad
- [ ] No hay credenciales en código (.env en .gitignore)
- [ ] Validación de entrada en todos los endpoints
- [ ] Rate limiting aplicado en endpoints sensibles
- [ ] Permisos verificados en controllers (usando @requireRole)
- [ ] XSS prevenido (sanitize-html en datos de usuario)

### ✅ Seguridad Específica Producción
- [ ] NODE_ENV=production
- [ ] SESSION_SECURE=true (HTTPS)
- [ ] JWT_SECRET ≥32 caracteres
- [ ] SESSION_SECRET ≥32 caracteres
- [ ] TRUST_PROXY=true (si hay proxy/LB)
- [ ] No hay stack traces en respuestas HTTP (error handler)

### ✅ Database
- [ ] Migraciones aplicadas (`npm run migrate`)
- [ ] Índices creados (ver PERFORMANCE.md)
- [ ] Backups configurados
- [ ] Permisos de BD correctos (usuario de app NO es root)

### ✅ Operaciones
- [ ] Directorio logs/ existe con permisos correctos
- [ ] Rotación de logs configurada (winston-daily-rotate-file)
- [ ] Schedulers de cleanup monitorean fallos
- [ ] Health check responde OK

### ✅ Cambios Específicos (Enero 2026)
Si modificas estos componentes, verifica:

**Si cambias src/app.js:**
- [ ] No hay express-session middleware global (removido Enero 14)
- [ ] ETag dinámico incluye versión de package.json

**Si cambias src/utils/envValidator.js:**
- [ ] Validaciones de producción están en lugar
- [ ] SESSION_SECURE se valida en startup
- [ ] JWT_SECRET ≥32 chars se valida

**Si cambias schedulers (tokenCleanupScheduler, auditCleanupScheduler):**
- [ ] Contador de fallos consecutivos está presente
- [ ] Checksum threshold alerta después de 3 fallos
- [ ] Contador se resetea en limpieza exitosa

**Si cambias src/utils/logger.js:**
- [ ] winston-daily-rotate-file está en package.json
- [ ] Logs se rotan cada 24h
- [ ] Directorio logs/ existe
- [ ] Retención: 14d (general), 30d (errores)

---

## Preguntas Frecuentes

**P: ¿Puedo usar `async/await` sin try-catch si tengo error handler global?**  
R: No. Siempre usar try-catch en controllers para manejo específico. Error handler global es fallback.

**P: ¿Debo escribir JSDoc para todas las funciones?**  
R: Sí para funciones públicas (exportadas). No necesario para helpers internos si son obvios.

**P: ¿Puedo usar Lodash?**  
R: Solo si necesitas 5+ funciones. Para 1-2 funciones, mejor implementar directamente.

**P: ¿Debo mockear repositorio en test de service?**  
R: Sí. Services deben testearse con mocks. Controllers con BD en memoria (SQLite).

**P: ¿Puedo hacer query SQL raw?**  
R: Solo si es absolutamente necesario. Verificar compatibilidad MySQL/Oracle.

**P: ¿Cómo migro de node-cache a Redis?**  
R: Ver ADR-009 en DECISIONS.md. Esperar hasta implementar cluster mode.

**P: ¿Qué pasa si un scheduler de cleanup falla 3 veces?**  
R: Se loguea alerta crítica "🔴 CRÍTICO". Verificar: BD disponible, permisos, espacio en disco.

**P: ¿Cómo sabré que los logs se están rotando?**  
R: Ver en `logs/` directorio. Archivos con patrón `app-YYYY-MM-DD.log` (uno por día).

**P: ¿Qué pasa en producción si SESSION_SECURE ≠ "true"?**  
R: Servidor RECHAZA startup. Editar .env: SESSION_SECURE=true
```
