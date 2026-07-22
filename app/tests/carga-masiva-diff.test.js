const { createTestApp } = require('./test-app-factory');
const { buildDiff } = require('../src/modules/carga-masiva/dotacionDiffEngine');

let ds, entities;

beforeAll(async () => {
  const ctx = await createTestApp();
  ds = ctx.ds; entities = ctx.entities;
});

afterAll(async () => { if (ds && ds.isInitialized) await ds.destroy(); });

const sigla = (overrides) => ({ id_sigla: 1, sigla: 'HBR', universo_totalizador: 'X', tipo_hospital_sigla: 'AGUDOS', ...overrides });
const persona = (overrides) => ({ tipo_doc: 'DNI', numero_doc: 10000000, ...overrides });
const rol = (overrides) => ({
  descripcion_reparticion: 'Repartición test', escalafon: 'Profesional', literal_codigo_registro: 'Reg',
  situacion_revista: 'Activo', literal_puesto: 'Puesto', unificador_puesto: 'Unificador', agrupador: 'Grupo',
  ...overrides,
});
const rowFor = ({ cuil, nombre, edad, codigoCargo, codigoRol, idSigla = 1 }) => ({
  cuil,
  persona: persona({ cuil, nombre_apellido: nombre, edad }),
  cargo: { codigo_cargo: codigoCargo },
  rol: rol({ codigo_rol: codigoRol, codigo_reparticion: idSigla }),
  sigla: sigla({ id_sigla: idSigla }),
});

describe('dotacionDiffEngine — comparación contra el período correcto', () => {
  it('compara un período nuevo contra el período anterior con datos, no contra sí mismo', async () => {
    const { Sigla, Persona, Cargo, Rol } = entities;

    await ds.getRepository(Sigla).save(sigla());

    // Junio: A (sigue igual), B (va a cambiar), D (va a desaparecer)
    await ds.getRepository(Persona).save([
      persona({ id_persona: 1, periodo: '2026-06', cuil: '20111111111', nombre_apellido: 'A Persona', edad: 30 }),
      persona({ id_persona: 2, periodo: '2026-06', cuil: '20222222222', nombre_apellido: 'B Persona', edad: 40 }),
      persona({ id_persona: 3, periodo: '2026-06', cuil: '20333333333', nombre_apellido: 'D Persona', edad: 50 }),
    ]);
    await ds.getRepository(Cargo).save([
      { id_cargo: 1, periodo: '2026-06', codigo_cargo: 'C1' },
      { id_cargo: 2, periodo: '2026-06', codigo_cargo: 'C2' },
      { id_cargo: 3, periodo: '2026-06', codigo_cargo: 'C3' },
    ]);
    await ds.getRepository(Rol).save([
      rol({ id_rol: 1, periodo: '2026-06', id_persona: 1, id_cargo: 1, id_sigla: 1, codigo_rol: 'SIAL-1', codigo_reparticion: 1 }),
      rol({ id_rol: 2, periodo: '2026-06', id_persona: 2, id_cargo: 2, id_sigla: 1, codigo_rol: 'SIAL-2', codigo_reparticion: 1 }),
      rol({ id_rol: 3, periodo: '2026-06', id_persona: 3, id_cargo: 3, id_sigla: 1, codigo_rol: 'SIAL-3', codigo_reparticion: 1 }),
    ]);

    // Archivo de julio: A (sin cambios), B (cambia edad), C (nueva) — D no viene (eliminado)
    const rows = [
      rowFor({ cuil: '20111111111', nombre: 'A Persona', edad: 30, codigoCargo: 'C1', codigoRol: 'SIAL-1' }),
      rowFor({ cuil: '20222222222', nombre: 'B Persona', edad: 41, codigoCargo: 'C2', codigoRol: 'SIAL-2' }),
      rowFor({ cuil: '20444444444', nombre: 'C Persona', edad: 25, codigoCargo: 'C4', codigoRol: 'SIAL-4' }),
    ];

    const diff = await buildDiff({ manager: ds.manager, periodo: '2026-07', rows });

    expect(diff.comparisonPeriodo).toBe('2026-06');
    expect(diff.nuevos.map((n) => n.row.persona.nombre_apellido)).toEqual(['C Persona']);
    expect(diff.modificados.map((m) => m.row.persona.nombre_apellido)).toEqual(['B Persona']);
    expect(diff.sinCambios).toHaveLength(1);
    expect(diff.eliminados.map((e) => e.persona.nombre_apellido)).toEqual(['D Persona']);
  });

  it('re-cargar un período que ya tiene datos compara contra sí mismo (corrección)', async () => {
    const { Sigla, Persona, Cargo, Rol } = entities;

    // 2026-08 ya tiene un registro cargado
    await ds.getRepository(Sigla).save(sigla({ id_sigla: 2, sigla: 'HGA' }));
    await ds.getRepository(Persona).save(persona({ id_persona: 10, periodo: '2026-08', cuil: '20555555555', nombre_apellido: 'E Persona', edad: 33 }));
    await ds.getRepository(Cargo).save({ id_cargo: 10, periodo: '2026-08', codigo_cargo: 'C10' });
    await ds.getRepository(Rol).save(rol({ id_rol: 10, periodo: '2026-08', id_persona: 10, id_cargo: 10, id_sigla: 2, codigo_rol: 'SIAL-10', codigo_reparticion: 2 }));

    // Se vuelve a subir el mismo período con un dato corregido
    const rows = [
      rowFor({ cuil: '20555555555', nombre: 'E Persona', edad: 34, codigoCargo: 'C10', codigoRol: 'SIAL-10', idSigla: 2 }),
    ];

    const diff = await buildDiff({ manager: ds.manager, periodo: '2026-08', rows });

    expect(diff.comparisonPeriodo).toBe('2026-08');
    expect(diff.modificados).toHaveLength(1);
    expect(diff.nuevos).toHaveLength(0);
  });

  it('primera carga de la historia (sin período anterior) marca todo como nuevo', async () => {
    const { Sigla } = entities;
    await ds.getRepository(Sigla).save(sigla({ id_sigla: 3, sigla: 'HZ' }));
    const rows = [
      rowFor({ cuil: '20999999999', nombre: 'F Persona', edad: 22, codigoCargo: 'CZ', codigoRol: 'SIAL-Z', idSigla: 3 }),
    ];
    const diff = await buildDiff({ manager: ds.manager, periodo: '2020-01', rows });
    expect(diff.comparisonPeriodo).toBeNull();
    expect(diff.nuevos).toHaveLength(1);
  });
});
