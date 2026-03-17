# Arquitectura del Sistema

## Visión General

Sistema modular de 3 capas con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────┐
│  FRONTEND (React + AdminJS)                 │
│  - Componentes JSX                          │
│  - State management (hooks + context)       │
│  - Visualización (tablas, organigramas)     │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────────┐
│  BACKEND (Express + TypeORM)                │
│  ┌─────────────────────────────────────────┐│
│  │ Controllers (HTTP)                      ││
│  └──────┬──────────────────────────────────┘│
│  ┌──────▼──────────────────────────────────┐│
│  │ Services (Business Logic)               ││
│  └──────┬──────────────────────────────────┘│
│  ┌──────▼──────────────────────────────────┐│
│  │ Repositories (TypeORM)                  ││
│  └─────────────────────────────────────────┘│
└─────────────────┬───────────────────────────┘
                  │ SQL
┌─────────────────▼───────────────────────────┐
│  BASE DE DATOS (MySQL → Oracle)             │
│  - Entidades persistentes                   │
│  - Índices optimizados                      │
│  - Auditoría completa                       │
└─────────────────────────────────────────────┘
```

## Principios de Diseño Adoptados

### 1. Separación de Responsabilidades
**Decisión consciente:** Cada capa tiene un propósito único y no cruza fronteras.

- **Controllers:** Solo manejan HTTP (parseo request, formateo response, status codes)
- **Services:** Solo lógica de negocio (validaciones, orquestación, transformaciones)
- **Repositories:** Solo acceso a datos (queries, persistencia)

**Por qué:** Facilita testing, reduce acoplamiento, permite cambiar implementación de una capa sin afectar otras.

### 2. Inyección de Dependencias
**Decisión consciente:** Services reciben repositorios por constructor, no acceden a `AppDataSource` directamente.

```javascript
// ✅ CORRECTO
class PersonaService {
  constructor(personaRepository) {
    this.personaRepository = personaRepository;
  }
}

// ❌ INCORRECTO (legacy eliminado)
class PersonaService {
  list() {
    const repo = AppDataSource.getRepository(Persona);
  }
}
```

**Por qué:** Permite mockear repositorios en tests, facilita cambiar ORM en el futuro.

### 3. Modularización por Feature
**Decisión consciente:** Código organizado por dominio (personas, cargos, hospitales), no por tipo técnico.

```
src/
├── services/PersonaService.js
├── controllers/personasController.js
├── routes/personasRoutes.js
├── schemas/personaSchema.js
```

**Por qué:** Features relacionadas quedan cerca, más fácil entender flujo completo.

### 4. Configuración Centralizada
**Decisión consciente:** Todas las variables de entorno leídas en un solo lugar (`config/env.js`).

**Por qué:** Cambios de configuración no requieren buscar en 20 archivos, valores por defecto claros.

### 5. Validación en el Borde
**Decisión consciente:** Validación Zod en controllers antes de pasar a services.

**Por qué:** Services asumen datos válidos, no necesitan re-validar. Errores HTTP en controllers, errores de negocio en services.

### 6. Auditoría como Ciudadano de Primera Clase
**Decisión consciente:** Middleware de auditoría captura todas las peticiones API automáticamente.

**Por qué:** Trazabilidad sin modificar cada endpoint individualmente.

## Decisiones Arquitectónicas CONSCIENTES

### 1. AdminJS v6 (no v7)
**Alternativas evaluadas:** AdminJS v7, construir admin custom, usar Directus

**Decisión:** Usar AdminJS 6.8.3 (último compatible con CommonJS)

**Por qué:**
- AdminJS v7 usa ESM puro, incompatible con nuestro stack CommonJS
- Migrar todo el proyecto a ESM requiere ~40 horas
- AdminJS v6 es estable y cubre el 100% de necesidades
- La ganancia de v7 no justifica el esfuerzo de migración

**Consecuencias asumidas:**
- AdminJS v6 no recibirá features nuevas
- Eventual migración a v7 o alternativa será necesaria (1-2 años)
- No es bloqueante para funcionalidad actual

### 2. TypeScript Solo para Entidades
**Alternativas evaluadas:** TypeScript 100%, JavaScript 100%

**Decisión:** TypeScript solo para entidades TypeORM, resto en JavaScript

**Por qué:**
- TypeORM requiere decoradores (`@Entity`, `@Column`, etc.)
- Decorators requieren TypeScript
- Migrar 50+ archivos JS a TS strict requiere ~40 horas
- La ganancia de tipado no justifica el esfuerzo actual

**Consecuencias asumidas:**
- Sin type safety en controllers/services
- Errores de tipo detectados en runtime, no compile-time
- `strict: false` en tsconfig.json
- Posible deuda técnica a futuro

### 3. MySQL Temporal, Oracle Objetivo Final
**Alternativas evaluadas:** Solo MySQL, solo Oracle, PostgreSQL

**Decisión:** Desarrollar en MySQL, diseñar para migrar a Oracle

**Por qué:**
- Cliente final usa Oracle en producción
- MySQL más accesible para desarrollo local
- TypeORM abstrae diferencias (queries compatibles con ambos)

**Consecuencias asumidas:**
- Algunas queries pueden requerir ajustes menores en Oracle
- No usar features específicas de MySQL (ej: `JSON_EXTRACT`)
- Testing final obligatorio en Oracle antes de producción

### 4. JWT + Refresh Tokens (no Solo Sesiones)
**Alternativas evaluadas:** Solo express-session, solo JWT sin refresh, OAuth2

**Decisión:** JWT con refresh tokens rotativos

**Por qué:**
- API REST debe ser stateless
- Tokens de corta duración (15 min) limitan ventana de ataque
- Refresh tokens permiten sesiones largas sin comprometer seguridad
- Rotación automática detecta robo de tokens

**Consecuencias asumidas:**
- Complejidad mayor que sesiones simples
- Tabla `refresh_tokens` crece con el tiempo (purga periódica necesaria)
- AdminJS usa sesiones separadas (convivencia de 2 sistemas de auth)

### 5. Convivencia de Dos Sistemas de Autenticación
**Alternativas evaluadas:** JWT único, session única, migrar AdminJS a JWT

**Decisión:** Convivencia temporal de JWT (API) y express-session (AdminJS)

**Por qué:**
- AdminJS está diseñado para sesiones, no JWT
- Forzar JWT en AdminJS requiere refactoring profundo de auth.js
- API REST necesita JWT stateless por naturaleza
- Sistema funcional, unificación no es crítica a corto plazo

**Consecuencias asumidas:**
- Usuario debe autenticarse dos veces si usa ambos
- Complejidad conceptual (dos flujos de login)
- Eventual unificación recomendada (baja prioridad)

### 6. Permisos en BD, Control de UI en Código
**Alternativas evaluadas:** Todo en BD, todo en código, híbrido

**Decisión:** Separación limpia:
- **En BD:** Permisos CRUD (`can_create`, `can_update`, `can_delete`, `can_read_all`)
- **En código:** Control de UI (`role === 'admin' || role === 'editor'`)

**Por qué:**
- Permisos CRUD son datos, pueden cambiar sin deploy
- Control de UI es lógica, cambiar requiere conocimiento técnico
- Hibridar ambos generó bugs y confusión (documentado en `ARQUITECTURA_PERMISOS_FINAL.md`)

**Consecuencias asumidas:**
- Cambiar qué roles ven Navigation requiere modificar código
- Permisos CRUD flexibles, UI más rígida

## Límites Actuales de la Arquitectura

### 1. No Soporta Múltiples Bases de Datos
El sistema asume una única base de datos. No hay sharding ni federación.

**Impacto:** Si BD supera capacidad de un solo servidor, requiere refactoring.

**Solución futura:** Particionar por región o año si es necesario.

### 2. No Hay Queue de Trabajos Asíncronos
Operaciones largas (exports masivos) bloquean el thread de Node.js.

**Impacto:** Exports de >50k registros pueden timeout.

**Mitigación actual:** Límite de 20k registros por export (configurable).

**Solución futura:** Bull/BullMQ + Redis para jobs asíncronos.

### 3. Cache en Memoria (no Distribuido)
El caché usa `node-cache` in-process, no compartido entre instancias.

**Impacto:** En cluster mode, cada proceso tiene su propio caché.

**Mitigación actual:** Sistema corre en proceso único.

**Solución futura:** Redis para caché compartido.

### 4. Sin Real-Time Updates
Los cambios no se propagan en tiempo real a otros usuarios.

**Impacto:** Usuario A ve datos desactualizados hasta que recargue.

**Mitigación actual:** Los usuarios recargan manualmente.

**Solución futura:** WebSockets o Server-Sent Events.

### 5. Logs No Centralizados
Winston escribe a archivos locales, no a sistema central.

**Impacto:** En múltiples instancias, logs dispersos.

**Mitigación actual:** Sistema en instancia única.

**Solución futura:** ELK Stack, Loki, o similar.

## Qué NO Hace el Sistema (Scope Explícito)

### NO gestiona:
- ❌ Nómina o pagos (solo estructura organizacional)
- ❌ Turnos médicos o agendas
- ❌ Historias clínicas de pacientes
- ❌ Inventario de equipamiento
- ❌ Presupuesto o contabilidad

### NO provee:
- ❌ API pública (solo uso interno)
- ❌ Sincronización con sistemas externos
- ❌ Importación masiva desde Excel (solo manual)
- ❌ Notificaciones por email/SMS

### NO implementa:
- ❌ Multi-tenancy (es un sistema único para un cliente)
- ❌ Internacionalización (solo español)
- ❌ Modo offline (requiere conexión constante)

## Flujo de Datos Típico

### Ejemplo: Listar Personas con Filtros

```
1. Usuario → GET /api/personas?periodo=2025-01&q=garcia&limit=50

2. Controller (personasController.js)
   ├─ Parsea query params
   ├─ Valida límites (max 200)
   ├─ Construye objeto `where`
   └─ Llama service.list(options)

3. Service (PersonaService.js)
   ├─ Recibe opciones validadas
   ├─ Aplica RLS si usuario es director
   └─ Llama repository.findAndCount(where, order, skip, take)

4. Repository (TypeORM)
   ├─ Genera SQL con WHERE/ORDER/LIMIT
   ├─ Ejecuta query en BD
   └─ Retorna [rows, count]

5. Service
   └─ Retorna { rows, count }

6. Controller
   ├─ Formatea response
   └─ res.json({ data: rows, meta: { count, limit, offset } })

7. Usuario ← { data: [...], meta: {...} }
```

### Ejemplo: Autenticación JWT

```
1. Usuario → POST /api/auth/login { email, password }

2. authController.login
   ├─ Valida formato de entrada
   ├─ Busca User en BD
   ├─ Verifica password con bcrypt
   ├─ Genera accessToken (JWT, 15min)
   ├─ Genera refreshToken (crypto, 30 días)
   ├─ Guarda refreshToken en BD (hashed)
   ├─ Audita login_success
   └─ Retorna { accessToken, refreshToken, user }

3. Usuario → GET /api/personas (Authorization: Bearer <token>)

4. authenticateJWT middleware
   ├─ Extrae token de header
   ├─ Verifica firma JWT
   ├─ Busca User en BD
   ├─ Carga permissions
   ├─ Adjunta req.user
   └─ next()

5. Controller ejecuta con req.user disponible
```

## Patrones de Código Establecidos

### Factory Pattern
`createApp()` y `setupAdmin()` son factories que retornan instancias configuradas sin side effects.

### Middleware Chain
Express usa cadena de middlewares para separar concerns (rate limit → auth → audit → business logic).

### Repository Pattern
Services no ejecutan SQL directamente, usan métodos de repositorio (`findOne`, `findAndCount`, `save`).

### Singleton Pattern
`AppDataSource` (TypeORM) es singleton inicializado una vez en `bootstrap.js`.

---

## 🆕 Patrón de Centralización de Código (Enero 20, 2026)

### Motivación
Durante análisis, se identificó duplicación significativa en:
- Manejo de bcrypt (4 ubicaciones)
- Inicialización de scripts (14 scripts)
- Datos maestros como hospitales (4 componentes)

### Soluciones Implementadas

#### 1. Centralización de Manejo de Passwords
**Ubicación:** `src/utils/passwordHelpers.js`

**Problema:** Bcryptjs importado y usado directamente en 4 archivos (UserService, AuthService, admin/auth.js, admin/seguridad-api.js)

**Solución:** Crear módulo centralizado que exponga:
```javascript
export function hashPassword(plainPassword)
export function comparePassword(plainPassword, hash)
```

**Beneficio:** Cambiar algoritmo (Argon2, scrypt, PBKDF2) requiere editar 1 archivo

**Patrón a Aplicar Cuando:**
- Función se repite en 2+ archivos
- Implementación puede cambiar (algoritmo, versión, parámetros)
- Facilita cambios futuros

#### 2. Centralización de Inicialización de BD en Scripts
**Ubicación:** `scripts/lib/init-db.js`

**Problema:** 14 scripts duplicaban boilerplate:
```javascript
require('reflect-metadata')
require('dotenv').config()
const ts = require('ts-node')
const { AppDataSource } = require('../src/config/data-source')
// ... inicializar y conectar
```

**Solución:** Crear módulo con:
```javascript
export async function initDatabase()
export async function closeDatabase(dataSource)
```

**Beneficio:** 
- Cambios a AppDataSource/ts-node requieren editar 1 archivo
- Boilerplate eliminado: ~155 líneas
- Scripts reducidas de 52 → 28 líneas en promedio

**Patrón a Aplicar Cuando:**
- Boilerplate se repite en 5+ scripts
- Ciclo de vida complejo (múltiples pasos, errores)
- Centralizando reduce tamaño significativamente

#### 3. Centralización de Datos Maestros
**Ubicación:** `src/components/datos-comunes/hospitals-data.js`

**Problema:** Lista de 35 hospitales con id/name/category duplicada en:
- RecorridasHospitales.jsx (37 líneas)
- hospitales.jsx (37 líneas)
- DirectorHome.jsx (10 líneas, incompleta)
- HospitalesConcursos.jsx (37 líneas)
- OrganigramaHome.jsx (via local hospitals-data.js)
- OrganigramaDetalle.jsx (via local hospitals-data.js)

**Solución:** Crear `datos-comunes/` con:
- `hospitals` - Array con id/name/category
- `hospitalsMap` - O(1) lookup id→name (para directores)
- `hospitalsByCategory` - Grouper para UI por categoría

**Beneficio:**
- Cambios a lista de hospitales: editar 1 archivo
- Todos 6 componentes actualizados automáticamente
- Si futuro trae de BD: 1 cambio en init de hospitals
- Duplicación eliminada: 158 líneas
- Local hospitals-data.js de vista_organigrama eliminado

**Patrón a Aplicar Cuando:**
- Constante se repite en 3+ componentes
- Cambiaría junta (si un hospital se agrega, se agrega en todos)
- Podría venir de BD en futuro

### Patrones Observados

#### Anti-patrón a Evitar
```javascript
// ❌ EVITAR: Copiar-pegar código
// archivo1.js
const hospitals = [ ... 35 items ... ]

// archivo2.js  
const hospitals = [ ... 35 items ... ] // Copia exacta

// Problema: Cambios divergen, no se sincronizan
```

#### Patrón Correcto a Replicar
```javascript
// ✅ CORRECTO: Centralizar y reutilizar
// datos-comunes/hospitals-data.js
export const hospitals = [ ... 35 items ... ]

// archivo1.js
import { hospitals } from '../datos-comunes/hospitals-data'

// archivo2.js
import { hospitals } from '../datos-comunes/hospitals-data'

// Beneficio: Single source of truth
```

### Candidatos para Centralización Futura

| Datos | Ubicaciones | Líneas | Prioridad |
|-------|------------|--------|-----------|
| Estados de recorridas | 3-4 archivos | 20-30 | Media |
| Descripciones de roles | 2-3 archivos | 10-20 | Media |
| Categorías de cargos | 2-3 archivos | 15-25 | Baja |
| Colores de unidades organizativas | Vista organigrama | 40-60 | Baja |

### Guía de Decisión

**Centralizar si:**
- ✅ 3+ ubicaciones repiten datos/código
- ✅ Cambios deberían ser sincronizados
- ✅ Complejidad justifica extraer
- ✅ Futuro podría cambiar fuente (BD, API, config)

**NO centralizar si:**
- ❌ Usado en 1 ubicación (prematura abstracción)
- ❌ Datos muy específicos de un contexto
- ❌ Cambios divergen por propósito
- ❌ Performance crítica requiere inlining

---

## Módulo de Recorridas (Enero 2026)

### Decisión Arquitectónica
Se agregó nuevo módulo completo manteniendo patrones establecidos:

**Capa de Datos:**
- Entidad TypeScript: `Recorrida.ts`
- Índices: `(hospital_code, created_at)` + `(user_id)`
- Relación: FK a `users` con cascada DELETE

**Capa de Lógica:**
- Service: `RecorridaService.js` con sanitización HTML
- Método `sanitizeHtml()` previene XSS
- Paginación estándar (50 registros)

**Capa de HTTP:**
- Controller: `recorridasController.js` con 5 métodos (CRUD)
- Rutas: GET/POST/PUT/DELETE `/api/recorridas`
- Permisos: admin, editor, viewer (NO director)

**Capa de UI:**
- 3 componentes React: Listado, Detalle, Modal
- AdminJS pages con integración automática
- Editor WYSIWYG integrado en Modal

### Justificación
- ✅ Sigue patrones existentes (Service → Controller → Routes)
- ✅ Reutiliza middlewares (auth, audit, validation)
- ✅ Sanitización centralizada en service (no en cada controller)
- ✅ Auditoría automática de cambios
- ✅ No requiere cambios arquitectónicos mayores

### Qué CAMBIÓ Mínimamente
- Entidades centralizadas ahora incluyen `Recorrida`
- Rutas incluyen montaje de `recorridasRoutes`
- AdminJS config incluye páginas de Recorridas

### Qué SE MANTIENE IGUAL
- Flujo de autenticación (JWT + express-session)
- Patrón de services → controllers
- Inyección de dependencias
- Rate limiting y auditoría
- Validación con Zod

---

## Estrategia de Testing

### Unit Tests (Services)
- Mockear repositorios con Jest
- Validar lógica de negocio sin BD

### Integration Tests (Controllers)
- Usar Supertest para simular HTTP
- BD en memoria (SQLite vía `sql.js`)
- Validar flujos end-to-end

### Manual Testing (UI)
- No hay tests automatizados de frontend
- Testing manual de AdminJS y componentes React

## Próximos Pasos de Arquitectura

1. **Unificar autenticación** (JWT único para API y AdminJS)
2. **Queue asíncrona** para exports pesados
3. **Redis** para caché distribuido
4. **Replicación** del sistema a 32 hospitales restantes
5. **Migración a Oracle** en producción
