# Datos Comunes (Shared Data)

Este directorio centraliza datos que se replican across múltiples componentes.

## Archivos

### `hospitals-data.js`

Centraliza lista y mapeos de hospitales.

**Exports:**

- **`hospitals`** - Array de objetos con estructura `{ id, name, category }`
  - Usado cuando necesitas iteración o filtrado por categoría
  - Consumidores: RecorridasHospitales, hospitales, OrganigramaHome, HospitalesConcursos

- **`hospitalsMap`** - Objeto lookup `id → nombre` para búsquedas O(1)
  - Usado cuando necesitas encontrar nombre por ID rápidamente
  - Consumidores: DirectorHome, OrganigramaDetalle

- **`hospitalsByCategory`** - Objeto agrupador `categoría → array`
  - Usado para renderizado por categoría en UIs
  - Actualmente no consumido, pero disponible para uso futuro

**Patrón de Actualización:**

Si el listado de hospitales cambia:
1. Editar SOLO este archivo
2. TODOS los consumidores se actualizan automáticamente (mismo import)

Si en futuro se trae de BD:
```javascript
// Cambio aquí ...
async function loadHospitals() {
  const response = await fetch('/api/hospitales');
  return response.json();
}

export const hospitals = await loadHospitals();
export const hospitalsMap = buildMap(hospitals);
export const hospitalsByCategory = buildGrouper(hospitals);

// ... y TODOS los componentes funcionan sin cambios ✅
```

## Pattern: Cuándo Centralizar

Centraliza en `datos-comunes/` cuando:
- ✅ Datos reutilizados en 3+ componentes distintos
- ✅ Datos que cambiarían juntos (ej: hospitales en todas partes)
- ✅ Datos que podrían venir de BD en futuro

NO centralices si:
- ❌ Es específico a un componente
- ❌ Es constante de dominio (usar `enums.js` en utils/)
- ❌ Es derivado computacional (calcular en el componente)

## Ejemplos de Expansión Futura

Candidatos a centralizar:
- `estados-enums.js` - Estados de recorridas, períodos
- `roles-metadata.js` - Descripciones y permisos por rol
- `categorias.js` - Categorías de cargos, unidades
- `colores.js` - Color scheme para tipos de unidades organizativas

## Descubrimiento de Duplicación

Script para encontrar nuevos candidatos a centralizar:
```bash
# Buscar constantes definidas en 2+ componentes
grep -r "const.*= \[" src/components --include="*.jsx" | grep -v node_modules
```
