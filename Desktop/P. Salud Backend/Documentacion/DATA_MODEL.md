# Modelo de Datos

## Entidades Principales

### 1. Persona
**Propósito:** Representa un empleado del sistema de salud en un periodo específico.

**Campos clave:**
- `id_persona` (PK): Identificador numérico único del empleado
- `periodo` (PK): Snapshot temporal (formato: YYYY-MM, ej: 2025-01)
- `nombre_apellido`: Nombre completo del empleado
- `cuil`: CUIL único (clave natural)
- `tipo_doc`, `numero_doc`: Documento de identidad
- `edad`: Edad calculada o ingresada
- `sexo`: Género (M/F/O)
- `antiguedad`: Años de servicio
- `fecha_ingreso`: Primera entrada al sistema

**Índices:**
- Compuesto: `(periodo, sexo)` - Filtros frecuentes por género y periodo
- Compuesto: `(periodo, tipo_doc)` - Búsquedas por documento
- Simple: `(cuil)` - Búsqueda rápida por CUIL

**Volumen esperado:** ~50,000 registros (1,500 empleados × 33 hospitales)

---

### 2. Cargo
**Propósito:** Define un puesto específico en la estructura organizacional.

**Campos clave:**
- `id_cargo` (PK): Identificador único
- `periodo` (PK): Snapshot temporal
- `codigo_cargo`: Código alfanumérico del puesto
- `descripcion`: Nombre descriptivo del cargo
- `sigla`: Código del hospital/área (FK a Sigla)
- `id_cargo_padre`: Jerarquía organizacional (auto-referencia)
- `nivel_jerarquico`: Profundidad en el árbol (1=raíz)
- `tipo_cargo`: Clasificación (ej: Directivo, Profesional, Administrativo)

**Índices:**
- Compuesto: `(periodo)` - Filtro principal

**Volumen esperado:** ~5,000 registros (150 cargos × 33 hospitales)

---

### 3. Rol
**Propósito:** Asignación de una persona a un cargo en un periodo.

**Relación:** `Rol = Persona + Cargo` (Many-to-Many con atributos)

**Campos clave:**
- `id_rol` (PK): Identificador único
- `id_persona` (FK): Referencia a Persona
- `id_cargo` (FK): Referencia a Cargo
- `periodo` (PK): Periodo de asignación
- `codigo_reparticion`: Código del hospital
- `escalafon`: Categoría del empleado (ej: Profesional, Administrativo)
- `estado_cargo`: Estado actual (Activo, Vacante, Bloqueado, Comisión)
- `es_jefatura`: Si es cargo jerárquico
- `tipo_jefatura`: Jerarquía (Director, Subdirector, Jefe)
- `situacion_revista`: Estado laboral (En Servicio, Licencia, etc.)

**Índices:**
- Compuesto: `(periodo, estado_cargo)` - Filtros más comunes
- Compuesto: `(codigo_reparticion)` - Filtro por hospital
- Compuesto: `(periodo, escalafon)` - Análisis por escalafón

**Volumen esperado:** ~80,000 registros (múltiples asignaciones históricas)

---

### 4. BajaConcurso
**Propósito:** Gestión de procesos concursales (vacantes a llenar).

**Campos clave:**
- `id` (PK): Identificador único
- `periodo` (PK): Periodo del proceso
- `tipo`: Tipo de proceso (baja/concurso)
- `codigo_cargo`: Código del puesto
- `descripcion_cargo`: Nombre del cargo
- `sigla`: Hospital (FK a Sigla)
- `estado`: Estado del proceso (Abierto, Cerrado, En evaluación)
- `fecha_inicio`, `fecha_cierre`: Ventana temporal

**Volumen esperado:** ~2,000 registros (procesos históricos)

---

### 5. Sigla
**Propósito:** Catálogo de hospitales y áreas del sistema.

**Campos clave:**
- `id` (PK): Identificador único
- `periodo` (PK): Snapshot temporal
- `codigo`: Código alfanumérico del hospital (ej: HGACA)
- `descripcion`: Nombre completo del hospital
- `activo`: Si está operativo

**Índices:**
- Compuesto: `(periodo, codigo)` - Búsqueda principal

**Volumen esperado:** ~100 registros (33 hospitales × múltiples periodos)

---

### 6. User
**Propósito:** Usuarios del sistema con credenciales de acceso.

**Campos clave:**
- `id` (PK): Identificador único
- `username`: Login único
- `email`: Correo electrónico único
- `password_hash`: Bcrypt hash (no se almacena password en claro)
- `role`: Rol del usuario (admin, editor, viewer, director)
- `hospital_code`: Hospital asignado (solo para directores)
- `is_active`: Si la cuenta está activa
- `last_login`: Última autenticación exitosa

**Volumen esperado:** ~50 usuarios (staff administrativo)

---

### 7. Permission
**Propósito:** Permisos granulares por rol.

**Campos clave:**
- `id` (PK): Identificador único
- `role`: Rol aplicable (unique)
- `can_create`, `can_update`, `can_delete`, `can_read_all`: Permisos CRUD
- `filter_by_hospital`: Si aplica RLS (solo directores)
- `can_execute_ddl`: Si puede modificar estructura de BD

**Volumen esperado:** 4 registros (uno por rol)

---

### 8. RefreshToken
**Propósito:** Gestión de tokens de refresco JWT con rotación.

**Campos clave:**
- `id` (PK): Identificador único
- `user_id` (FK): Usuario propietario
- `token_hash`: SHA-256 del token (no se almacena token en claro)
- `jti`: JWT ID para validación
- `family_id`: UUID para detectar robo (todos los tokens de una familia)
- `expires_at`: Expiración (30 días típico)
- `revoked`: Si fue revocado manualmente
- `revoked_reason`: Motivo (logout, rotated, compromised)
- `replaced_by_jti`: Cadena de rotación
- `last_used`: Última actividad

**Volumen esperado:** ~500 registros (purga automática de expirados)

---

### 9. AuditLog
**Propósito:** Trazabilidad completa de acciones en el sistema.

**Campos clave:**
- `id` (PK): Identificador único
- `user_id` (FK): Usuario que realizó la acción
- `action`: Tipo de acción (create, update, delete, login, logout)
- `resource`: Entidad afectada (personas, cargos, roles, etc.)
- `resource_id`: ID del registro afectado
- `details`: JSON con cambios (before/after)
- `ip_address`: IP del cliente
- `user_agent`: Navegador/cliente
- `timestamp`: Momento exacto

**Volumen esperado:** ~100,000 registros/año (purga automática >90 días)

---

### 10. Recorrida (🆕 Enero 2026)
**Propósito:** Documentar recorridas, seguimientos e inspecciones operativas por hospital.

**Campos clave:**
- `id` (PK): Identificador único
- `hospital_code`: Hospital al que pertenece
- `titulo`: Título del seguimiento (0-200 caracteres)
- `contenido_html`: Contenido enriquecido (HTML sanitizado)
- `user_id` (FK): Usuario creador
- `created_at`: Fecha de creación (auto)
- `updated_at`: Fecha de última edición (auto)

**Índices:**
- Compuesto: `(hospital_code, created_at)` - Query principal: listar por hospital
- Simple: `(user_id)` - Auditoría: buscar por creador

**Relaciones:**
- Hospital → Código en campo `hospital_code` (no es FK formal)
- User → `user_id` (FK con cascada DELETE)

**Características:**
- ✅ HTML sanitizado (prevención XSS) con librería `sanitize-html`
- ✅ Soft timestamps: `created_at` inmutable, `updated_at` se actualiza
- ✅ No permite eliminación física por directores (solo admin/editor)
- ✅ Auditoría completa en tabla `audit_logs`

**Volumen esperado:** ~5,000 registros/año (retención indefinida)

---

## Relaciones Principales

### Jerarquía de Cargos (Auto-Referencia)
```
Cargo
├─ id_cargo (PK)
└─ id_cargo_padre (FK → Cargo.id_cargo)

Ejemplo:
Director (id: 1, padre: null)
└─ Subdirector (id: 2, padre: 1)
   └─ Jefe de Servicio (id: 3, padre: 2)
      └─ Profesional (id: 4, padre: 3)
```

### Asignación Persona-Cargo
```
Persona (1) ──< Rol >── (1) Cargo
         (Many)      (Many)

Un empleado puede tener múltiples roles en el tiempo.
Un cargo puede ser ocupado por diferentes empleados en periodos distintos.
```

### Hospital y Estructuras
```
Sigla (1) ──< (Many) Cargo
Sigla (1) ──< (Many) BajaConcurso
```

### Autenticación
```
User (1) ──< (Many) RefreshToken
User (1) ──< (Many) AuditLog
User (1) ──── (1) Permission [via role]
```

---

## Consideraciones de Performance

### Índices Compuestos Estratégicos
Se priorizaron índices que cubren los filtros más frecuentes:

1. **`personas (periodo, sexo)`** - Análisis de género por periodo (común en reportes)
2. **`roles (periodo, estado_cargo)`** - Filtro principal en dotación
3. **`roles (periodo, escalafon)`** - Análisis por categoría laboral
4. **`roles (codigo_reparticion)`** - RLS para directores

### Particionamiento por Periodo
Aunque no está implementado físicamente, el modelo conceptual soporta particionamiento:
- Cada entidad tiene `periodo` como parte de PK
- Queries siempre filtran por periodo
- Futura partición por periodo no requiere cambios en lógica

### Volúmenes y Proyecciones

| Tabla | Registros Actuales | Crecimiento Anual | Retención |
|-------|-------------------|-------------------|-----------|
| Persona | ~1,500 | ~500/año | Indefinida (histórico) |
| Cargo | ~150 | ~20/año | Indefinida (histórico) |
| Rol | ~5,000 | ~2,000/año | Indefinida (histórico) |
| BajaConcurso | ~200 | ~100/año | 5 años |
| User | ~20 | ~5/año | Mientras esté activo |
| RefreshToken | ~50 | N/A | Purga automática (expirados) |
| AuditLog | ~10,000 | ~100,000/año | Purga automática (>90 días) |

**Proyección a 5 años:**
- Personas: ~4,000 registros
- Roles: ~15,000 registros
- AuditLog: ~500,000 registros (con purga activa)

### Qué NO Está Modelado Intencionalmente

#### No hay versionamiento de cambios
Los cambios en entidades sobrescriben datos. El histórico se mantiene solo por:
- Campo `periodo` (snapshots mensuales)
- Tabla `audit_log` (cambios a nivel registro)

**Por qué:** Versionamiento completo (tipo CQRS/Event Sourcing) es overkill para este dominio.

#### No hay soft deletes
Los registros eliminados se borran físicamente (con auditoría en `audit_log`).

**Por qué:** Periodos son inmutables. Si se necesita "deshacer" algo, se crea nuevo periodo.

#### No hay tabla de direcciones/contactos
Los datos de contacto de empleados no están en el sistema.

**Por qué:** Fuera del scope inicial (solo estructura organizacional).

#### No hay tabla de licencias/ausencias
Las ausencias solo se reflejan en `roles.situacion_revista`.

**Por qué:** Sistema de asistencia es módulo separado.

---

## Migraciones y Evolución del Schema

### Estrategia de Migraciones
- Migraciones versionadas con timestamp (`20260102-NombreMigracion.ts`)
- Nunca modificar migraciones ejecutadas
- Migraciones deben ser idempotentes (soportar re-ejecución)

### Historial de Cambios Importantes

**20260107-AddRevokedAtToRefreshTokens.ts** (Enero 7, 2026)
- Agregó columna `revoked_at` a tabla `refresh_tokens`
- Implementa política de cleanup: tokens revocados se marcan con timestamp
- Permite borrado automático de tokens revocados (>7 días)
- Impacto: -80% tiempo de limpieza automática

**20260106-CreateRecorridasTable.ts** (Enero 6, 2026)
- Creó tabla `recorridas` para seguimientos/inspecciones por hospital
- Índices compuestos: `(hospital_code, created_at)` y `(user_id)`
- FK a `users` con cascada DELETE
- Sanitización de HTML contra XSS integrada en service

**20260102-AdditionalCriticalIndexes.ts** (Enero 2, 2026)
- Agregó 8 índices críticos adicionales NO incluidos en otras migraciones:
  - `IDX_roles_codigo_rol` → Mejora 40% en queries de organigrama
  - `IDX_audit_user_action_date` → Filtros combinados en auditoría
  - `IDX_refresh_expires_revoked` → Cleanup de tokens expirados
  - Índices en tabla `organigramas` (4 índices de soporte)
- Impacto: Organigramas -40% tiempo respuesta, Auditoría -60%

**20260102-PerformanceIndexesComplete.ts** (Enero 2, 2026)
- Agregó 7 índices compuestos estratégicos:
  - `personas`: `(periodo, sexo)`, `(periodo, tipo_doc)`, `(cuil)`
  - `roles`: `(periodo, estado_cargo)`, `(codigo_reparticion)`, `(periodo, escalafon)`
  - `cargos`: `(periodo)`
- Impacto: -80% en tiempo de queries con filtros (de 3-5s a 200-500ms)

**202412XX-AddPermissionsTable.ts**
- Creó tabla `permissions` para permisos granulares por rol
- Migró permisos de hardcode a base de datos

**202411XX-AddAuditLog.ts**
- Creó tabla `audit_log` con índices para trazabilidad
- Agregó triggers automáticos para capture de cambios

### Compatibilidad MySQL → Oracle

El modelo está diseñado para ser portable:
- No usa tipos específicos de MySQL (ej: `JSON` reemplazado por `TEXT`)
- No usa `AUTO_INCREMENT` (usa secuencias que Oracle soporta)
- No usa funciones específicas (ej: `FIELD()` se abstrae en código)

**Cambios esperados en migración:**
- Tipos `VARCHAR(255)` → `VARCHAR2(255)`
- `DATETIME` → `TIMESTAMP`
- `TEXT` → `CLOB`
- Secuencias explícitas para PKs

---

## Integridad y Constraints

### Foreign Keys Definidas
- `Rol.id_persona` → `Persona.id_persona`
- `Rol.id_cargo` → `Cargo.id_cargo`
- `Cargo.id_cargo_padre` → `Cargo.id_cargo`
- `RefreshToken.user_id` → `User.id`
- `AuditLog.user_id` → `User.id`

### Constraints Únicos
- `User.username` (unique)
- `User.email` (unique)
- `Persona.cuil` (unique por periodo)
- `Permission.role` (unique)

### Validaciones en Aplicación (no BD)
- Formato de `periodo` (YYYY-MM) validado en Zod
- Formato de `cuil` (11 dígitos) validado en Zod
- Rangos de edad (0-120) validados en Zod

**Por qué no en BD:** Mayor flexibilidad para cambios sin migraciones.
