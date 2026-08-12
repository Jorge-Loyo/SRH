# PLAN DE SESIÓN — 2026-09

> Objetivo: validar el flujo completo de creación de cargos, normalizar la tabla `new_cargo`,
> diseñar la vinculación cargos-dotación y conectar con el organigrama.

---

## CONTEXTO

Tenemos dos universos de datos que deben convivir:

- **Datos migrados masivamente** — 46.947 cargos históricos cargados por scripts (M1-M14)
- **Datos generados por la aplicación** — cargos nuevos creados desde el formulario de altas

El objetivo de hoy es limpiar los datos de prueba, validar que el formulario genera cargos
correctamente normalizados, y diseñar la estructura de vinculación con dotación y organigrama.

---

## BLOQUE 1 — Limpieza de datos de prueba

> ✅ COMPLETADO

### Resultado

- 58 cargos de prueba eliminados (`id_alta IS NOT NULL`, `documento = NULL`)
- 12 eventos de alta eliminados de `cargos_alta`
- 38 registros `registro_cph` + 20 `registro_enf` eliminados
- **Quedan 46.889 cargos migrados** — intocables

### M16 — Migración de códigos legacy al formato normalizado

> ✅ COMPLETADO — 43.871 códigos actualizados

| Formato legacy | Formato nuevo | Cantidad |
|---|---|---|
| `CPH-P-XXXXXX` | `CPH-POF-XXXXXX` | 10.069 |
| `CPH-G-XXXXXX` | `CPH-POU-XXXXXX` | 6.239 |
| `CPH-J-P-XXXXXX` | `CPH-J-POF-XXXXXX` | 2.172 |
| `CPH-J-G-XXXXXX` | `CPH-J-POU-XXXXXX` | 198 |
| `CPH-D-P-XXXXXX` | `CPH-D-XXXXXX` | 81 |
| `EG-P-XXXXXX` | `EG-XXXXXX` | 6.760 |
| `ENF-P-XXXXXX` | `ENF-XXXXXX` | 11.042 |
| `TEC-P-XXXXXX` | `TEC-POF-XXXXXX` | 3.567 |
| `SG-G-XXXXXX` | `SG-XXXXXX` | 3.743 |

### Estado final de `new_cargo` post-limpieza

| Prefijo | Total |
|---|---|
| `ENF` | 11.042 |
| `CPH-POF` | 10.069 |
| `EG` | 6.760 |
| `CPH-POU` | 6.239 |
| `SG` | 3.743 |
| `TEC-POF` | 3.567 |
| `RES` | 2.665 |
| `CPH-J-POF` | 2.172 |
| `DOC` | 353 |
| `CPH-J-POU` | 198 |
| `CPH-D` | 81 |

### Fix en `AltaCargoService.js` — contador de códigos

`#nextCodigo` actualizado para usar `MAX(seq)` con REGEXP en lugar de `COUNT(*)` con LIKE.
Así los migrados con formato legacy no interfieren con el contador de los nuevos.

---

## BLOQUE 2 — Validar flujo de creación de cargos

> Probar el formulario de altas con datos reales y verificar que todos los campos
> normalizados se graben correctamente en `new_cargo`.

### Campos a verificar por carrera

| Campo | CPH | ENF | TEC | EG | AS |
|---|---|---|---|---|---|
| `codigo` | CPH-POF/POU/J/D/SD | ENF | TEC-POF/POU | EG/EG-J/EG-D/EG-G | AS-MIN/SS/DG/DGA |
| `id_carrera` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `id_modalidad` | ✓ | NULL | ✓ | NULL | NULL |
| `id_puesto` | ✓ | NULL | ✓ | ✓ (jefe/gerencial) | NULL |
| `id_especialidad` | ✓ | NULL | NULL | NULL | NULL |
| `id_jornada` | NULL | ✓ | NULL | NULL | NULL |
| `id_tipo_cargo` | ✓ (estructura) | NULL | NULL | ✓ (estructura) | ✓ |
| `id_etiqueta` | opcional | opcional | opcional | opcional | opcional |
| `id_alta` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tipo_cargo` | texto tipo | NULL | NULL | texto tipo | texto tipo |

### Casos de prueba a ejecutar

1. CPH ejecución POF — con puesto + especialidad + etiqueta
2. CPH ejecución POU — con puesto + especialidad
3. CPH estructura jefe POF — con modalidad + puesto
4. CPH estructura director — sin modalidad ni puesto
5. CPH estructura subdirector — sin modalidad ni puesto
6. ENF ejecución — con jornada
7. TEC POF — con puesto
8. TEC POU — con puesto
9. EG ejecución — con puesto
10. EG estructura jefe_eg — con puesto
11. EG estructura gerencial — con puesto (GERENTE/SUBGERENTE)
12. EG estructura director_eg — sin puesto
13. AS ministro
14. AS subsecretaria
15. AS dir_general
16. AS dir_general_adjunta

### Query de verificación post-alta

```sql
SELECT
  nc.id, nc.codigo, nc.carrera, nc.tipo_cargo,
  nc.id_carrera, nc.id_modalidad, nc.id_puesto, nc.id_especialidad,
  nc.id_jornada, nc.id_tipo_cargo, nc.id_etiqueta, nc.id_alta,
  nc.estado, nc.sigla, nc.cargo_desde
FROM new_cargo nc
WHERE nc.id_alta IS NOT NULL
ORDER BY nc.id DESC
LIMIT 20;
```

---

## BLOQUE 3 — Tabla `new_cargo` normalizada y optimizada

> Revisar el estado actual de la tabla y definir qué falta para considerarla "lista".

### Estado actual de campos FK

| Campo | Estado | Acción |
|---|---|---|
| `id_carrera` | Completo (0 NULLs) | OK |
| `id_modalidad` | Completo (NULLs correctos) | OK |
| `id_especialidad` | Completo (NULLs correctos) | OK |
| `id_puesto` | Completo (NULLs correctos) | OK |
| `id_jornada` | Completo (NULLs correctos) | OK |
| `id_tipo_cargo` | Solo nuevos | Históricos sin mapear — aceptable |
| `id_etiqueta` | Solo nuevos | Históricos sin mapear — aceptable |
| `id_alta` | 46.889 NULLs | Históricos sin evento de alta — aceptable |

### Campos texto redundantes (pendiente M10 fase 2)

| Campo | Usado en | Bloqueo para eliminar |
|---|---|---|
| `carrera` | Filtros WHERE, display | Reescribir B8 |
| `modalidad` | Filtros WHERE, display | Reescribir B8 |
| `puesto` | Búsqueda LIKE | Reescribir B9 |
| `especialidad` | Búsqueda LIKE | Reescribir B9 |

### Índices a revisar

```sql
-- Verificar índices existentes
SHOW INDEX FROM new_cargo;

-- Índices sugeridos si no existen:
-- idx_new_cargo_carrera_estado  (id_carrera, estado)
-- idx_new_cargo_sigla           (sigla)
-- idx_new_cargo_id_alta         (id_alta)
-- idx_new_cargo_codigo          (codigo) -- probablemente ya existe UNIQUE
```

---

## BLOQUE 4 — Vinculación cargos ↔ dotación

> Diseñar la tabla puente que vincula cargos con personas (datos del Dotaneitor).

### Fuente de datos: `dot_resultado`

El Dotaneitor procesa `Cargos_Salud.xlsx` y guarda en `dot_resultado` una fila por cargo/agente con:

| Campo clave | Descripción |
|---|---|
| `id_sial` | Identificador SIAL del cargo — clave de cruce con `new_cargo.id_sial` |
| `cuil` | CUIL del agente que ocupa el cargo |
| `ayn` | Apellido y nombre |
| `desde` | Fecha de antigüedad (inicio en el cargo) |
| `situacion_revista` | activo / retencion_cargo / comision |
| `agrupador` | Agrupador del escalafón |
| `unificador_de_puestos` | Unificador de puestos |
| `estado` | Activo / Bloqueado / Retencion / Comision |
| `fecha_proceso` | Fecha del último proceso Dotaneitor |

### Tabla `dotacion` — esquema propuesto (M15)

```sql
CREATE TABLE dotacion (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  id_cargo              INT NOT NULL,
  id_sial               VARCHAR(20) NULL,
  cuil                  BIGINT NULL,
  cuil_y_rol            VARCHAR(50) NULL,
  ayn                   VARCHAR(200) NULL,
  desde                 DATE NULL,
  hasta                 DATE NULL,
  situacion_revista     ENUM('activo','retencion_cargo','comision') NULL,
  agrupador             VARCHAR(100) NULL,
  unificador_de_puestos VARCHAR(100) NULL,
  jefe_escalafon        VARCHAR(50) NULL,
  estado                VARCHAR(20) NULL,
  fecha_proceso         DATETIME NULL,
  fecha_creacion        DATETIME DEFAULT NOW(),
  fecha_actualizacion   TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  CONSTRAINT fk_dotacion_cargo FOREIGN KEY (id_cargo) REFERENCES new_cargo(id)
);
```

### Lógica de sincronización (endpoint B11)

```
dot_resultado.id_sial  →  new_cargo.id_sial  →  new_cargo.id  →  dotacion.id_cargo
```

- **Cargo ocupado**: `new_cargo` tiene `id_sial` que aparece en `dot_resultado` con CUIL
- **Cargo vacante**: `new_cargo` vigente sin fila en `dotacion` (o con `hasta IS NOT NULL`)
- **Sin match**: `dot_resultado` con `id_sial` que no existe en `new_cargo` → loguear para revisión

---

## BLOQUE 5 — Vinculación con el organigrama

> Conectar los cargos del sistema con los datos del organigrama para verificar veracidad.

### Campos de cruce disponibles

| Campo en `new_cargo` | Campo en organigrama | Descripción |
|---|---|---|
| `sigla` | código de repartición | Efector/dependencia |
| `id_sial` | id_sial | Identificador SIAL del cargo |
| `codigo` | código de cargo del sistema | Generado en el alta |

### Campos a obtener del organigrama por cargo

| Campo | Descripción |
|---|---|
| Código de repartición | Identifica la dependencia en el organigrama |
| ID SIAL | Identificador del cargo en el sistema SIAL |
| DNI | Documento del agente asignado |
| Plus salarial | Complemento salarial del cargo |
| Código de cargo del sistema | El `codigo` generado en el alta (`CPH-POF-000001`, etc.) |

### Validaciones cruzadas organigrama ↔ sistema

1. Cargo en organigrama con `id_sial` → buscar en `new_cargo` por `id_sial` → verificar que `estado = vigente`
2. Cargo en `new_cargo` vigente → verificar que existe en organigrama
3. Agente en organigrama (DNI/CUIL) → buscar en `dotacion` → verificar que el cargo coincide
4. Plus salarial del organigrama → comparar con `id_tipo_cargo` del cargo (jefe, director, etc.)

### Estructura de vinculación completa

```
organigrama
  └── codigo_reparticion, id_sial, dni, plus_salarial
        ↓ (cruce por id_sial)
new_cargo
  └── id, codigo, sigla, id_carrera, id_tipo_cargo, estado
        ↓ (cruce por new_cargo.id)
dotacion
  └── id_cargo, cuil, ayn, desde, situacion_revista, estado
```

---

## ORDEN DE EJECUCIÓN

1. **Bloque 1** — Limpiar datos de prueba (script SQL)
2. **Bloque 2** — Probar formulario de altas con los 16 casos, verificar con query
3. **Bloque 3** — Revisar índices y estado de la tabla
4. **Bloque 4** — Ejecutar M15 (crear tabla `dotacion`), probar sincronización
5. **Bloque 5** — Definir estructura de cruce con organigrama

---

## CRITERIOS DE ÉXITO

- [x] Tabla `new_cargo` sin datos de prueba — 46.889 migrados con códigos normalizados
- [ ] Los 16 casos de prueba generan cargos con todos los campos FK correctos
- [ ] Tabla `dotacion` creada y sincronizada con `dot_resultado`
- [ ] Al menos 1 cargo vinculado end-to-end: `new_cargo` → `dotacion` → organigrama
