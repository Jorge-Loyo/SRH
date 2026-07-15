// Seed para popular la tabla permissions con los 7 roles del sistema
const { initDatabase, closeDatabase } = require('./lib/init-db');
const { Permission } = require('../src/entities-class/Permission');

async function seedPermissions() {
  try {
    console.log('🔧 Inicializando conexión...');
    
    const dataSource = await initDatabase();
    console.log('✅ Conexión establecida');

    const repo = dataSource.getRepository(Permission);

    // Limpiar tabla existente (usando DELETE con condición siempre verdadera para compatibilidad)
    // Alternativa: TRUNCATE TABLE, pero requiere permisos específicos
    await dataSource.query('DELETE FROM permissions WHERE 1=1');
    console.log('🗑️  Tabla permissions limpiada');

    // Definir permisos por rol
    const permissions = [
      {
        role: 'admin',
        description: 'Administrador (DBA) - Acceso total al sistema',
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
        description: 'Editor - Manipulación de datos sin cambiar estructura',
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
        description: 'Viewer - Solo lectura sin modificaciones',
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
        description: 'Director de Hospital - Solo lectura de su hospital',
        can_read_all: true,  // Lectura habilitada pero filtrada por hospital
        can_create: false,
        can_update: false,
        can_delete: false,
        can_alter_structure: false,
        can_manage_users: false,
        can_view_audit: false,
        filter_by_hospital: true,  // ✅ Filtrado obligatorio por hospital
        hospital_code: null,       // Se toma del user.hospital_code en runtime
      },
      {
        role: 'gerencia',
        description: 'Lectura general + CRUD completo en Recorridas y Minutas',
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
        role: 'concursales',
        description: 'Gestión de procesos concursales CEETPS (códigos 87, 85, 83)',
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
        role: 'autoridades',
        description: 'Lectura de Organigramas y Dotación Total (todos los hospitales)',
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
    ];

    // Insertar permisos
    for (const perm of permissions) {
      await repo.save(perm);
      console.log(`✅ Permiso creado: ${perm.role}`);
    }

    await closeDatabase(dataSource);
    console.log('✅ Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seedPermissions();
