# Arquitectura y Onboarding Técnico — Sistema de Gestión de Dotación GCABA

> Para desarrolladores que se incorporan al proyecto.
> Última actualización: 2026-08

---

## 1. Visión general

Sistema web para la gestión de dotación de recursos humanos del sistema de salud del GCABA. Permite administrar cargos, concursos, bajas, organigrama y dotación de ~46.000 cargos distribuidos en hospitales y efectores de la Ciudad.

### Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Node.js + Express | 18+ |
| ORM | TypeORM | 0.3.x |
| Base de datos | MySQL | 8.0 |
| Frontend | React + Vite | 18 / 5 |
| Estilos | Tailwind CSS | 3.x |
| Microservicio | Python + FastAPI | 3.10+ / 0.x |
| Autenticación | JWT (access + refresh token) | — |
| Validación | Zod | 3.x |
| Logging | Winston + DailyRotateFile | — |
| Contenedores | Docker + Docker Compose | — |

---

## 2. Estructura de carpetas

```
dotacion-rrhh/
├── app/                        # Backend Node.js
│   ├── src/
│   │   ├── config/             # Configuración: env, data-source, swagger
│   │   ├── controllers/        # Controladores de rutas legacy (cargos, personas, etc.)
│   │   ├── entities-class/     # Entidades TypeORM (TypeScript)
│   │   ├── hospitals/          # Lógica de dotación por hospital (dot-pages)
│   │   ├── middlewares/        # auth, audit, validators, rateLimiters
│   │   ├── modules/            # Módulos de negocio (ver sección 4)
│   │   ├── routes/             # Rutas Express (index.js + archivos por dominio)
│   │   ├── schemas/            # Schemas Zod de validación
│   │   ├── services/           # Servicios compartidos
│   │   ├── standards/          # Constantes y estándares de negocio
│   │   ├── utils/              # logger, errorHandler, csv, tokenCleanup, etc.
│   │   ├── app.js              # Factory de Express (createApp)
│   │   ├── bootstrap.js        # Inicialización: DB + servidor + schedulers
│   │   └── server.js           # Entry point
│   ├── python-service/         # Microservicio FastAPI (Dotaneitor)
│   ├── public/
│   │   ├── spa/                # Build del frontend React (generado por Vite)
│   │   └── landing/            # Landing page estática
│   ├── scripts/                # Scripts de migración y seeds (Node.js)
│   ├── tests/                  # Tests Jest
│   ├── .env.local              # Variables de entorno locales (no commitear)
│   └── Dockerfile              # Imagen Docker del backend Node
│
├── frontend/                   # Frontend React
│   ├── src/
│   │   ├── api/                # Funciones fetch hacia /api/*
│   │   ├── auth/               # AuthContext, ProtectedRoute
│   │   ├── components/         # Componentes reutilizables (UI, tablas, modales)
│   │   ├── constants/          # Constantes del frontend
│   │   ├── data/               # Datos estáticos (hospitales, siglas)
│   │   ├── hooks/              # Custom hooks
│   │   ├── layout/             # AppLayout, Sidebar, Header
│   │   ├── pages/              # Páginas por módulo (ver sección 5)
│   │   ├── utils/              # Helpers de formato, fechas, etc.
│   │   ├── App.jsx             # Router principal (React Router v6)
│   │   └── main.jsx            # Entry point React
│   └── package.json
│
├── Doc/                        # Documentación del proyecto
├── Dockerfile                  # Imagen Docker del microservicio Python
├── docker-compose.yml          # Orquestación de servicios
├── .gitlab-ci.yml              # Pipeline CI/CD
└── README.md
```

---

## 3. Flujo de arranque del servidor

```
server.js
  └── bootstrap()
        ├── Registra entidades TypeORM (entities-class/)
        ├── AppDataSource.initialize()  →  conexión MySQL (pool 50 conexiones)
        ├── createApp()
        │     ├── Middlewares globales: compression, helmet, cookieParser, morgan
        │     ├── Sirve landing.html en GET /
        │     ├── Sirve SPA React en /public/spa/
        │     ├── Swagger UI en /api/docs (solo development)
        │     ├── Health check en GET /health
        │     ├── Rate limiter: 250 req/min por IP+usuario
        │     ├── Monta /api → apiRoutes (index.js)
        │     └── SPA catch-all: cualquier ruta no-API → index.html
        ├── startCleanupScheduler()     →  limpia refresh tokens cada 4h
        └── startAuditCleanupScheduler() → limpia audit logs cada 24h
```

---

## 4. Módulos del backend

El backend mezcla dos estilos: **rutas legacy** en `src/routes/` y **módulos de negocio** en `src/modules/`. Los módulos nuevos siguen la estructura `módulo/controller + routes + service + entity`.

### 4.1 Módulos en `src/modules/`

| Módulo | Base URL | Descripción |
|---|---|---|
| `alta-cargo` | `/api/cargos/alta` | Alta de cargos, catálogos (carreras, puestos, especialidades), lista de cargos (`new_cargo`) |
| `dotacion` | `/api/dotacion` | Sincronización padrón → `cargo_dotacion`, KPIs de dotación |
| `bajas` | `/api/concursales/bajas` | Bajas consolidadas CPH |
| `seguimiento-cph` | `/api/concursales/seguimiento-cph` | Seguimiento de concursos CPH |
| `seguimiento-ceetps` | `/api/concursales/seguimiento-ceetps` | Seguimiento de concursos CEETPS (ENF/TEC/Servicios) |
| `tablero-kpis` | `/api/concursales/tablero` | KPIs del tablero concursal |
| `conjuntos-config` | `/api/concursales/config` | Configuración de conjuntos (agrupadores, unificadores) |
| `carga-masiva` | `/api/admin/carga-masiva/dotacion` | Importación masiva de dotación desde Excel |
| `carga-masiva/pou` | `/api/admin/carga-masiva/pou` | Importación masiva de POU |
| `herramientas` | `/api/herramientas` | ERD, tablas admin, proxy hacia microservicio Python |

### 4.2 Rutas legacy en `src/routes/`

| Archivo | Base URL | Descripción |
|---|---|---|
| `authRoutes.js` | `/api/auth` | Login, logout, refresh token, me |
| `usersRoutes.js` | `/api/users` | CRUD de usuarios |
| `siglasRoutes.js` | `/api/siglas` | CRUD de siglas (efectores) |
| `personasRoutes.js` | `/api/personas` | CRUD de personas |
| `cargosRoutes.js` | `/api/cargos` | CRUD de cargos legacy |
| `organigramaRoutes.js` | `/api/organigrama` | Árbol de organigrama por sigla o sección |
| `recorridasRoutes.js` | `/api/recorridas` | Recorridas e informes por hospital |
| `minutasRoutes.js` | `/api/minutas` | Minutas estructuradas |
| `pouRoutes.js` | `/api/pou` | Planta Orgánica Unitaria |
| `dotacionTotalApiRoutes.js` | `/api/dotacion-total` | Vista global de dotación (desde `dot_resultado`) |
| `dotacionActivaRoutes.js` | `/api/dotacion-activa` | Dotación activa filtrada |
| `auditRoutes.js` | `/api/audit` | Logs de auditoría |
| `rolesRoutes.js` | `/api/roles` | CRUD de roles |
| `hospitalesApiRoutes.js` | `/api/hospitales` | Datos de hospitales |
| `tablasApiRoutes.js` | `/api/tablas` | Tablas de referencia |
| `seguridadApiRoutes.js` | `/api/seguridad` | Gestión de seguridad |
| `periodosRoutes.js` | `/api/periodos` | Períodos disponibles |

---

## 5. Módulos del frontend

El frontend es una SPA React con React Router v6. Todas las rutas protegidas están dentro de `AppLayout` (sidebar + header).

### 5.1 Páginas por módulo

| Carpeta | Rutas | Roles |
|---|---|---|
| `vista_usuario/` | `/` | Todos menos director |
| `vista_hospitales/` | `/hospitales`, `/hospitales/:code`, `/pou`, `/pou/:code` | Todos |
| `vista_organigrama/` | `/organigrama`, `/organigrama/:code`, `/organigrama/nivel-central`, `/organigrama/atencion-primaria` | Todos + autoridades |
| `vista_dotacion/` | `/dotacion` | Todos + autoridades |
| `vista_recorrida/` | `/recorridas` | Todos menos director |
| `vista_concursales/` | `/concursales/bajas`, `/concursales/seguimiento-cph`, `/concursales/seguimiento-ceetps`, `/concursales/tablero`, `/concursales/configuracion` | admin, editor, concursales, gerencia |
| `vista_alta_cargo/` | `/cargos`, `/cargos/lista`, `/cargos/kpis`, `/cargos/subir`, `/cargos/decreto`, `/cargos/pou` | admin, editor |
| `vista_seguridad/` | `/seguridad/*` | admin únicamente |
| `vista_herramientas/` | `/herramientas/*` | admin, editor |
| `vista_director/` | `/director` | director únicamente |
| `tablas_full/` | `/tablas/*` | admin, editor |

### 5.2 Estructura de una página típica

```
src/api/altaCargoApi.js       ← funciones fetch (getCarreras, createAlta, etc.)
src/pages/vista_alta_cargo/
  CargosPage.jsx              ← página contenedora con tabs
  AltaCargoPage.jsx           ← formulario de alta
  ListaCargosPage.jsx         ← tabla paginada con filtros
```

### 5.3 Autenticación en el frontend

- `AuthContext` almacena el usuario y `allowedModules` en memoria.
- `ProtectedRoute` verifica rol y módulo antes de renderizar.
- El access token se guarda en cookie `httpOnly` (manejado por el backend).
- El refresh token rota en cada uso — si se detecta reutilización, se revoca toda la familia.

---

## 6. Microservicio Python (Dotaneitor)

Servicio FastAPI independiente que procesa archivos Excel de dotación.

| Item | Valor |
|---|---|
| Puerto | 5001 |
| Health check | `GET /health` |
| Swagger | `GET /docs` |
| Ubicación | `app/python-service/` |
| Dockerfile | `Dockerfile` (raíz del proyecto) |

El backend Node actúa como **proxy**: todas las llamadas a `/api/herramientas/dotaneitor/*` se reenvían al servicio Python en `http://localhost:5001`.

### Flujo de procesamiento Dotaneitor

```
1. POST /session              → crea sesión en memoria (UUID)
2. POST /upload-cargos        → sube archivo Excel Cargos_Salud
3. POST /normalizar           → normaliza columnas y formatos
4. POST /procesar             → cruza con tablas de referencia de la BD
5. POST /cruzar               → completa especialidades por CUIL y agrupador
6. GET  /preview              → previsualiza resultado paginado
7. POST /guardar-bd           → persiste en dot_resultado + historial
8. GET  /descargar            → descarga Excel procesado
9. GET  /reporte-calidad      → descarga reporte de calidad en Excel
10. DELETE /session           → limpia sesión y archivos temporales
```

---

## 7. Base de datos — Tablas principales

Ver `Doc/ESQUEMA_BASE_DE_DATOS.md` para el detalle completo.

| Tabla | Descripción |
|---|---|
| `new_cargo` | Cargos del sistema (46.889 registros) — tabla central |
| `cargo_dotacion` | Ocupaciones activas de cargos (persona + cargo + período) |
| `cargos_alta` | Eventos de alta que originaron cargos |
| `dot_resultado` | Resultado del procesamiento Dotaneitor (padrón procesado) |
| `personas` | Personas del padrón (por período) |
| `roles` | Roles/cargos de personas por período |
| `siglas` | Efectores (hospitales, direcciones) |
| `organigramas` | Estructura jerárquica de cada efector |
| `carreras` | Escalafones (CPH, ENF, TEC, EG, AS, RG, SG, RES, DOC) |
| `users` | Usuarios del sistema |
| `audit_logs` | Log de auditoría de operaciones |
| `refresh_tokens` | Tokens de refresh activos |

---

## 8. Autenticación y seguridad

### JWT + Refresh Token rotativo

```
Login → access token (30 min) + refresh token (cookie httpOnly)
       ↓
Cada request → Authorization: Bearer <access_token>
       ↓
Expirado → POST /api/auth/refresh → nuevo access token + nuevo refresh token
       ↓
Reutilización detectada → revoca toda la familia → fuerza re-login
```

### Middlewares de seguridad

| Middleware | Función |
|---|---|
| `authenticateJWT` | Verifica y decodifica el JWT |
| `authorizeRoles(...roles)` | Verifica que el rol del usuario esté en la lista |
| `requirePermission(perm)` | Verifica permiso granular en tabla `permissions` |
| `auditMiddleware` | Registra la operación en `audit_logs` |
| `loginLimiter` | Rate limit específico para `/api/auth/login` |
| `heavyEndpointsLimiter` | Rate limit para endpoints costosos (organigrama) |

---

## 9. Flujo de datos — Alta de cargo

```
Frontend (CargosPage)
  → POST /api/cargos/alta
  → AltaCargoService.create()
      ├── Valida schema Zod
      ├── Calcula códigos únicos (#nextCodigos)
      │     └── SELECT MAX(codigo) WHERE codigo REGEXP prefix → incrementa seq
      ├── Transacción MySQL:
      │     ├── INSERT cargos_alta (encabezado del evento)
      │     ├── INSERT new_cargo × cantidad (un registro por cargo)
      │     └── INSERT registro_cph / registro_enf / registro_tec_* (detalle)
      └── CargoDotacionSyncService.syncNuevosDesdeAlta()
            └── INSERT cargo_dotacion (ocupación inicial si hay persona)
```

---

## 10. Flujo de datos — Sincronización de dotación

```
POST /api/dotacion/cargos/sincronizar
  → CargoDotacionSyncService.sincronizar()
      ├── Lee padrón desde dot_resultado (estado Activo/Bloqueado/Comision)
      ├── Compara con cargo_dotacion (registros con hasta IS NULL)
      ├── Para cada diferencia:
      │     ├── Nuevo en padrón → INSERT cargo_dotacion
      │     ├── Cambio de datos → UPDATE cargo_dotacion
      │     └── Ya no en padrón → UPDATE cargo_dotacion SET hasta = NOW()
      └── Retorna resumen: insertados, actualizados, cerrados
```

---

## 11. Variables de entorno

El archivo `.env.local` (desarrollo) y `.env` (producción/Docker) deben contener:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=dotacion_user
DB_PASSWORD=<password>
DB_NAME=dotacion_db

# JWT
JWT_SECRET=<secret>
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=<secret>

# App
NODE_ENV=development
PORT=3000
TRUST_PROXY=false

# Timeouts
HEAVY_QUERY_TIMEOUT=30000
```

---

## 12. Scripts disponibles

### Backend (`app/`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta con nodemon (hot reload) |
| `npm start` | Producción |
| `npm test` | Tests Jest |
| `npm run migrate` | Ejecuta migraciones pendientes |
| `npm run migrate:revert` | Revierte última migración |
| `npm run migrate:show` | Lista estado de migraciones |
| `npm run seed:users` | Crea usuarios iniciales |
| `npm run seed:carreras` | Carga catálogo de carreras |

### Frontend (`frontend/`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server Vite (puerto 5173) |
| `npm run build` | Build de producción → `app/public/spa/` |
| `npm run preview` | Preview del build |

### Scripts de migración (`app/scripts/`)

Los scripts `M1` a `M16` son migraciones de datos ejecutadas una sola vez. Ver `HISTORIAL_DESARROLLO.md` para el estado de cada uno.

---

## 13. CI/CD y Deploy

El pipeline `.gitlab-ci.yml` tiene dos stages:

1. `validate` — chequeo de sintaxis JS en contenedor Node efímero
2. `deploy` — solo en rama `develop`:
   - SSH a la VM de producción
   - `git pull origin develop`
   - `docker compose up -d --build app`

### Servicios Docker en producción

| Servicio | Puerto externo | Descripción |
|---|---|---|
| `app` (Node) | 8091 | Backend + SPA |
| `python-service` | 8092 | Microservicio Dotaneitor |
| `db` (MySQL) | — | Base de datos (sin puerto externo) |
| `adminer` | 8095 | Administrador de BD |

---

## 14. Convenciones de código

- **Módulos nuevos**: carpeta en `src/modules/` con `controller.js`, `routes.js`, `service.js`, `entity.ts`.
- **Validación**: siempre con Zod en el schema, aplicado via `validateBody()` middleware.
- **Queries**: SQL raw via `AppDataSource.query()` para queries complejas; TypeORM repository para CRUD simple.
- **Errores**: usar `createErrorHandler()` — no exponer stack en producción.
- **Logs**: usar `logger` de Winston, nunca `console.log` en producción.
- **Commits**: formato `módulo: descripción breve` (ej: `alta-cargo: fix duplicate entry en createAlta`).
- **Rama de trabajo**: `Desarrollo_Jorge`. No pushear directo a `develop`.
