# Decisiones Arquitectónicas (ADRs Simplificados)

## Formato

Cada decisión sigue este formato:
- **Decisión:** Qué se decidió
- **Contexto:** Por qué se necesitaba decidir
- **Alternativas:** Qué más se consideró
- **Consecuencias:** Qué implicaciones tiene la decisión
- **Estado:** Activa / Deprecada / Supersedida

---

## ADR-001: AdminJS v6 en lugar de v7

**Fecha:** Noviembre 2025  
**Estado:** ✅ Activa

### Decisión
Usar AdminJS 6.8.3 (última versión CommonJS) en lugar de v7 (ESM puro).

### Contexto
- AdminJS v7 requiere ESM completo en todo el proyecto
- El proyecto actual usa CommonJS (`require`, `module.exports`)
- Migrar 50+ archivos a ESM requiere ~40 horas
- AdminJS v6 es estable y cubre 100% de necesidades

### Alternativas Consideradas
1. **Migrar a AdminJS v7 + ESM completo**
   - Pros: Última versión, features nuevas
   - Contras: 40 horas de trabajo, breaking changes, riesgo alto

2. **Construir admin panel custom**
   - Pros: Control total, sin dependencias pesadas
   - Contras: 200+ horas de desarrollo, reinventar rueda

3. **Usar Directus o Strapi**
   - Pros: Alternativas modernas
   - Contras: Lock-in a nuevo framework, migración compleja

### Consecuencias
- ✅ Funcional hoy sin refactoring masivo
- ✅ AdminJS v6 sigue recibiendo patches de seguridad
- ⚠️ No recibirá features nuevas
- ⚠️ Eventual migración a v7 o alternativa necesaria (1-2 años)

---

## ADR-002: TypeScript Solo para Entidades

**Fecha:** Octubre 2025  
**Estado:** ✅ Activa

### Decisión
Usar TypeScript solo para entidades TypeORM, resto del código en JavaScript.

### Contexto
- TypeORM requiere decoradores (`@Entity`, `@Column`)
- Decorators solo funcionan en TypeScript
- Habilitar `strict: true` requiere refactoring de 50+ archivos
- Sin tipado estricto, TypeScript aporta poco valor en controllers/services

### Alternativas Consideradas
1. **TypeScript 100% con strict mode**
   - Pros: Type safety completo
   - Contras: 40+ horas de migración, cambios masivos

2. **JavaScript 100% (sin TS en absoluto)**
   - Pros: Sin complejidad de TS
   - Contras: TypeORM decorators no funcionan

3. **JSDoc para tipado (sin TS)**
   - Pros: Tipado sin transpilación
   - Contras: TypeORM aún requiere TS para decorators

### Consecuencias
- ✅ Entidades bien tipadas (lo crítico)
- ✅ Sin overhead de migración masiva
- ⚠️ Sin type safety en controllers/services (errores en runtime)
- ⚠️ `strict: false` es deuda técnica

---

## ADR-003: MySQL Temporal, Oracle Objetivo Final

**Fecha:** Septiembre 2025  
**Estado:** ✅ Activa (migración pendiente)

### Decisión
Desarrollar en MySQL, diseñar queries compatibles con Oracle para migración futura.

### Contexto
- Cliente final usa Oracle en producción
- Desarrolladores sin licencias Oracle para local
- MySQL más accesible para desarrollo
- TypeORM abstrae diferencias (con cuidado)

### Alternativas Consideradas
1. **Desarrollar directo en Oracle**
   - Pros: Evita migración final
   - Contras: Licencias caras, setup complejo local

2. **Solo MySQL (sin migración)**
   - Pros: Más simple
   - Contras: Incompatible con infraestructura cliente

3. **PostgreSQL como target final**
   - Pros: Open source, features avanzadas
   - Contras: Cliente ya tiene Oracle, no quiere cambiar

### Consecuencias
- ✅ Desarrollo ágil en local (MySQL fácil setup)
- ✅ TypeORM hace migración viable
- ⚠️ Queries deben evitar features específicas MySQL (ej: `JSON_EXTRACT`)
- ⚠️ Testing exhaustivo en Oracle pre-producción obligatorio

**Convenciones adoptadas:**
- No usar tipos `JSON` (usar `TEXT` + parse manual)
- No usar `AUTO_INCREMENT` (usar secuencias compatibles)
- No usar funciones específicas MySQL (`FIELD()` → abstracción en código)

---

## ADR-004: JWT con Refresh Tokens Rotativos

**Fecha:** Octubre 2025  
**Estado:** ✅ Activa

### Decisión
Autenticación API REST con JWT (15 min) + refresh tokens rotativos (30 días).

### Contexto
- API REST debe ser stateless
- Tokens de larga duración (días) son riesgosos
- Usuario no quiere re-autenticarse cada 15 min

### Alternativas Consideradas
1. **Solo JWT sin refresh (1 hora de vida)**
   - Pros: Más simple
   - Contras: Ventana de ataque mayor, UX peor (logout cada hora)

2. **Solo express-session (como AdminJS)**
   - Pros: Más simple que JWT
   - Contras: No es stateless, no escala en cluster sin Redis

3. **OAuth2 con auth server externo**
   - Pros: Estándar de industria
   - Contras: Overkill, infraestructura adicional

### Consecuencias
- ✅ Stateless (escala sin sticky sessions)
- ✅ Ventana de ataque mínima (accessToken 15 min)
- ✅ Detección de robo de tokens (reuso detectado)
- ⚠️ Complejidad mayor que sesiones simples
- ⚠️ Tabla `refresh_tokens` crece (purga periódica necesaria)

---

## ADR-005: Convivencia de Dos Sistemas de Auth

**Fecha:** Octubre 2025  
**Estado:** ⚠️ Temporal (eventual unificación recomendada)

### Decisión
Mantener JWT (API) y express-session (AdminJS) conviviendo temporalmente.

### Contexto
- API REST usa JWT (stateless)
- AdminJS diseñado para sesiones (cookies)
- Refactoring AdminJS a JWT requiere cambios profundos en auth.js

### Alternativas Consideradas
1. **Unificar a JWT en ambos**
   - Pros: Un solo sistema
   - Contras: AdminJS no soporta JWT nativamente, refactoring profundo

2. **Unificar a sesiones en ambos**
   - Pros: Más simple
   - Contras: API pierde stateless, no escala

3. **Convivencia indefinida**
   - Pros: Funcional ya
   - Contras: Complejidad conceptual, usuarios auth 2 veces si usan ambos

### Consecuencias
- ✅ Sistema funcional sin refactoring masivo
- ⚠️ Usuario debe autenticarse dos veces (API + AdminJS)
- ⚠️ Complejidad conceptual (dos flujos de login)
- 🔄 Unificación recomendada como mejora futura (baja prioridad)

---

## ADR-006: Permisos en BD, Control UI en Código

**Fecha:** Diciembre 2025  
**Estado:** ✅ Activa (después de refactoring)

### Decisión
**Separación clara:**
- Permisos CRUD (`can_create`, `can_update`, etc.) → Tabla `permissions` (BD)
- Control de UI (Navigation, Pages) → Código (lógica de `role`)

### Contexto
- Sistema inicial tenía híbrido (ambos en BD)
- Cambiar UI por BD causaba bugs (documentado en `ARQUITECTURA_PERMISOS_FINAL.md`)
- Permisos CRUD son datos (pueden cambiar sin deploy)
- Control UI es lógica (requiere conocimiento técnico)

### Alternativas Consideradas
1. **Todo en BD**
   - Pros: Sin deploys para cambiar UI
   - Contras: Lógica compleja en BD, bugs difíciles de debuggear

2. **Todo en código**
   - Pros: Cambios atómicos (Git + deploy)
   - Contras: Cambiar permisos CRUD requiere deploy

3. **Híbrido (anterior)**
   - Pros: Flexibilidad
   - Contras: Bugs, inconsistencias, confusión

### Consecuencias
- ✅ Permisos CRUD flexibles (cambio sin deploy)
- ✅ Control UI predecible (cambio con deploy y review)
- ⚠️ Cambiar qué roles ven Navigation requiere código
- ✅ Elimina bugs del sistema híbrido anterior

---

## ADR-007: Capa de Servicios con Inyección de Dependencias

**Fecha:** Diciembre 2025  
**Estado:** ✅ Activa (refactorización completada)

### Decisión
Introducir capa de servicios entre controllers y TypeORM, con repositorios inyectados.

### Contexto
- Controllers accedían directamente a `AppDataSource` (acoplamiento alto)
- Lógica de negocio mezclada con HTTP
- Testing difícil (no se puede mockear repositorio)

### Alternativas Consideradas
1. **Mantener controllers con AppDataSource directo**
   - Pros: Más simple (menos archivos)
   - Contras: Acoplamiento, no testeable, no reutilizable

2. **Servicios sin inyección (acceden a AppDataSource)**
   - Pros: Capa intermedia sin complejidad DI
   - Contras: Aún acoplado, no testeable

3. **Servicios con DI (elegida)**
   - Pros: Testeable, desacoplado, reutilizable
   - Contras: Más archivos, patrón más complejo

### Consecuencias
- ✅ Services testeables (mockear repositorios con Jest)
- ✅ Lógica de negocio reutilizable
- ✅ Cambiar ORM no requiere modificar controllers
- ⚠️ Más archivos (services/, schemas/)
- ✅ Arquitectura más limpia y mantenible

**Módulos migrados:**
- PersonaService ✅
- CargoService ✅
- RolService ✅
- SiglaService ✅
- BajaConcursoService ✅

---

## ADR-008: Validación Zod en Borde (Controllers)

**Fecha:** Noviembre 2025  
**Estado:** ✅ Activa

### Decisión
Validar entrada con Zod en controllers, antes de pasar a services.

### Contexto
- Services no deben preocuparse por validar formato de entrada
- Validación HTTP (400 Bad Request) es responsabilidad de controllers
- TypeScript solo valida en compile-time, no runtime

### Alternativas Consideradas
1. **Validación en services**
   - Pros: Services auto-contenidos
   - Contras: Services conocen HTTP (status codes)

2. **Validación en middleware genérico**
   - Pros: DRY (un lugar)
   - Contras: Middleware no sabe qué schema aplicar sin metadata

3. **Validación en controllers (elegida)**
   - Pros: Separación limpia (HTTP en controllers)
   - Contras: Cada controller aplica schema

### Consecuencias
- ✅ Services asumen datos válidos (sin re-validar)
- ✅ Errores HTTP en controllers, errores de negocio en services
- ✅ Mensajes de error descriptivos (Zod provee detalles)
- ⚠️ Cada endpoint CRUD debe aplicar `validateBody(schema)`

---

## ADR-009: Caché en Memoria (node-cache) No Distribuido

**Fecha:** Enero 2026  
**Estado:** ✅ Activa (suficiente para instancia única)

### Decisión
Usar `node-cache` in-process para caché, no Redis.

### Contexto
- Sistema corre en instancia única (no cluster)
- Caché de queries DISTINCT necesario (reducir DB load)
- Redis agrega complejidad (infraestructura adicional)

### Alternativas Consideradas
1. **Redis (distribuido)**
   - Pros: Compartido entre instancias, persistente
   - Contras: Infraestructura adicional, overkill para instancia única

2. **Sin caché**
   - Pros: Más simple
   - Contras: Queries DISTINCT repetidas (70% de overhead)

3. **node-cache in-memory (elegida)**
   - Pros: Sin dependencias externas, suficiente para instancia única
   - Contras: No compartido en cluster, pierde al reiniciar

### Consecuencias
- ✅ Funcional sin infraestructura adicional
- ✅ TTL configurable (5 min para DISTINCT)
- ⚠️ Caché se pierde al reiniciar servidor (aceptable)
- ⚠️ No funciona en cluster mode (migrar a Redis cuando escale)

**Cuándo migrar a Redis:**
- Si se implementa cluster mode (>1 instancia)
- Si caché debe persistir entre restarts
- Si latencia de caché afecta UX

---

## ADR-010: Auditoría Automática con Middleware

**Fecha:** Octubre 2025  
**Estado:** ✅ Activa

### Decisión
Middleware `auditMiddleware` captura automáticamente todas las peticiones `POST`, `PUT`, `DELETE` en `/api`.

### Contexto
- Trazabilidad es requisito crítico
- Modificar cada endpoint manualmente es error-prone
- Middleware centraliza lógica de auditoría

### Alternativas Consideradas
1. **Auditoría manual en cada controller**
   - Pros: Control fino por endpoint
   - Contras: Fácil olvidar, código duplicado

2. **Triggers de BD**
   - Pros: Captura TODO (incluso queries directas)
   - Contras: Pierde contexto HTTP (user, IP), difícil debuggear

3. **Middleware automático (elegida)**
   - Pros: Centralizado, sin modificar controllers
   - Contras: Puede capturar cosas irrelevantes

### Consecuencias
- ✅ 100% de mutaciones auditadas (POST/PUT/DELETE)
- ✅ Sin olvidar auditoría en endpoints nuevos
- ✅ Contexto completo (user, IP, user-agent)
- ⚠️ Tabla `audit_log` crece rápido (purga automática necesaria)

**Purga configurada:** >90 días (script `audit-purge.js`)

---

## ADR-011: React.memo y useCallback para Performance

**Fecha:** Enero 2026  
**Estado:** ✅ Activa

### Decisión
Aplicar `React.memo` y `useCallback` selectivamente en componentes pesados.

### Contexto
- Organigrama (500+ nodos) se re-renderizaba completamente en cada cambio
- Tablas full con filtros causaban re-renders innecesarios
- Performance degradada en interacciones frecuentes

### Alternativas Consideradas
1. **Aplicar memo a TODOS los componentes**
   - Pros: Máxima optimización teórica
   - Contras: Overhead de comparación, over-engineering

2. **No usar memo (confiar en React default)**
   - Pros: Más simple
   - Contras: Performance inaceptable en componentes pesados

3. **Memo selectivo (elegida)**
   - Pros: Balance performance/complejidad
   - Contras: Requiere análisis de qué optimizar

### Consecuencias
- ✅ -50% tiempo de interacción en organigrama
- ✅ -82% re-renders innecesarios en tablas
- ⚠️ Requiere análisis cuidadoso de deps (bugs sutiles si mal usado)

**Regla adoptada:**
- Usar `React.memo` en: Componentes con >100 nodos, renders costosos (D3, SVG)
- Usar `useCallback` en: Callbacks pasados a componentes memo'izados

---

## ADR-012: Índices Compuestos Estratégicos

**Fecha:** Enero 2026  
**Estado:** ✅ Activa

### Decisión
Crear 8 índices compuestos en tablas críticas basados en queries reales.

### Contexto
- Queries con filtros tomaban 3-5 segundos
- Análisis de slow queries reveló patterns de filtrado repetidos
- Índices simples (PK, FK) insuficientes

### Alternativas Consideradas
1. **Índices en cada columna filtrable**
   - Pros: Cobertura total
   - Contras: Overhead de mantenimiento, espacio en disco

2. **Solo índices simples**
   - Pros: Más simple
   - Contras: Queries lentas

3. **Índices compuestos estratégicos (elegida)**
   - Pros: Balance performance/overhead
   - Contras: Requiere análisis de queries reales

### Consecuencias
- ✅ -85% tiempo de queries (3-5s → 200-500ms)
- ✅ Cobertura de 90% de queries frecuentes
- ⚠️ Overhead en `INSERT`/`UPDATE` (índices deben actualizarse)

**Índices creados:**
- `personas(periodo, sexo)` - Filtro común en reportes
- `roles(periodo, estado_cargo)` - Filtro principal dotación
- `roles(codigo_reparticion)` - RLS para directores

---

## ADR-013: Centralización de Código Duplicado (Enero 2026)

**Fecha:** Enero 20, 2026  
**Estado:** ✅ Activa

### Decisión
Centralizar código y datos duplicados en módulos reutilizables (`src/utils/passwordHelpers.js`, `scripts/lib/init-db.js`, `src/components/datos-comunes/`).

### Contexto
- Bcryptjs importado y usado en 4 archivos distintos (UserService, AuthService, admin/auth.js, admin/seguridad-api.js)
- 14 scripts duplicaban boilerplate de ts-node/TypeORM (~155 líneas)
- Datos de hospitales (35 items) duplicados en 6 componentes (~158 líneas)
- Cambios a estos componentes requería editar múltiples ubicaciones
- Riesgo: archivos se desincronizaran, inconsistencias, mantenimiento difícil

### Alternativas Consideradas
1. **Dejar todo duplicado**
   - Pros: Cada archivo auto-contenido
   - Contras: Cambios divergen, mantenimiento múltiple

2. **Centralizar selectivamente**
   - Pros: Balance entre modularidad y duplicación
   - Contras: Requiere análisis de qué centralizar

3. **Centralizar agresivamente (elegida)**
   - Pros: Single source of truth, cambios en 1 lugar
   - Contras: Requiere refactorización, interdependencias

### Consecuencias

#### ✅ Beneficios Realizados

**Passwords (src/utils/passwordHelpers.js):**
- ✅ 4 archivos refactorizados
- ✅ Cambiar algoritmo (Argon2, scrypt) requiere editar 1 archivo
- ✅ ~20 líneas de código duplicado eliminadas

**Scripts (scripts/lib/init-db.js):**
- ✅ 5 scripts refactorizados (seed-users, seed-permissions, audit-purge, run-migrations, load-concursos)
- ✅ Boilerplate eliminado: ~155 líneas
- ✅ Cambios a AppDataSource centralizados
- ✅ Reducción de tamaño: 52→28 líneas en promedio

**Hospital Data (src/components/datos-comunes/hospitals-data.js):**
- ✅ 6 componentes refactorizados
- ✅ Duplicación eliminada: ~158 líneas
- ✅ Single source of truth para 35 hospitales
- ✅ Futuro: si trae de BD, cambio en 1 archivo

#### ⚠️ Trade-offs Asumidos
- Interdependencia entre módulos (cambio centralizado afecta múltiples consumidores)
- Requiere testing de impacto en todos los consumidores
- Complejidad de debugging si falla módulo centralizado (pero más visible)

#### 📊 Métricas Totales
- Scripts eliminados: 9 (-64%)
- Líneas de duplicación removidas: ~333 líneas
- Archivos centralizadores creados: 4
- Fuentes únicas de verdad: +3

### Patrón Establecido

**Cuándo centralizar:**
- ✅ 3+ ubicaciones repiten código/datos
- ✅ Cambios deberían ser sincronizados
- ✅ Futuro podría cambiar fuente (BD, API, config)
- ✅ Complejidad justifica extraer

**NO centralizar si:**
- ❌ 1-2 ubicaciones (prematura abstracción)
- ❌ Datos muy específicos de contexto
- ❌ Cambios divergen por propósito

### Candidatos para Futuras Centralizaciones
| Datos | Ubicaciones | Prioridad | Módulo Sugerido |
|-------|------------|-----------|-----------------|
| Hospitales | 6 componentes | ✅ HECHO | hospitals-data.js |
| Estados de recorridas | 3-4 archivos | Media | estados-recorridas.js |
| Descripciones de roles | 2-3 archivos | Media | roles-metadata.js |
| Categorías de cargos | 2-3 archivos | Baja | categorias-cargos.js |

**Ver detalles en:** [ARCHITECTURE.md](./ARCHITECTURE.md) → "Patrón de Centralización de Código (Enero 20, 2026)"

---

## Decisiones Descartadas (Para Referencia)

### ❌ Migrar a Microservicios
**Por qué descartado:** Over-engineering para escala actual. Complejidad no justificada.

### ❌ Implementar GraphQL
**Por qué descartado:** REST suficiente, GraphQL agrega complejidad sin beneficio claro.

### ❌ WebSockets para Real-Time
**Por qué descartado:** No hay necesidad crítica de updates en tiempo real. Polling manual aceptable.

### ❌ Server-Side Rendering (SSR)
**Por qué descartado:** Aplicación interna (SEO irrelevante), SPA suficiente.

---

## Template para Nuevas Decisiones

```markdown
## ADR-XXX: Título Descriptivo

**Fecha:** YYYY-MM-DD  
**Estado:** ✅ Activa / ⚠️ Temporal / ❌ Deprecada

### Decisión
Qué se decidió hacer (1-2 líneas).

### Contexto
Por qué se necesitaba tomar una decisión (problema a resolver).

### Alternativas Consideradas
1. **Opción A**
   - Pros: ...
   - Contras: ...

2. **Opción B (elegida)**
   - Pros: ...
   - Contras: ...

### Consecuencias
- ✅ Beneficio 1
- ✅ Beneficio 2
- ⚠️ Trade-off 1
- ⚠️ Trade-off 2
```
