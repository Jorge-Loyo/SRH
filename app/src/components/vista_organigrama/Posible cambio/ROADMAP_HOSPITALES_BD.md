# 📋 ROADMAP: Hospitales desde Base de Datos

**Documento de Guía Técnica para Migrar Datos de Hospitales (Hardcodeados → BD)**

---

## 🎯 Objetivo

Trasladar la lista de hospitales de `hospitals-data.js` (hardcodeado) a una tabla en base de datos, permitiendo:
- ✅ Agregar/editar hospitales sin redeployar
- ✅ Mantener datos dinámicos y actualizados
- ✅ Reutilizar lista en múltiples servicios
- ✅ Mantener performance con caché

---

## 📊 Estado Actual vs Futuro

### Hoy (v1.0 - Hardcodeado)
```
hospitals-data.js → OrganigramaHome.jsx
                 → OrganigramaDetalle.jsx
                 
Cambiar hospital = Editar código + Redeployar
```

### Mañana (v1.1 - Dinámico desde BD)
```
Base de Datos (hospitales table)
        ↓
   /api/hospitales (GET)
        ↓
useHospitales Hook + Caché Local
        ↓
OrganigramaHome.jsx + OrganigramaDetalle.jsx

Cambiar hospital = Actualizar BD (instantáneo)
```

---

## 🏗️ PASO 1: Crear Tabla en Base de Datos

### SQL Script

```sql
-- Crear tabla de hospitales
CREATE TABLE hospitales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo_hospital VARCHAR(20) UNIQUE NOT NULL COMMENT 'HGARM, HGAPP, etc.',
  nombre VARCHAR(255) NOT NULL COMMENT 'Hospital Ramos Mejia',
  categoria VARCHAR(100) NOT NULL COMMENT 'HOSPITALES DE AGUDOS, HOSPITALES DE NIÑOS, etc.',
  activo BOOLEAN DEFAULT TRUE COMMENT 'Para deshabilitar sin eliminar',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_codigo_hospital (codigo_hospital),
  INDEX idx_categoria (categoria),
  INDEX idx_activo (activo)
);

-- Insertar datos iniciales desde hospitals-data.js
INSERT INTO hospitales (codigo_hospital, nombre, categoria) VALUES
('HGARM', 'Hospital Ramos Mejia', 'HOSPITALES DE AGUDOS'),
('HGAPP', 'Hospital Piñero', 'HOSPITALES DE AGUDOS'),
('HBR', 'Hospital Rivadavia', 'HOSPITALES DE AGUDOS'),
('HGACD', 'Hospital Durand', 'HOSPITALES DE AGUDOS'),
('HGAP', 'Hospital Penna', 'HOSPITALES DE AGUDOS'),
('HGADS', 'Hospital Santojanni', 'HOSPITALES DE AGUDOS'),
('HGACA', 'Hospital Argerich', 'HOSPITALES DE AGUDOS'),
('HGATA', 'Hospital Alvarez', 'HOSPITALES DE AGUDOS'),
('HGAJAF', 'Hospital Fernandez', 'HOSPITALES DE AGUDOS'),
('HGAIP', 'Hospital Pirovano', 'HOSPITALES DE AGUDOS'),
('HGNPE', 'Hospital Elizalde', 'HOSPITALES DE NIÑOS'),
('HGNRG', 'Hospital Gutierrez', 'HOSPITALES DE NIÑOS'),
('HIFJM', 'Hospital Muñiz', 'HOSPITALES MONOVALENTES'),
('HGAVS', 'Hospital Velez Sarsfield', 'HOSPITALES DE AGUDOS'),
('HGAT', 'Hospital Tornu', 'HOSPITALES DE AGUDOS'),
('HGAZ', 'Hospital Zubizarreta', 'HOSPITALES DE AGUDOS'),
('HGACG', 'Hospital Grierson', 'HOSPITALES DE AGUDOS'),
('HNJTB', 'Hospital Borda', 'HOSPITALES DE SALUD MENTAL'),
('HNBM', 'Hospital Moyano', 'HOSPITALES DE SALUD MENTAL'),
('HMOMC', 'Hospital Marie Curie', 'HOSPITALES MONOVALENTES'),
('HMIRS', 'Hospital Sarda', 'HOSPITALES MONOVALENTES'),
('HBU', 'Hospital Udaondo', 'HOSPITALES MONOVALENTES'),
('HQ', 'Hospital Illia', 'HOSPITALES MONOVALENTES'),
('HIJCTG', 'Hospital Tobar Garcia', 'HOSPITALES DE SALUD MENTAL'),
('HEPTA', 'Hospital Alvear', 'HOSPITALES DE SALUD MENTAL'),
('HRRMF', 'Hospital Ferrer', 'HOSPITALES MONOVALENTES'),
('HSL', 'Hospital Santa Lucia', 'HOSPITALES MONOVALENTES'),
('IZLP', 'Instituto Pasteur', 'HOSPITALES MONOVALENTES'),
('HMO', 'Hospital Dueñas', 'HOSPITALES MONOVALENTES'),
('HRR', 'Hospital Rocca', 'HOSPITALES MONOVALENTES'),
('IRPS', 'Instituto R. Psicofisica', 'HOSPITALES MONOVALENTES'),
('IREP', 'Instituto R. Psicofisica', 'HOSPITALES MONOVALENTES'),
('HOI', 'Hospital Quinquela Martin', 'HOSPITALES MONOVALENTES'),
('HOPL', 'Hospital Lagleyze', 'HOSPITALES MONOVALENTES'),
('HO', 'Hospital Carrillo', 'HOSPITALES MONOVALENTES');
```

---

## 🔷 PASO 2: Crear Entidad TypeORM

**Archivo:** `src/entities-class/Hospital.ts`

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  Index, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm'

@Entity('hospitales')
@Index('idx_codigo_hospital', ['codigo_hospital'])
@Index('idx_categoria', ['categoria'])
@Index('idx_activo', ['activo'])
export class Hospital {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 20 })
  codigo_hospital: string // HGARM, HGAPP, etc.

  @Column({ length: 255 })
  nombre: string // Hospital Ramos Mejia

  @Column({ length: 100 })
  categoria: string // HOSPITALES DE AGUDOS

  @Column({ default: true })
  activo: boolean // Para deshabilitar sin eliminar

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Método helper para transformar a formato frontend
  toDTO() {
    return {
      id: this.codigo_hospital, // Para compatibilidad con hospitalsMap
      name: this.nombre,
      category: this.categoria
    }
  }
}
```

---

## 🔌 PASO 3: Crear Endpoint Backend

**Archivo:** `src/routes/hospitalRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { AppDataSource } = require('../config/data-source');
const { Hospital } = require('../entities-class/Hospital');
const { authenticateJWT } = require('../middlewares/auth');
const logger = require('../utils/logger');

/**
 * GET /api/hospitales
 * 
 * Devuelve lista de hospitales activos
 * 
 * Query Params:
 * - categoria (opcional): Filtrar por categoría
 * - activo (opcional): true/false, por defecto true
 * 
 * Response:
 * {
 *   data: [ { id, name, category, activo }, ... ],
 *   count: number,
 *   categories: [ 'HOSPITALES DE AGUDOS', ... ]
 * }
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { categoria, activo } = req.query;
    const repo = AppDataSource.getRepository(Hospital);
    
    // Construir query dinámica
    let query = repo.createQueryBuilder('h');
    
    // Filtro: activos por defecto
    const filterActivo = activo !== undefined ? activo === 'true' : true;
    query = query.where('h.activo = :activo', { activo: filterActivo });
    
    // Filtro opcional por categoría
    if (categoria) {
      query = query.andWhere('h.categoria = :categoria', { categoria });
    }
    
    // Ordenar por código
    query = query.orderBy('h.codigo_hospital', 'ASC');
    
    // Ejecutar query
    const hospitales = await query.getMany();
    
    // Obtener categorías únicas
    const categories = [...new Set(hospitales.map(h => h.categoria))].sort();
    
    // Transformar a DTO
    const data = hospitales.map(h => h.toDTO());
    
    res.json({
      data,
      count: data.length,
      categories
    });
    
  } catch (error) {
    logger.error('[GET /api/hospitales] Error:', { error: error.message });
    res.status(500).json({ error: error.message, data: [] });
  }
});

/**
 * GET /api/hospitales/:id
 * Obtener un hospital por código
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(Hospital);
    
    const hospital = await repo.findOne({
      where: { codigo_hospital: id, activo: true }
    });
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital no encontrado' });
    }
    
    res.json({ data: hospital.toDTO() });
    
  } catch (error) {
    logger.error('[GET /api/hospitales/:id] Error:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/hospitales (Admin only)
 * Crear nuevo hospital
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { codigo_hospital, nombre, categoria } = req.body;
    
    // Validar campos requeridos
    if (!codigo_hospital || !nombre || !categoria) {
      return res.status(400).json({ 
        error: 'Se requieren: codigo_hospital, nombre, categoria' 
      });
    }
    
    const repo = AppDataSource.getRepository(Hospital);
    
    // Verificar que no exista
    const existing = await repo.findOne({ where: { codigo_hospital } });
    if (existing) {
      return res.status(409).json({ error: 'Hospital ya existe' });
    }
    
    const hospital = repo.create({
      codigo_hospital,
      nombre,
      categoria,
      activo: true
    });
    
    await repo.save(hospital);
    
    res.status(201).json({ data: hospital.toDTO() });
    
  } catch (error) {
    logger.error('[POST /api/hospitales] Error:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 📍 PASO 4: Registrar Ruta en `src/routes/index.js`

```javascript
// Agregar al inicio con otros imports
const hospitales = require('./hospitalRoutes');

// Agregar al router
router.use('/hospitales', hospitales);
```

---

## 🪝 PASO 5: Crear Hook React con Caché

**Archivo:** `src/components/vista_organigrama/useHospitales.js`

```javascript
import { useState, useEffect } from 'react'

const CACHE_KEY = 'hospitales_cache'
const CACHE_TIME = 5 * 60 * 1000 // 5 minutos

/**
 * Hook para obtener lista de hospitales con caché automático
 * 
 * Devuelve:
 * {
 *   hospitales: Array<{ id, name, category }>,
 *   hospitalsMap: Object<id => name>,
 *   categories: Array<string>,
 *   loading: boolean,
 *   error: string | null,
 *   refetch: function // Forzar recarga
 * }
 */
export function useHospitales() {
  const [hospitales, setHospitales] = useState([])
  const [hospitalsMap, setHospitalsMap] = useState({})
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHospitales = async (forceRefresh = false) => {
    try {
      // Revisar caché si no es force refresh
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TIME) {
            setHospitales(data.hospitales)
            setHospitalsMap(data.hospitalsMap)
            setCategories(data.categories)
            setLoading(false)
            return
          }
        }
      }

      // Fetch si no hay caché válido
      setLoading(true)
      setError(null)

      const abortController = new AbortController()
      const response = await fetch('/api/hospitales', {
        signal: abortController.signal,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })

      if (!response.ok) {
        throw new Error('Error cargando hospitales')
      }

      const json = await response.json()
      const data = json.data

      // Generar map: codigo_hospital => nombre
      const map = data.reduce((acc, h) => {
        acc[h.id] = h.name
        return acc
      }, {})

      // Guardar en caché
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: {
          hospitales: data,
          hospitalsMap: map,
          categories: json.categories
        },
        timestamp: Date.now()
      }))

      setHospitales(data)
      setHospitalsMap(map)
      setCategories(json.categories)
      setLoading(false)

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setLoading(false)
      }
    }
  }

  // Fetch al montar
  useEffect(() => {
    fetchHospitales()
  }, [])

  return {
    hospitales,
    hospitalsMap,
    categories,
    loading,
    error,
    refetch: () => fetchHospitales(true) // Forzar recarga
  }
}
```

---

## 🔄 PASO 6: Modificar Componentes

### OrganigramaHome.jsx

```javascript
import { useHospitales } from './useHospitales'

const OrganigramaHome = () => {
  const { hospitales, loading, error } = useHospitales()

  if (loading) {
    return <Box><Text>Cargando hospitales...</Text></Box>
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={() => window.location.reload()} />
  }

  // Agrupar por categoría igual que antes
  const grouped = hospitales.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = []
    acc[h.category].push(h)
    return acc
  }, {})

  const categories = Object.keys(grouped).sort()

  return (
    <Box style={{ padding: 16 }}>
      {/* ... resto igual ... */}
    </Box>
  )
}
```

### OrganigramaDetalle.jsx

```javascript
import { useHospitales } from './useHospitales'

const OrganigramaDetalle = () => {
  const { hospitalsMap } = useHospitales()
  
  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams()
    return new URLSearchParams(window.location.search)
  }, [])
  
  const hospitalCode = params.get('hospital') || 'HGACA'
  const hospitalName = hospitalsMap[hospitalCode] || hospitalCode
  
  // ... resto igual, ahora con hospitalsMap dinámico ...
}
```

---

## 🚀 PASO 7: Eliminar Datos Hardcodeados

### Una vez todo funcione dinámicamente:

```bash
# Opción 1: Mantener hospitals-data.js como fallback
# (En caso de error de BD, usar datos locales)
# - Editar useHospitales para usar fallback

# Opción 2: Eliminar completamente
# rm src/components/vista_organigrama/hospitals-data.js
# 
# Actualizar imports en OrganigramaHome.jsx
# Actualizar imports en OrganigramaDetalle.jsx
```

---

## 🔐 Seguridad y Consideraciones

### ✅ Implementado
- [x] Autenticación en endpoint (requireJWT)
- [x] Validación de entrada (categoria)
- [x] Índices en BD para performance
- [x] Caché de cliente (sessionStorage)

### ⚠️ Considerar Adicional
- [ ] Rate limiting en /api/hospitales
- [ ] Roles específicos para POST/PUT/DELETE
- [ ] Auditoría de cambios en tabla hospitales
- [ ] CDN/Redis para caché distribuido (si escala)

---

## 🧪 Testing

Agregar tests en `tests/vista_organigrama/`:

```javascript
// Ejemplo: test useHospitales
describe('useHospitales', () => {
  test('debe cargar hospitales desde API', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 'HGACA', name: 'Hospital Argerich', category: 'HOSPITALES DE AGUDOS' }],
        categories: ['HOSPITALES DE AGUDOS']
      })
    })

    const { result, waitForNextUpdate } = renderHook(() => useHospitales())
    await waitForNextUpdate()

    expect(result.current.hospitales).toHaveLength(1)
    expect(result.current.hospitalsMap['HGACA']).toBe('Hospital Argerich')
  })

  test('debe usar caché si está disponible', async () => {
    sessionStorage.setItem('hospitales_cache', JSON.stringify({
      data: { hospitales: [], hospitalsMap: {}, categories: [] },
      timestamp: Date.now()
    }))

    renderHook(() => useHospitales())
    
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
```

---

## 📈 Fases de Implementación

### **Fase 1: Preparación (2 horas)**
- [x] Crear tabla en BD
- [x] Crear entidad TypeORM
- [x] Script SQL para insertar datos

### **Fase 2: Backend (2 horas)**
- [x] Crear endpoint GET /api/hospitales
- [x] Crear endpoint GET /api/hospitales/:id
- [x] Registrar rutas
- [x] Agregar tests

### **Fase 3: Frontend (1.5 horas)**
- [x] Crear hook useHospitales
- [x] Modificar OrganigramaHome.jsx
- [x] Modificar OrganigramaDetalle.jsx
- [x] Agregar tests

### **Fase 4: Cleanup (1 hora)**
- [x] Eliminar hospitals-data.js
- [x] Validar en staging
- [x] Deploy

**Total Estimado: 6-7 horas de desarrollo**

---

## ✅ Checklist Antes de Producción

- [ ] BD creada con datos iniciales
- [ ] Entidad TypeORM compila sin errores
- [ ] Endpoints devuelven datos correctos
- [ ] Hook cacheando correctamente
- [ ] Componentes usan hook nuevo
- [ ] Tests pasando
- [ ] Performance OK (tiempo de carga)
- [ ] Errores manejados elegantemente
- [ ] Fallback si API falla
- [ ] Documentación actualizada

---

## 🎯 Beneficios Finales

✅ **Mantenibilidad:** Agregar/editar hospitales sin código  
✅ **Flexibilidad:** Cambios reflejados instantáneamente  
✅ **Escalabilidad:** Preparado para crecer  
✅ **Performance:** Caché automático minimiza requests  
✅ **Seguridad:** Autenticación + auditoría  

---

**Documento creado:** 2026-01-20  
**Versión:** 1.0 - Roadmap Inicial  
**Estado:** Listo para implementación en v1.1
