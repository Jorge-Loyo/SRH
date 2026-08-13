# Referencia de API REST — Sistema de Gestión de Dotación GCABA

> Base URL: `http://localhost:3000/api`
> Autenticación: JWT via header `Authorization: Bearer <token>` o cookie `accessToken`
> Última actualización: 2026-08

---

## Convenciones

### Autenticación

Todos los endpoints (salvo `/auth/login`) requieren JWT válido.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Roles

| Rol | Descripción |
|---|---|
| `admin` | Acceso total |
| `editor` | Lectura y escritura, sin seguridad |
| `viewer` | Solo lectura |
| `gerencia` | Recorridas, dotación, organigrama |
| `concursales` | Módulo concursal + altas |
| `director` | Solo su hospital |
| `autoridades` | Organigrama y dotación |

### Respuestas de error comunes

| Código | Significado |
|---|---|
| `400` | Parámetros inválidos o faltantes |
| `401` | Token ausente o expirado |
| `403` | Rol sin permiso para la operación |
| `404` | Recurso no encontrado |
| `429` | Rate limit excedido (250 req/min) |
| `500` | Error interno del servidor |

---

## Auth — `/api/auth`

### POST /api/auth/login

Autentica un usuario y devuelve tokens.

**Rate limit:** 10 intentos / 15 min por IP.

**Body:**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Respuesta 200:**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "allowedModules": null
  }
}
```
> El refresh token se envía como cookie `httpOnly`.

**Errores:** `400` credenciales inválidas, `429` rate limit.

---

### GET /api/auth/me

Devuelve el usuario autenticado actual.

**Respuesta 200:**
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "allowedModules": null
}
```

---

### POST /api/auth/refresh

Renueva el access token usando el refresh token de la cookie.

**Rate limit:** 30 req/min por IP.

**Respuesta 200:**
```json
{ "accessToken": "<nuevo_jwt>" }
```

**Errores:** `401` refresh token inválido o reutilizado (revoca toda la familia).

---

### POST /api/auth/logout

Invalida el refresh token actual.

**Respuesta 200:**
```json
{ "message": "Logged out" }
```

---

## Alta de Cargo — `/api/cargos/alta`

Roles requeridos: `admin`, `editor` (lectura); `admin`, `editor`, `concursales` (escritura).

### GET /api/cargos/alta/carreras

Lista carreras disponibles con filtros opcionales.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `modo` | `ejecucion` \| `estructura` | Filtra por modo de alta |

**Respuesta 200:**
```json
[
  { "id": 1, "codigo": "CPH", "nombre": "Carrera Profesional Hospitalaria", "excluir_alta": 0, "solo_estructura": 1 },
  { "id": 2, "codigo": "ENF", "nombre": "Enfermería", "excluir_alta": 0, "solo_estructura": 0 }
]
```

---

### GET /api/cargos/alta/modalidades

Lista modalidades (planta/guardia).

**Respuesta 200:**
```json
[
  { "id": 1, "codigo": "planta", "nombre": "Planta (POF)" },
  { "id": 2, "codigo": "guardia", "nombre": "Guardia (POU)" }
]
```

---

### GET /api/cargos/alta/puestos

Lista puestos de cargo.

**Query params:** `carrera` (código), `modalidad` (código).

**Respuesta 200:**
```json
[
  { "id": 1, "nombre": "MEDICO DE PLANTA", "carrera": "CPH", "unificador": "CPH de Planta" }
]
```

---

### GET /api/cargos/alta/especialidades

Lista especialidades.

**Query params:** `puesto` (id), `carrera` (código).

**Respuesta 200:**
```json
[
  { "id": 1, "nombre": "CARDIOLOGIA" },
  { "id": 2, "nombre": "CLINICA MEDICA" }
]
```

---

### GET /api/cargos/alta/tipos-cargo

Lista tipos de cargo para modo estructura.

**Respuesta 200:**
```json
[
  { "id": 1, "codigo": "jefe", "nombre": "Jefe", "carrera": "CPH" },
  { "id": 2, "codigo": "director", "nombre": "Director", "carrera": "CPH" }
]
```

---

### GET /api/cargos/alta/jornadas

Lista jornadas (solo ENF).

**Respuesta 200:**
```json
[
  { "id": 1, "nombre": "Jornada completa" },
  { "id": 2, "nombre": "ATP" }
]
```

---

### GET /api/cargos/alta/siglas

Lista siglas (efectores) disponibles para alta.

**Respuesta 200:**
```json
[
  { "sigla": "HGACA", "nombre": "Hospital General de Agudos Carlos G. Durand" },
  { "sigla": "HGARM", "nombre": "Hospital General de Agudos Ramos Mejía" }
]
```

---

### GET /api/cargos/alta/etiquetas

Lista etiquetas (categorías internas).

**Respuesta 200:**
```json
[
  { "id": 1, "nombre": "BA", "descripcion": "Básico A" }
]
```

---

### POST /api/cargos/alta/etiquetas

Crea una nueva etiqueta. Roles: `admin`, `editor`.

**Body:**
```json
{ "nombre": "BC", "descripcion": "Básico C" }
```

**Respuesta 201:**
```json
{ "id": 3, "nombre": "BC", "descripcion": "Básico C" }
```

---

### GET /api/cargos/alta

Lista eventos de alta con paginación.

**Query params:** `page`, `limit`, `carrera`, `sigla`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "tipo_alta": "ejecucion",
      "documento": "EX-2026-001",
      "cantidad": 3,
      "fecha_registro": "2026-01-15"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/cargos/alta/:id

Detalle de un evento de alta.

**Respuesta 200:** objeto completo del alta con cargos generados.

**Errores:** `404` si no existe.

---

### POST /api/cargos/alta

Crea un nuevo evento de alta y genera los cargos. Roles: `admin`, `editor`, `concursales`.

**Body:**
```json
{
  "tipo_alta": "ejecucion",
  "carrera": "CPH",
  "modalidad_cod": "planta",
  "sigla": "HGACA",
  "cantidad": 2,
  "id_puesto": 1,
  "id_especialidad": 5,
  "documento": "EX-2026-001",
  "norma_referencia": "Ley 6035",
  "nro_resolucion": "RES-001/2026",
  "fecha_registro": "2026-01-15"
}
```

**Respuesta 201:**
```json
{
  "id_alta": 42,
  "codigos": ["CPH-POF-046890", "CPH-POF-046891"],
  "cantidad": 2
}
```

**Errores:** `400` validación Zod, `409` código duplicado.

---

### GET /api/cargos/alta/new-cargo

Lista cargos (`new_cargo`) con filtros y paginación.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `page` | number | Página (default 1) |
| `q` | string | Búsqueda por código o sigla |
| `carrera` | string | Código de carrera |
| `modalidad` | string | Código de modalidad |
| `tipoCph` | string | Tipo CPH (jefe, director, etc.) |
| `sigla` | string | Sigla del efector |
| `estado` | `vigente` \| `no_vigente` | Estado del cargo |
| `categoria` | string | Categoría interna |

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "codigo": "CPH-POF-000001",
      "carrera": "CPH",
      "sigla": "HGACA",
      "estado": "vigente",
      "antiguedad": "2020-03-01",
      "antiguedad_calc": "6 a 5 m",
      "situacion_revista": null
    }
  ],
  "total": 46889,
  "page": 1,
  "limit": 50
}
```

---

### GET /api/cargos/alta/new-cargo/export

Exporta la lista de cargos a Excel (.xlsx).

**Query params:** mismos filtros que `GET /new-cargo`.

**Respuesta:** archivo `.xlsx` como descarga.

---

### GET /api/cargos/alta/new-cargo/:id

Detalle completo de un cargo.

**Respuesta 200:**
```json
{
  "id": 1,
  "codigo": "CPH-POF-000001",
  "carrera": "CPH",
  "sigla": "HGACA",
  "puesto": "MEDICO DE PLANTA",
  "especialidad": "CARDIOLOGIA",
  "antiguedad": "2020-03-01",
  "antiguedad_calc": "6 a 5 m",
  "situacion_revista": "activo",
  "norma_referencia": "Ley 6035"
}
```

---

### PATCH /api/cargos/alta/new-cargo/:id

Actualiza campos editables de un cargo. Roles: `admin`, `editor`.

**Body (campos permitidos):**
```json
{
  "sigla": "HGARM",
  "situacion_revista": "retencion_cargo",
  "id_etiqueta": 2
}
```

**Respuesta 200:** cargo actualizado.

---

### GET /api/cargos/alta/dotacion-kpis

KPIs de dotación del módulo de cargos.

**Respuesta 200:**
```json
{
  "total": 46889,
  "vigentes": 46889,
  "no_vigentes": 0,
  "por_carrera": [
    { "carrera": "CPH", "total": 12500 },
    { "carrera": "ENF", "total": 18000 }
  ]
}
```

---

## Dotación — `/api/dotacion`

Roles requeridos: `admin`, `editor`.

### GET /api/dotacion/kpis

KPIs globales de dotación desde `dot_resultado`.

**Respuesta 200:**
```json
{
  "globales": {
    "total": 46889,
    "activos": 45100,
    "retencion": 1766,
    "comision": 23,
    "mujeres": 28000,
    "varones": 18889,
    "efectores": 33
  },
  "porEscalafon": [
    { "escalafon": "CPH", "total": 12500 }
  ],
  "porSitRevista": [
    { "situacion": "Activo", "total": 45100 }
  ],
  "topEfectores": [
    { "sigla": "HGACA", "total": 2100 }
  ]
}
```

---

### GET /api/dotacion/estado

Estado de la última sincronización y totales del padrón.

**Respuesta 200:**
```json
{
  "ultima_sync": "2026-08-01T10:00:00Z",
  "total_dot_resultado": 46889,
  "total_cargo_dotacion": 46889
}
```

---

### POST /api/dotacion/cargos/sincronizar

Sincroniza `dot_resultado` → `cargo_dotacion`.

**Respuesta 200:**
```json
{
  "insertados": 12,
  "actualizados": 45,
  "cerrados": 3,
  "sin_cambios": 46829
}
```

---

### GET /api/dotacion/cargos/estado

Estado de la sincronización de `cargo_dotacion`.

**Respuesta 200:**
```json
{
  "total_activos": 46889,
  "ultima_sync": "2026-08-01T10:00:00Z"
}
```

---

## Organigrama — `/api/organigrama`

### GET /api/organigrama

Devuelve el árbol jerárquico de un efector o sección.

**Rate limit:** endpoint pesado con limiter propio.

**Query params:**

| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `sigla` | string | Sí (o `seccion`) | Código del efector (ej: `HGACA`) |
| `seccion` | string | Sí (o `sigla`) | `nivel-central` o `atencion-primaria` |
| `periodo` | string | No | Formato `YYYY-MM` para incluir personas |

**Respuesta 200:**
```json
{
  "sigla": "HGACA",
  "data": {
    "id": "DHOS-001",
    "name": "Dirección Hospital",
    "title": "DHOS",
    "lvl": 1,
    "persona": {
      "nombre": "GARCIA, JUAN",
      "cargo": "DIRECTOR MEDICO",
      "cuil": "20-12345678-9"
    },
    "children": [...]
  }
}
```

**Errores:** `400` sigla/sección inválida, `404` sin organigrama para esa sigla.

---

## Bajas Consolidadas — `/api/concursales/bajas`

Roles: `admin`, `editor`, `gerencia`, `concursales` (lectura); `admin`, `editor`, `gerencia` (escritura).

### GET /api/concursales/bajas

Lista bajas con filtros y paginación.

**Query params:** `page`, `limit`, `sigla`, `estado`, `origen`, `q`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "id_sial": "12345",
      "ayn": "GARCIA, JUAN",
      "sigla": "HGACA",
      "motivo_baja": "Renuncia",
      "fecha_baja": "2026-01-10",
      "estado": "ACTIVO"
    }
  ],
  "total": 320,
  "page": 1
}
```

---

### GET /api/concursales/bajas/:id

Detalle de una baja.

---

### POST /api/concursales/bajas

Crea una baja. Dispara automáticamente la creación del seguimiento CPH si corresponde.

**Body:**
```json
{
  "id_sial": "12345",
  "sigla": "HGACA",
  "motivo_baja": "Renuncia",
  "fecha_baja": "2026-01-10",
  "origen": "Alta por Baja"
}
```

**Respuesta 201:** baja creada con `id`.

---

### PUT /api/concursales/bajas/:id

Actualiza una baja existente.

---

### DELETE /api/concursales/bajas/:id

Elimina una baja.

---

## Seguimiento CPH — `/api/concursales/seguimiento-cph`

Roles: `admin`, `editor`, `gerencia`, `concursales` (lectura); `admin`, `editor`, `gerencia` (escritura).

### GET /api/concursales/seguimiento-cph

Lista seguimientos con filtros y paginación.

**Query params:** `page`, `limit`, `sigla`, `estado`, `sub_estado`, `q`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "id_baja": 1,
      "sigla": "HGACA",
      "estado": "ACTIVO",
      "sub_estado": "C-INSCRIPCION",
      "especialidad_baja": "CARDIOLOGIA",
      "especialidad_solicitada": "CARDIOLOGIA",
      "cambio_especialidad": "NO"
    }
  ],
  "total": 180
}
```

---

### GET /api/concursales/seguimiento-cph/estados/unique

Lista de estados únicos presentes en los seguimientos.

---

### GET /api/concursales/seguimiento-cph/stats/by-efector

Estadísticas agrupadas por efector.

---

### GET /api/concursales/seguimiento-cph/by-baja/:idBaja

Seguimiento asociado a una baja específica.

---

### GET /api/concursales/seguimiento-cph/:id

Detalle de un seguimiento.

---

### POST /api/concursales/seguimiento-cph

Crea un seguimiento manualmente (normalmente se crea automáticamente desde `/bajas`).

---

### PUT /api/concursales/seguimiento-cph/:id

Actualiza estados, fechas y observaciones del seguimiento.

---

### DELETE /api/concursales/seguimiento-cph/:id

Elimina un seguimiento.

---

## Seguimiento CEETPS — `/api/concursales/seguimiento-ceetps`

Roles: `can_create`, `can_update`, `can_delete` (permisos granulares).

### GET /api/concursales/seguimiento-ceetps

Lista seguimientos CEETPS con filtros.

**Query params:** `page`, `limit`, `sigla`, `escalafon`, `estado`.

---

### GET /api/concursales/seguimiento-ceetps/by-baja/:idBaja

Seguimiento CEETPS asociado a una baja.

---

### GET /api/concursales/seguimiento-ceetps/:id

Detalle de un seguimiento CEETPS.

---

### POST / PUT / DELETE /api/concursales/seguimiento-ceetps[/:id]

CRUD estándar con auditoría.

---

## Dotación Total — `/api/dotacion-total`

Roles: todos excepto sin autenticación.

### GET /api/dotacion-total

Vista global de dotación desde `dot_resultado`.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `periodo` | `YYYY-MM` | Período a consultar |
| `page` | number | Paginación |
| `perPage` | number | Registros por página |
| `sortBy` | string | Campo de ordenamiento |
| `sortDir` | `asc` \| `desc` | Dirección |
| `sigla` | string | Filtro por efector |
| `universo_totalizador` | string | Filtro por universo |
| `tipo_hospital_sigla` | string | Tipo de hospital |
| `escalafon` | string | Escalafón |
| `especialidad` | string | Especialidad |
| `export` | `xlsx` | Descarga Excel (no disponible para `autoridades`) |

**Respuesta 200:**
```json
{
  "data": [...],
  "total": 46889,
  "page": 1,
  "perPage": 50
}
```

---

## POU — `/api/pou`

### GET /api/pou

Lista registros POU con filtros.

### GET /api/pou/periodos

Lista períodos disponibles en POU.

### GET /api/pou/hospitales

Lista hospitales con datos POU.

### GET /api/pou/comparar

Comparativa entre dos períodos POU.

**Query params:** `periodo1`, `periodo2`, `sigla`.

### GET /api/pou/comparar/export

Exporta comparativa a Excel.

### GET /api/pou/export

Exporta POU a Excel.

### GET /api/pou/:id/:periodo

Detalle de un registro POU.

---

## Recorridas — `/api/recorridas`

Roles: `admin`, `editor`, `viewer`, `gerencia`, `concursales`.

### GET /api/recorridas

Lista recorridas con paginación.

**Query params:** `page`, `limit`, `hospital_code`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "hospital_code": "HGACA",
      "titulo": "Recorrida enero 2026",
      "contenido": "<p>...</p>",
      "created_at": "2026-01-20T09:00:00Z"
    }
  ],
  "total": 45
}
```

---

### GET /api/recorridas/:id

Detalle de una recorrida.

---

### POST /api/recorridas

Crea una recorrida. Roles: `admin`, `editor`, `viewer`, `gerencia`.

**Body:**
```json
{
  "hospital_code": "HGACA",
  "titulo": "Recorrida enero 2026",
  "contenido": "<p>Contenido HTML...</p>"
}
```

---

### PUT /api/recorridas/:id

Actualiza una recorrida.

---

### DELETE /api/recorridas/:id

Elimina una recorrida. Roles: `admin`, `editor`, `gerencia`.

---

## Usuarios — `/api/users`

Requiere permiso `can_manage_users`.

### GET /api/users

Lista usuarios del sistema.

### GET /api/users/:id

Detalle de un usuario.

### POST /api/users

Crea un usuario.

**Body:**
```json
{
  "username": "jperez",
  "email": "jperez@gcaba.gob.ar",
  "password": "<password>",
  "role": "editor"
}
```

### PUT /api/users/:id

Actualiza un usuario.

### DELETE /api/users/:id

Elimina un usuario.

---

## Auditoría — `/api/audit`

Requiere permiso `can_view_audit`.

### GET /api/audit

Lista logs de auditoría con filtros.

**Query params:** `page`, `limit`, `user`, `action`, `from`, `to`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": 1,
      "user": "admin",
      "action": "POST /api/cargos/alta",
      "ip": "192.168.1.1",
      "timestamp": "2026-08-01T10:00:00Z",
      "body": "{...}"
    }
  ],
  "total": 5000
}
```

---

### POST /api/audit/purge

Purga logs de auditoría anteriores a una fecha.

**Body:**
```json
{ "before": "2026-01-01" }
```

---

## Herramientas — `/api/herramientas`

Roles: `admin`, `editor`.

### GET /api/herramientas/erd

Devuelve el esquema ERD de la base de datos.

### GET /api/herramientas/table/:tableName

Devuelve datos de una tabla de referencia.

### GET /api/herramientas/admin/tables

Lista tablas administrables.

### POST /api/herramientas/admin/:tableName

Inserta un registro en una tabla administrable.

### PUT /api/herramientas/admin/:tableName/:id

Actualiza un registro.

### DELETE /api/herramientas/admin/:tableName/:id

Elimina un registro.

### ALL /api/herramientas/dotaneitor/*

Proxy hacia el microservicio Python en `http://localhost:5001`. Ver sección de API Python más abajo.

---

## Microservicio Python — `http://localhost:5001`

> Accesible desde el backend via proxy en `/api/herramientas/dotaneitor/*`
> Swagger disponible en `http://localhost:5001/docs`

### GET /health

```json
{ "status": "ok", "service": "dotaneitor" }
```

---

### POST /session

Crea una sesión de procesamiento.

**Respuesta 200:**
```json
{ "session_id": "uuid-v4" }
```

---

### POST /upload-cargos

Sube el archivo Excel `Cargos_Salud`.

**Form-data:** `session_id` (string), `file` (Excel .xlsx).

**Respuesta 200:**
```json
{ "filename": "Cargos_Salud.xlsx", "rows": 46889 }
```

---

### POST /normalizar

Normaliza columnas y formatos del archivo subido.

**Body:** `{ "session_id": "uuid" }`

**Respuesta 200:**
```json
{
  "logs": [
    { "text": "✓ Normalización completada", "type": "success" },
    { "text": "Columna NUM_DOC: 12 valores corregidos", "type": "info" }
  ]
}
```

---

### POST /procesar

Cruza el archivo con tablas de referencia de la BD (siglas, agrupadores, unificadores).

**Body:** `{ "session_id": "uuid" }`

**Respuesta 200:**
```json
{
  "logs": [
    { "text": "✓ 46889 registros procesados", "type": "success" },
    { "text": "[!] 23 filas sin SIGLA reconocida", "type": "warning" }
  ]
}
```

---

### POST /cruzar

Completa especialidades por CUIL y por agrupador.

**Body:** `{ "session_id": "uuid" }`

**Respuesta 200:**
```json
{
  "logs": [
    { "text": "✓ Huecos completados por CUIL: 1240", "type": "success" }
  ]
}
```

---

### GET /preview

Previsualiza el resultado procesado (paginado).

**Query params:** `session_id`, `page` (default 1), `limit` (default 50, max 200).

**Respuesta 200:**
```json
{
  "cols": ["ID SIAL", "CUIL", "AYN", "SIGLAS", ...],
  "rows": [...],
  "total": 46889,
  "page": 1,
  "limit": 50
}
```

---

### POST /guardar-bd

Persiste el resultado en `dot_resultado` con historial de cambios.

**Body:** `{ "session_id": "uuid" }`

**Respuesta 200:**
```json
{
  "proceso_id": "uuid",
  "insertados": 5,
  "registros_actualizados": 120,
  "campos_modificados": 340,
  "eliminados": 2
}
```

---

### GET /descargar

Descarga el resultado procesado como Excel.

**Query params:** `session_id`

**Respuesta:** archivo `Dotacion_procesada.xlsx`.

---

### GET /reporte-calidad

Descarga reporte de calidad de datos en Excel (4 hojas: Resumen, Detalle, Completitud por columna, Completitud por fila).

**Query params:** `session_id`

**Respuesta:** archivo `Reporte_calidad.xlsx`.

---

### GET /historial

Lista los últimos procesos de guardado en BD.

**Query params:** `limit` (default 10, max 50).

**Respuesta 200:**
```json
[
  {
    "proceso_id": "uuid",
    "fecha": "2026-08-01T10:00:00",
    "insertados": 5,
    "eliminados": 2,
    "campos_modificados": 340,
    "registros_actualizados": 120,
    "cambios": [...]
  }
]
```

---

### GET /ultima-actualizacion

Fecha del último registro guardado en `dot_resultado`.

**Respuesta 200:**
```json
{ "ultima": "2026-08-01T10:00:00" }
```

---

### DELETE /session

Elimina la sesión y archivos temporales.

**Body:** `{ "session_id": "uuid" }`

**Respuesta 200:**
```json
{ "ok": true }
```
