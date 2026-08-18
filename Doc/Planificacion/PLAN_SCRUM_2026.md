# PLAN SCRUM — Sistema de Gestión de Dotación GCABA

> Documento de planificación ágil. Fuente de verdad para sprints, tareas y decisiones de alcance.
> Última actualización: 2026-09

---

## 1. CONTEXTO DEL EQUIPO

| Parámetro          | Valor                                   |
| ------------------ | --------------------------------------- |
| Equipo             | 2 desarrolladores (Jorge + Agustin)     |
| Capacidad          | 30h/semana por dev = 60h/semana totales |
| Duración de sprint | 1–2 semanas según complejidad           |
| Ceremonia          | Review + Retro semanal                  |
| Herramienta        | Trello                                  |
| Sin daily          | Comunicación asíncrona                  |

### Definición de Done (DoD)

Un ítem está terminado cuando:

- [ ] Funcionalidad implementada y probada manualmente
- [ ] Tests unitarios o de integración donde aplique
- [ ] Documentación actualizada (este doc + archivos Doc/)
- [ ] Deploy en producción (Render o VM según corresponda)
- [ ] Sin regresiones en módulos existentes

---

## 2. ESTADO ACTUAL DEL SISTEMA

### 2.1 Lo que ya funciona

| Módulo                                        | Estado                           |
| --------------------------------------------- | -------------------------------- |
| Alta de cargos (CPH/ENF/TEC/EG/AS/RG)         | ✅ Funcional                     |
| Lista de cargos con filtros y modal info      | ✅ Funcional                     |
| Dotaneitor — procesamiento semanal            | ✅ Funcional                     |
| `dot_resultado` — padrón procesado            | ✅ Funcional                     |
| `cargo_dotacion` — vinculación cargo↔persona  | ✅ Funcional                     |
| Sincronización dot_resultado → cargo_dotacion | ✅ Funcional (con deuda técnica) |
| Organigrama                                   | ✅ Funcional                     |
| Módulo POU/POF comparativa                    | ✅ Funcional                     |

| Seguimie
tos de prueba |
| Seguimiento CEETPS (ENF/TEC/EG) | ⚠️ Estructura creada, datos de prueba |
| Bajas Consolidadas | ⚠️ Estructura creada, datos de prueba |
| Tablero KPIs | ⚠️ Parcial |

### 2.2 Deuda técnica activa con impacto en sprints

| #    | Problema                                                                     | Impacto                                      | Sprint  |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------------- | ------- |
| DT-1 | N+1 queries en `CargoDotacionSyncService` (~90k queries por sync)            | Performance crítica en sync semanal          | S1      |
| DT-2 | Dos tablas paralelas: `dotacion` + `cargo_dotacion` haciendo lo mismo        | Inconsistencia de datos, doble mantenimiento | S1      |
| DT-3 | `DotacionSyncService` usa LEFT JOIN (puede insertar `id_cargo = NULL`)       | Datos corruptos en tabla `dotacion`          | S1      |
| DT-4 | `_mapSitRev()` duplicado en ambos sync services                              | Riesgo de divergencia silenciosa             | S1      |
| DT-5 | F11 pendiente: auto-sync post-Dotaneitor no integrado                        | Sync manual, riesgo de olvidar               | S1      |
| DT-6 | Campos texto (`carrera`, `modalidad`, `puesto`, `especialidad`) duplican FKs | Prerequisito M10 fase 2                      | Backlog |
| DT-7 | Estados concursales hardcodeados en `concursalesHelpers.js`                  | No configurable desde UI                     | Backlog |
| DT-8 | Siglas por usuario hardcodeadas                                              | No configurable desde UI                     | Backlog |

---

## 3. ALCANCE DEFINIDO — MVP

### Dentro del alcance

- Dotación se actualiza automáticamente con la carga semanal del Dotaneitor
- Alta, baja y modificación de cargos desde la app
- Seguimiento de concursos CPH (con importación de datos históricos del sheet)
- Seguimiento de concursos CEETPS — ENF, TEC, EG (con importación de datos históricos)
- Bajas consolidadas conectadas al flujo de concursos
- Tablero de KPIs concursales
- Padrón en tiempo real: cada cambio en BD se refleja en padrón y organigrama

### Fuera del alcance (primera etapa)

- Portal Postulante (sistema separado)
- Integración API con TAD (manual: admin carga novedades)
- Firma digital (solo alertas del paso a paso)
- Integración con Hacienda (manual: admin registra respuestas)
- Integración con otros sistemas del GCABA

### Actores del sistema

| Actor             | Rol en el sistema                       |
| ----------------- | --------------------------------------- |
| CPH / Alexis      | Gestiona concursos CPH, carga novedades |
| Rijana            | Gestiona concursos CEETPS               |
| Administrativo    | Carga novedades TAD, Hacienda, firma    |
| Admin             | Configuración, usuarios, carga masiva   |
| Director hospital | Vista de su efector                     |

---

## 4. FLUJO CONCURSAL — Referencia

### 4.1 Flujo CPH (Carrera Profesional Hospitalaria — Ley 6.035)

```
FASE 1 — Origen
  Baja registrada en sistema
    → Genera concurso (origen: Alta por Baja / Cobertura Dotación / Ampliación / POU→POF)
    → Autorización presupuestaria Hacienda (manual: admin registra respuesta)

FASE 2 — Preparación
  Sorteo de jurado (campo: sorteo_jurado)
    → Disposición hospital
    → Publicación (campo: disposicion)

FASE 3 — Inscripción y evaluación
  Inscripción (campo: fecha_insc_hasta)
    → Validación de postulantes
    → Examen (campo: fecha_examen)
    → Orden de mérito (campo: fecha_orden_merito)
    → IFACS (campo: fecha_ifacs)
    → INSAL firma (campo: fecha_insal)

FASE 4 — Designación
  TAD — expediente (campo: ee_designacion) [manual]
    → Apto médico (campo: fecha_apto_medico)
    → Carga documentación (campo: carga_documentacion)
    → ITE (campo: fecha_ite)
    → Aprobación Hacienda [manual]

FASE 5 — Cierre
  Proyecto resolución (campo: proyecto_resolucion)
    → Resolución a la firma (campo: reso_a_la_firma)
    → Resolución designación (campo: resolucion_designacion)
    → Alta SIAL (campo: cargo_sial)
    → FINALIZADO
```

**Sub-estados CPH (calcSubEstado — 18 niveles):**
`VACANTE → A-CARATULADO → A-AUTZN → B-SORTEO JUR → C-DISPO DE LLAMADO → D-EXAMEN PUBLICADO → E-ORDEN DE MERITO → F-IFACS → G-INSAL → H-TAD → I-CARGA DOCU → J-APTO MED → K-ITE → L-PYCTO DE RESO → M-RESO A LA FIRMA → N-DESIGNADO → O-ALTA SIAL → P-SUSPENDIDO → Q-DESIERTO`

**Sub-estados simplificados CPH (calcSubEstado3 — 8 niveles):**
`A-VALID. VCTE → B-AUTORIZADO → C-INSCRIPCION → D-ETAPA EVAL → E-ADJUDI → F-PROX. A DESIG → G-RESOLUCION → H-DESIERTO`

### 4.2 Flujo CEETPS — ENF / TEC / EG (Leyes 6.767 / 6.035 / 471)

```
Sin Autorizar (campo: expediente_concurso)
  → Autorizado (campo: puesto_solicitado)
  → Disposición de Llamado (campo: dispo_llamado)
  → IFACS (campo: fecha_ifacs)
  → INSAL (campo: fecha_insal)
  → TAD (campo: expediente_designacion) [manual]
  → Disposición de Designación (campo: dispo_designacion)
  → Finalizado (campo: resolucion_designacion)
```

### 4.3 Diferencias entre carreras

| Aspecto                | CPH               | ENF                  | TEC                  | EG                   |
| ---------------------- | ----------------- | -------------------- | -------------------- | -------------------- |
| Módulo seguimiento     | `seguimiento-cph` | `seguimiento-ceetps` | `seguimiento-ceetps` | `seguimiento-ceetps` |
| Escalafón CEETPS       | —                 | 87                   | 85                   | 83                   |
| Sorteo jurado          | ✅                | ❌                   | ❌                   | ❌                   |
| Fecha examen           | ✅                | ❌                   | ❌                   | ❌                   |
| Orden de mérito        | ✅                | ❌                   | ❌                   | ❌                   |
| IFACS                  | ✅                | ✅                   | ✅                   | ✅                   |
| INSAL                  | ✅                | ✅                   | ✅                   | ✅                   |
| TAD (manual)           | ✅                | ✅                   | ✅                   | ✅                   |
| Jornada (ATP/completa) | ❌                | ✅                   | ❌                   | ❌                   |
| Modalidad POF/POU      | ✅                | ❌                   | Parcial\*            | ❌                   |
| Situación revista      | Solo jefes/dir    | ❌                   | ❌                   | ❌                   |
| Puestos individuales   | ✅                | ❌                   | ✅                   | ❌                   |
| Especialidades         | ✅                | ❌                   | ✅                   | ❌                   |

\*TEC POU aplica solo a: Radiólogos, Hemoterapia, Anatomía Patológica, Instrumentadores Quirúrgicos.

---

## 5. SPRINTS

### SPRINT 1 — Dotación robusta + performance

**Duración:** 1 semana | **Capacidad:** 60h

**Objetivo:** Que la sincronización semanal sea rápida, correcta y automática.

| #    | Tarea                                                                                                             | Dev   | Estimación | Prioridad  |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ----- | ---------- | ---------- |
| S1-1 | Refactorizar `CargoDotacionSyncService`: eliminar N+1, usar batch UPSERT con `INSERT ... ON DUPLICATE KEY UPDATE` | Dev 1 | 8h         | 🔴 Crítico |
| S1-2 | Decidir y ejecutar: unificar `dotacion` + `cargo_dotacion` en una sola tabla                                      | Dev 2 | 6h         | 🔴 Crítico |
| S1-3 | Corregir `DotacionSyncService`: cambiar LEFT JOIN → INNER JOIN para evitar `id_cargo = NULL`                      | Dev 1 | 2h         | 🔴 Crítico |
| S1-4 | Extraer `_mapSitRev()` a módulo compartido (`syncHelpers.js`)                                                     | Dev 1 | 1h         | 🟡 Medio   |
| S1-5 | Integrar F11: auto-sync post-Dotaneitor en `DotaneitorPage` (paso 6 automático)                                   | Dev 2 | 4h         | 🔴 Crítico |
| S1-6 | Endpoint `GET /api/dotacion/estado` que devuelva: última sync, total activos, total padrón, delta                 | Dev 1 | 3h         | 🟡 Medio   |
| S1-7 | Badge de estado de sync en el header de `DotacionTotalPage` y `ListaCargosPage`                                   | Dev 2 | 3h         | 🟡 Medio   |
| S1-8 | Test de regresión: sync con padrón real, verificar conteos antes/después                                          | Ambos | 4h         | 🟡 Medio   |

**Criterio de éxito:**

- Sync completa en < 30 segundos con padrón de 46k registros
- Una sola tabla de ocupación como fuente de verdad
- Sync se dispara automáticamente al finalizar el paso "Guardar en BD" del Dotaneitor

---

### SPRINT 2 — Importación de datos históricos

**Duración:** 1 semana | **Capacidad:** 60h

**Objetivo:** Migrar los sheets reales a la BD para tener datos de trabajo reales.

| #    | Tarea                                                                                        | Dev   | Estimación | Prioridad  |
| ---- | -------------------------------------------------------------------------------------------- | ----- | ---------- | ---------- |
| S2-1 | Analizar estructura del sheet "Seguimiento Concursos CPH.xlsx" y mapear columnas → campos BD | Dev 1 | 4h         | 🔴 Crítico |
| S2-2 | Script de importación CPH: `scripts/import_seguimiento_cph.js`                               | Dev 1 | 8h         | 🔴 Crítico |
| S2-3 | Analizar estructura del sheet "GO CONCURSOS ENF-TEC-SERV.xlsx" y mapear columnas → campos BD | Dev 2 | 4h         | 🔴 Crítico |
| S2-4 | Script de importación CEETPS: `scripts/import_seguimiento_ceetps.js`                         | Dev 2 | 8h         | 🔴 Crítico |
| S2-5 | Validación cruzada: concursos importados vs `bajas_consolidadas` (vincular por código/sigla) | Ambos | 6h         | 🟡 Medio   |
| S2-6 | Reporte de calidad post-importación: registros importados, sin match, duplicados             | Dev 1 | 3h         | 🟡 Medio   |
| S2-7 | Importar sheet "Bajas Consolidadas" → tabla `bajas_consolidadas`                             | Dev 2 | 6h         | 🔴 Crítico |

**Criterio de éxito:**

- Datos reales cargados en `seguimiento_cph`, `seguimiento_ceetps`, `bajas_consolidadas`
- Reporte de calidad con < 5% de registros sin match
- Scripts documentados y reproducibles para futuras importaciones

**Archivos fuente disponibles:**

- `Contexto/Seguimiento Concursos CPH.xlsx`
- `Contexto/Seguimiento de concursos CPH.xlsx`
- `Contexto/GO CONCURSOS ENF-TEC-SERV.xlsx`

---

### SPRINT 3 — Refactor SeguimientoCphPage

**Duración:** 2 semanas | **Capacidad:** 120h

**Objetivo:** Página de seguimiento CPH completamente funcional con datos reales.

| #     | Tarea                                                                                            | Dev   | Estimación | Prioridad  |
| ----- | ------------------------------------------------------------------------------------------------ | ----- | ---------- | ---------- |
| S3-1  | Diseño UX: tabla principal con columnas clave + panel de detalle lateral                         | Dev 2 | 4h         | 🔴 Crítico |
| S3-2  | Tabla principal: sigla, carrera, puesto, especialidad, origen, sub-estado, responsable           | Dev 2 | 8h         | 🔴 Crítico |
| S3-3  | Filtros: estado, sub-estado, sigla, carrera, origen, responsable                                 | Dev 1 | 6h         | 🔴 Crítico |
| S3-4  | Panel de detalle (`SeguimientoCphDetail.jsx`): formulario completo con todos los campos por fase | Dev 1 | 12h        | 🔴 Crítico |
| S3-5  | Edición inline de campos por fase (click → editar → guardar)                                     | Dev 2 | 8h         | 🔴 Crítico |
| S3-6  | Badge visual de sub-estado con color por etapa                                                   | Dev 2 | 3h         | 🟡 Medio   |
| S3-7  | Alertas de vencimiento: concursos sin movimiento > 30/60/90 días                                 | Dev 1 | 4h         | 🟡 Medio   |
| S3-8  | Botón "Nuevo concurso desde baja" — vincula con `bajas_consolidadas`                             | Dev 1 | 6h         | 🔴 Crítico |
| S3-9  | Exportar a Excel con filtros aplicados                                                           | Dev 2 | 4h         | 🟢 Bajo    |
| S3-10 | Endpoint `GET /api/seguimiento-cph/kpis` para tablero                                            | Dev 1 | 4h         | 🟡 Medio   |
| S3-11 | Tests de los endpoints de seguimiento CPH                                                        | Dev 1 | 6h         | 🟡 Medio   |

**Criterio de éxito:**

- Alexis/CPH puede ver y actualizar todos sus concursos desde la app
- Sub-estado calculado automáticamente, sin edición manual
- Alertas visibles para concursos estancados

---

### SPRINT 4 — Refactor BajasConsolidadasPage + flujo baja→concurso

**Duración:** 2 semanas | **Capacidad:** 120h

**Objetivo:** Módulo de bajas funcional y conectado al flujo concursal.

| #     | Tarea                                                                                               | Dev   | Estimación | Prioridad  |
| ----- | --------------------------------------------------------------------------------------------------- | ----- | ---------- | ---------- |
| S4-1  | Revisar estructura actual de `bajas_consolidadas` vs datos del sheet                                | Dev 1 | 4h         | 🔴 Crítico |
| S4-2  | Tabla principal de bajas: sigla, nombre, puesto, escalafón, origen, genera_concurso                 | Dev 2 | 8h         | 🔴 Crítico |
| S4-3  | Formulario de nueva baja (`BajaForm.jsx`): campos completos por carrera                             | Dev 1 | 10h        | 🔴 Crítico |
| S4-4  | Lógica "genera concurso": si `genera_concurso = SI` → crear registro en seguimiento correspondiente | Dev 1 | 8h         | 🔴 Crítico |
| S4-5  | Conexión baja → `new_cargo`: marcar cargo como `no_vigente` al registrar baja                       | Dev 2 | 6h         | 🔴 Crítico |
| S4-6  | Vista de detalle de baja con historial de cambios                                                   | Dev 2 | 6h         | 🟡 Medio   |
| S4-7  | Filtros: sigla, escalafón, genera_concurso, estado                                                  | Dev 1 | 4h         | 🟡 Medio   |
| S4-8  | Refactor CEETPS: `SeguimientoCeetpsPage` con mismo patrón que CPH                                   | Dev 2 | 12h        | 🔴 Crítico |
| S4-9  | Endpoint `GET /api/bajas/kpis` para tablero                                                         | Dev 1 | 3h         | 🟡 Medio   |
| S4-10 | Tests del flujo baja → concurso                                                                     | Ambos | 6h         | 🟡 Medio   |

**Criterio de éxito:**

- Rijana puede gestionar concursos CEETPS desde la app
- Una baja con `genera_concurso = SI` crea automáticamente el seguimiento correspondiente
- El cargo en `new_cargo` se marca `no_vigente` al registrar la baja

---

### SPRINT 5 — TableroPage + cierre MVP

**Duración:** 1 semana | **Capacidad:** 60h

**Objetivo:** Dashboard operativo con KPIs de dotación y concursales.

| #    | Tarea                                                                       | Dev   | Estimación | Prioridad  |
| ---- | --------------------------------------------------------------------------- | ----- | ---------- | ---------- |
| S5-1 | KPIs dotación: total vigentes, ocupados, vacantes, por carrera, por efector | Dev 1 | 6h         | 🔴 Crítico |
| S5-2 | KPIs concursales CPH: por sub-estado, por sigla, tiempo promedio por etapa  | Dev 2 | 6h         | 🔴 Crítico |
| S5-3 | KPIs concursales CEETPS: por estado, por escalafón                          | Dev 1 | 4h         | 🔴 Crítico |
| S5-4 | Gráfico de evolución de dotación histórica (dot_resultado_historico)        | Dev 2 | 6h         | 🟡 Medio   |
| S5-5 | Alertas activas: concursos vencidos, cargos sin sync, bajas sin concurso    | Dev 1 | 4h         | 🟡 Medio   |
| S5-6 | Filtro por efector/sigla en todo el tablero                                 | Dev 2 | 4h         | 🟡 Medio   |
| S5-7 | Deploy final + smoke test en producción                                     | Ambos | 4h         | 🔴 Crítico |

**Criterio de éxito:**

- Tablero carga en < 3 segundos
- KPIs reflejan datos reales post-importación
- Sin errores en producción

---

## 6. BACKLOG — Fuera de sprints actuales

| #   | Tarea                                                                                | Motivo de postergación                              |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| B-1 | M10 fase 2: eliminar campos texto (`carrera`, `modalidad`, `puesto`, `especialidad`) | Alto riesgo, requiere reescribir filtros y búsqueda |
| B-2 | Migrar estados concursales hardcodeados a tabla de catálogo                          | No bloquea MVP                                      |
| B-3 | Migrar siglas por usuario a tabla `user_siglas`                                      | No bloquea MVP                                      |
| B-4 | Portal Postulante                                                                    | Sistema separado, fuera de alcance                  |
| B-5 | Integración API TAD                                                                  | No disponible en primera etapa                      |
| B-6 | Firma digital real                                                                   | No disponible en primera etapa                      |
| B-7 | Integración Hacienda                                                                 | No disponible en primera etapa                      |
| B-8 | Módulo de recorridas — mejoras                                                       | Funcional, no urgente                               |

---

## 7. ARQUITECTURA DE DATOS — Dotación (referencia)

```
Cargos_Salud.xlsx (semanal)
      ↓  Dotaneitor (Python — srh-python.onrender.com)
dot_resultado          ← padrón plano procesado
      ↓  POST /api/dotacion/cargos/sincronizar  (automático post-Dotaneitor)
cargo_dotacion         ← vinculación cargo ↔ persona (fuente de verdad)
  ├── id_cargo  FK → new_cargo
  ├── id_persona FK → personas_dotacion
  ├── id_sial
  ├── situacion_revista
  ├── antiguedad
  └── hasta (NULL = activo)
```

**Invariante crítica:** `cargo_dotacion.estado` es el estado de la PERSONA, no del cargo. El estado del cargo (`new_cargo.estado`) se gestiona exclusivamente desde la interfaz de edición manual.

---

## 8. FLUJO DE DEPLOY

```
Desarrollo local
  → git push github HEAD:main HEAD:Desarrollo_Jorge
  → git push origin Desarrollo_Jorge:Desarrollo_Jorge
  → git push origin Desarrollo_Jorge:develop

Render (staging/prod):  srh-u36r.onrender.com  ← GitHub main
Vercel (frontend):      srh-pi.vercel.app       ← GitHub Desarrollo_Jorge/main
VM GitLab (prod):       10.22.0.123             ← GitLab develop (CI/CD)
Python service:         srh-python.onrender.com ← GitHub main
```

---

## 9. VARIABLES DE ENTORNO REQUERIDAS

| Variable             | Descripción                           | Dónde    |
| -------------------- | ------------------------------------- | -------- |
| `DB_HOST`            | Host Aiven MySQL                      | Backend  |
| `DB_PORT`            | Puerto Aiven (13861)                  | Backend  |
| `DB_USER`            | Usuario DB                            | Backend  |
| `DB_PASSWORD`        | Password DB                           | Backend  |
| `DB_NAME`            | Nombre DB (defaultdb)                 | Backend  |
| `JWT_SECRET`         | Secret para tokens                    | Backend  |
| `PYTHON_SERVICE_URL` | URL del Dotaneitor Python             | Backend  |
| `CORS_ORIGINS`       | Orígenes permitidos (comma-separated) | Backend  |
| `VITE_API_URL`       | URL del backend                       | Frontend |

---

## 10. REGISTRO DE DECISIONES

| Fecha   | Decisión                                                         | Motivo                                   |
| ------- | ---------------------------------------------------------------- | ---------------------------------------- |
| 2026-09 | Portal Postulante fuera de alcance                               | Sistema separado, complejidad alta       |
| 2026-09 | TAD manual (admin carga novedades)                               | No hay API disponible en primera etapa   |
| 2026-09 | Firma = solo alertas del paso a paso                             | Proceso en otro sistema, sin integración |
| 2026-09 | Hacienda = registro manual de respuestas                         | Sin integración en primera etapa         |
| 2026-09 | MVP = dotación automática + ABM cargos + seguimiento concursales | Foco en valor inmediato para RRHH        |
| 2026-09 | `cargo_dotacion` es la fuente de verdad de ocupación             | M15 ejecutado, `dotacion` legacy         |
| 2026-09 | Sync automática post-Dotaneitor (F11)                            | Eliminar paso manual, riesgo de olvido   |

---

## 11. MÉTRICAS DE ÉXITO DEL MVP

| Métrica                           | Objetivo                     |
| --------------------------------- | ---------------------------- |
| Tiempo de sync semanal            | < 30 segundos                |
| Datos históricos importados       | > 95% de registros con match |
| Concursos CPH en sistema          | 100% de los del sheet actual |
| Concursos CEETPS en sistema       | 100% de los del sheet actual |
| Tiempo de carga del tablero       | < 3 segundos                 |
| Errores en producción post-deploy | 0 críticos                   |
