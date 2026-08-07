# Dotaneitor — Plan de Implementación Web

## Estado actual
- ✅ Tablas BD creadas y cargadas desde Excel:
  - `dot_agrupador` (396 registros)
  - `dot_unificador_puestos` (420 registros)
  - `dot_especialidades` (49.231 registros: CPH + Suplentes + Residentes)
  - `siglas` actualizada con `desc_sigla` (76 registros)
- ✅ Módulos Python copiados a `app/python-service/`
  - `normalizador_cargos.py`
  - `especialidades.py`
  - `especialidad_por_agrupador.py`
  - `consolidacion_lit_puesto.py`
  - `consolidacion_especialidades.py`
- ✅ `requirements.txt` creado e instalado (Python 3.14, pandas 3.x)
- ✅ Tablas dot_* agregadas al whitelist de Tablas Admin

---

## Arquitectura

```
Browser (React)
    │  HTTP multipart/JSON
    ▼
Node.js :3000  ──proxy──►  Python FastAPI :5001
                               │
                               ├── normalizador_cargos.py      (sin cambios)
                               ├── especialidades.py           (subclase en main.py)
                               ├── especialidad_por_agrupador.py (sin cambios, no usa archivos)
                               ├── consolidacion_lit_puesto.py (sin cambios)
                               ├── consolidacion_especialidades.py (sin cambios)
                               └── main.py  ← toda la adaptación vive acá
```

El microservicio Python:
- Corre en puerto 5001 (mismo host)
- Node hace proxy de `/api/dotaneitor/*` → `http://localhost:5001/*`
  - Node 18+ tiene `fetch` nativo — no hace falta instalar `node-fetch` ni `http-proxy-middleware`
- Sesiones en memoria por `session_id` (UUID) — el browser lo guarda en `sessionStorage`
- Archivos temporales en `app/python-service/tmp/{session_id}/`

---

## FASE 1 — Microservicio Python (FastAPI)
**Archivo:** `app/python-service/main.py`

### Endpoints

| Método | Path | Body / Params | Respuesta |
|--------|------|---------------|-----------|
| GET  | `/health`          | —                        | `{ status: "ok" }` |
| POST | `/session`         | —                        | `{ session_id: "uuid" }` |
| POST | `/upload-cargos`   | multipart `file`         | `{ filename, rows }` |
| POST | `/normalizar`      | `{ session_id }`         | `{ logs: [...] }` |
| POST | `/procesar`        | `{ session_id }`         | `{ logs: [...] }` |
| POST | `/cruzar`          | `{ session_id }`         | `{ logs: [...] }` |
| GET  | `/preview`         | `?session_id=&page=&limit=` | `{ cols, rows, total }` |
| GET  | `/descargar`       | `?session_id=`           | FileResponse (.xlsx) |
| GET  | `/reporte-calidad` | `?session_id=`           | FileResponse (.xlsx) |
| DELETE | `/session`       | `{ session_id }`         | `{ ok: true }` |

### Estrategia para reemplazar el Excel de referencia por BD

`especialidades.py` tiene `ConsolidadorEspecialidades.cargar(ruta_archivo)` que llama a
`pd.read_excel`. En `main.py` se crea una subclase que sobreescribe solo ese método:

```python
class ConsolidadorEspecialidadesBD(ConsolidadorEspecialidades):
    def cargar(self, conn):
        """Lee dot_especialidades desde MySQL en vez del Excel."""
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT tipo, cuil, especialidad FROM dot_especialidades WHERE activo=1")
        rows = cursor.fetchall()
        # Armar self.lookups igual que lo hace el método original
        # tipo 'cph' -> cod_reg '37', 'suplentes' -> '23', 'residentes' -> '24'
        ...
```

`DotacionAutomation` también se subclasea en `main.py` para reemplazar `cargar_archivos()`:
- En vez de leer el Excel de referencia, consulta la BD y arma los DataFrames
  `self.agrupador_df`, `self.unificador_df`, `self.siglas_df` directamente desde MySQL.
- `self.cargos_df` sigue leyendo el archivo subido por el usuario.

**Queries:**
```sql
-- siglas_df
SELECT sigla, universo_totalizador AS `UNIVERSO TOTALIZADOR`,
       tipo_hospital_sigla AS `Tipo de Hospital / Sigla`,
       monovalencia AS `Monovalencia`
FROM siglas WHERE activo IS NULL OR activo = 1

-- agrupador_df  (columnas que espera procesar())
SELECT cruce AS `CRUCE`, escalafon AS `ESCALAFON`,
       lit_puesto AS `LIT_PUESTO`, agrupador AS `AGRUPADOR`
FROM dot_agrupador WHERE activo=1

-- unificador_df
SELECT cruce AS `Cruce`, lit_cod_reg AS `LIT_COD_REG`,
       lit_puesto AS `LIT_PUESTO`, unificador AS `UNIFICADOR DE PUESTO`
FROM dot_unificador_puestos WHERE activo=1
```

### Sesiones
```python
sessions = {}  # session_id -> { cargos_path, automation, normalizado, procesado, cruzado }
```
Cleanup automático: thread que cada 30 min borra sesiones con más de 2 horas de inactividad.

### Conexión BD
Lee `.env.local` del directorio padre (`../`) con `python-dotenv`.
Variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

---

## FASE 2 — Proxy Node.js ✅
**Archivo:** `app/src/modules/herramientas/herramientasRoutes.js`

- Usar `fetch` nativo de Node 18 (no instalar dependencias extra)
- Rutas: `ALL /api/dotaneitor/*` → `http://localhost:5001/*`
- Pasar el body y headers tal cual (multipart incluido)
- Si el microservicio no responde: devolver `503 { error: "Servicio Dotaneitor offline" }`
- JWT ya validado por `authenticateJWT` antes del proxy — Python no necesita validar nada

```js
// Patrón del proxy en herramientasRoutes.js
router.all('/dotaneitor/*path',
  authenticateJWT,
  authorizeRoles('admin', 'editor'),
  proxyDotaneitor   // función en herramientasController.js
)
```

---

## FASE 3 — Frontend `DotaneitorPage.jsx` ✅
**Archivo:** `frontend/src/pages/vista_herramientas/DotaneitorPage.jsx`

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  DOTANEITOR                              [? Ayuda]       │
│  ● Servicio activo  /  ● Servicio offline               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ① Cargos_Salud   [drop zone / nombre archivo]          │
│  ② Normalizar     [botón]   Sin normalizar / ✓          │
│  ③ Procesar       [botón]                               │
│  ④ Cruzar         [botón]                               │
│  ⑤ [Guardar Excel]  [Exportar reporte calidad]          │
│                                                          │
│  ┌─ Log ──────────────────────────────────────────────┐  │
│  │  • texto info                                      │  │
│  │  ⚠ texto warning  (ámbar)                         │  │
│  │  ✓ texto success  (verde)                         │  │
│  │  ✗ texto error    (rojo)                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Vista previa (primeras 50 filas) ─────────────────┐  │
│  │  tabla con scroll horizontal + paginación          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Estado React
```js
{
  sessionId: null,          // persiste en sessionStorage
  cargosFile: null,         // nombre del archivo subido
  normalizado: false,
  procesado: false,
  cruzado: false,
  loading: false,           // bloquea todos los botones
  logs: [],                 // [{ text, type }]
  preview: null,            // { cols, rows, total }
  previewPage: 1,
  serviceOnline: null,      // null | true | false
}
```

### Flujo
1. Mount → `GET /api/dotaneitor/health` → setServiceOnline
2. Mount → si hay `sessionId` en sessionStorage → restaurar estado
3. Seleccionar archivo → `POST /session` (si no hay sessionId) → `POST /upload-cargos`
4. Normalizar → `POST /normalizar` → agregar logs
5. Procesar → `POST /procesar` → agregar logs + `GET /preview` → setPreview
6. Cruzar → `POST /cruzar` → agregar logs + `GET /preview` → actualizar preview
7. Guardar → `GET /descargar` → descarga directa (window.open o fetch+blob)
8. Reporte → `GET /reporte-calidad` → descarga directa
9. Unmount / nueva sesión → `DELETE /session`

---

## FASE 4 — Integración sidebar + rutas ✅
**Archivos:** `Sidebar.jsx`, `App.jsx`

```js
// Sidebar.jsx — grupo Herramientas
{ to: '/herramientas/dotaneitor', label: 'Dotaneitor', roles: ['admin', 'editor'] }

// App.jsx
const DotaneitorPage = lazy(() => import('./pages/vista_herramientas/DotaneitorPage.jsx'))
<Route path="herramientas/dotaneitor" element={
  <ProtectedRoute roles={EDIT_ROLES}><DotaneitorPage /></ProtectedRoute>
} />
```

---

## FASE 5 — Script de arranque y documentación ✅
**Archivos:** `app/python-service/start.bat`, `ARRANQUE_LOCAL.md`

### `start.bat`
```bat
@echo off
cd /d %~dp0
python -m pip install -r requirements.txt --quiet
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
pause
```

### Sección a agregar en `ARRANQUE_LOCAL.md`
```markdown
## 4. Levantar el microservicio Dotaneitor (opcional)
Solo necesario para usar la herramienta Dotaneitor.
Doble click en: app/python-service/start.bat
El servicio queda en http://localhost:5001
```

---

## Orden de ejecución

```
FASE 1  →  FASE 2  →  FASE 3  →  FASE 4  →  FASE 5
Python      Node        React      Nav         Docs

Prerequisito: FASE 1 debe estar funcionando (/health responde)
antes de desarrollar FASE 2 y FASE 3.
```

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Microservicio offline | Badge en página + mensaje "ejecutá start.bat" |
| Archivo >50MB | FastAPI: `UploadFile` sin límite por defecto; agregar validación de tamaño en el endpoint |
| Sesión perdida al recargar | `sessionId` en `sessionStorage` — se recupera si el microservicio sigue vivo |
| Columnas del Excel cambian | Validación explícita en `procesar()` con mensaje descriptivo |
| Proceso largo (>30s) | Los pasos corren en `asyncio.to_thread()` — no bloquean el event loop de FastAPI |

---

## Notas técnicas

### Módulos que NO se modifican
- `normalizador_cargos.py` — sin cambios
- `especialidad_por_agrupador.py` — sin cambios (trabaja 100% en memoria, no usa archivos externos)
- `consolidacion_lit_puesto.py` — sin cambios
- `consolidacion_especialidades.py` — sin cambios

### Módulos que se adaptan en `main.py` (sin tocar los originales)
- `ConsolidadorEspecialidades` → subclase `ConsolidadorEspecialidadesBD` que sobreescribe `cargar()`
- `DotacionAutomation` → subclase `DotacionAutomationBD` que sobreescribe `cargar_archivos()`

### Columnas que espera `procesar()` en cada DataFrame de referencia
Estas son las columnas exactas que usa `Dotaneitor.py` — los alias en las queries SQL deben
coincidir exactamente:

| DataFrame | Columnas requeridas |
|-----------|-------------------|
| `siglas_df` | `Sigla`, `UNIVERSO TOTALIZADOR`, `Tipo de Hospital / Sigla`, `Monovalencia` |
| `agrupador_df` | `CRUCE`, `AGRUPADOR` |
| `unificador_df` | `Cruce`, `UNIFICADOR DE PUESTO` |
| `especialidades` (lookup) | `tipo` (cph/suplentes/residentes), `cuil`, `especialidad` |
