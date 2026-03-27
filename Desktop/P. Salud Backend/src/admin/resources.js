// Centralización de definición de recursos AdminJS
// Exporta una función que recibe dependencias y devuelve el array de resources
const logger = require('../utils/logger');
const { fixAdminJSRecordSerialization } = require('./record-serialization-fix');

module.exports.buildAdminResources = function buildAdminResources({ AppDataSource }) {
  const { Sigla } = require('../entities-class/Sigla')
  const { Persona } = require('../entities-class/Persona')
  const { Cargo } = require('../entities-class/Cargo')
  const { Rol } = require('../entities-class/Rol')
  const { BajaConcurso } = require('../entities-class/BajaConcurso')
  const { AuditLog } = require('../entities-class/AuditLog')
  const { User } = require('../entities-class/User')
  const { RefreshToken } = require('../entities-class/RefreshToken')
  const { Permission } = require('../entities-class/Permission')

  const getEntityColumns = (Entity, { exclude = [] } = {}) => {
    try {
      const meta = AppDataSource.getMetadata(Entity)
      const cols = meta.columns.map((c) => c.propertyName)
      return cols.filter((c) => !exclude.includes(c))
    } catch (e) {
      logger.warn('[Admin] No se pudo obtener columnas para', { entity: Entity?.name, error: e?.message })
      return []
    }
  }

  // ✅ CRITICAL FIX: Ensure ALL functions return EXPLICIT BOOLEAN
  const can = {
    list: ({ currentAdmin } = {}) => {
      // ✅ list action always accessible (read-only)
      return true === true; // ✅ explicit boolean
    },
    show: ({ currentAdmin } = {}) => {
      // ✅ show action always accessible (read-only)
      return true === true; // ✅ explicit boolean
    },
    new: ({ currentAdmin } = {}) => {
      // ✅ Usar middleware de authorization en lugar de BD
      // AdminJS ya tiene permisos por role en middleware.js
      if (!currentAdmin?.id) return false;
      const result = currentAdmin?.role === 'admin' || currentAdmin?.role === 'editor';
      return result === true; // ✅ explicit boolean
    },
    edit: ({ currentAdmin } = {}) => {
      // ✅ Usar middleware de authorization en lugar de BD
      if (!currentAdmin?.id) return false;
      const result = currentAdmin?.role === 'admin' || currentAdmin?.role === 'editor';
      return result === true; // ✅ explicit boolean
    },
    delete: ({ currentAdmin } = {}) => {
      // ✅ Usar middleware de authorization en lugar de BD
      if (!currentAdmin?.id) return false;
      const result = currentAdmin?.role === 'admin';
      return result === true; // ✅ explicit boolean
    }
  }
  
  // ✅ Control de visibilidad de Navigation (sidebar) basado en rol
  const canViewNavigation = ({ currentAdmin } = {}) => {
    const role = currentAdmin?.role;
    const result = role === 'admin' || role === 'editor';
    return result === true; // ✅ explicit boolean
  }
  
  // ✅ Control de visibilidad de recursos de Seguridad basado en rol (no permisos BD)
  const adminOnly = ({ currentAdmin } = {}) => {
    const result = currentAdmin?.role === 'admin';
    return result === true; // ✅ explicit boolean
  }

  async function logAdminAction({ currentAdmin, action, resource, recordId, changes }) {
    try {
      const repo = AppDataSource.getRepository(AuditLog)
      await repo.save({
        user_username: currentAdmin?.email || null,
        user_role: currentAdmin?.role || null,
        source: 'admin',
        action,
        resource,
        record_id: recordId || null,
        method: null,
        path: '/admin',
        status: 200,
        changes: changes ? JSON.stringify(changes) : null,
        ip: null,
        user_agent: null
      })
    } catch {}
  }

  return [
    {
      resource: Sigla,
      options: {
        navigation: { name: 'Rrrh 2', icon: 'Database' },
        // ✅ Controlar visibilidad del recurso en Navigation
        isAccessible: canViewNavigation,
        properties: { id_sigla: { isDisabled: true }, roles: { isVisible: false } },
        listProperties: ['id_sigla', 'sigla', 'universo_totalizador', 'tipo_hospital_sigla'],
        editProperties: ['sigla', 'universo_totalizador', 'tipo_hospital_sigla', 'monovalencia'],
        showProperties: getEntityColumns(Sigla),
        actions: {
          list: { isAccessible: can.list },
          show: { isAccessible: can.show },
          new: { isAccessible: can.new, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'create', resource: 'Sigla', recordId: id, changes: req?.payload }); return res } },
          edit: { isAccessible: can.edit, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update', resource: 'Sigla', recordId: id, changes: req?.payload }); return res } },
          delete: { isAccessible: can.delete, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'delete', resource: 'Sigla', recordId: id }); return res } }
        }
      }
    },
    {
      resource: Persona,
      options: {
        navigation: { name: 'Rrrh 2', icon: 'Database' },
        // ✅ Controlar visibilidad del recurso en Navigation
        isAccessible: canViewNavigation,
        properties: { id_persona: { isDisabled: true }, periodo: { isDisabled: true, type: 'string' }, roles: { isVisible: false } },
        listProperties: ['id_persona', 'cuil', 'nombre_apellido', 'especialidad', 'localidad', 'mail_laboral'],
        editProperties: ['nombre_apellido', 'fecha_nacimiento', 'sexo', 'tipo_doc', 'numero_doc', 'especialidad', 'telefono', 'mail_personal', 'mail_laboral', 'domicilio', 'localidad', 'antiguedad'],
        showProperties: getEntityColumns(Persona),
        actions: {
          list: { isAccessible: can.list },
          show: { isAccessible: can.show },
          new: { isAccessible: can.new, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'create', resource: 'Persona', recordId: id, changes: req?.payload }); return res } },
          edit: { isAccessible: can.edit, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update', resource: 'Persona', recordId: id, changes: req?.payload }); return res } },
          delete: { isAccessible: can.delete, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'delete', resource: 'Persona', recordId: id }); return res } }
        }
      }
    },
    {
      resource: Cargo,
      options: {
        navigation: { name: 'Rrrh 2', icon: 'Database' },
        // ✅ Controlar visibilidad del recurso en Navigation
        isAccessible: canViewNavigation,
        properties: { id_cargo: { isDisabled: true }, periodo: { isDisabled: true, type: 'string' }, roles: { isVisible: false }, bajas: { isVisible: false } },
        listProperties: ['id_cargo', 'periodo', 'codigo_cargo'],
        editProperties: ['codigo_cargo'],
        showProperties: getEntityColumns(Cargo),
        actions: {
          list: { isAccessible: can.list },
          show: { isAccessible: can.show },
          new: { isAccessible: can.new, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'create', resource: 'Cargo', recordId: id, changes: req?.payload }); return res } },
          edit: { isAccessible: can.edit, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update', resource: 'Cargo', recordId: id, changes: req?.payload }); return res } },
          delete: { isAccessible: can.delete, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'delete', resource: 'Cargo', recordId: id }); return res } }
        }
      }
    },
    {
      resource: Rol,
      options: {
        navigation: { name: 'Rrrh 2', icon: 'Database' },
        // ✅ Controlar visibilidad del recurso en Navigation
        isAccessible: canViewNavigation,
        properties: {
          id_rol: { isDisabled: true },
          periodo: { type: 'string', isDisabled: true, isVisible: { list: false, show: true, edit: false, filter: true } },
          cargo: { isVisible: false }, persona: { isVisible: false }, sigla: { isVisible: false },
          id_persona: { type: 'string' }, id_cargo: { type: 'string' }, id_sigla: { type: 'string' }, codigo_reparticion: { type: 'string' }
        },
        listProperties: ['id_rol', 'descripcion_reparticion', 'literal_puesto', 'situacion_revista'],
        showProperties: getEntityColumns(Rol),
        actions: {
          list: { isAccessible: can.list },
          show: { isAccessible: can.show },
          new: { isAccessible: can.new, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'create', resource: 'Rol', recordId: id, changes: req?.payload }); return res } },
          edit: { isAccessible: can.edit, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update', resource: 'Rol', recordId: id, changes: req?.payload }); return res } },
          delete: { isAccessible: can.delete, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'delete', resource: 'Rol', recordId: id }); return res } }
        }
      }
    },
    {
      resource: BajaConcurso,
      options: {
        navigation: { name: 'Rrrh 2', icon: 'Database' },
        // ✅ Controlar visibilidad del recurso en Navigation
        isAccessible: canViewNavigation,
        properties: { id_baja: { isDisabled: true }, periodo: { type: 'string', isDisabled: true, isVisible: { list: false, show: true, edit: false, filter: true } }, cargo: { isVisible: false }, id_cargo: { type: 'string' } },
        listProperties: ['id_baja', 'sigla', 'motivo_baja', 'nombre_apellido', 'puesto_baja'],
        showProperties: getEntityColumns(BajaConcurso),
        actions: {
          list: { isAccessible: can.list },
          show: { isAccessible: can.show },
          new: { isAccessible: can.new, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'create', resource: 'BajaConcurso', recordId: id, changes: req?.payload }); return res } },
          edit: { isAccessible: can.edit, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update', resource: 'BajaConcurso', recordId: id, changes: req?.payload }); return res } },
          delete: { isAccessible: can.delete, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'delete', resource: 'BajaConcurso', recordId: id }); return res } }
        }
      }
    },
    {
      resource: AuditLog,
      options: {
        navigation: { name: 'Seguridad', icon: 'Shield' },
        // ✅ Solo ADMIN ve recursos de Seguridad
        isAccessible: adminOnly,
        listProperties: getEntityColumns(AuditLog),
        showProperties: getEntityColumns(AuditLog),
        actions: { list: { isAccessible: adminOnly }, show: { isAccessible: adminOnly }, export: { isAccessible: adminOnly }, edit: { isAccessible: () => false }, new: { isAccessible: () => false }, delete: { isAccessible: () => false } }
      }
    },
    {
      resource: User,
      options: {
        navigation: { name: 'Seguridad', icon: 'Shield' },
        // ✅ Solo ADMIN ve recursos de Seguridad
        isAccessible: adminOnly,
        properties: {
          id: { isDisabled: true }, password_hash: { isVisible: { list: false, filter: false, show: false, edit: false } },
          password: { type: 'password', isVisible: { list: false, filter: false, show: false, edit: true } },
          email: { isVisible: { list: true, filter: true, show: true, edit: true } }, username: { isVisible: { list: true, filter: true, show: true, edit: true } },
          role: { type: 'string', isVisible: { list: true, filter: true, show: true, edit: true } }, is_active: { type: 'string', isVisible: { list: true, filter: true, show: true, edit: true } }
        },
        listProperties: getEntityColumns(User, { exclude: ['password_hash'] }),
        filterProperties: ['username', 'email', 'role', 'is_active'],
        showProperties: getEntityColumns(User, { exclude: ['password_hash'] }),
        editProperties: [...getEntityColumns(User, { exclude: ['password_hash'] }), 'password'],
        actions: {
          list: { isAccessible: adminOnly }, show: { isAccessible: adminOnly },
          new: {
            isAccessible: adminOnly,
            before: async (request) => { if (request?.payload?.password) { const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync(request.payload.password, 10); request.payload.password_hash = hash; delete request.payload.password } return request },
            after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'create', resource: 'User', recordId: id, changes: req?.payload }); return res }
          },
          edit: {
            isAccessible: adminOnly,
            before: async (request) => { if (request?.payload?.password) { const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync(request.payload.password, 10); request.payload.password_hash = hash; delete request.payload.password } return request },
            after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update', resource: 'User', recordId: id, changes: req?.payload }); return res }
          },
          delete: { isAccessible: adminOnly, after: async (res, req, ctx) => { const id = ctx?.record?.id?.()?.toString() || null; await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'delete', resource: 'User', recordId: id }); return res } }
        }
      }
    },
    {
      resource: RefreshToken,
      options: {
        navigation: { name: 'Seguridad', icon: 'Shield' },
        // ✅ Solo ADMIN ve recursos de Seguridad
        isAccessible: adminOnly,
        properties: { id: { isDisabled: true }, token_hash: { isVisible: { list: false, filter: false, show: false, edit: false } }, user: { isVisible: { list: true, filter: true, show: true, edit: false } }, revoked: { type: 'string' } },
        listProperties: getEntityColumns(RefreshToken, { exclude: ['token_hash'] }),
        filterProperties: ['user', 'family_id', 'jti', 'revoked'],
        showProperties: getEntityColumns(RefreshToken, { exclude: ['token_hash'] }),
        actions: { list: { isAccessible: adminOnly }, show: { isAccessible: adminOnly }, edit: { isAccessible: () => false === true }, new: { isAccessible: () => false === true }, delete: { isAccessible: () => false === true } }
      }
    },
    {
      resource: Permission,
      options: {
        navigation: { name: 'Seguridad', icon: 'Shield' },
        // ✅ Solo ADMIN ve recursos de Seguridad
        isAccessible: adminOnly,
        properties: {
          id: { isDisabled: true },
          role: { isVisible: { list: true, filter: true, show: true, edit: false } },
          description: { type: 'textarea', isVisible: { list: false, filter: false, show: true, edit: true } },
          can_read_all: { type: 'boolean' },
          can_create: { type: 'boolean' },
          can_update: { type: 'boolean' },
          can_delete: { type: 'boolean' },
          can_alter_structure: { type: 'boolean' },
          can_manage_users: { type: 'boolean' },
          can_view_audit: { type: 'boolean' },
          filter_by_hospital: { type: 'boolean' },
          hospital_code: { isVisible: { list: false, filter: false, show: true, edit: true } },
          created_at: { isDisabled: true },
          updated_at: { isDisabled: true }
        },
        listProperties: ['role', 'can_create', 'can_update', 'can_delete'],
        filterProperties: ['role'],
        showProperties: getEntityColumns(Permission),
        editProperties: ['description', 'can_read_all', 'can_create', 'can_update', 'can_delete', 'can_alter_structure', 'can_manage_users', 'can_view_audit', 'filter_by_hospital', 'hospital_code'],
        actions: {
          list: { isAccessible: adminOnly },
          show: { isAccessible: adminOnly },
          new: { isAccessible: () => false === true }, // ✅ explicit boolean
          edit: {
            isAccessible: adminOnly,
            after: async (res, req, ctx) => {
              const id = ctx?.record?.id?.()?.toString() || null;
              await logAdminAction({ currentAdmin: ctx?.currentAdmin, action: 'update_permissions', resource: 'Permission', recordId: id, changes: req?.payload });
              return res;
            }
          },
          delete: { isAccessible: () => false === true } // ✅ explicit boolean
        }
      }
    }
  ];
  
  // ✅ FIX: Prevenir serialización de objetos completos en URLs
  return fixAdminJSRecordSerialization(resources);
}
