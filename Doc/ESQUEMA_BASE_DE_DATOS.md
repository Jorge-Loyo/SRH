# Esquema de Base de Datos — Sistema de Gestión de Dotación GCABA

> Motor: MySQL 8.0 | Base: `dotacion_db` | Charset: `utf8mb4`
> Última actualización: 2026-08

---

## 1. Mapa general de tablas

| Grupo | Tablas |
|---|---|
| Núcleo de cargos | `new_cargo`, `cargos_alta`, `registro_cph`, `registro_enf`, `registro_tec_pou`, `registro_tec_pof` |
| Catálogos de cargos | `carreras`, `modalidades`, `puestos_cargo`, `especialidades`, `jornadas`, `tipos_cargo`, `cargo_etiquetas` |
| Dotación normalizada | `personas_dotacion`, `cargo_dotacion` |
| Padrón procesado | `dot_resultado`, `dot_resultado_historial` |
| Tablas de referencia Dotaneitor | `dot_agrupador`, `dot_unificador_puestos`, `dot_especialidades` |
| Padrón legacy (por período) | `personas`, `cargos`, `roles` |
| Efectores y estructura | `siglas`, `organigramas`, `pou` |
| Módulo concursal | `bajas_consolidadas`, `seguimiento_cph`, `seguimiento_ceetps` |
| Configuración | `conjuntos_config` |
| Seguridad | `users`, `permissions`, `module_permissions`, `custom_roles`, `refresh_tokens` |
| Auditoría | `audit_logs` |
| Contenido | `recorridas`, `minutas` |

---

## 2. Núcleo de cargos

### 2.1 `new_cargo` — Tabla central del sistema

Contiene los 46.889 cargos del sistema de salud GCABA. Es la fuente de verdad de la estructura de cargos.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | INT UNSIGNED PK | No | Autoincremental |
| `codigo` | VARCHAR(30) UNIQUE | No | Código único del cargo (ej: `CPH-POF-000001`) |
| `id_sial` | VARCHAR(50) | Sí | ID en el sistema SIAL (fuente externa) |
| `id_alta` | INT | Sí | FK → `cargos_alta.id` (null en 46.889 históricos) |
| `id_carrera` | INT | Sí | FK → `carreras.id` |
| `id_modalidad` | INT | Sí | FK → `modalidades.id` (null para ENF, EG, AS) |
| `id_puesto` | INT | Sí | FK → `puestos_cargo.id` (null para ENF, AS) |
| `id_especialidad` | INT | Sí | FK → `especialidades.id` |
| `id_jornada` | INT | Sí | FK → `jornadas.id` (solo ENF) |
| `id_tipo_cargo` | INT | Sí | FK → `tipos_cargo.id` (solo estructura) |
| `id_etiqueta` | INT | Sí | FK → `cargo_etiquetas.id` |
| `sigla` | VARCHAR(20) | Sí | Código del efector (ej: `HGACA`) |
| `estado` | ENUM | No | `vigente` \| `no_vigente` |
| `carrera` | VARCHAR(20) | Sí | Texto redundante (legacy, mantener por compatibilidad) |
| `modalidad` | VARCHAR(20) | Sí | Texto redundante (legacy) |
| `puesto` | VARCHAR(150) | Sí | Texto redundante (legacy) |
| `especialidad` | VARCHAR(150) | Sí | Texto redundante (legacy) |
| `tipo_cargo` | VARCHAR(50) | Sí | Texto redundante (legacy) |
| `categoria_interna` | VARCHAR(50) | Sí | Texto redundante de `id_etiqueta` (legacy) |
| `situacion_revista` | ENUM | Sí | `activo` \| `retencion_cargo` \| `comision` (solo CPH jefe/director) |
| `antiguedad` | DATE | Sí | **LEGACY** — migrado a `cargo_dotacion.antiguedad` en M11 |
| `norma_referencia` | VARCHAR(100) | Sí | Norma legal del cargo |
| `nro_resolucion` | VARCHAR(100) | Sí | Número de resolución |
| `documento_origen` | VARCHAR(100) | Sí | Documento de origen |
| `created_at` | DATETIME | No | Fecha de creación |
| `updated_at` | TIMESTAMP | No | Última modificación |

**Índices:** `codigo` (UNIQUE), `id_sial`, `sigla`, `estado`, `id_carrera`

**Notas de diseño:**
- Los campos texto (`carrera`, `modalidad`, `puesto`, `especialidad`) son redundantes con las FKs. Se mantienen por compatibilidad con el padrón legacy. Pendiente eliminar en M10 fase 2.
- `situacion_revista` y `antiguedad` son atributos de la **ocupación**, no del cargo. Están en esta tabla por razones históricas. La fuente de verdad actual es `cargo_dotacion`.
- `id_alta` es NULL en los 46.889 cargos históricos importados antes de implementar el módulo de alta.

---

### 2.2 `cargos_alta` — Eventos de alta

Cada fila representa un evento administrativo que originó uno o más cargos.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | INT PK | No | Autoincremental |
| `fecha_registro` | DATETIME | No | Fecha del evento (auto) |
| `tipo_alta` | ENUM | No | `ejecucion` \| `estructura` |
| `documento` | VARCHAR(100) | Sí | Número de expediente |
| `cantidad` | INT UNSIGNED | No | Cantidad de cargos creados (default 1) |
| `norma_referencia` | VARCHAR(100) | Sí | Norma legal |
| `nro_resolucion` | VARCHAR(100) | Sí | Número de resolución |
| `documento_origen` | VARCHAR(100) | Sí | Documento de origen |

**Relación:** 1 `cargos_alta` → N `new_cargo` (via `new_cargo.id_alta`)

---

### 2.3 `registro_cph` — Detalle de altas CPH

| Columna | Tipo | Descripción |
|---|---|---|
| `id_cph` | INT PK | Autoincremental |
| `id_alta` | INT | FK → `cargos_alta.id` |
| `modalidad` | VARCHAR(20) | `planta` \| `guardia` |
| `puesto` | VARCHAR(150) | Nombre del puesto |
| `especialidad` | VARCHAR(150) | Especialidad médica |
| `numero_unico` | INT | Secuencial único CPH |

---

### 2.4 `registro_enf` — Detalle de altas ENF

| Columna | Tipo | Descripción |
|---|---|---|
| `id_enf` | INT PK | Autoincremental |
| `id_alta` | INT | FK → `cargos_alta.id` |
| `nivel_formacion` | VARCHAR(50) | `enfermero prof` \| `licenciado en enfermeria` |
| `numero_unico` | INT | Secuencial único ENF |

---

### 2.5 `registro_tec_pou` / `registro_tec_pof` — Detalle de altas TEC

| Columna | Tipo | Descripción |
|---|---|---|
| `id_pou` / `id_pof` | INT PK | Autoincremental |
| `id_alta` | INT | FK → `cargos_alta.id` |
| `puesto` | VARCHAR(150) | Nombre del puesto técnico |
| `numero_unico` | INT | Secuencial único TEC |

---

## 3. Catálogos de cargos

### 3.1 `carreras`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `codigo` | VARCHAR(10) UNIQUE | `CPH`, `ENF`, `TEC`, `EG`, `AS`, `RG`, `SG`, `RES`, `DOC` |
| `nombre` | VARCHAR(100) | Nombre completo |
| `norma` | VARCHAR(100) | Norma legal aplicable |
| `excluir_alta` | TINYINT(1) | 1 = no aparece en formulario de alta |
| `solo_estructura` | TINYINT(1) | 1 = solo en modo estructura |

---

### 3.2 `modalidades`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `codigo` | VARCHAR(20) UNIQUE | `planta`, `guardia` |
| `nombre` | VARCHAR(50) | Nombre display |

---

### 3.3 `puestos_cargo`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `nombre` | VARCHAR(150) | Nombre del puesto |
| `carrera` | VARCHAR(10) | Código de carrera |
| `unificador` | VARCHAR(100) | Agrupador funcional |
| `es_estructura` | TINYINT(1) | 1 = solo modo estructura |

---

### 3.4 `especialidades`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `nombre` | VARCHAR(150) UNIQUE | Nombre de la especialidad |

---

### 3.5 `jornadas`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `nombre` | VARCHAR(50) | `Jornada completa`, `ATP` |

Solo aplica a ENF. Para todas las demás carreras `id_jornada` es NULL.

---

### 3.6 `tipos_cargo`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `codigo` | VARCHAR(30) UNIQUE | `jefe`, `director`, `subdirector`, `jefe_eg`, etc. |
| `nombre` | VARCHAR(100) | Nombre display |
| `carrera` | VARCHAR(10) | Carrera a la que aplica |
| `requiere_modalidad` | TINYINT(1) | 1 = necesita modalidad en el código |

---

### 3.7 `cargo_etiquetas`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `nombre` | VARCHAR(50) UNIQUE | Código de etiqueta (ej: `BA`, `BC`) |
| `descripcion` | VARCHAR(200) | Descripción |


---

## 4. Dotación normalizada

Estas tablas representan la ocupación actual de los cargos. Son el resultado de sincronizar `dot_resultado` (padrón procesado por Dotaneitor) con `new_cargo`.

### 4.1 `personas_dotacion` — Personas únicas del padrón

Una fila por persona (CUIL único). Se actualiza en cada sincronización.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | INT UNSIGNED PK | No | Autoincremental |
| `cuil` | BIGINT UNIQUE | No | CUIL de la persona |
| `numero_doc` | VARCHAR(20) | Sí | Número de documento |
| `tipo_doc` | VARCHAR(10) | Sí | Tipo de documento |
| `ayn` | VARCHAR(200) | No | Apellido y nombre |
| `fecha_nacimiento` | DATE | Sí | Fecha de nacimiento |
| `sexo` | VARCHAR(10) | Sí | Sexo |
| `especialidad` | VARCHAR(200) | Sí | Especialidad principal |
| `telefono` | VARCHAR(30) | Sí | Teléfono |
| `mail_personal` | VARCHAR(200) | Sí | Email personal |
| `mail_laboral` | VARCHAR(200) | Sí | Email laboral |
| `domicilio` | VARCHAR(200) | Sí | Domicilio |
| `localidad` | VARCHAR(200) | Sí | Localidad |
| `fecha_creacion` | DATETIME | No | Alta del registro |
| `fecha_actualizacion` | TIMESTAMP | No | Última modificación (auto) |

**Índices:** `cuil` (UNIQUE), `numero_doc`

---

### 4.2 `cargo_dotacion` — Ocupaciones de cargos

Historial de quién ocupa cada cargo y en qué período. `hasta IS NULL` = ocupación activa.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | INT UNSIGNED PK | No | Autoincremental |
| `id_cargo` | INT UNSIGNED | No | FK → `new_cargo.id` |
| `id_persona` | INT UNSIGNED | No | FK → `personas_dotacion.id` |
| `id_sial` | VARCHAR(50) | No | ID SIAL del rol (ej: `000110898-2`) |
| `cuil_y_rol` | VARCHAR(80) | Sí | CUIL + número de rol concatenado |
| `codigo_repa` | INT | Sí | FK lógica → `organigramas.codigo_reparticion` |
| `periodo` | VARCHAR(10) | No | Período del padrón (`YYYY-MM`) |
| `desde` | DATE | Sí | Inicio de la ocupación |
| `hasta` | DATE | Sí | Fin de la ocupación (NULL = activo) |
| `antiguedad` | DATE | Sí | Fecha de inicio en el cargo (migrado desde `new_cargo` en M11) |
| `situacion_revista` | ENUM | Sí | `activo` \| `retencion_cargo` \| `comision` |
| `estado` | VARCHAR(50) | Sí | Estado de la persona: `Activo`, `Bloqueado`, `Comision` |
| `fecha_proceso` | DATETIME | Sí | Fecha del padrón que originó el registro |
| `fecha_creacion` | DATETIME | No | Alta del registro |
| `fecha_actualizacion` | TIMESTAMP | No | Última modificación (auto) |

**Índices:** `id_sial`, `id_cargo`, `id_persona`, `periodo`, `hasta`, `codigo_repa`

**FKs:** `id_cargo` → `new_cargo.id`, `id_persona` → `personas_dotacion.id`

**Invariante crítica:** `estado` refleja el estado de la **persona** (del padrón), NO del cargo. Un cargo con persona `Bloqueada` sigue siendo `vigente` en `new_cargo`. Este servicio nunca modifica `new_cargo.estado`.

---

## 5. Padrón procesado (Dotaneitor)

### 5.1 `dot_resultado` — Resultado del procesamiento

Tabla destino del microservicio Dotaneitor. Contiene el padrón completo procesado y cruzado.

| Columna | Tipo | Descripción |
|---|---|---|
| `id_sial` | VARCHAR(50) PK | ID único del rol en SIAL |
| `cuil` | BIGINT | CUIL de la persona |
| `cuil_y_rol` | VARCHAR(50) | CUIL + número de rol |
| `ayn` | VARCHAR(200) | Apellido y nombre |
| `fecha_nacimiento` | DATE | Fecha de nacimiento |
| `edad` | INT | Edad calculada |
| `sexo` | VARCHAR(10) | Sexo |
| `tipo_doc` | VARCHAR(10) | Tipo de documento |
| `numero_doc` | VARCHAR(20) | Número de documento |
| `codigo_repa` | VARCHAR(20) | Código de repartición |
| `descripcion_repa` | VARCHAR(200) | Descripción de la repartición |
| `siglas` | VARCHAR(20) | Sigla del efector |
| `universo_totalizador` | VARCHAR(100) | Universo totalizador |
| `tipo_hospital_sigla` | VARCHAR(100) | Tipo de hospital |
| `monovalencia` | VARCHAR(50) | Monovalencia |
| `escalafon` | VARCHAR(50) | Escalafón |
| `codigo_de_registro` | VARCHAR(10) | Código de registro |
| `literal_cr` | VARCHAR(100) | Literal del código de registro |
| `regimen` | VARCHAR(50) | Régimen de empleo |
| `situacion_de_revista` | VARCHAR(50) | Situación de revista |
| `puesto` | VARCHAR(100) | Puesto |
| `literal_puesto` | VARCHAR(200) | Literal del puesto |
| `especialidad` | VARCHAR(200) | Especialidad |
| `unificador_de_puestos` | VARCHAR(200) | Unificador de puestos |
| `agrupador` | VARCHAR(150) | Agrupador |
| `codigo_jefaturas` | VARCHAR(50) | Código de jefaturas |
| `jefe_escalafon` | VARCHAR(100) | Jefe de escalafón |
| `estado` | VARCHAR(50) | Estado de la persona: `Activo`, `Bloqueado`, `Comision` |
| `fecha_proceso` | DATETIME | Fecha del procesamiento |

**Nota:** Esta tabla se reemplaza completamente en cada procesamiento Dotaneitor. Los cambios quedan registrados en `dot_resultado_historial`.

---

### 5.2 `dot_resultado_historial` — Historial de cambios del padrón

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `proceso_id` | VARCHAR(36) | UUID del proceso de guardado |
| `fecha_proceso` | DATETIME | Fecha del proceso |
| `accion` | VARCHAR(10) | `insert`, `update`, `delete` |
| `id_sial` | VARCHAR(50) | ID SIAL afectado |
| `cuil_y_rol` | VARCHAR(50) | CUIL y rol |
| `ayn` | VARCHAR(200) | Apellido y nombre |
| `campo` | VARCHAR(100) | Campo modificado (solo en `update`) |
| `valor_anterior` | TEXT | Valor previo |
| `valor_nuevo` | TEXT | Valor nuevo |

---

## 6. Tablas de referencia Dotaneitor

Usadas por el microservicio Python para el cruce de datos.

### 6.1 `dot_agrupador`

Mapeo de cruce → agrupador funcional.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT UNSIGNED PK | Autoincremental |
| `cruce` | VARCHAR(300) UNIQUE | Clave de cruce (escalafon + lit_puesto) |
| `escalafon` | VARCHAR(150) | Escalafón |
| `lit_puesto` | VARCHAR(200) | Literal del puesto |
| `agrupador` | VARCHAR(150) | Agrupador resultante |
| `activo` | TINYINT(1) | 1 = activo |

---

### 6.2 `dot_unificador_puestos`

Mapeo de cruce → unificador de puestos.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT UNSIGNED PK | Autoincremental |
| `cruce` | VARCHAR(400) UNIQUE | Clave de cruce |
| `lit_cod_reg` | VARCHAR(150) | Literal del código de registro |
| `lit_puesto` | VARCHAR(200) | Literal del puesto |
| `unificador` | VARCHAR(200) | Unificador resultante |
| `activo` | TINYINT(1) | 1 = activo |

---

### 6.3 `dot_especialidades`

Lookup de especialidades por CUIL para completar huecos en el padrón.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT UNSIGNED PK | Autoincremental |
| `tipo` | ENUM | `cph`, `suplentes`, `residentes` |
| `cuil` | BIGINT | CUIL de la persona |
| `cuil_y_rol` | VARCHAR(50) | CUIL + rol |
| `rol` | INT | Número de rol |
| `apellido_nombre` | VARCHAR(200) | Nombre |
| `nombre_puesto` | VARCHAR(200) | Puesto |
| `doc_resp_alta` | VARCHAR(100) | Documento de alta |
| `especialidad` | VARCHAR(200) | Especialidad |
| `activo` | TINYINT(1) | 1 = activo |

**Índices:** `cuil`, `(tipo, cuil)`


---

## 7. Padrón legacy (por período)

Estas tres tablas contienen el padrón histórico importado desde SIAL, organizado por período (`YYYY-MM`). Son de solo lectura — no se modifican desde la aplicación.

### 7.1 `personas` — Personas por período

PK compuesta: `(id_persona, periodo)`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_persona` | INT | ID de la persona en SIAL |
| `periodo` | VARCHAR(10) | Período `YYYY-MM` |
| `cuil` | BIGINT | CUIL |
| `nombre_apellido` | VARCHAR(100) | Nombre completo |
| `fecha_nacimiento` | VARCHAR(15) | Fecha de nacimiento |
| `edad` | INT | Edad |
| `sexo` | VARCHAR(15) | Sexo |
| `tipo_doc` | VARCHAR(10) | Tipo de documento |
| `numero_doc` | BIGINT | Número de documento |
| `especialidad` | VARCHAR(100) | Especialidad |
| `antiguedad` | VARCHAR(15) | Antigüedad (texto legacy) |
| `telefono` | VARCHAR(15) | Teléfono |
| `mail_personal` | VARCHAR(200) | Email personal |
| `mail_laboral` | VARCHAR(200) | Email laboral |
| `domicilio` | VARCHAR(200) | Domicilio |
| `localidad` | VARCHAR(200) | Localidad |

---

### 7.2 `cargos` — Cargos por período

PK compuesta: `(id_cargo, periodo)`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_cargo` | INT | ID del cargo en SIAL |
| `periodo` | VARCHAR(10) | Período `YYYY-MM` |
| `codigo_cargo` | VARCHAR(20) | Código del cargo |
| `estado_cargo` | VARCHAR(50) | Estado |

---

### 7.3 `roles` — Relación persona-cargo por período

PK compuesta: `(id_rol, periodo)`. Es la tabla de hechos del padrón legacy.

| Columna | Tipo | Descripción |
|---|---|---|
| `id_rol` | INT | ID del rol en SIAL |
| `periodo` | VARCHAR(10) | Período `YYYY-MM` |
| `id_cargo` | INT | FK → `cargos(id_cargo, periodo)` |
| `id_persona` | INT | FK → `personas(id_persona, periodo)` |
| `id_sigla` | INT | FK → `siglas.id_sigla` |
| `codigo_reparticion` | INT | Código de repartición |
| `descripcion_reparticion` | VARCHAR(200) | Descripción |
| `escalafon` | VARCHAR(50) | Escalafón |
| `codigo_registro` | VARCHAR(5) | Código de registro |
| `literal_codigo_registro` | VARCHAR(100) | Literal |
| `situacion_revista` | VARCHAR(50) | Situación de revista |
| `literal_puesto` | VARCHAR(100) | Literal del puesto |
| `unificador_puesto` | VARCHAR(100) | Unificador |
| `agrupador` | VARCHAR(50) | Agrupador |
| `j_categoria` | VARCHAR(20) | Categoría de jefatura |
| `jefaturas` | VARCHAR(50) | Jefaturas |
| `cargo_desde` | VARCHAR(15) | Inicio del cargo |
| `cargo_hasta` | VARCHAR(15) | Fin del cargo |
| `estado` | VARCHAR(50) | Estado del rol |

**Índices:** `(id_rol, periodo)`, `periodo`, `id_cargo`, `id_persona`, `id_sigla`

---

## 8. Efectores y estructura

### 8.1 `siglas` — Efectores del sistema de salud

| Columna | Tipo | Descripción |
|---|---|---|
| `id_sigla` | INT PK | ID manual (sin autoincrement) |
| `sigla` | VARCHAR(20) | Código del efector (ej: `HGACA`) |
| `desc_sigla` | VARCHAR(150) | Descripción del efector |
| `universo_totalizador` | VARCHAR(50) | Agrupador de universo |
| `tipo_hospital_sigla` | VARCHAR(100) | Tipo de hospital |
| `monovalencia` | VARCHAR(100) | Monovalencia |

**Índice:** `sigla`

---

### 8.2 `organigramas` — Estructura jerárquica

Árbol de unidades organizativas de cada efector.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `sigla` | VARCHAR(20) | Efector al que pertenece |
| `lvl` | INT | Nivel jerárquico (1 = raíz) |
| `tipo` | VARCHAR(30) | Tipo de unidad: `DHOS`, `SDHOS`, `DEPT`, `DIV`, `UNID`, `SECCION`, etc. |
| `codigo_reparticion` | VARCHAR(20) | Código único de la unidad |
| `desc_rep` | VARCHAR(200) | Descripción de la unidad |
| `padre` | VARCHAR(20) | `codigo_reparticion` del nodo padre |
| `path` | VARCHAR(500) | Path completo de códigos |
| `path_nombres` | VARCHAR(1000) | Path completo de nombres |
| `regimen_empleo` | VARCHAR(100) | Régimen de empleo (para agrupación bajo SDHOS) |
| `universo_totalizador` | VARCHAR(100) | Universo (para secciones nivel-central / atencion-primaria) |

---

### 8.3 `pou` — Planta Orgánica Unitaria

Resumen de dotación por sigla y período. No contiene cargos individuales.

PK compuesta: `(id, periodo)`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT | ID del registro POU |
| `periodo` | VARCHAR(7) | Período `YYYY-MM` |
| `sigla` | VARCHAR(10) | Efector |
| `descripcion_sigla` | VARCHAR(100) | Descripción |
| `perfil` | VARCHAR(50) | Perfil del cargo |
| `especialidad` | VARCHAR(100) | Especialidad |
| `dotacion_diaria` | INT | Dotación diaria |
| `dotacion_sem` | INT | Dotación semanal |
| `dotacion_total` | INT | Dotación total |
| `activos` | INT | Activos |
| `tecnicos` | INT | Técnicos |
| `vacantes` | INT | Vacantes |

---

## 9. Módulo concursal

### 9.1 `bajas_consolidadas` — Desvinculaciones de personal

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `usuario` | VARCHAR(100) | Usuario que registró la baja |
| `origen` | VARCHAR(50) | `Ampliación`, `POU a POF`, `Alta por Baja`, `Cobertura Dotación` |
| `cuil` | VARCHAR(20) | CUIL del agente |
| `nombre_apellido` | VARCHAR(200) | Nombre completo |
| `sigla` | VARCHAR(20) | Efector |
| `efector` | VARCHAR(200) | Nombre del efector |
| `tipo_efector` | VARCHAR(100) | Tipo de efector |
| `codigo_cargo` | VARCHAR(50) | Código del cargo |
| `puesto_baja` | VARCHAR(150) | Puesto del agente |
| `especialidad_baja` | VARCHAR(150) | Especialidad |
| `escalafon` | VARCHAR(50) | Escalafón |
| `pou_pof` | VARCHAR(10) | POU o POF |
| `unificador_puestos` | VARCHAR(100) | Unificador |
| `codigo_registro` | INT | Código de registro SIAL |
| `ex_baja` | VARCHAR(150) | Expediente de baja |
| `fecha_baja` | VARCHAR(15) | Fecha de la baja |
| `motivo_baja` | VARCHAR(150) | Motivo |
| `doc_respaldatoria` | VARCHAR(150) | Documentación respaldatoria |
| `genera_concurso` | VARCHAR(5) | `SI` \| `NO` |
| `es_cph` | BOOLEAN | Calculado: `genera_concurso=SI` y no es TEC/ENF |
| `fecha_pase_paralelo` | VARCHAR(15) | Fecha de pase paralelo |
| `partida_presupuestaria` | VARCHAR(50) | Partida |
| `carga_horaria` | VARCHAR(20) | Carga horaria |
| `cargo_baja` | VARCHAR(200) | Cargo en SIAL |

**Índices:** `sigla`, `es_cph`, `genera_concurso`, `cuil`

**Regla de negocio:** cuando `es_cph = true`, se crea automáticamente un registro en `seguimiento_cph`.

---

### 9.2 `seguimiento_cph` — Seguimiento de concursos CPH

Registra el ciclo completo del proceso concursal para profesionales CPH.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `id_baja` | INT | FK → `bajas_consolidadas.id` (nullable) |
| `sigla_efector` | VARCHAR(20) | Efector |
| `estado` | VARCHAR(50) | Estado calculado: `NO INICIADO`, `ACTIVO`, `FINALIZADO`, `SUSPENDIDO` |
| `sub_estado` | VARCHAR(100) | Sub-estado |
| `sub_estado_3` | VARCHAR(100) | Etapa del concurso (A-VALID.VCTE → H-DESIERTO) |
| `cambio_especialidad` | VARCHAR(5) | `SI` \| `NO` |
| `ee_baja` | VARCHAR(150) | EE de la baja |
| `cuil_baja` | VARCHAR(20) | CUIL del agente |
| `nombre_baja` | VARCHAR(200) | Nombre del agente |
| `fecha_baja` | VARCHAR(15) | Fecha de baja |
| `especialidad_baja` | VARCHAR(150) | Especialidad de la baja |
| `especialidad_solicitada` | VARCHAR(150) | Especialidad del concurso |
| `ee_concurso` | VARCHAR(150) | EE del concurso |
| `fecha_ee_concurso` | VARCHAR(15) | Fecha EE concurso |
| `fecha_autorizacion` | VARCHAR(15) | Fecha de autorización |
| `disposicion` | VARCHAR(100) | Disposición de llamado |
| `fecha_insc_desde` | VARCHAR(15) | Inicio inscripción |
| `fecha_insc_hasta` | VARCHAR(15) | Fin inscripción |
| `fecha_examen` | VARCHAR(15) | Fecha de examen |
| `ee_designacion` | VARCHAR(150) | EE de designación |
| `resolucion_designacion` | VARCHAR(100) | Resolución de designación |
| `suspendido` | BOOLEAN | Concurso suspendido |
| `fecha_dispo_desierta` | VARCHAR(15) | Fecha disposición desierta |
| `observaciones` | VARCHAR(1000) | Observaciones |

**Índices:** `sigla_efector`, `estado`, `cuil_baja`, `id_baja`, `ee_concurso`, `ee_baja`, `nombre_baja`

---

### 9.3 `seguimiento_ceetps` — Seguimiento de concursos CEETPS

Para enfermeros (87), técnicos (85) y administrativos (83).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `id_baja` | INT | FK → `bajas_consolidadas.id` (nullable) |
| `codigo_registro` | INT | 87=ENF, 85=TEC, 83=Servicios |
| `sigla_efector` | VARCHAR(20) | Efector |
| `expediente_concurso` | VARCHAR(150) | Expediente del concurso |
| `puesto_solicitado` | VARCHAR(150) | Puesto solicitado |
| `dispo_llamado` | VARCHAR(500) | Disposición de llamado |
| `fecha_ifacs` | VARCHAR(15) | Fecha IFACS |
| `fecha_insal` | VARCHAR(15) | Fecha INSAL |
| `estado_concurso` | VARCHAR(100) | Estado calculado |
| `expediente_designacion` | VARCHAR(150) | EE de designación |
| `dispo_designacion` | VARCHAR(500) | Disposición de designación |
| `resolucion_designacion` | VARCHAR(500) | Resolución de designación |
| `cuil_designado` | VARCHAR(20) | CUIL del designado |
| `nombre_apellido_designado` | VARCHAR(200) | Nombre del designado |
| `observaciones` | VARCHAR(1000) | Observaciones |
| `cuil` | VARCHAR(20) | CUIL del agente de baja |
| `nombre_apellido_baja` | VARCHAR(200) | Nombre del agente |
| `puesto_baja` | VARCHAR(150) | Puesto de la baja |
| `especialidad_baja` | VARCHAR(150) | Especialidad |
| `fecha_baja` | VARCHAR(15) | Fecha de baja |

**Índices:** `sigla_efector`, `codigo_registro`, `id_baja`, `cuil`, `expediente_concurso`, `estado_concurso`


---

## 10. Seguridad

### 10.1 `users` — Usuarios del sistema

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `username` | VARCHAR(64) UNIQUE | Nombre de usuario |
| `email` | VARCHAR(255) UNIQUE | Email |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contraseña |
| `role` | VARCHAR(16) | `admin`, `editor`, `viewer`, `director`, `gerencia`, `concursales`, `autoridades` |
| `hospital_code` | VARCHAR(20) | Efector asignado (para rol `director`) |
| `role_alias` | VARCHAR(50) | Nombre visual del rol (estético, no afecta permisos) |
| `is_active` | BOOLEAN | Usuario activo |
| `created_at` | DATETIME | Fecha de creación |
| `updated_at` | TIMESTAMP | Última modificación |

---

### 10.2 `permissions` — Permisos por rol

Una fila por rol del sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `role` | VARCHAR(20) UNIQUE | Rol del sistema |
| `description` | VARCHAR(255) | Descripción |
| `can_read_all` | BOOLEAN | Puede leer todos los registros |
| `can_create` | BOOLEAN | Puede crear |
| `can_update` | BOOLEAN | Puede editar |
| `can_delete` | BOOLEAN | Puede eliminar |
| `can_alter_structure` | BOOLEAN | Puede modificar estructura |
| `can_manage_users` | BOOLEAN | Puede gestionar usuarios |
| `can_view_audit` | BOOLEAN | Puede ver auditoría |
| `filter_by_hospital` | BOOLEAN | Solo ve datos de su hospital |
| `hospital_code` | VARCHAR(20) | Hospital asignado |

---

### 10.3 `module_permissions` — Módulos accesibles por rol

PK compuesta: `(role, module_key)`. Controla qué módulos del frontend puede ver cada rol.

| Columna | Tipo | Descripción |
|---|---|---|
| `role` | VARCHAR(32) | Rol del sistema |
| `module_key` | VARCHAR(64) | Clave del módulo (ej: `AltasCargo`, `ListaCargos`) |
| `updated_at` | TIMESTAMP | Última modificación |

**Nota:** `admin` siempre devuelve `null` (sin restricciones). Si no hay filas para un rol, se usa `pagePermissions.js` como fallback.

---

### 10.4 `custom_roles` — Roles personalizados

Roles creados desde la interfaz de administración (puramente visuales, no afectan permisos del sistema).

| Columna | Tipo | Descripción |
|---|---|---|
| `key` | VARCHAR(32) PK | Clave única del rol |
| `label` | VARCHAR(64) | Nombre display |
| `description` | VARCHAR(255) | Descripción |
| `color` | VARCHAR(16) | Color del badge (ej: `blue`, `green`) |
| `created_at` | DATETIME | Fecha de creación |
| `updated_at` | TIMESTAMP | Última modificación |

---

### 10.5 `refresh_tokens` — Tokens de refresh activos

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `token_hash` | VARCHAR(128) UNIQUE | Hash SHA-256 del token |
| `jti` | VARCHAR(64) UNIQUE | JWT ID único del token |
| `family_id` | VARCHAR(64) | Agrupa todos los tokens de una sesión |
| `replaced_by_jti` | VARCHAR(64) | JTI del token que lo reemplazó (rotación) |
| `user_id` | INT | FK → `users.id` (CASCADE DELETE) |
| `expires_at` | DATETIME | Expiración del token |
| `revoked` | BOOLEAN | Token revocado |
| `revoked_reason` | VARCHAR(32) | Motivo de revocación |
| `revoked_at` | DATETIME | Fecha de revocación |
| `last_used` | DATETIME | Último uso (para detectar inactividad) |
| `created_at` | DATETIME | Fecha de creación |

**Índices:** `token_hash` (UNIQUE), `jti` (UNIQUE), `family_id`

**Mecanismo anti-reutilización:** si se usa un token ya rotado (`replaced_by_jti` no null), se revocan todos los tokens de la misma `family_id` y se fuerza re-login.

---

## 11. Auditoría

### 11.1 `audit_logs` — Log de operaciones

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `user_username` | VARCHAR(120) | Usuario que realizó la acción |
| `user_role` | VARCHAR(32) | Rol del usuario |
| `source` | VARCHAR(16) | `api`, `admin`, `auth` |
| `action` | VARCHAR(32) | `create`, `update`, `delete`, `login`, `logout`, `refresh` |
| `resource` | VARCHAR(128) | Recurso afectado (ej: `new_cargo`) |
| `record_id` | VARCHAR(64) | ID del registro afectado |
| `method` | VARCHAR(10) | Método HTTP |
| `path` | VARCHAR(200) | Path del endpoint |
| `status` | INT | Código HTTP de respuesta |
| `changes` | TEXT | JSON con los cambios realizados |
| `ip` | VARCHAR(64) | IP del cliente |
| `user_agent` | VARCHAR(256) | User agent |
| `created_at` | DATETIME | Fecha del evento |

**Índices:** `user_username`, `user_role`, `source`, `action`, `created_at`

**Limpieza automática:** scheduler cada 24h purga logs anteriores al umbral configurado.

---

## 12. Contenido

### 12.1 `recorridas` — Informes por hospital

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `hospital_code` | VARCHAR(20) | Efector |
| `titulo` | VARCHAR(200) | Título de la recorrida |
| `contenido_html` | TEXT | Contenido HTML (máx 100KB) |
| `user_id` | INT | FK → `users.id` |
| `created_at` | DATETIME | Fecha de creación |
| `updated_at` | TIMESTAMP | Última modificación |

**Índices:** `(hospital_code, created_at)`, `user_id`

---

### 12.2 `minutas` — Planillas dinámicas por hospital

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Autoincremental |
| `hospital_code` | VARCHAR(20) | Efector |
| `titulo` | VARCHAR(200) | Título |
| `datos_tabla` | JSON | Estructura `{ columns: [...], rows: [...] }` |
| `user_id` | INT | FK → `users.id` |
| `created_at` | DATETIME | Fecha de creación |
| `updated_at` | TIMESTAMP | Última modificación |

**Estructura del JSON `datos_tabla`:**
```json
{
  "columns": [
    { "id": "col1", "name": "Nombre", "type": "text" },
    { "id": "col2", "name": "Cantidad", "type": "number" },
    { "id": "col3", "name": "Estado", "type": "select", "options": ["Activo", "Inactivo"] }
  ],
  "rows": [
    { "col1": "Ejemplo", "col2": 5, "col3": "Activo" }
  ]
}
```

---

### 12.3 `conjuntos_config` — Configuración clave/valor

| Columna | Tipo | Descripción |
|---|---|---|
| `key` | VARCHAR(50) PK | Clave de configuración |
| `value` | TEXT | Valor (generalmente JSON) |

Actualmente almacena `conjuntos_rules`: reglas de autocompletado del campo "Conjuntos" en el módulo concursal.

---

## 13. Diagrama de relaciones principales

```
cargos_alta (1) ──────────────────── (N) new_cargo
                                           │
                    ┌──────────────────────┤
                    │                      │
              cargo_dotacion (N) ──── (1) new_cargo
                    │
              personas_dotacion (1) ── (N) cargo_dotacion
                    │
              dot_resultado ──── (sincroniza) ──── cargo_dotacion


new_cargo.sigla ──── (lógica) ──── siglas.sigla
new_cargo.id_carrera ──── carreras.id
new_cargo.id_modalidad ──── modalidades.id
new_cargo.id_puesto ──── puestos_cargo.id
new_cargo.id_especialidad ──── especialidades.id
new_cargo.id_jornada ──── jornadas.id
new_cargo.id_tipo_cargo ──── tipos_cargo.id
new_cargo.id_etiqueta ──── cargo_etiquetas.id
new_cargo.id_alta ──── cargos_alta.id

bajas_consolidadas (1) ──── (0..1) seguimiento_cph
bajas_consolidadas (1) ──── (0..1) seguimiento_ceetps

personas (N) ──── (periodo) ──── roles (N) ──── (periodo) ──── cargos
roles.id_sigla ──── siglas.id_sigla
organigramas.sigla ──── (lógica) ──── siglas.sigla

users (1) ──── (N) refresh_tokens
users (1) ──── (N) recorridas
users (1) ──── (N) minutas
permissions.role ──── (lógica) ──── users.role
module_permissions.role ──── (lógica) ──── users.role
```

---

## 14. Decisiones de diseño

### 14.1 PK compuesta en tablas del padrón legacy

`personas`, `cargos` y `roles` usan PK compuesta `(id, periodo)` porque el mismo ID puede existir en múltiples períodos. Esto refleja la naturaleza del padrón SIAL: una foto mensual del estado de la dotación.

### 14.2 `new_cargo` como tabla central vs padrón legacy

El sistema tiene dos representaciones de los cargos:
- `new_cargo`: estructura permanente de cargos (independiente del período)
- `cargos` + `roles`: foto mensual del padrón SIAL

La unión entre ambos mundos es `new_cargo.id_sial` ↔ `dot_resultado.id_sial` ↔ `roles.codigo_rol`.

### 14.3 Campos texto redundantes en `new_cargo`

Los campos `carrera`, `modalidad`, `puesto`, `especialidad`, `tipo_cargo`, `categoria_interna` duplican las FKs normalizadas. Se mantienen por compatibilidad con el padrón legacy y con queries existentes. **Pendiente eliminar en M10 fase 2.**

### 14.4 `antiguedad` y `situacion_revista` en `new_cargo`

Son atributos de la **ocupación** (relación persona-cargo), no del cargo en sí. Están en `new_cargo` por razones históricas. En M11 se migró `antiguedad` a `cargo_dotacion` como fuente de verdad. `situacion_revista` también está en `cargo_dotacion` desde la sincronización del padrón. Los campos en `new_cargo` se mantienen como legacy hasta que se complete la migración.

### 14.5 `dot_resultado` como tabla de reemplazo total

Cada ejecución del Dotaneitor reemplaza completamente `dot_resultado`. Los cambios (inserts, updates, deletes) se registran en `dot_resultado_historial` con un `proceso_id` UUID para trazabilidad completa.

### 14.6 `cargo_dotacion.hasta IS NULL` como indicador de actividad

En lugar de un campo `activo` boolean, se usa `hasta IS NULL` para indicar ocupación activa. Esto permite mantener el historial completo de ocupaciones sin necesidad de una tabla separada de historial.

### 14.7 `estado` en `cargo_dotacion` es estado de la persona, no del cargo

`dot_resultado.estado` (`Activo`/`Bloqueado`/`Comision`) es el estado de la **persona** en el padrón. Un cargo con persona `Bloqueada` sigue siendo `vigente` en `new_cargo`. `CargoDotacionSyncService` nunca modifica `new_cargo.estado`.

### 14.8 Refresh tokens con rotación y detección de reutilización

Cada uso del refresh token genera uno nuevo y revoca el anterior. Si se detecta uso de un token ya rotado (posible robo), se revocan todos los tokens de la misma `family_id`, forzando re-login en todos los dispositivos del usuario.

### 14.9 Timezone UTC en la conexión MySQL

La conexión TypeORM usa `timezone: 'Z'` (UTC). Las fechas se almacenan en UTC y se convierten a hora local Argentina (UTC-3) en el frontend donde sea necesario. Esto facilita la futura migración a Oracle y es compatible con entornos distribuidos.

### 14.10 Pool de conexiones configurado para 50+ usuarios concurrentes

`connectionLimit: 50`, `queueLimit: 100`, `idleTimeout: 600000` (10 min). Configurado para soportar los ~33 hospitales consultando simultáneamente el organigrama y la dotación.

### 14.11 Tablas de referencia Dotaneitor cargadas desde Excel

`dot_agrupador`, `dot_unificador_puestos` y `dot_especialidades` se cargan una sola vez desde el Excel de referencia via `setup-dotaneitor-tables.js`. Se actualizan manualmente cuando cambian las reglas de negocio del padrón.

### 14.12 `seguimiento_cph` y `seguimiento_ceetps` creados automáticamente

Cuando se guarda una baja con `es_cph = true`, el servicio crea automáticamente el registro de seguimiento CPH copiando los datos relevantes. Lo mismo para CEETPS cuando `codigo_registro` es 83, 85 o 87. Esto garantiza que no haya bajas sin seguimiento.

---

## 15. Scripts de migración ejecutados

| Script | Descripción | Estado |
|---|---|---|
| M1 | Migrar códigos GEN → EG | Ejecutado |
| M2 | Actualizar carreras | Ejecutado |
| M3 | Crear jornadas | Ejecutado |
| M4 | Crear tipos_cargo | Ejecutado |
| M5 | Actualizar puestos_cargo | Ejecutado |
| M6 | Eliminar cargos legacy | Ejecutado |
| M7 | Migrar cargos al módulo de alta | Ejecutado |
| M8 | Correcciones de datos | Ejecutado |
| M10 | Rellenar FKs en new_cargo | Ejecutado |
| M11 | Migrar antiguedad → cargo_dotacion | Ejecutado |
| M12 | Cambiar ENUM estado | Ejecutado |
| M13 | Agregar id_jornada | Ejecutado |
| M14 | Unificar id_puesto | Ejecutado |
| M15 | Crear personas_dotacion y cargo_dotacion | Ejecutado |
| M16 | Migrar códigos legacy al formato normalizado | Ejecutado |
