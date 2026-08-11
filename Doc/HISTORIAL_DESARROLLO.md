# DISEÑO — Tabla `cargo` y estructura de datos

> Documento de trabajo. Registra decisiones de diseño, estado actual y estructura objetivo.
> Última actualización: 2026-01 (actualizado post M10-M14)

---

## 1. Contexto y objetivo

El sistema gestiona **cargos** del sistema de salud del GCABA.
Un cargo es la unidad mínima de dotación: existe independientemente de si está ocupado o vacante.

Flujo de vida de un cargo:

```
ALTA (expediente/decreto)
  → CONCURSO (proceso de selección)
  → DESIGNACIÓN (persona asignada)  ←→  DOTACIÓN (tabla futura)
  → BAJA / TRANSFERENCIA
```

El objetivo es tener una tabla `cargo` normalizada que sea la fuente de verdad,
y que los procesos (alta, concurso, baja, transferencia) sean eventos vinculados a ella.

---

## 2. Estado actual de la BD

### Tablas principales

| Tabla              | Rol                                          | Estado                                                                    |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| `new_cargo`        | Tabla principal de cargos (46.947 registros) | En uso. Normalización en curso (M10-M14 ejecutados).                      |
| `cargos_alta`      | Encabezado del evento de alta                | ✅ Migrada (M7) — `documento`+`tipo_alta`. Legacy `expediente` mantenido. |
| `registro_cph`     | Detalle CPH del alta                         | Se mantiene                                                               |
| `registro_enf`     | Detalle ENF del alta                         | Se mantiene                                                               |
| `registro_tec_pou` | Detalle TEC guardia                          | Se mantiene                                                               |
| `registro_tec_pof` | Detalle TEC planta                           | Se mantiene                                                               |
| `cargos`           | Tabla legacy (periodo+codigo)                | ❌ Cancelado eliminar — 245k registros + FK desde `bajas_concursos`       |
| `pou`              | Dotación por sigla/periodo                   | Tabla de resumen, no de cargos individuales                               |

### Tablas de catálogo

| Tabla            | Campos clave                                                                    | Estado                                   |
| ---------------- | ------------------------------------------------------------------------------- | ---------------------------------------- |
| `carreras`       | id_carrera, codigo, nombre, norma_referencia, excluir_alta, solo_estructura     | ✅ OK — M2/M8                            |
| `modalidades`    | id, nombre, id_cod, activo                                                      | ✅ OK                                    |
| `especialidades` | id, nombre, categoria, id_carrera                                               | ✅ OK                                    |
| `puestos_cargo`  | id, nombre, carrera, tipo, es_medico, activo, es_estructura, modalidad_tec      | ✅ OK — M5/M8                            |
| `siglas`         | id_sigla, sigla                                                                 | ✅ OK                                    |
| `jornadas`       | id, nombre, activo                                                              | ✅ Creada M3 — 'Jornada completa', 'ATP' |
| `tipos_cargo`    | id, codigo, nombre, aplica_carrera, requiere_modalidad, solo_estructura, activo | ✅ Creada M4 — 7 tipos                   |

### Estado de `new_cargo` — campos FK (post M10-M14)

| Campo FK            | Tipo                    | NULLs  | Estado                                                   |
| ------------------- | ----------------------- | ------ | -------------------------------------------------------- |
| `id_carrera`        | int FK → carreras       | 0      | ✅ Completo                                              |
| `id_modalidad`      | int FK → modalidades    | 3.038  | ✅ Correcto — carreras sin modalidad (EG/ENF/SG/RES/DOC) |
| `id_especialidad`   | int FK → especialidades | 24.485 | ✅ Correcto — carreras donde no aplica                   |
| `id_puesto`         | int FK → puestos_cargo  | 24.585 | ✅ Correcto — ENF/EG/SG/RES/DOC sin puestos individuales |
| `id_jornada`        | tinyint FK → jornadas   | 46.943 | ✅ Correcto — solo ENF usa jornada                       |
| `id_alta`           | int FK → cargos_alta    | 46.889 | ⚠️ Pendiente — cargos históricos sin evento de alta      |
| ~~`id_puesto_tec`~~ | eliminado               | —      | ✅ Eliminado M14 — reemplazado por `id_puesto`           |

### Estado de `new_cargo` — campos texto libre

| Campo          | NULLs   | Estado                                                              |
| -------------- | ------- | ------------------------------------------------------------------- |
| `carrera`      | 0       | ⚠️ Mantenido — usado en filtros y display. Eliminar en M10 fase 2.  |
| `modalidad`    | 3.038   | ⚠️ Mantenido — usado en filtros y display. Eliminar en M10 fase 2.  |
| `puesto`       | ~6.000  | ⚠️ Mantenido — usado en búsqueda full-text. Eliminar en M10 fase 2. |
| `especialidad` | ~24.000 | ⚠️ Mantenido — usado en búsqueda full-text. Eliminar en M10 fase 2. |
| ~~`jornada`~~  | —       | ✅ Eliminado M13 — reemplazado por `id_jornada`                     |

### Estado de `new_cargo` — otros campos

| Campo               | Tipo                                    | Estado                                                                                |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `estado`            | enum('vigente','no_vigente')            | ✅ Migrado M12 — era activo/bloqueado                                                 |
| `situacion_revista` | enum(activo, retencion_cargo, comision) | ⚠️ 2.472 registros con valor. Mover a `dotacion` — bloqueado hasta diseñar esa tabla  |
| `antiguedad`        | date                                    | ⚠️ 46.947 registros con fecha. Mover a `dotacion` — bloqueado hasta diseñar esa tabla |
| `categoria_interna` | varchar(50)                             | En uso — se mantiene                                                                  |
| `nivel_formacion`   | varchar                                 | No existe en BD (referencia legacy en código eliminada)                               |

### Estado de carreras (post M8)

| codigo | nombre               | norma_referencia | excluir_alta | solo_estructura |
| ------ | -------------------- | ---------------- | ------------ | --------------- |
| CPH    | CPH                  | Ley 6.035        | 0            | 1               |
| ENF    | Enfermería           | Ley 6.767        | 0            | 0               |
| TEC    | Técnico              | Ley 6.035        | 0            | 0               |
| EG     | Escalafón General    | Ley 471          | 0            | 1               |
| SG     | Suplentes de Guardia | —                | 1            | 0               |
| RES    | Residentes           | —                | 1            | 0               |
| DOC    | Docentes             | —                | 1            | 0               |

> Lógica de filtro en frontend:
>
> - Modo ejecución → mostrar donde `excluir_alta = 0`
> - Modo estructura → mostrar donde `solo_estructura = 1`
> - CPH y EG aparecen en ambos modos (solo_estructura=1 + excluir_alta=0)

---

## 3. Estructura objetivo — tabla `cargo`

### Decisiones tomadas

- [ ] Los campos de texto libre con FK disponible se eliminan — **PENDIENTE M10 fase 2**
- [ ] `situacion_revista` se mueve a la tabla `dotacion` — **BLOQUEADO hasta diseñar dotacion**
- [ ] `antiguedad` se mueve a la tabla `dotacion` — **BLOQUEADO hasta diseñar dotacion**
- [x] `estado` cambiado a `vigente`/`no_vigente` — **HECHO M12**
- [x] `id_jornada` FK reemplaza campo texto `jornada` — **HECHO M13**
- [x] `id_puesto` unificado reemplaza `id_puesto_tec` — **HECHO M14**
- [x] Los datos del evento de alta se consolidan en `cargos_alta` — **HECHO M7**

### Estados del cargo

| Estado       | Descripción                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `vigente`    | Cargo activo en la estructura. Puede estar ocupado o vacante según dotación. |
| `no_vigente` | Cargo dado de baja, transferido o suspendido definitivamente.                |

**Vacante no es un estado del cargo** — es una condición derivada:

- `vigente` + sin dotación asignada = **vacante**
- `vigente` + con dotación asignada = **ocupado**
- `no_vigente` = cargo fuera de la estructura

### Estructura objetivo `cargo`

```
cargo  (actualmente: new_cargo)
├── id                    PK autoincrement
├── codigo                varchar(25) UNIQUE NOT NULL
├── id_sial               varchar(20) UNIQUE NULL
├── sigla                 varchar(20) NOT NULL              -- texto, FK lógica a siglas
├── id_carrera            int FK → carreras                 ✅ completo
├── id_modalidad          int FK → modalidades NULL         ✅ completo
├── id_puesto             int FK → puestos_cargo NULL       ✅ completo (TEC+CPH)
├── id_especialidad       int FK → especialidades NULL      ✅ completo
├── id_jornada            tinyint FK → jornadas NULL        ✅ completo
├── id_alta               int FK → cargos_alta NULL         ⚠️ 46.889 históricos sin alta
├── estado                enum(vigente, no_vigente)         ✅ migrado M12
├── cargo_desde           date NULL
├── cargo_hasta           date NULL
├── categoria_interna     varchar(50) NULL
├── norma_referencia      varchar(100) NULL
├── nro_resolucion        varchar(100) NULL
├── documento_origen      varchar(100) NULL
├── fecha_alta            datetime NOT NULL
├── fecha_actualizacion   timestamp AUTO UPDATE
│
│   -- Campos a eliminar en M10 fase 2 (cuando filtros/búsqueda usen FKs):
├── carrera               varchar(10)    ← reemplazar por id_carrera
├── modalidad             varchar(50)    ← reemplazar por id_modalidad
├── puesto                varchar(150)   ← reemplazar por id_puesto
├── especialidad          varchar(150)   ← reemplazar por id_especialidad
│
│   -- Campos a mover a dotacion (cuando esa tabla exista):
├── situacion_revista     enum(activo, retencion_cargo, comision) NULL
└── antiguedad            date NULL
```

---

## 4. Tabla `cargos_alta` — estado post M7

```
cargos_alta
├── id                    PK
├── fecha_registro        datetime DEFAULT NOW()
├── tipo_alta             enum(ejecucion, estructura) NOT NULL
├── documento             varchar(100) NULL                  ← reemplaza expediente
├── expediente            varchar(100) NULL                  ← legacy, mantener
├── cantidad              int
├── norma_referencia      varchar(100) NULL
├── nro_resolucion        varchar(100) NULL
└── documento_origen      varchar(100) NULL
```

---

## 5. Tablas de detalle de alta — se mantienen

```
registro_cph        → id_alta, modalidad, puesto, especialidad, numero_unico
registro_enf        → id_alta, numero_unico
registro_tec_pou    → id_alta, puesto, numero_unico
registro_tec_pof    → id_alta, puesto, numero_unico
```

---

## 6. Diseño futuro — tabla `dotacion`

> Pendiente de diseño e implementación. Prerequisito para M11.

```
dotacion  ← A DISEÑAR
├── id                    PK
├── id_cargo              int FK → new_cargo
├── id_persona            int FK → personas NULL   (NULL si vacante)
├── desde                 date
├── hasta                 date NULL
├── situacion_revista     enum(activo, retencion_cargo, comision)
├── antiguedad            date NULL                ← migrar desde new_cargo
└── ...
```

**Datos a migrar desde `new_cargo` cuando `dotacion` exista:**

- `situacion_revista` — 2.472 registros con valor (activo/retencion_cargo/comision)
- `antiguedad` — 46.947 registros con fecha

---

## 7. Formato de códigos de cargo

| Carrera | Tipo                   | Formato           | Ejemplo         |
| ------- | ---------------------- | ----------------- | --------------- |
| CPH     | Ejecución Planta       | `CPH-POF-{seq}`   | CPH-POF-000001  |
| CPH     | Ejecución Guardia      | `CPH-POU-{seq}`   | CPH-POU-000001  |
| CPH     | Jefe Planta            | `CPH-J-POF-{seq}` | CPH-J-PL-000001 |
| CPH     | Jefe Guardia           | `CPH-J-POU-{seq}` | CPH-J-GU-000001 |
| CPH     | Director               | `CPH-D-{seq}`     | CPH-D-000001    |
| CPH     | Sub Director           | `CPH-SD-{seq}`    | CPH-SD-000001   |
| ENF     | Ejecución              | `ENF-{seq}`       | ENF-000001      |
| TEC     | Planta (POF)           | `TEC-POF-{seq}`   | TEC-POF-000001  |
| TEC     | Guardia (POU)          | `TEC-POU-{seq}`   | TEC-POU-000001  |
| EG      | Ejecución              | `EG-{seq}`        | EG-000001       |
| EG      | Jefe                   | `EG-J-{seq}`      | EG-J-000001     |
| AS      | Autoridades Superiores | `AS-D-{seq}`      | AS-D-000001     |
| RG      | Regimen Gerencial      | `RG-CG-{seq}`     | RG-CG-000001    |

**Reglas:**

- Director y Sub Director no tienen modalidad en ninguna carrera
- Jefe tiene modalidad (planta/guardia) — solo aplica a CPH
- SD solo aplica a CPH, solo por estructura, sin modalidad
- EG-J solo por estructura
- AS (Autoridades Superiores) reemplaza a EG-D
- RG (Régimen Gerencial) reemplaza a EG-CG
- ENF solo por ejecución, sin modalidad en el código
- TEC POU: Radiólogos, Hemoterapia, Anatomía Patológica, Instrumentadores Quirúrgicos
- Prefijo GEN migrado a EG — scripts M1/M2

---

## 8. Registro de scripts ejecutados

| Script | Descripción                                                                                                                                     | Estado                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| M1     | Migrar `GEN-...` → `EG-...` en `new_cargo.codigo`                                                                                               | ✅ Ejecutado                                               |
| M2     | Actualizar carrera GEN→EG, agregar norma_referencia/excluir_alta/solo_estructura a `carreras`                                                   | ✅ Ejecutado                                               |
| M3     | Crear tabla `jornadas` con 'Jornada completa' y 'ATP'                                                                                           | ✅ Ejecutado                                               |
| M4     | Crear tabla `tipos_cargo` con 7 tipos                                                                                                           | ✅ Ejecutado                                               |
| M5     | Agregar `modalidad_tec` a `puestos_cargo`, migrar puestos TEC, agregar EG y SUB DIRECTOR                                                        | ✅ Ejecutado                                               |
| M6     | Eliminar tabla `cargos` legacy                                                                                                                  | ❌ Cancelado — 245k registros + FK desde `bajas_concursos` |
| M7     | Migrar `cargos_alta`: agregar `documento`+`tipo_alta`, eliminar `carrera_seleccionada`/`categoria_interna`/`jornada`                            | ✅ Ejecutado                                               |
| M8     | Correcciones: `solo_estructura=1` para CPH/EG, corregir `modalidad_tec` POU en puestos TEC                                                      | ✅ Ejecutado                                               |
| M10    | Rellenar FKs en `new_cargo`: `id_carrera` (58), `id_modalidad` (38), `id_especialidad` (38), `id_puesto` CPH (18.795). Campos texto mantenidos. | ⚠️ Parcial                                                 |
| M12    | Cambiar enum `estado`: `activo`→`vigente`, `bloqueado`→`no_vigente`. 46.947 registros migrados.                                                 | ✅ Ejecutado                                               |
| M13    | Agregar `id_jornada` FK → `jornadas`, migrar 4 registros, eliminar campo texto `jornada`                                                        | ✅ Ejecutado                                               |
| M14    | Agregar `id_puesto` FK → `puestos_cargo`, migrar 3.567 TEC desde `id_puesto_tec`, eliminar `id_puesto_tec`                                      | ✅ Ejecutado                                               |

---

## 9. Registro de cambios en código

### Backend

| Archivo                 | Cambio                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AltaCargoService.js`   | `#nextCodigo` reescrito para todos los formatos. `create()` usa `documento`+`tipo_alta`, `'vigente'`, `id_jornada`+`id_puesto`.                                                                                                               |
| `altaCargoSchema.js`    | `expediente`→`documento`, `tipo_alta` agregado. CPH: subdirector. TEC: tipo_tec. EG: nuevo con tipo_eg.                                                                                                                                       |
| `AltaCargoEntity.ts`    | `CargosAlta` refleja nueva estructura: `tipo_alta`+`documento`, sin campos del cargo.                                                                                                                                                         |
| `carrerasController.js` | `listCarreras` con `norma_referencia`/`excluir_alta`/`solo_estructura`. Nuevos: `listJornadas`, `listTiposCargo`, `listPuestos`. SELECTs sin `nivel_formacion`/`jornada`, con `id_jornada`/`id_puesto`. Filtro `estado` mapea valores legacy. |
| `uploadController.js`   | `mapEstado()` devuelve `vigente`/`no_vigente`. UPDATE usa `id_puesto` (puestos_cargo) en lugar de `id_puesto_tec`.                                                                                                                            |
| `altaCargoRoutes.js`    | Rutas: `GET /puestos`, `GET /jornadas`, `GET /tipos-cargo`.                                                                                                                                                                                   |

### Frontend

| Archivo               | Cambio                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AltaCargoPage.jsx`   | Prop `modo`. Carrera EG con tipo_eg. Sub Director CPH. Modalidad condicional por `requiere_modalidad`. Jornadas/carreras/tipos desde BD. `buildPayload` usa `documento`+`tipo_alta`. |
| `altaCargoApi.js`     | `listPuestos(carrera, tipo, modo)`, `listJornadas()`, `listTiposCargo(carrera)`.                                                                                                     |
| `ListaCargosPage.jsx` | `ESTADOS_ENUM`/`ESTADOS_FILTER`/`ESTADO_STYLES` actualizados a `vigente`/`no_vigente`.                                                                                               |

---

## 10. Tareas pendientes

### BD — Migración `new_cargo`

| #          | Tarea                                                                   | Riesgo                                                | Estado                                |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| M9         | Renombrar `new_cargo` → `cargo`                                         | —                                                     | ❌ Descartado                         |
| M10 fase 2 | Eliminar campos texto: `carrera`, `modalidad`, `puesto`, `especialidad` | Alto — requiere reescribir filtros, búsqueda y export | ⚠️ Bloqueado hasta completar 12.4     |
| M11        | Mover `situacion_revista` y `antiguedad` a tabla `dotacion`             | Alto — 46.947 registros                               | ❌ Bloqueado hasta diseñar `dotacion` |

### Backend — pendiente

| #   | Tarea                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------- |
| B8  | Reescribir filtros WHERE en `carrerasController.js` para usar FKs en lugar de campos texto (prerequisito M10 fase 2) |
| B9  | Reescribir búsqueda full-text — actualmente usa `puesto LIKE` y `especialidad LIKE` (prerequisito M10 fase 2)        |
| B10 | Reescribir `uploadController.js` para no escribir en campos texto (prerequisito M10 fase 2)                          |

### Frontend — pendiente

| #   | Tarea                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------- |
| F7  | Selector tipo TEC (POF/POU) leerlo de BD usando `modalidad_tec` de `puestos_cargo` en lugar de ButtonGroup hardcoded |
| F8  | Panel de resultados: mostrar `tipo_alta` y `tipo_eg`/`tipo_cph` en el resumen del cargo registrado                   |
| F9  | Reescribir export Excel en `ListaCargosPage.jsx` para resolver nombres desde FKs (prerequisito M10 fase 2)           |

### Fuera de scope actual (otros módulos)

| Dato                  | Ubicación actual                     | Destino                    |
| --------------------- | ------------------------------------ | -------------------------- |
| Estados concursal CPH | Hardcoded en `concursalesHelpers.js` | `estados_concurso` (crear) |
| Motivos de baja       | Hardcoded en `concursalesHelpers.js` | `motivos_baja` (crear)     |
| Usuarios por módulo   | Hardcoded en `concursalesHelpers.js` | `users` + permisos         |
| Siglas por usuario    | Hardcoded en `concursalesHelpers.js` | `user_siglas` (crear)      |
| Escalafones CEETPS    | Hardcoded en `concursalesHelpers.js` | `carreras` o `escalafones` |

---

## 11. Validación y saneamiento de datos — tarea futura

> Prerequisito para M10 fase 2 y para eliminar campos texto.
> Script sugerido: `audit-integridad.js`

### 11.1 NULLs en `new_cargo` — estado actual

| Campo FK          | NULLs  | Causa                                                                           | Acción                                  |
| ----------------- | ------ | ------------------------------------------------------------------------------- | --------------------------------------- |
| `id_carrera`      | 0      | —                                                                               | ✅ Completo                             |
| `id_modalidad`    | 3.038  | Carreras sin modalidad (EG/ENF/SG/RES/DOC)                                      | ✅ Correcto por diseño                  |
| `id_especialidad` | 24.485 | Carreras donde no aplica especialidad                                           | ✅ Correcto por diseño                  |
| `id_puesto`       | 24.585 | ENF (11.062), EG (6.760), SG (3.743), RES (2.665), DOC (353). 2 CPH "No Aplica" | ✅ Correcto por diseño                  |
| `id_jornada`      | 46.943 | Solo ENF usa jornada                                                            | ✅ Correcto por diseño                  |
| `id_alta`         | 46.889 | Cargos históricos sin evento de alta registrado                                 | ⚠️ Pendiente — carga histórica de altas |

### 11.2 Validaciones cruzadas pendientes

| Validación                | Tablas                        | Descripción                                                                              |
| ------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| Siglas válidas            | `new_cargo` ↔ `siglas`        | Verificar que `new_cargo.sigla` exista en `siglas.sigla`                                 |
| Puestos CPH sin mapeo     | `new_cargo` ↔ `puestos_cargo` | 2 registros CPH con puesto "No Aplica" — eliminar o crear puesto especial                |
| FKs huérfanas             | `new_cargo` ↔ catálogos       | Verificar que `id_especialidad`, `id_modalidad`, `id_puesto` apunten a registros activos |
| Cargos vigentes sin sigla | `new_cargo`                   | `estado = 'vigente'` y `sigla IS NULL`                                                   |
| Duplicados SIAL           | `new_cargo`                   | Revisar NULLs múltiples en `id_sial` (tiene índice UNIQUE pero permite NULLs)            |
| Altas sin cargos          | `cargos_alta` ↔ `new_cargo`   | Registros en `cargos_alta` sin ningún cargo asociado                                     |
| Detalles huérfanos        | `registro_*` ↔ `cargos_alta`  | Detalles de alta sin encabezado válido                                                   |
| Cargos sin `id_alta`      | `new_cargo`                   | 46.889 históricos — decidir si se crean altas retroactivas                               |

### 11.3 Prerequisitos para M10 fase 2

Antes de eliminar `carrera`, `modalidad`, `puesto`, `especialidad`:

1. Completar validaciones 11.2
2. Reescribir filtros WHERE en `carrerasController.js` para usar FKs (B8)
3. Reescribir búsqueda full-text — `puesto LIKE` / `especialidad LIKE` (B9)
4. Reescribir export Excel en `ListaCargosPage.jsx` (F9)
5. Reescribir `uploadController.js` para no escribir en campos texto (B10)
