/**
 * Tests para validaciones de concursos
 * Focused on Zod validation y helpers
 */

const { concursoCreateSchema } = require('../src/schemas/concursoSchema');

/**
 * Tests para Validaciones Zod
 */
describe('Validaciones Zod - ConcursoCreateSchema', () => {
  it('debe validar concurso correcto', () => {
    const data = {
      id_concurso: 1,
      sigla: 'HGACA',
      estado: 'RESOLUCION',
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('debe rechazar id_concurso negativo', () => {
    const data = {
      id_concurso: -1,
      sigla: 'HGACA',
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar id_concurso decimal', () => {
    const data = {
      id_concurso: 1.5,
      sigla: 'HGACA',
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar sigla vacía', () => {
    const data = {
      id_concurso: 1,
      sigla: '',
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar sigla > 20 caracteres', () => {
    const data = {
      id_concurso: 1,
      sigla: 'ABCDEFGHIJKLMNOPQRST1', // 21 caracteres
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe aceptar sigla exactamente 20 caracteres', () => {
    const data = {
      id_concurso: 1,
      sigla: 'ABCDEFGHIJKLMNOPQRST', // 20 caracteres exactos
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('debe rechazar estado > 50 caracteres', () => {
    const data = {
      id_concurso: 1,
      sigla: 'HGACA',
      estado: 'A'.repeat(51), // 51 caracteres
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe aceptar estado exactamente 50 caracteres', () => {
    const data = {
      id_concurso: 1,
      sigla: 'HGACA',
      estado: 'A'.repeat(50), // 50 caracteres exactos
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('debe aceptar campos opcionales como null', () => {
    const data = {
      id_concurso: 1,
      sigla: 'HGACA',
      estado: null,
      nombre_baja: null,
      cuil_baja: null,
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('debe aceptar campos opcionales omitidos', () => {
    const data = {
      id_concurso: 1,
      sigla: 'HGACA',
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('debe validar max lengths de todos los campos string', () => {
    const validData = {
      id_concurso: 1,
      sigla: 'HGACA',
      ee_baja: 'A'.repeat(150), // Max 150
      nombre_baja: 'A'.repeat(150), // Max 150
      puesto_baja: 'A'.repeat(150), // Max 150
      cuil_baja: 'A'.repeat(20), // Max 20
    };

    const result = concursoCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('debe rechazar campos que excedan max lengths', () => {
    const invalidData = {
      id_concurso: 1,
      sigla: 'HGACA',
      cuil_baja: 'A'.repeat(21), // > 20
    };

    const result = concursoCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('debe rechazar id_concurso no numérico', () => {
    const data = {
      id_concurso: 'not a number',
      sigla: 'HGACA',
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar sigla no string', () => {
    const data = {
      id_concurso: 1,
      sigla: 123,
    };

    const result = concursoCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe validar correctamente un concurso completo', () => {
    const completeData = {
      id_concurso: 123456,
      sigla: 'HGACA',
      estado: 'RESOLUCION',
      sub_estado: 'RESOLUCION',
      ee_baja: 'EXP-2024-001',
      cuil_baja: '20123456789',
      nombre_baja: 'Juan Perez',
      fecha_baja: '2024-01-15',
      escalafon_baja: 'A',
      puesto_baja: 'Medico General',
      especialidad_baja: 'Medicina General',
      ee_concurso: 'CONC-2024-001',
      fecha_ee_concurso: '2024-02-01',
      escalafon_concurso: 'A',
      puesto_alta: 'Medico General',
      especialidad_solicitada_de_alta: 'Medicina General',
      fecha_autorizacion: '2024-02-15',
      sorteo_de_jurado: 'Si',
      disposicion_concurso: 'RES-123-2024',
      fecha_desde: '2024-03-01',
      fecha_hasta: '2024-04-01',
      fecha_examen: '2024-04-15',
      orden_merito: 'OM-001',
      fecha_orden_merito: '2024-05-01',
      expediente_designacion: 'DESIG-001',
      fecha_expediente_designacion: '2024-05-15',
      nombre_designacion: 'Juan Perez',
      cuil_designacion: '20123456789',
      fecha_apto_medico: '2024-05-20',
      resolucion_designacion: 'RES-456-2024',
      fecha_resolucion: '2024-05-25',
      observaciones: 'Concurso completado exitosamente',
      codigo_cargo: 'MED-001',
    };

    const result = concursoCreateSchema.safeParse(completeData);
    expect(result.success).toBe(true);
  });
});

module.exports = {};
