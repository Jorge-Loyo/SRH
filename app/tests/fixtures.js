async function seed(ds, { Sigla, Persona, Cargo, Rol, Permission }) {
  const siglaRepo = ds.getRepository(Sigla);
  const personaRepo = ds.getRepository(Persona);
  const cargoRepo = ds.getRepository(Cargo);
  const rolRepo = ds.getRepository(Rol);
  const permRepo = ds.getRepository(Permission);

  // Seed permissions for all roles
  await permRepo.save([
    {
      role: 'admin',
      description: 'Administrador - Acceso total',
      can_read_all: true,
      can_create: true,
      can_update: true,
      can_delete: true,
      can_alter_structure: true,
      can_manage_users: true,
      can_view_audit: true,
      filter_by_hospital: false,
      hospital_code: null,
    },
    {
      role: 'editor',
      description: 'Editor - Manipulación de datos',
      can_read_all: true,
      can_create: true,
      can_update: true,
      can_delete: true,
      can_alter_structure: false,
      can_manage_users: false,
      can_view_audit: false,
      filter_by_hospital: false,
      hospital_code: null,
    },
    {
      role: 'viewer',
      description: 'Visualizador - Solo lectura',
      can_read_all: true,
      can_create: false,
      can_update: false,
      can_delete: false,
      can_alter_structure: false,
      can_manage_users: false,
      can_view_audit: false,
      filter_by_hospital: false,
      hospital_code: null,
    },
    {
      role: 'director',
      description: 'Director - Visualización filtrada',
      can_read_all: true,
      can_create: false,
      can_update: false,
      can_delete: false,
      can_alter_structure: false,
      can_manage_users: false,
      can_view_audit: false,
      filter_by_hospital: true,
      hospital_code: null,
    },
  ]);

  const sigla = await siglaRepo.save({ id_sigla: 1, sigla: 'HR', universo_totalizador: 'RRHH', tipo_hospital_sigla: 'General' });
  const persona = await personaRepo.save({ id_persona: 1, periodo: '2024-01', cuil: '20300123459', nombre_apellido: 'Juan Perez', edad: 30, tipo_doc: 'DNI', numero_doc: '30012345' });
  const cargo = await cargoRepo.save({ id_cargo: 1, periodo: '2024-01', codigo_cargo: 'C-001' });

  const rol = await rolRepo.save({
    id_rol: 1,
    periodo: '2024-01',
    id_cargo: cargo.id_cargo,
    id_persona: persona.id_persona,
    id_sigla: sigla.id_sigla,
    codigo_reparticion: 100,
    descripcion_reparticion: 'RRHH',
    escalafon: 'E1',
    literal_codigo_registro: 'REG-1',
    situacion_revista: 'ACTIVO',
    literal_puesto: 'Analista',
    unificador_puesto: 'AN-01',
    agrupador: 'ADM',
  });

  return { sigla, persona, cargo, rol };
}

module.exports = { seed };
