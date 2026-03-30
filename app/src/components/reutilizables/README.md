# 📦 Componentes Reutilizables

Biblioteca de componentes React reutilizables usados en toda la aplicación.

---

## 📚 Índice

1. [BackButton](#backbutton) - Botón de navegación hacia atrás
2. [ErrorFallback](#errorfallback) - UI de error con recuperación
3. [MultiSelectDropdown](#multiselectdropdown) - Selector múltiple con búsqueda
4. [Pagination](#pagination) - Paginación con números de página
5. [PeriodoSelector](#periodoselector) - Selector de períodos con autoselección
6. [ScrollTrap](#scrolltrap) - Prevención de scroll bubbling
7. [UserInfo](#userinfo) - Información de usuario en sidebar
8. [Modal](#modal) - ✨ **NUEVO** - Modal reutilizable con estructura consistente
9. [LoadingSpinner](#loadingspinner) - ✨ **NUEVO** - Indicador de carga animado
10. [ConfirmationDialog](#confirmationdialog) - ✨ **NUEVO** - Diálogo de confirmación

---

## BackButton

Botón simple para volver a la página anterior usando `window.history.back()`.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `label` | `string` | `'Volver'` | Texto del botón |

### Ejemplo

```jsx
import BackButton from '../reutilizables/BackButton'

function MiPagina() {
  return (
    <div>
      <BackButton label="← Volver al inicio" />
      {/* contenido */}
    </div>
  )
}
```

### Características
- ✅ Hover funcional con efectos visuales
- ✅ Icono de flecha incluido
- ✅ Estilos consistentes con el design system

---

## ErrorFallback

Componente para mostrar errores de forma amigable con opciones de recuperación.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `error` | `Object` | - | **Requerido**. Objeto error con `message`, `type`, `isRecoverable` |
| `onRetry` | `Function` | - | Callback para reintentar la operación |
| `componentName` | `string` | `'Componente'` | Nombre del componente que falló |
| `homeUrl` | `string` | `'/admin'` | URL del botón "Volver al Inicio" |

### Ejemplo

```jsx
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'

function MiComponente() {
  const { error, handleError, clearError } = useErrorHandler()
  
  if (error) {
    return (
      <ErrorFallback 
        error={error} 
        onRetry={() => fetchData()} 
        componentName="MiComponente" 
      />
    )
  }
  
  // render normal
}
```

### Características
- ✅ Detección automática de errores recuperables/no recuperables
- ✅ Botón "Reintentar" condicional
- ✅ Diseño visual consistente
- ✅ Hint de soporte técnico

---

## MultiSelectDropdown

Selector múltiple estilo Excel con búsqueda integrada y funciones de selección masiva.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `value` | `Array<string\|number>` | `[]` | Valores seleccionados (controlled) |
| `options` | `Array<string\|number>` | `[]` | Opciones disponibles |
| `onChange` | `Function` | - | **Requerido**. Callback `(newValue) => {}` |
| `placeholder` | `string` | `'Seleccionar...'` | Texto cuando no hay selección |
| `label` | `string` | - | Etiqueta descriptiva (accesibilidad) |
| `onFocus` | `Function` | - | Callback al abrir dropdown (carga lazy) |

### Ejemplo

```jsx
import MultiSelectDropdown from '../reutilizables/multi-select-dropdown'

function MiFormulario() {
  const [selectedRoles, setSelectedRoles] = useState([])
  const roleOptions = ['admin', 'editor', 'viewer', 'director']
  
  return (
    <MultiSelectDropdown
      label="Roles"
      value={selectedRoles}
      options={roleOptions}
      onChange={setSelectedRoles}
      placeholder="Seleccionar roles..."
    />
  )
}
```

### Características
- ✅ Búsqueda en tiempo real
- ✅ Seleccionar/Limpiar todos
- ✅ Cierre al hacer clic fuera
- ✅ Indicador visual de cantidad seleccionada
- ✅ Scroll interno para muchas opciones
- ⚠️ Accesibilidad: Falta navegación con teclado completa (mejora futura)

---

## Pagination

Paginador completo con números de página, botones anterior/siguiente y contador de registros.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `currentPage` | `number` | - | **Requerido**. Página actual (1-indexed) |
| `totalPages` | `number` | - | **Requerido**. Total de páginas |
| `onPageChange` | `Function` | - | **Requerido**. Callback `(newPage) => {}` |
| `totalRecords` | `number` | - | Total de registros (opcional, para contador) |
| `loading` | `boolean` | `false` | Deshabilita botones durante carga |

### Ejemplo

```jsx
import Pagination from '../reutilizables/Pagination'

function MiTabla() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0 })
  const perPage = 50
  
  const totalPages = Math.ceil(data.total / perPage)
  
  return (
    <div>
      {/* tabla */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={data.total}
        onPageChange={setPage}
        loading={loading}
      />
    </div>
  )
}
```

### Características
- ✅ Lógica inteligente de truncado (muestra 1...3,4,5...10)
- ✅ Botones con estados hover
- ✅ Accesible con aria-labels
- ✅ Responsive (flexbox con wrap)
- ✅ Contador de registros opcional

---

## PeriodoSelector

Selector de períodos con fetch automático desde `/api/periodos` y autoselección del último período con datos.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `hospital` | `string` | - | Código de hospital para filtrar períodos |
| `periodo` | `string` | - | Período seleccionado (controlled) |
| `onPeriodoChange` | `Function` | - | Callback `(nuevoPeriodo) => {}` |

### Ejemplo

```jsx
import PeriodoSelector from '../reutilizables/periodo-selector'

function VistaOrganigrama() {
  const [periodo, setPeriodo] = useState(null)
  const hospital = 'H001'
  
  return (
    <div>
      <PeriodoSelector 
        hospital={hospital}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
      />
      
      {periodo && <p>Mostrando datos de {periodo}</p>}
    </div>
  )
}
```

### Características
- ✅ Fetch automático de períodos disponibles
- ✅ Autoselección del último período con datos (`recommended`)
- ✅ Sincronización con URL query params
- ✅ Indicadores visuales (✓ con datos, ⚠️ sin datos)
- ✅ Manejo de estados: loading, error, sin períodos
- ✅ No causa loops infinitos (optimizado)

### Endpoint Backend

Consume: `GET /api/periodos?hospital={codigo}`

Respuesta esperada:
```json
{
  "items": ["2024-01", "2023-12", "2023-11"],
  "periodsMetadata": [
    { "periodo": "2024-01", "hasData": true, "isCurrent": true },
    { "periodo": "2023-12", "hasData": true, "isCurrent": false },
    { "periodo": "2023-11", "hasData": false, "isCurrent": false }
  ],
  "currentPeriod": "2024-01",
  "hasCurrent": true,
  "recommended": "2024-01"
}
```

---

## ScrollTrap

Previene que el scroll se propague al contenedor padre cuando se llega al límite superior/inferior.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | **Requerido**. Contenido a envolver |
| `style` | `Object` | `{}` | Estilos CSS adicionales |
| `...props` | `any` | - | Props adicionales para el `<div>` |

### Ejemplo

```jsx
import ScrollTrap from '../reutilizables/ScrollTrap'

function MiTabla() {
  return (
    <ScrollTrap style={{ maxHeight: 400, overflow: 'auto' }}>
      <table>
        {/* muchas filas */}
      </table>
    </ScrollTrap>
  )
}
```

### Características
- ✅ Previene scroll "saltón"
- ✅ Funciona con rueda del mouse y touchpad
- ✅ Usa `overscrollBehavior: 'contain'` como fallback
- ✅ Sin dependencias externas

### Cuándo usar
- Tablas con scroll interno
- Modales con contenido scrolleable
- Sidebars fijos con contenido largo

---

## UserInfo

Componente especial que inyecta información del usuario en el sidebar de AdminJS.

### Props

Ninguna (usa `useCurrentAdmin()` hook de AdminJS internamente)

### Ejemplo

```jsx
import UserInfo from '../reutilizables/UserInfo'

function MiPagina() {
  return (
    <div>
      <UserInfo /> {/* Inyecta automáticamente en el sidebar */}
      {/* contenido */}
    </div>
  )
}
```

### Características
- ✅ Inyección automática en sidebar de AdminJS
- ✅ Muestra username, rol y hospital (para directores)
- ✅ CSS inline para ocultar sidebar según rol sin flash (FOWC)
- ✅ Sincronización con `sessionStorage` para persistencia
- ✅ Renderizado con React (no innerHTML)
- ✅ Cleanup automático al desmontar

### Notas Técnicas

**¿Por qué manipula el DOM directamente?**

AdminJS no expone el sidebar como prop modificable. Este componente:
1. Busca el sidebar en el DOM
2. Crea un contenedor React
3. Renderiza con `createRoot` de React 18
4. Limpia correctamente al desmontar

Es una **solución pragmática** para extender AdminJS sin forkear la biblioteca.

---

## 🏗️ Arquitectura y Patrones

### Convenciones de Código

1. **Naming**: Todos los componentes usan PascalCase excepto archivos con guiones (histórico)
2. **Props**: Destructuring en firma de función
3. **Estilos**: Inline styles con objetos (no CSS modules)
4. **Accesibilidad**: aria-labels donde sea relevante
5. **Documentación**: JSDoc completo en cada componente

### Patrones Comunes

```jsx
// ✅ BIEN: Props con defaults
const MiComponente = ({ value = [], onChange, loading = false }) => {
  // ...
}

// ✅ BIEN: Early return para estados especiales
if (loading) return <Spinner />
if (error) return <ErrorFallback error={error} />
if (!data) return null

// ✅ BIEN: Cleanup en useEffect
useEffect(() => {
  const handler = () => {}
  window.addEventListener('click', handler)
  return () => window.removeEventListener('click', handler)
}, [])
```

---

## 🧪 Testing

Los componentes están mockeados en tests existentes. Ver:
- `tests/vista_usuario/panel.test.js`
- `tests/tablas_full/tablas_full.shared.test.js`

Ejemplo de mock:
```js
jest.mock('../../src/components/reutilizables/BackButton', () => {
  return function MockBackButton() { return null }
})
```

---

## 🚀 Roadmap

### Mejoras Futuras

1. **MultiSelectDropdown**
   - [ ] Navegación completa con teclado (↑↓, Enter, Esc)
   - [ ] Roles ARIA para screen readers
   - [ ] Opción de búsqueda por fuzzy match

2. **Pagination**
   - [ ] Opción de salto directo a página (input)
   - [ ] Selector de items por página
   - [ ] Teclado: Home/End para primera/última página

3. **PeriodoSelector**
   - [ ] Cache de períodos en memoria (evitar refetch)
   - [ ] Loading skeleton mientras carga

4. **Modal**
   - [ ] Animaciones de entrada/salida (fade in)
   - [ ] Soporte para modales anidados
   - [ ] Variantes de tamaño predefinidas (sm, md, lg, xl)

5. **LoadingSpinner**
   - [ ] Más variantes de animación (dots, pulse)
   - [ ] Integración con Suspense

6. **General**
   - [ ] Tests unitarios con React Testing Library
   - [ ] Storybook para documentación visual
   - [ ] Tema personalizable (dark mode)

---

## Modal

Componente wrapper para modales con estructura consistente (header, body, footer).

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Requerido**. Si el modal está visible |
| `onClose` | `Function` | - | **Requerido**. Callback al cerrar |
| `title` | `string` | - | **Requerido**. Título del modal |
| `subtitle` | `string` | `null` | Texto secundario debajo del título |
| `children` | `ReactNode` | - | **Requerido**. Contenido del body |
| `footer` | `ReactNode` | `null` | Contenido del footer (botones) |
| `maxWidth` | `string` | `'1200px'` | Ancho máximo del modal |
| `disableClickOutside` | `boolean` | `false` | Si es true, no cierra al hacer click fuera |
| `disableScroll` | `boolean` | `false` | Si es true, no usa ScrollTrap |

### Ejemplo

```jsx
import Modal from '../reutilizables/Modal'

function MiComponente() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Crear Usuario"
      subtitle="Hospital: H001"
      footer={
        <>
          <Button onClick={() => setIsOpen(false)} variant="light">Cancelar</Button>
          <Button onClick={handleSave} variant="primary">Guardar</Button>
        </>
      }
    >
      <Label>Nombre</Label>
      <Input value={nombre} onChange={e => setNombre(e.target.value)} />
    </Modal>
  )
}
```

### Características
- ✅ Overlay con backdrop semitransparente
- ✅ ScrollTrap integrado para prevenir scroll bubbling
- ✅ Click-outside opcional
- ✅ Estructura consistente (header/body/footer)
- ✅ Responsive (maxWidth 95vw, maxHeight 95vh)

---

## LoadingSpinner

Indicador visual de carga con animación CSS.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `loading` | `boolean` | `true` | Si está en estado de carga |
| `text` | `string` | `null` | Texto a mostrar junto al spinner |
| `size` | `string` | `'default'` | Tamaño: `'small'`, `'default'`, `'large'` |
| `color` | `string` | `'#666'` | Color del spinner y texto |
| `inline` | `boolean` | `false` | Si es true, se muestra inline (útil para botones) |
| `overlay` | `boolean` | `false` | Si es true, se muestra como overlay absoluto |
| `style` | `Object` | `{}` | Estilos CSS adicionales |

### Ejemplo

```jsx
import LoadingSpinner from '../reutilizables/LoadingSpinner'

// En un botón
<Button disabled={loading}>
  {loading ? <LoadingSpinner inline size="small" text="Guardando..." color="#fff" /> : 'Guardar'}
</Button>

// Centrado en contenedor
{loading ? (
  <LoadingSpinner text="Cargando datos..." />
) : (
  <Table data={data} />
)}

// Como overlay
<Box style={{ position: 'relative' }}>
  {loading && <LoadingSpinner overlay text="Procesando..." />}
  <Form />
</Box>
```

### Características
- ✅ Animación CSS pura (sin dependencias)
- ✅ 3 tamaños predefinidos
- ✅ Modo inline para botones
- ✅ Modo overlay para contenedores
- ✅ Personalizable (color, tamaño, texto)

---

## ConfirmationDialog

Diálogo modal de confirmación para acciones destructivas.

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Requerido**. Si el diálogo está visible |
| `onConfirm` | `Function` | - | **Requerido**. Callback al confirmar |
| `onCancel` | `Function` | - | **Requerido**. Callback al cancelar |
| `title` | `string` | `'Confirmar acción'` | Título del diálogo |
| `message` | `string` | `'¿Está seguro...'` | Mensaje explicativo |
| `confirmText` | `string` | `'Confirmar'` | Texto del botón de confirmación |
| `cancelText` | `string` | `'Cancelar'` | Texto del botón de cancelación |
| `variant` | `string` | `'danger'` | Variante: `'danger'`, `'primary'`, `'warning'`, `'light'` |
| `icon` | `string` | `'AlertCircle'` | Icono de AdminJS |
| `loading` | `boolean` | `false` | Si está procesando |

### Ejemplo

```jsx
import ConfirmationDialog from '../reutilizables/ConfirmationDialog'

function MiComponente() {
  const [showConfirm, setShowConfirm] = useState(false)
  
  const handleDelete = async () => {
    await deleteUser(userId)
    setShowConfirm(false)
  }
  
  return (
    <>
      <Button onClick={() => setShowConfirm(true)} variant="danger">
        Eliminar
      </Button>
      
      <ConfirmationDialog
        isOpen={showConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        title="Eliminar Usuario"
        message="¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
        icon="Delete"
      />
    </>
  )
}
```

### Características
- ✅ 4 variantes de color (danger, primary, warning, light)
- ✅ Icono personalizable
- ✅ Loading state integrado
- ✅ Diseño visual consistente con sistema
- ✅ Overlay con z-index 10000

---

## 📝 Contribuir

Al modificar estos componentes:

1. **No rompas compatibilidad** - muchas vistas los usan
2. **Actualiza este README** si cambias props o comportamiento
3. **Agrega JSDoc** si creas nuevas props
4. **Prueba en al menos 2 vistas** antes de commitear
5. **Considera accesibilidad** (aria-labels, teclado)

---

## 📞 Soporte

Si encuentras bugs o necesitas nuevas funcionalidades, contacta al equipo de desarrollo.

**Mantenedores actuales:** Equipo Backend & Frontend

**Última actualización:** Enero 2026
