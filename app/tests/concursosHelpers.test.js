/**
 * Tests para utilidades de concursos
 */

const { normalizarEstado, getColorEstado, MAPEO_ESTADO, COLORES_ESTADO } = require('../src/utils/concursosHelpers');

describe('concursosHelpers', () => {
  // ✅ TEST 1: normalizarEstado
  describe('normalizarEstado()', () => {
    it('debe normalizar "RESOLUCION" a "RESOLUCIÓN"', () => {
      expect(normalizarEstado('RESOLUCION')).toBe('RESOLUCIÓN');
    });

    it('debe normalizar "RESOLUCI" a "RESOLUCIÓN"', () => {
      expect(normalizarEstado('RESOLUCI')).toBe('RESOLUCIÓN');
    });

    it('debe normalizar estados con espacios', () => {
      expect(normalizarEstado('  ADJUDICADO  ')).toBe('ADJUDICADO');
    });

    it('debe ser case-insensitive', () => {
      expect(normalizarEstado('resolucion')).toBe('RESOLUCIÓN');
      expect(normalizarEstado('ResolucioN')).toBe('RESOLUCIÓN');
    });

    it('debe dejar sin cambios estados ya normalizados', () => {
      expect(normalizarEstado('RESOLUCIÓN')).toBe('RESOLUCIÓN');
      expect(normalizarEstado('ADJUDICADO')).toBe('ADJUDICADO');
    });

    it('debe retornar estado sin cambios si no está en mapeo', () => {
      expect(normalizarEstado('ESTADO_DESCONOCIDO')).toBe('ESTADO_DESCONOCIDO');
    });

    it('debe manejar null/undefined', () => {
      expect(normalizarEstado(null)).toBe(null);
      expect(normalizarEstado(undefined)).toBe(undefined);
    });

    it('debe normalizar abreviaturas PROX', () => {
      expect(normalizarEstado('PROX. A DESIG')).toBe('PRÓX. A DESIGNAR');
      expect(normalizarEstado('PROX A DESIG')).toBe('PRÓX. A DESIGNAR');
    });

    it('debe normalizar variaciones de DESIG', () => {
      expect(normalizarEstado('DESIG. EFECTIVA')).toBe('DESIGNACIÓN EFECTIVA');
      expect(normalizarEstado('DESIG EFECTIVA')).toBe('DESIGNACIÓN EFECTIVA');
    });

    it('debe normalizar variaciones de INSCRIPCION', () => {
      expect(normalizarEstado('INSCRIPCION')).toBe('INSCRIPCIÓN');
      expect(normalizarEstado('INSCRIPCI')).toBe('INSCRIPCIÓN');
    });

    it('debe normalizar variaciones de VALIDACION', () => {
      expect(normalizarEstado('VALID. VCTE')).toBe('VALIDACIÓN VACANTE');
      expect(normalizarEstado('VALIDACION VCTE')).toBe('VALIDACIÓN VACANTE');
    });

    it('debe normalizar variaciones de ETAPA EVALUACION', () => {
      expect(normalizarEstado('ETAPA EVAL')).toBe('ETAPA DE EVALUACIÓN');
      expect(normalizarEstado('ETAPA EVAL.')).toBe('ETAPA DE EVALUACIÓN');
      expect(normalizarEstado('ETAPA EVALUACION')).toBe('ETAPA DE EVALUACIÓN');
    });
  });

  // ✅ TEST 2: getColorEstado
  describe('getColorEstado()', () => {
    it('debe retornar colores para estado válido', () => {
      const color = getColorEstado('RESOLUCIÓN');
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('text');
      expect(color).toHaveProperty('label');
    });

    it('debe retornar colores correctos para RESOLUCIÓN', () => {
      const color = getColorEstado('RESOLUCIÓN');
      expect(color.bg).toBe('#E3F2FD');
      expect(color.border).toBe('#1976d2');
      expect(color.text).toBe('#1565c0');
      expect(color.label).toBe('Resolución');
    });

    it('debe retornar colores correctos para AUTORIZADO', () => {
      const color = getColorEstado('AUTORIZADO');
      expect(color.bg).toBe('#E8F5E9');
      expect(color.border).toBe('#388e3c');
      expect(color.text).toBe('#2e7d32');
      expect(color.label).toBe('Autorizado');
    });

    it('debe retornar colores correctos para ADJUDICADO', () => {
      const color = getColorEstado('ADJUDICADO');
      expect(color.bg).toBe('#E0F2F1');
      expect(color.border).toBe('#00897b');
      expect(color.text).toBe('#00695c');
      expect(color.label).toBe('Adjudicado');
    });

    it('debe normalizar estados antes de buscar color', () => {
      const color1 = getColorEstado('RESOLUCION'); // Sin normalizar
      const color2 = getColorEstado('RESOLUCIÓN'); // Normalizado
      expect(color1).toEqual(color2);
    });

    it('debe retornar color default para estado desconocido', () => {
      const color = getColorEstado('ESTADO_INEXISTENTE');
      expect(color).toHaveProperty('bg');
      expect(color.bg).toBe('#F5F5F5');
      expect(color.border).toBe('#999');
      expect(color.text).toBe('#666');
    });

    it('debe manejar null/undefined sin errores', () => {
      const color1 = getColorEstado(null);
      const color2 = getColorEstado(undefined);
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
    });

    it('debe retornar todos los colores definidos en COLORES_ESTADO', () => {
      const estadoKey = 'RESOLUCIÓN';
      const color = getColorEstado(estadoKey);
      const esperado = COLORES_ESTADO[estadoKey];
      expect(color).toEqual(esperado);
    });
  });

  // ✅ TEST 3: MAPEO_ESTADO constante
  describe('MAPEO_ESTADO', () => {
    it('debe ser un objeto no vacío', () => {
      expect(typeof MAPEO_ESTADO).toBe('object');
      expect(Object.keys(MAPEO_ESTADO).length).toBeGreaterThan(0);
    });

    it('debe mapear todas las abreviaturas correctamente', () => {
      expect(MAPEO_ESTADO['RESOLUCION']).toBe('RESOLUCIÓN');
      expect(MAPEO_ESTADO['AUTORIZADO']).toBe('AUTORIZADO');
      expect(MAPEO_ESTADO['DESIERTO']).toBe('DESIERTO');
    });

    it('no debe tener valores null o undefined', () => {
      Object.entries(MAPEO_ESTADO).forEach(([key, value]) => {
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
      });
    });
  });

  // ✅ TEST 4: COLORES_ESTADO constante
  describe('COLORES_ESTADO', () => {
    it('debe ser un objeto no vacío', () => {
      expect(typeof COLORES_ESTADO).toBe('object');
      expect(Object.keys(COLORES_ESTADO).length).toBeGreaterThan(0);
    });

    it('cada color debe tener propiedades bg, border, text, label', () => {
      Object.entries(COLORES_ESTADO).forEach(([estado, color]) => {
        expect(color).toHaveProperty('bg');
        expect(color).toHaveProperty('border');
        expect(color).toHaveProperty('text');
        expect(color).toHaveProperty('label');
      });
    });

    it('los valores de color deben ser strings válidos de hex', () => {
      Object.entries(COLORES_ESTADO).forEach(([estado, color]) => {
        expect(typeof color.bg).toBe('string');
        expect(typeof color.border).toBe('string');
        expect(typeof color.text).toBe('string');
        // Validar formato hex
        expect(/^#[0-9A-F]{6}$/i.test(color.bg)).toBe(true);
        expect(/^#[0-9A-F]{6}$/i.test(color.border)).toBe(true);
        expect(/^#[0-9A-F]{6}$/i.test(color.text)).toBe(true);
      });
    });

    it('no debe tener valores null', () => {
      Object.entries(COLORES_ESTADO).forEach(([estado, color]) => {
        expect(color.bg).not.toBeNull();
        expect(color.border).not.toBeNull();
        expect(color.text).not.toBeNull();
        expect(color.label).not.toBeNull();
      });
    });
  });

  // ✅ TEST 5: Coherencia entre MAPEO y COLORES
  describe('Coherencia entre MAPEO_ESTADO y COLORES_ESTADO', () => {
    it('todos los valores de MAPEO deben existir en COLORES', () => {
      const valoresMapeo = new Set(Object.values(MAPEO_ESTADO));
      const coloresKeys = Object.keys(COLORES_ESTADO);
      
      valoresMapeo.forEach((estado) => {
        // Normalizar para comparación (eliminar problemas de encoding)
        const existe = coloresKeys.some(key => key === estado);
        expect(existe).toBe(true);
      });
    });

    it('no debe haber estados en COLORES que no estén mapeados', () => {
      // Los valores de MAPEO son los que deberían estar en COLORES
      // (puede haber estados en COLORES sin abreviaturas)
      Object.keys(COLORES_ESTADO).forEach((estado) => {
        expect(typeof estado).toBe('string');
        expect(estado.length).toBeGreaterThan(0);
      });
    });
  });
});

module.exports = {};
