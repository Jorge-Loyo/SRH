# REGLAS DE NEGOCIO — Sistema de Gestión de Dotación GCABA

> Contrato de lógica de negocio. Fuente de verdad para requerimientos funcionales, historias de usuario y decisiones de diseño.
> Última actualización: 2026-09

---

## 1. DOMINIO — Qué es un Cargo

Un **cargo** es la unidad mínima de dotación del sistema de salud del GCABA.

- Existe **independientemente** de si está ocupado o vacante.
- Pertenece a una **carrera**, una **sigla** (efector/dependencia) y opcionalmente a una **modalidad**.
- Tiene un **código único** que lo identifica de por vida.
- Su ciclo de vida es:

```
ALTA (expediente/decreto)
  → CONCURSO (proceso de selección)
  → DESIGNACIÓN (persona asignada)  ←→  DOTACIÓN (tabla futura)
  → BAJA / TRANSFERENCIA
```

### 1.1 Estados del cargo

| Estado | Descripción |
|---|---|
| `vigente` | Cargo activo en la estructura. Puede estar ocupado o vacante. |
| `no_vigente` | Cargo dado de baja, transferido o suspendido definitivamente. |

**Regla clave:** "Vacante" NO es un estado del cargo. Es una condición derivada:
- `vigente` + sin dotación asignada = **vacante**
- `vigente` + con dotación asignada = **ocupado**
- `no_vigente` = fuera de la estructura

---

## 2. CARRERAS

Las carreras definen el escalafón al que pertenece un cargo.

| Código | Nombre | Norma | Excluir Alta | Solo Estructura |
|---|---|---|---|---|
| CPH | Carrera Profesional Hospitalaria | Ley 6.035 | No | Sí |
| ENF | Enfermería | Ley 6.767 | No | No |
| TEC | Técnico (CEETPS) | Ley 6.035 | No | No |
| EG | Escalafón General | Ley 471 | No | Sí |
| AS | Autoridades Superiores | No aplica | No | Sí |
| RG | Régimen Gerencial | — | No | Sí |
| SG | Suplentes de Guardia | — | Sí | No |
| RES | Residentes | — | Sí | No |
| DOC | Docentes | — | Sí | No |

### Reglas de filtro por modo de alta

- **Modo ejecución** → mostrar carreras donde `excluir_alta = 0`
- **Modo estructura** → mostrar carreras donde `solo_estructura = 1`
- CPH y EG aparecen en **ambos modos** (`solo_estructura = 1` + `excluir_alta = 0`)
- AS aparece **solo en modo estructura** (`solo_estructura = 1`, `excluir_alta = 0`)
- SG, RES y DOC están **excluidas del alta** (`excluir_alta = 1`)

---

## 3. FORMATO DE CÓDIGOS DE CARGO

El código es el identificador permanente del cargo. Se genera en el momento del alta y nunca cambia.

| Carrera | Tipo | Formato | Ejemplo |
|---|---|---|---|
| CPH | Ejecución Planta | `CPH-POF-{seq}` | CPH-POF-000001 |
| CPH | Ejecución Guardia | `CPH-POU-{seq}` | CPH-POU-000001 |
| CPH | Jefe Planta | `CPH-J-POF-{seq}` | CPH-J-POF-000001 |
| CPH | Jefe Guardia | `CPH-J-POU-{seq}` | CPH-J-POU-000001 |
| CPH | Director | `CPH-D-{seq}` | CPH-D-000001 |
| CPH | Sub Director | `CPH-SD-{seq}` | CPH-SD-000001 |
| ENF | Ejecución | `ENF-{seq}` | ENF-000001 |
| TEC | Planta (POF) | `TEC-POF-{seq}` | TEC-POF-000001 |
| TEC | Guardia (POU) | `TEC-POU-{seq}` | TEC-POU-000001 |
| EG | Ejecución | `EG-{seq}` | EG-000001 |
| EG | Jefe EG | `EG-J-{seq}` | EG-J-000001 |
| EG | Director EG | `EG-D-{seq}` | EG-D-000001 |
| EG | Gerencial | `EG-G-{seq}` | EG-G-000001 |
| AS | Ministro | `AS-MIN-{seq}` | AS-MIN-000001 |
| AS | Subsecretaría | `AS-SS-{seq}` | AS-SS-000001 |
| AS | Dir. General | `AS-DG-{seq}` | AS-DG-000001 |
| AS | Dir. General Adjunta | `AS-DGA-{seq}` | AS-DGA-000001 |
| RG | Régimen Gerencial | `RG-CG-{seq}` | RG-CG-000001 |

### Reglas de formato

- CPH ejecución usa `POF` (planta) y `POU` (guardia) en el código — reemplaza los anteriores `PL`/`GU`.
- Jefe CPH también usa `POF`/`POU` según modalidad.
- Director y Sub Director **no tienen modalidad** en ninguna carrera.
- Sub Director solo aplica a CPH, solo por estructura, sin modalidad.
- ENF es solo por ejecución, **sin modalidad** en el código.
- TEC POU aplica a: Radiólogos, Hemoterapia, Anatomía Patológica, Instrumentadores Quirúrgicos.
- EG tipos estructura: `jefe_eg` → `EG-J`, `director_eg` → `EG-D`, `gerencial` → `EG-G`.
- **AS** (Autoridades Superiores) es carrera independiente con `solo_estructura=1`, `norma=No aplica`. Tipos: `ministro`, `subsecretaria`, `dir_general`, `dir_general_adjunta`.
- **RG** (Régimen Gerencial) es carrera independiente.
- El prefijo `GEN` fue migrado a `EG` (script M1/M2 ejecutado).
- Los códigos legacy (`CPH-P`, `CPH-G`, `EG-P`, `ENF-P`, `TEC-P`, `SG-G`) fueron migrados al formato normalizado (script M16 ejecutado). El secuencial continúa desde el último número existente.

---

## 4. MODALIDADES

| Modalidad | Aplica a |
|---|---|
| `planta` (POF) | CPH, TEC |
| `guardia` (POU) | CPH, TEC |
| Sin modalidad | ENF, EG, AS, SG, RES, DOC |

- ENF, EG, AS, SG, RES y DOC **no tienen modalidad** — `id_modalidad` es NULL por diseño.
- TEC se diferencia en POU (guardia) y POF (planta) — determina el formato del código.

---

## 5. PUESTOS

Los puestos son los cargos funcionales dentro de cada carrera.

### CPH — Puestos de Guardia (POU)
- ESPECIALISTA EN LA GUARDIA MEDICO
- PROFESIONAL GUARDIA MEDICO
- FARMACEUTICO DE GUARDIA, KINESIOLOGO DE GUARDIA, OBSTETRICA DE GUARDIA, TRABAJADOR SOCIAL DE GUARDIA, ODONTOLOGO DE GUARDIA, PSICOLOGO DE GUARDIA, BIOQUIMICO DE GUARDIA

### CPH — Puestos de Planta (POF)
- MEDICO DE PLANTA
- EXPERTO EN FISICA RADIANTE DE PLANTA, PSICOPEDAGOGO DE PLANTA, ODONTOLOGO DE PLANTA, FARMACEUTICO DE PLANTA, FONOAUDIOLOGO DE PLANTA, OBSTETRICA DE PLANTA, PSICOLOGO DE PLANTA, TRABAJADOR SOCIAL DE PLANTA, NUTRICIONISTA DIETISTA DE PLANTA, BIOQUIMICO DE PLANTA, KINESIOLOGO DE PLANTA, TERAPEUTA OCUPACIONAL DE PLANTA, MUSICOTERAPEUTA DE PLANTA, SOCIOLOGO DE PLANTA, LIC. EN CIENCIAS EDUC. DE PLANTA, BIOLOGO DE PLANTA

### CPH — Jefaturas
- JEFE DEPARTAMENTO, JEFE DIVISION, JEFE SECCION, JEFE UNIDAD

### EG — Puestos gerencial (estructura)
- GERENTE (`tipo=gerencial`, `es_estructura=1`)
- SUBGERENTE (`tipo=gerencial`, `es_estructura=1`)

### Reglas de filtro de puestos
- El puesto disponible depende del **unificador** (CPH de Guardia / CPH de Planta / Jefaturas) y del **escalafón** (Médico / No Médico).
- Sin filtros: se muestran todos los puestos CPH (jefaturas aparte).
- ENF, AS, SG, RES, DOC **no tienen puestos individuales** — `id_puesto` es NULL por diseño.

---

## 6. ESPECIALIDADES

Las especialidades se filtran según el puesto seleccionado.

- Cada puesto tiene un conjunto fijo de especialidades válidas (mapa puesto → especialidades).
- Si no hay puesto seleccionado, se filtra por escalafón (Médico / No Médico).
- Fallback: si no hay puesto ni escalafón, se muestran todas las especialidades.
- ENF, EG, AS, SG, RES, DOC **no tienen especialidad** — `id_especialidad` es NULL por diseño.

---

## 7. EVENTO DE ALTA

El alta es el evento que da origen a uno o más cargos en la estructura.

### Tabla `cargos_alta` (encabezado del evento)

| Campo | Descripción |
|---|---|
| `tipo_alta` | `ejecucion` o `estructura` |
| `documento` | Número de expediente/documento que respalda el alta |
| `expediente` | Campo legacy — se mantiene por compatibilidad |
| `cantidad` | Cantidad de cargos creados en este evento |
| `norma_referencia` | Norma legal que autoriza el alta |
| `nro_resolucion` | Número de resolución |
| `documento_origen` | Documento de origen del alta |
| `fecha_registro` | Fecha en que se registró el evento |

### Tipos de alta

| Tipo | Descripción |
|---|---|
| `ejecucion` | Alta de cargo de ejecución (planta/guardia) |
| `estructura` | Alta de cargo de conducción/estructura (jefaturas, directores) |

### Pestañas del módulo /cargos

| Pestaña | Ruta | modalidadForzada | modo |
|---|---|---|---|
| Cargo de Ejecucion POF | `/cargos` | `planta` | `ejecucion` |
| Cargo de Ejecucion POU | `/cargos/pou` | `guardia` | `ejecucion` |
| Cargo por Estructura | `/cargos/decreto` | — | `estructura` |

### Tablas de detalle por carrera

| Tabla | Aplica a |
|---|---|
| `registro_cph` | Cargos CPH — modalidad, puesto, especialidad, numero_unico |
| `registro_enf` | Cargos ENF — numero_unico |
| `registro_tec_pou` | Cargos TEC guardia — puesto, numero_unico |
| `registro_tec_pof` | Cargos TEC planta — puesto, numero_unico |

### Regla de resolución de norma/resolución (COALESCE)

Cuando un cargo tiene datos en `cargos_alta` y también en `new_cargo`, se prioriza el dato del alta:
- `norma_ref_final` = `COALESCE(ca.norma_referencia, nc.norma_referencia)`
- `resolucion_final` = `COALESCE(ca.nro_resolucion, nc.nro_resolucion)`
- `doc_origen_final` = `COALESCE(ca.documento_origen, nc.documento_origen)`

---

## 8. SITUACIÓN DE REVISTA

La situación de revista aplica **solo a cargos CPH de tipo Jefe o Director** (código con patrón `CPH-J-*` o `CPH-D-*`).

| Valor | Descripción |
|---|---|
| `activo` | El agente está en actividad normal |
| `retencion_cargo` | El agente retiene el cargo pero está en otra función |
| `comision` | El agente está en comisión de servicios |

**Nota de diseño:** Este campo actualmente está en `new_cargo`. Debe migrarse a la tabla `dotacion` cuando esta sea diseñada, ya que es un atributo de la relación persona-cargo, no del cargo en sí.

---

## 9. ANTIGÜEDAD

- Se almacena como **fecha de inicio** en el cargo (`antiguedad` date).
- Se calcula dinámicamente: `TIMESTAMPDIFF(YEAR, antiguedad, CURDATE())` años + meses restantes.
- Formato de display: `"X a Y m"` (ej: "3 a 4 m").
- Se calcula para **todos los cargos con fecha de antigüedad**, sin importar el estado.
- **Nota de diseño:** Debe migrarse a la tabla `dotacion` — es un atributo de la ocupación, no del cargo.

---

## 10. CATEGORÍA INTERNA (ETIQUETA)

- Campo `categoria_interna` varchar(50) en `new_cargo` — texto redundante con `id_etiqueta`.
- `id_etiqueta` FK → `cargo_etiquetas.id` — normalizado desde el alta.
- Identifica subcategorías internas del cargo (ej: "BA", "BC").
- Se muestra como badge en la tabla y en el modal de información.
- Se puede filtrar directamente por valor exacto.

---

## 11. SIGLAS (EFECTORES)

Las siglas identifican el efector (hospital, dirección, subsecretaría) al que pertenece el cargo.

- Cada cargo tiene una sigla asignada (`new_cargo.sigla`).
- Las siglas están catalogadas en la tabla `siglas`.
- Se agrupan por tipo de efector:
  - Hospitales de Agudos, Hospitales de Niños, Hospitales Monovalentes
  - Hospitales de Salud Mental, SAME
  - SS Atención Hospitalaria, SS Administración de Salud, SS Planificación Sanitaria
  - SS Atención Primaria, SS Personas Mayores, Nivel Central, Unidad de Ministro

---

## 12. MÓDULO CONCURSALES — Bajas y Seguimiento CPH

### 12.1 Orígenes de concurso

| Origen | Módulo |
|---|---|
| Ampliación | Módulo 1 |
| POU a POF | Módulo 1 |
| Alta por Baja | Módulo 2 |
| Cobertura Dotación | Módulo 2 |

### 12.2 Estados del proceso concursal CPH

El estado se calcula automáticamente a partir de los datos cargados (réplica de fórmulas Excel):

| Estado | Condición |
|---|---|
| `SUSPENDIDO` | `suspendido = true` |
| `FINALIZADO` | `resolucion_designacion` tiene valor |
| `ACTIVO` | Tiene EE baja, EE concurso, fecha baja y fecha EE concurso |
| `NO INICIADO` | Ninguna de las anteriores |

### 12.3 Sub-estado 3 (etapa del concurso)

Se calcula de más a menos avanzado:

| Sub-estado | Condición |
|---|---|
| H-DESIERTO | Tiene `fecha_dispo_desierta` |
| G-RESOLUCION | Tiene `resolucion_designacion` |
| F-PROX. A DESIG | Tiene `ee_designacion` |
| E-ADJUDI | Fecha examen ≤ hoy |
| D-ETAPA EVAL | Fecha inscripción hasta ≤ hoy |
| C-INSCRIPCION | Tiene `disposicion` |
| B-AUTORIZADO | Tiene `fecha_autorizacion` y `sorteo_jurado` |
| A-VALID. VCTE | Ninguna de las anteriores |

### 12.4 Cambio de especialidad

Se detecta automáticamente comparando `especialidad_baja` vs `especialidad_solicitada`. Si difieren → `SI`, si son iguales → `NO`.

### 12.5 Asignación de usuarios por sigla

Cada analista tiene un conjunto fijo de siglas asignadas en Bajas Consolidadas y Seguimiento CEETPS. Los usuarios con `null` tienen acceso a todas las siglas.

---

## 13. MÓDULO CEETPS — Seguimiento

### 13.1 Escalafones CEETPS

| Código | Escalafón |
|---|---|
| 87 | Enfermería |
| 85 | Técnicos |
| 83 | Servicios |

### 13.2 Unificador de puestos automático

| Código | Unificador |
|---|---|
| 87 | Nueva Carrera de Enfermería |
| 85 | CEETPS |
| 83 | Escalafón General |

### 13.3 Estado del concurso CEETPS

Se calcula de más a menos avanzado:

| Estado | Condición |
|---|---|
| Finalizado | Tiene `resolucion_designacion` |
| Disposición de Designación | Tiene `dispo_designacion` |
| TAD | Tiene `expediente_designacion` |
| INSAL | Tiene `fecha_insal` |
| IFACS | Tiene `fecha_ifacs` |
| Disposición de Llamado | Tiene `dispo_llamado` |
| Autorizado | Tiene `puesto_solicitado` |
| Sin Autorizar | Tiene `expediente_concurso` |

---

## 14. SEGURIDAD Y ACCESO

### 14.1 Roles del sistema

| Rol | Descripción |
|---|---|
| `admin` | Acceso total. Sin restricciones de módulos. |
| `editor` | Puede editar datos y tablas. Sin acceso a seguridad. |
| `viewer` | Solo lectura. Sin tablas BD ni seguridad. |
| `director` | Solo su hospital — vista personalizada + organigrama. |
| `gerencia` | Acceso a recorridas, dotación y organigrama. |
| `concursales` | Gestión de procesos concursales + módulo de altas. |
| `autoridades` | Acceso a organigrama y dotación. |

Además existen **roles custom** creados desde la interfaz (tabla `custom_roles`), con clave, label, descripción y color.

### 14.2 Permisos de módulos

- Los módulos accesibles por rol se almacenan en la tabla `module_permissions`.
- `admin` siempre devuelve `null` (sin restricciones — acceso total).
- Para los demás roles: si no hay filas en BD, se usa `pagePermissions.js` como fallback.
- Los permisos se entregan al frontend en el login y en cada refresh de token.
- El frontend filtra el sidebar y protege rutas según `allowedModules`.

### 14.3 Regla de acceso a módulos

- `allowedModules = null` → admin → acceso a todo.
- `allowedModules = []` → sin acceso a ningún módulo.
- `allowedModules = ['AltasCargo', 'ListaCargos']` → solo esos módulos visibles y accesibles.

### 14.4 Permisos de acción (tabla `permissions`)

| Permiso | Descripción |
|---|---|
| `can_read_all` | Puede leer todos los registros |
| `can_create` | Puede crear registros |
| `can_update` | Puede editar registros |
| `can_delete` | Puede eliminar registros |
| `can_alter_structure` | Puede modificar estructura de datos |
| `can_manage_users` | Puede gestionar usuarios y seguridad |
| `can_view_audit` | Puede ver logs de auditoría |
| `filter_by_hospital` | Solo ve datos de su hospital (`hospital_code`) |

### 14.5 Autenticación

- JWT con expiración configurable (default 30 minutos de inactividad).
- Refresh token rotativo: cada uso genera un nuevo token y revoca el anterior.
- Detección de reutilización: si se usa un refresh token ya rotado, se revoca toda la familia de tokens del usuario y se registra en auditoría.
- Soporte para modo DB (usuarios en BD) y modo ENV (usuarios en variables de entorno).
- El usuario puede autenticarse con `username` o `email`.

---

## 15. JORNADAS

Aplica **solo a ENF** (Enfermería).

| Jornada | Descripción |
|---|---|
| Jornada completa | Turno completo |
| ATP | Actividad de tiempo parcial |

Para todas las demás carreras, `id_jornada` es NULL por diseño.

---

## 16. TIPOS DE CARGO (ESTRUCTURA)

Los tipos de cargo aplican solo al **modo estructura** (`solo_estructura = 1`).

- Se almacenan en la tabla `tipos_cargo` con `codigo` VARCHAR(30).
- Cada tipo tiene: código, nombre, carrera a la que aplica, si requiere modalidad.
- Actualmente hay 11 tipos definidos:

| Código | Nombre | Carrera |
|---|---|---|
| `jefe` | Jefe | CPH |
| `director` | Director | CPH |
| `subdirector` | Sub Director | CPH |
| `jefe_eg` | Jefe EG | EG |
| `director_eg` | Director EG | EG |
| `gerencial` | Gerencial | EG |
| `ministro` | Ministro | AS |
| `subsecretaria` | Subsecretaría | AS |
| `dir_general` | Dir. General | AS |
| `dir_general_adjunta` | Dir. General Adjunta | AS |
| `rg` | Régimen Gerencial | RG |

---

## 17. DOTACIÓN (DISEÑO FUTURO)

> Tabla pendiente de diseño. Prerequisito para completar la normalización.

La tabla `dotacion` representará la **ocupación** de un cargo por una persona en un período.

Campos previstos:
- `id_cargo` FK → new_cargo
- `id_persona` FK → personas (NULL si vacante)
- `desde` / `hasta` (período de ocupación)
- `situacion_revista` — a migrar desde `new_cargo` (2.472 registros)
- `antiguedad` — a migrar desde `new_cargo` (46.947 registros)

**Impacto:** Hasta que esta tabla exista, `situacion_revista` y `antiguedad` permanecen en `new_cargo`.

---

## 18. RECORRIDAS Y MINUTAS

- Una **recorrida** es un informe por hospital con contenido HTML libre.
- Una **minuta** es una tabla estructurada con columnas configurables (texto, número, fecha, select).
- Ambas están asociadas a un `hospital_code`.
- Solo el creador queda registrado (`user_id`); no se puede modificar la autoría.
- El contenido HTML tiene un límite de 100KB.

---

## 19. POU (PLANTA ORGÁNICA UNITARIA)

- La tabla `pou` almacena la dotación por sigla y período (resumen, no cargos individuales).
- Permite comparativas entre períodos (POUComparativa).
- No es una tabla de cargos individuales — es un resumen agregado.

---

## 20. NORMALIZACIÓN DE `new_cargo` — Estado actual

| Campo FK | Tabla origen | Se llena en alta nueva | Históricos |
|---|---|---|---|
| `id_carrera` | `carreras` | ✅ Sí | ✅ Completo |
| `id_modalidad` | `modalidades` | ✅ Sí | ✅ Completo |
| `id_especialidad` | `especialidades` | ✅ Sí | ✅ Completo |
| `id_puesto` | `puestos_cargo` | ✅ Sí (CPH, TEC, EG) | ✅ Completo |
| `id_jornada` | `jornadas` | ✅ Sí | ✅ Completo |
| `id_tipo_cargo` | `tipos_cargo` | ✅ Sí (estructura) | ❌ Solo nuevos |
| `id_etiqueta` | `cargo_etiquetas` | ✅ Sí | ❌ Solo nuevos |
| `id_alta` | `cargos_alta` | ✅ Sí | ⚠️ 46.889 sin alta |

Campos texto redundantes mantenidos por compatibilidad: `carrera`, `modalidad`, `puesto`, `especialidad`, `tipo_cargo`, `categoria_interna`. Pendiente eliminar en M10 fase 2.

---

## 21. PENDIENTES DE NEGOCIO (DEUDA TÉCNICA CON IMPACTO FUNCIONAL)

| # | Descripción | Impacto |
|---|---|---|
| 1 | `situacion_revista` en `new_cargo` debe moverse a `dotacion` | Actualmente mezcla atributo de ocupación con atributo de cargo |
| 2 | `antiguedad` en `new_cargo` debe moverse a `dotacion` | Ídem |
| 3 | 46.889 cargos históricos sin `id_alta` | No tienen evento de alta registrado — datos de norma/resolución incompletos |
| 4 | Campos texto (`carrera`, `modalidad`, `puesto`, `especialidad`) duplican las FKs | Pendiente eliminar en M10 fase 2 |
| 5 | Usuarios por módulo hardcodeados en `concursalesHelpers.js` | Debe migrarse a tabla `users` + permisos |
| 6 | Siglas por usuario hardcodeadas en `concursalesHelpers.js` | Debe migrarse a tabla `user_siglas` |
| 7 | Estados concursales y motivos de baja hardcodeados | Deben migrarse a tablas de catálogo |
