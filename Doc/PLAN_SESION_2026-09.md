# PLAN DE SESIÓN — 2026-09

> Objetivo: validar el flujo completo de creación de cargos, normalizar la tabla `new_cargo`,
> diseñar la vinculación cargos-dotación y conectar con el organigrama.

---

## CONTEXTO

Tenemos dos universos de datos que deben convivir:

- **Datos migrados masivamente** — 46.889 cargos históricos cargados por scripts (M1-M14)
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

> ✅ COMPLETADO — 16/16 casos OK, 7 bugs corregidos

### Casos de prueba ejecutados

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

### Limpieza post-bloque 2

- 16 cargos de prueba sin `id_sial` eliminados con `limpiar-pruebas-b2.js`
- `new_cargo` queda en **46.889 registros**, todos con `id_sial`

---

## BLOQUE 3 — Tabla `new_cargo` normalizada y optimizada

> ✅ COMPLETADO

### Índices creados

```sql
CREATE INDEX idx_estado       ON new_cargo(estado);
CREATE INDEX idx_id_tipo_cargo ON new_cargo(id_tipo_cargo);
CREATE INDEX idx_id_etiqueta  ON new_cargo(id_etiqueta);
```

### Búsqueda por expediente

Agregado `ca.documento LIKE ?` y `ca.expediente LIKE ?` en `listNewCargo`.

---

## BLOQUE 4 — Vinculación cargos ↔ dotación

> ✅ COMPLETADO

### M15 — Tablas creadas

- `personas_dotacion` — CUIL UNIQUE, datos personales
- `cargo_dotacion` — FK → `new_cargo`, FK → `personas_dotacion`, `id_sial`, `codigo_repa`,
  `periodo`, `desde`/`hasta`, `situacion_revista`, `estado`

### Sincronización

- **46.889 cargos** sincronizados, **45.083 personas únicas**
- Endpoints: `POST /api/dotacion/cargos/sincronizar` y `GET /api/dotacion/cargos/estado`
- Cruce clave: `dot_resultado.id_sial` = `new_cargo.id_sial` (100% match)

### Distribución de situaciones (estado actual)

| Situación | Cantidad |
|---|---|
| Ocupado activo | 45.100 |
| Retención de cargo | 1.766 |
| Comisión | 23 |
| Vacante | 0 |
| **Total vigentes** | **46.889** |
| No vigentes | 0 |

### Fix — estado persona ≠ estado cargo

**Problema detectado**: 256 cargos estaban marcados `no_vigente` porque en alguna migración
inicial se usó `dot_resultado.estado` (estado de la **persona**) para setear `new_cargo.estado`
(estado del **cargo**). Un cargo con persona `Bloqueada` sigue siendo vigente si tiene `codigo_repa`.

**Corrección aplicada**: `fix-no-vigente-bloqueados.js` — 256 cargos corregidos a `vigente`.

**Guardia permanente en `CargoDotacionSyncService`**: al inicio de cada sincronización detecta
y corrige automáticamente cargos `no_vigente` con `codigo_repa` en el padrón. El resultado
incluye `cargos_corregidos` y el frontend muestra un badge ámbar si el valor es > 0.

**Invariante documentada**: `CargoDotacionSyncService` nunca modifica `new_cargo.estado`.
El estado del cargo se gestiona exclusivamente por edición manual.

### Performance

LEFT JOINs con `cargo_dotacion` en 46.889 filas causaban 1.4s.
Solución: subqueries correlacionadas solo para las 10 filas de la página actual.

---

## FRONTEND — ListaCargosPage (`/cargos/lista`)

> ✅ COMPLETADO

### Rediseño de filtros

- `MODALIDADES` como `[{v,l}]` con labels POF/POU
- `ESTADO_CONFIG` (Vigente/No vigente) + `SUBESTADO_CONFIG` separados por divisor `|`
- `SUBESTADO_CONFIG`: Ocupado / Vacante / Comisión / Retención
- `CategoriaPickerModal` — busca por código y descripción, carga desde `listEtiquetas()`
- Panel reorganizado en 4 filas: Carrera+Modalidad / Tipo CPH / Estado / Ubicación+Categoría
- Resumen de filtros activos con labels correctos

### Columna "Situación"

Nueva columna `dot_ocupacion` entre "Estado" y "Ocupado por" con badges:
- 🟢 **Ocupado** — vigente con persona en situación normal
- 🟡 **Vacante** — vigente sin ocupante
- 🔵 **Comisión** — ocupante en comisión
- 🟠 **Retención** — ocupante en retención de cargo
- `—` — para cargos no vigentes

Calculado en el backend con `CASE/EXISTS` sobre `cargo_dotacion`, sin costo extra
(reutiliza las subqueries correlacionadas ya existentes).

### Fix race condition filtros

Dos `useEffect` independientes (filtros + página) causaban que al activar un filtro
el segundo `useEffect` sobreescribiera el resultado con los datos sin filtrar.
Solución: unificado en un solo `useEffect` con debounce solo para el campo de texto `q`.

### Carreras disponibles

```js
const CARRERAS = ['CPH', 'CPS', 'CPT', 'CPB', 'CPO', 'CPA']
```

---

## BLOQUE 5 — Vinculación con el organigrama

> ✅ COMPLETADO

### Cruce disponible

| Cruce | Match |
|---|---|
| `new_cargo.sigla` → `organigramas.sigla` | **61/61 — 100%** ✅ |
| `cargo_dotacion.codigo_repa` → `organigramas.codigo_reparticion` | **3.987/4.071 — 98%** |
| Sin match (5.078 cargos) | Residentes y Sup. Guardia — subreparticiones sin nodo propio, esperado |

### Punto 1 — `getNewCargoInfo` con datos de organigrama

- JOIN `organigramas os` por `sigla` (efector del cargo) → `org_desc_rep`, `org_path`, `org_lvl`, `org_tipo`
- JOIN `organigramas o` por `codigo_repa` (repartición del ocupante) → `dot_reparticion`, `dot_path`
- `InfoModal` tiene nueva sección **Organigrama** con repartición, tipo, nivel y jerarquía completa
  formateada como `Ministerio › SS › DG › ...`

### Punto 2 — Columna Repartición en lista

- `listNewCargo` agrega `org_desc_rep` via JOIN por sigla (subquery con `ORDER BY lvl ASC LIMIT 1`
  para evitar multiplicación de filas)
- Nueva columna **Repartición** en `COLS` entre Sigla y Carrera

### Punto 3 — Página KPIs (`/cargos/kpis`)

- Endpoint `GET /api/cargos/alta/dotacion-kpis` con filtro opcional `?sigla=`
- 5 queries en paralelo: globales, por carrera, por modalidad, por situación, por efector
- **Página `DotacionKpisPage`**:
  - 7 KPI cards: total vigentes, ocupados, retención, comisión, vacantes, personas únicas, efectores
  - Barra de distribución global proporcional con leyenda
  - Grid 3 columnas: por carrera (mini-barras apiladas) / por modalidad / situación detalle
  - Tabla top efectores con sigla, nombre, totales por situación y mini-barra
  - Selector de efector para filtrar toda la página

---

## FIXES POST-SESIÓN

### Fix — `listNewCargo` no cargaba la tabla

**Problema**: JOIN directo `LEFT JOIN organigramas os ON os.sigla = nc.sigla` multiplicaba filas
cuando una sigla tenía más de un registro en `organigramas`. El `COUNT(*)` del total no coincidía
con los resultados reales y la tabla aparecía vacía.

**Solución**: convertido a subquery correlacionada con `ORDER BY lvl ASC LIMIT 1`, igual que
como ya estaba resuelto en `getNewCargoInfo`.

### Fix — `useCallback` en `ListaCargosPage` bloqueaba el fetch inicial

**Problema**: `load` definido con `useCallback([], [])` + `useEffect([..., load])` causaba que
en algunos casos el effect no disparara el fetch al montar el componente. El request a
`/api/cargos/alta/new-cargo` nunca aparecía en los logs del servidor.

**Solución**: eliminado `useCallback`, lógica de fetch inlinada directamente en el `useEffect`.
Dependencias simplificadas a `[page, q, carrera, modalidad, tipoCph, sigla, estado, categoria]`.

### Fix — Sección "Herramientas" eliminada del sidebar

El grupo "Herramientas" (Dotación, Dotaneitor, Tablas Vista, Tablas Admin) fue removido del
menú lateral. Las rutas `/herramientas/*` siguen activas y accesibles desde el engranaje del header.

### Fix — Duplicate entry en `createAlta` (código duplicado)

**Problema**: `#nextCodigo` calculaba el `MAX(seq)` con REGEXP usando `\\-` como escape del guión,
que en algunas versiones de MySQL no funciona correctamente y devuelve `null` → genera siempre
el mismo código base → `Duplicate entry` al insertar.

Además, con `cantidad > 1`, el loop llamaba `#nextCodigo` N veces dentro de la misma transacción;
como los INSERTs anteriores no eran visibles para el `SELECT MAX`, todos obtenían el mismo seq.

**Solución**:
- Escape cambiado de `\\-` a `[-]` en el REGEXP (más portable en MySQL).
- `#nextCodigo` refactorizado a `#nextCodigoBase` (devuelve `{prefix, maxSeq}`) +
  `#nextCodigos(cantidad)` que calcula todos los códigos del lote de una sola vez
  incrementando el secuencial manualmente, antes de entrar al loop de inserts.

---

## PENDIENTES

- [x] **M11** — Migrar `situacion_revista` y `antiguedad` desde `new_cargo` a `cargo_dotacion`
- [x] **F10** — Panel KPIs en `DotacionTotalPage` (`/dotacion`)

---

## CRITERIOS DE ÉXITO

- [x] Tabla `new_cargo` sin datos de prueba — 46.889 migrados con códigos normalizados
- [x] Los 16 casos de prueba generan cargos con todos los campos FK correctos
- [x] Tablas `personas_dotacion` y `cargo_dotacion` creadas y sincronizadas
- [x] Columna "Situación" en lista de cargos (Ocupado/Vacante/Comisión/Retención)
- [x] Filtros por situación funcionando correctamente
- [x] Guardia automática contra confusión estado-persona vs estado-cargo
- [x] Al menos 1 cargo vinculado end-to-end: `new_cargo` → `cargo_dotacion` → organigrama
- [x] Página KPIs `/cargos/kpis` con distribución por carrera, modalidad, situación y efector
