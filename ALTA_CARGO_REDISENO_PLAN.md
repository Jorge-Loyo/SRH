# Plan — Rediseño visual AltaCargoPage

## Objetivo
Compactar y modernizar el formulario sin perder funcionalidad. Menos espacio vertical, mejor jerarquía visual.

---

## Estado actual del archivo
- `AltaCargoPage.jsx` tiene 679 líneas, se lee correctamente con `fsRead`
- `fsReplace` fallaba en sesiones anteriores por caracteres unicode en labels españoles y líneas en blanco extras
- **Solución confirmada**: reescribir el archivo completo con `fsWrite` en dos partes
- El archivo fue leído exitosamente — contenido disponible para reescritura

---

## Problemas actuales del layout
- 4 secciones `Section` apiladas con padding generoso → demasiado scroll
- Sección 1 (Ubicación) y Sección 2 (Carrera) podrían estar en la misma fila
- Sección 3 (Detalle) repite el patrón de sección aunque es continuación de Carrera
- Sección 4 (Vigencia) tiene grid 2 col pero la etiqueta ocupa col-span-2 innecesariamente
- El header del expediente tiene buen diseño, mantener

---

## Nuevo layout del formulario (columna izquierda)

```
┌─────────────────────────────────────────────────────┐
│  EXPEDIENTE  [input                    ] [Confirmar] │  ← sin cambios
└─────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────────────────┐
│  Sigla           │  │  Carrera                     │
│  [HGNRG      ▶] │  │  [CPH] [ENF] [TEC] [GEN]    │
└──────────────────┘  └──────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Detalle  (aparece solo cuando hay carrera)          │
│  Modalidad: [Planta] [Guardia]                       │
│  Puesto: [selector ▶]   Especialidad: [selector ▶]  │
│  — o para ENF —                                      │
│  Nivel: [Enfermero Prof.] [Lic. en Enfermería]       │
└─────────────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
│  Desde   │  │ Cantidad │  │ Etiqueta │  │         │
│  [date]  │  │  − 1 +   │  │ [BA   ▶] │  │+Agregar │
└──────────┘  └──────────┘  └──────────┘  └─────────┘
```

---

## Plan de reescritura — 2 partes

### Parte 1 — Componentes auxiliares y helpers
Archivo: `AltaCargoPage.jsx` (comando `create`, reemplaza todo)
Contenido:
- Imports
- `PickerModal` — sin cambios
- `PickerField` — sin cambios
- `ButtonGroup` — sin cambios
- `EtiquetaPicker` — sin cambios
- Constantes: `PUESTOS_CPH`, `PUESTOS_TEC`, `PUESTOS_MEDICO`, `EMPTY_FORM`, `CARRERAS_EXCLUIDAS`
- Helpers: `isComplete()`, `buildPayload()`
- **NO incluye** `Section` (se elimina)
- **NO incluye** `export default AltaCargoPage` (va en Parte 2)

### Parte 2 — Componente principal AltaCargoPage
Archivo: `AltaCargoPage.jsx` (comando `append`, agrega al final)
Contenido:
- `export default function AltaCargoPage` completo con nuevo layout:
  - Header expediente (sin cambios)
  - Layout 2 columnas (`flex gap-6`)
  - **Fila 1**: `grid grid-cols-[180px_1fr] gap-4` — Sigla + Carrera
  - **Fila 2**: Detalle condicional — `bg-gray-50 rounded-xl px-4 py-3` sin card
  - **Fila 3**: `grid grid-cols-4 gap-3` — Desde + Cantidad + Etiqueta + botón
  - Panel derecho `w-72` (era `w-80`)

---

## Cambios concretos

### Eliminar componente `Section`
- Reemplazar por separadores visuales más livianos
- Usar label pequeño en lugar de card con borde completo

### Fila 1 — Sigla + Carrera en paralelo
- `grid grid-cols-[180px_1fr] gap-4`
- Sigla: PickerField compacto (ancho fijo ~180px)
- Carrera: ButtonGroup inline (sin card)

### Fila 2 — Detalle (condicional)
- Solo aparece cuando `carrera_seleccionada` tiene valor
- Sin card, solo fondo sutil `bg-gray-50 rounded-xl px-4 py-3`
- Modalidad en una línea, Puesto+Especialidad en la siguiente

### Fila 3 — Vigencia compacta
- `grid grid-cols-4 gap-3` con el botón "+ Agregar" como última celda
- Desde | Cantidad | Etiqueta | [+ Agregar cargo]
- Botón alineado al fondo de la celda (`flex flex-col justify-end`)

### Estados bloqueados
- `disabled` en cada campo individualmente en lugar de `opacity-40 pointer-events-none` en toda la sección

### Panel derecho
- Ajustar ancho a `w-72` (era `w-80`)

---

## Lo que NO cambia
- Toda la lógica de estado
- `buildPayload`, `isComplete`, `EMPTY_FORM`
- `EtiquetaPicker`, `PickerModal`, `PickerField`, `ButtonGroup`
- Panel derecho (cards, resultados, botón registrar)
- Header del expediente

---

## Estado de implementación
- [x] **Parte 1**: `fsWrite create` — componentes auxiliares + helpers (sin `Section`, sin `AltaCargoPage`)
- [x] **Parte 2**: `fsWrite append` — `export default AltaCargoPage` con nuevo layout
- [x] Build y verificacion — OK, 0 errores
