# Sistema de Gestión de Recursos Humanos en Salud

## ¿Qué es este sistema?

Un sistema de gestión de recursos humanos para el sector de salud pública municipal que permite administrar dotación de personal, cargos, roles, vacantes y procesos concursales en 33 hospitales de la provincia.

## ¿Qué problema resuelve?

Antes de este sistema, la gestión de personal sanitario era manual, fragmentada y sin visibilidad centralizada:
- **Falta de visibilidad:** No existía forma de ver dotación real vs. planificada por hospital
- **Procesos lentos:** Identificar vacantes y gestionar concursos era manual
- **Sin trazabilidad:** No había historial de cambios en la estructura organizacional
- **Acceso no controlado:** No existía control granular por rol y hospital
- **Sin métricas:** Imposible generar KPIs de dotación, vacantes o concursos

Este sistema centraliza toda la información, automatiza reportes, aplica permisos por rol, y permite tomar decisiones basadas en datos en tiempo real.

## Público objetivo

- **Administradores del sistema (admin):** Personal técnico que gestiona usuarios, permisos y auditoría
- **Editores (editor):** Personal de RRHH que carga y actualiza datos operacionales
- **Directores de hospital (director):** Solo visualizan datos de su hospital específico
- **Visualizadores (viewer):** Personal con acceso de solo lectura a todos los hospitales

## Stack tecnológico

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **ORM:** TypeORM 0.3.x con decoradores TypeScript
- **Base de datos:** MySQL 8+ (diseñado para migrar a Oracle)
- **Autenticación:** JWT con refresh tokens y rotación automática
- **Validación:** Zod para validación de entrada
- **Logging:** Winston para logs estructurados
- **Tests:** Jest con Supertest

### Frontend
- **Library:** React 18 con JSX
- **Panel Admin:** AdminJS 6.x (v6 por compatibilidad CommonJS)
- **Visualización:** react-d3-tree para organigramas
- **Bundling:** AdminJS bundler integrado

### Seguridad
- **Helmet** para headers seguros
- **express-rate-limit** para prevención de fuerza bruta
- **bcryptjs** para hashing de contraseñas
- **Permisos granulares** basados en tabla `permissions`
- **Row-Level Security (RLS)** para directores de hospital

### Performance
- **Compresión gzip/brotli** para reducir payload 70-80%
- **Connection pooling** optimizado (50 conexiones)
- **Caché en memoria** (node-cache) para queries frecuentes
- **Índices compuestos** en tablas críticas

## Ejecución

### Desarrollo

```powershell
# 1. Clonar e instalar
cd "Proyecto Salud 34"
npm install

# 2. Configurar entorno
# Copiar .env.example a .env y configurar:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET
# - ADMIN_ENABLED=true
# - SESSION_SECRET

# 3. Ejecutar migraciones
npm run migrate

# 4. (Opcional) Poblar usuarios y permisos
npm run seed:users
node scripts/seed-permissions.js

# 5. Iniciar en modo desarrollo
npm run dev
```

**Acceso:**
- API REST: `http://localhost:3000/api/*`
- Panel AdminJS: `http://localhost:3000/admin`
- Health check: `http://localhost:3000/health`

### Producción

```powershell
# 1. Configurar variables de entorno (ver .env.example)
# CRÍTICO:
# - NODE_ENV=production
# - SESSION_SECURE=true (HTTPS requerido)
# - JWT_SECRET (mínimo 32 caracteres aleatorios)
# - SESSION_SECRET (mínimo 32 caracteres aleatorios)
# - DB_PASSWORD (no usar default "root")
# - TRUST_PROXY=true (si detrás de Nginx/HAProxy/ALB)

# 2. Instalar dependencias
npm install

# 3. Crear directorio de logs
mkdir -p logs

# 4. Ejecutar migraciones
npm run migrate

# 5. Iniciar
npm start

# Ver logs en tiempo real:
tail -f logs/app-$(date +%Y-%m-%d).log
```

**Validaciones de startup (Enero 2026):**
- ✅ Servidor RECHAZA startup si SESSION_SECURE ≠ "true" en producción
- ✅ Servidor RECHAZA startup si JWT_SECRET < 32 caracteres
- ✅ Servidor RECHAZA startup si SESSION_SECRET < 32 caracteres
- ✅ Warning si TRUST_PROXY no configurado (IPs en audit logs incorrectas)

# 3. Iniciar servidor
npm start
```

**Consideraciones de producción:**
- Usar gestor de procesos (PM2, systemd)
- Configurar proxy reverso (Nginx/Apache)
- Habilitar HTTPS obligatorio
- Configurar backups automáticos de BD
- Monitorear logs con Winston en modo `production`
- Configurar rate limiters apropiados

## Características principales

### Gestión de Personal
- CRUD completo de personas con validación Zod
- Historial por periodo (ej: 2024-11, 2025-01)
- Búsqueda por CUIL, nombre, tipo documento
- Exportación CSV con filtros aplicados

### Organigrama Dinámico
- Visualización jerárquica con react-d3-tree
- Selector de periodo para ver evolución temporal
- Identificación de vacantes y jefaturas
- Exportación de imagen

### Dotación y Procesos Concursales
- Vista unificada por hospital
- KPIs interactivos (activos, vacantes, bloqueados, concursos)
- Filtros multi-select encadenados
- Comparación periodo a periodo

### Recorridas y Seguimientos (🆕 Enero 2026)
- Documentación de recorridas e inspecciones por hospital
- Editor WYSIWYG para contenido enriquecido
- Previsualización en tiempo real
- HTML sanitizado contra XSS
- Auditoría completa de creador/editor/fecha
- Acceso: admin, editor, viewer

### Refactoring Arquitectónico (✨ Enero 20, 2026)
- ✅ Eliminación de 9 scripts no-esenciales (64% reducción)
- ✅ Centralización de manejo de passwords en `src/utils/passwordHelpers.js` (facilita cambio de algoritmo)
- ✅ Centralización de inicialización de BD en `scripts/lib/init-db.js` (155 líneas de boilerplate eliminadas)
- ✅ Centralización de datos de hospitales en `src/components/datos-comunes/hospitals-data.js` (158 líneas de duplicación eliminadas)
- ✅ Patrón replicable documentado para futuras centralizaciones
- **Beneficio:** Mayor mantenibilidad, menos código duplicado, cambios futuros más simples

### Sistema de Permisos
- 4 roles: admin, editor, viewer, director
- Permisos granulares en tabla `permissions`
- RLS automático para directores (solo su hospital)
- Control de UI (Navigation, Pages) según permisos

### Auditoría
- Log completo de acciones en tabla `audit_log`
- Tracking de logins/logouts
- Cambios en datos (antes/después)
- Script de purga automática de logs antiguos

## Comandos útiles

```powershell
# Ejecutar tests
npm test

# Ver migraciones aplicadas
npm run migrate:show

# Revertir última migración
npm run migrate:revert

# Diagnosticar estado de migraciones
npm run migrate:diag

# Purgar logs de auditoría antiguos (>90 días)
npm run audit:purge

# Verificar tipos TypeScript
npm run typecheck
```

## Estado actual del proyecto

**Funcional y en uso con 1 hospital piloto (HGACA). Optimizaciones completas (enero 2026). Refactoring arquitectónico completado. Fase 4 de hardening completada.**

- ✅ Backend modular con capa de servicios
- ✅ Autenticación JWT con refresh tokens y rotación automática
- ✅ Sistema de permisos granulares
- ✅ Módulo de recorridas/seguimientos (enero 2026)
- ✅ Rutas administrativas para gestión de caché (Fase 4)
- ✅ FIX: Prevención de [object Object] en URLs de AdminJS (Fase 4)
- ✅ Validación y bloqueo de URLs con serialización incorrecta (Fase 4)
- ✅ Estándares de naming documentados (Fase 4)
- ✅ **Refactoring Arquitectónico Completado (Enero 20, 2026)**
  - ✅ 9 scripts no-esenciales eliminados
  - ✅ passwordHelpers.js centralizado
  - ✅ scripts/lib/init-db.js centralizado (~155 líneas boilerplate eliminadas)
  - ✅ datos-comunes/hospitals-data.js centralizado (~158 líneas duplicación eliminada)
  - ✅ 333 líneas de duplicación total removidas
- ✅ 15+ optimizaciones de performance aplicadas
- ✅ 16 índices estratégicos en base de datos
- ✅ Política de cleanup automático de tokens
- ✅ Tests de integración para endpoints críticos (46/46 PASS)
- ✅ Documentación técnica exhaustiva y actualizada (10 documentos)
- 🚧 Pendiente: Replicación a 32 hospitales restantes
- 🚧 Pendiente: Migración de MySQL a Oracle (infraestructura preparada)

## Próximos pasos

Consultar [ARCHITECTURE.md](./ARCHITECTURE.md) para entender decisiones de diseño, [DECISIONS.md](./DECISIONS.md) para contexto de decisiones clave, y [PERFORMANCE.md](./PERFORMANCE.md) para estrategia de escalado.
