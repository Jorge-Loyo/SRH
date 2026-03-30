const { AppDataSource } = require('../config/data-source');
const { toCsvBase64 } = require('../utils/csv');
const { canAccessPage, canViewTablePages, canViewStructurePages } = require('../config/pagePermissions');

/**
 * Builds AdminJS options configuration
 * @param {Object} options - Configuration options
 * @param {Object} options.AdminJS - AdminJS class
 * @param {Object} options.adminResources - Resources configuration
 * @param {Object|null} options.dashboardConf - Dashboard configuration
 * @returns {Object} AdminJS options
 */
function buildAdminOptions({ AdminJS, adminResources, dashboardConf }) {
  const { getAdminPageHandlers } = require('./pages');

  const adminOptions = {
    rootPath: '/admin',
    resources: adminResources,
    // Branding sin referencias a AdminJS (solo visual)
    branding: {
      companyName: 'Sistema de Salud',
      logo: '/admin-static/logo.png', // Home y panel usan logo.png
      favicon: '/admin-static/favicon.svg',
      softwareBrothers: false, // oculta "Made with ..."
      withMadeWithLove: false,
    },
    // Cargar CSS adicional para el panel (no afecta el login custom HTML)
    assets: {
      styles: ['/admin-static/admin.css'],
      // ✅ FIX: AdminJS v6 tiene problemas con objetos en scripts array
      // Cambiado a string directamente en lugar de objeto con src
      scripts: [
        'data:text/javascript;base64,' + Buffer.from(`
          // OPTIMIZACIÓN: Sincronizar role en sessionStorage para evitar FOWC (Flash of Unwanted Content)
          // UserInfo.jsx restaura la clase de rol desde sessionStorage ANTES de que React renderice
          // Esto elimina el flash del sidebar durante los primeros milisegundos
          (function() {
            fetch('/admin/me', { credentials: 'include' })
              .then(r => r.json())
              .then(data => {
                const role = data?.currentAdmin?.role;
                if (role && ['admin', 'editor', 'director', 'viewer'].includes(role)) {
                  sessionStorage.setItem('admin_user_role', role + '-role');
                }
              })
              .catch(() => {
                // Silencioso en caso de error (fallback a UserInfo.jsx)
              });
          })();
        `).toString('base64')
      ],
    },
    // Localización básica al español (solo textos genéricos)
    locale: {
      language: 'es',
      translations: {
        labels: {
          Login: 'Acceso',
        },
        buttons: {
          login: 'Ingresar',
          logout: 'Salir',
        },
        messages: {
          loginWelcome: 'Bienvenido',
        },
      },
    },
  };

  // 🔴 CRÍTICO: AdminJS panel NO puede ser público en producción
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_PUBLIC === 'true') {
    throw new Error('❌ PROHIBIDO: ADMIN_PUBLIC=true en producción. Panel debe ser privado siempre.');
  }

  if (dashboardConf) {
    adminOptions.dashboard = dashboardConf;
    
    // ✅ CRITICAL FIX: Helpers para control de acceso a páginas usando configuración centralizada
    const createAccessHelper = (pageName) => {
      return ({ currentAdmin } = {}) => {
        const hasAccess = canAccessPage(currentAdmin?.role, pageName);
        return hasAccess === true; // ✅ explicit boolean
      };
    };
    
    const isDirector = ({ currentAdmin } = {}) => {
      const result = currentAdmin?.role === 'director';
      return result === true;
    };
    
    const canViewOrganigramaPages = ({ currentAdmin } = {}) => {
      // Todos los roles autenticados pueden ver Organigrama
      return true === true;
    };
    
    // Páginas personalizadas con componentes JSX existentes
    adminOptions.pages = {
      Director: {
        label: 'Inicio Director',
        component: AdminJS.bundle('../components/vista_director/DirectorHome.jsx'),
        // ✅ Solo DIRECTOR ve esta página
        isAccessible: isDirector,
      },
      Hospitales: {
        label: 'Hospitales',
        component: AdminJS.bundle('../components/vista_hospitales/hospitales.jsx'),
        isAccessible: createAccessHelper('Hospitales'),
      },
      OrganigramaHome: {
        label: 'Organigrama',
        component: AdminJS.bundle('../components/vista_organigrama/OrganigramaHome.jsx'),
        // ✅ Todos pueden ver Organigrama (DIRECTOR incluido)
        isAccessible: canViewOrganigramaPages,
      },
      OrganigramaDetalle: {
        label: 'Detalle de Organigrama',
        component: AdminJS.bundle('../components/vista_organigrama/OrganigramaDetalle.jsx'),
        // ✅ Todos pueden ver detalle de Organigrama
        isAccessible: canViewOrganigramaPages,
      },
      OrganizacionTabla: {
        label: 'Tabla de Organización',
        component: AdminJS.bundle('../components/vista_hospitales/organizacion-tabla.jsx'),
        handler: async (req) => {
          try {
            const { handleOrganizacionTabla } = require('../hospitals/pages');
            const result = await handleOrganizacionTabla({ AppDataSource, req });
            if (result && typeof result === 'object' && !Array.isArray(result)) {
              return result;
            }
            return { columns: [], rows: [], total: 0 };
          } catch (e) {
            return { columns: [], rows: [], total: 0 };
          }
        },
        // ✅ Todos pueden ver Dotación (DIRECTOR incluido)
        isAccessible: canViewOrganigramaPages,
      },
      PersonasFull: {
        label: 'Personas (completo)',
        component: AdminJS.bundle('../components/tablas_full/personas-full-new.jsx'),
        handler: async (req) => {
          try {
            const { personasFullGeneric } = getAdminPageHandlers({ AppDataSource, toCsvBase64 });
            return await personasFullGeneric(req);
          } catch (e) {
            return { columns: [], rows: [], total: 0 };
          }
        },
        // ✅ Solo ADMIN y EDITOR ven tablas BD
        isAccessible: canViewTablePages,
      },
      CargosFull: {
        label: 'Cargos (completo)',
        component: AdminJS.bundle('../components/tablas_full/cargos-full-new.jsx'),
        handler: async (req) => {
          try {
            const { cargosFullGeneric } = getAdminPageHandlers({ AppDataSource, toCsvBase64 });
            return await cargosFullGeneric(req);
          } catch (e) {
            return { columns: [], rows: [], total: 0 };
          }
        },
        // ✅ Solo ADMIN y EDITOR ven tablas BD
        isAccessible: canViewTablePages,
      },
      RolesFull: {
        label: 'Roles (completo)',
        component: AdminJS.bundle('../components/tablas_full/roles-full-new.jsx'),
        handler: async (req) => {
          try {
            const { rolesFullGeneric } = getAdminPageHandlers({ AppDataSource, toCsvBase64 });
            return await rolesFullGeneric(req);
          } catch (e) {
            return { columns: [], rows: [], total: 0 };
          }
        },
        // ✅ Solo ADMIN y EDITOR ven tablas BD
        isAccessible: canViewTablePages,
      },
      SiglasFull: {
        label: 'Siglas (completo)',
        component: AdminJS.bundle('../components/tablas_full/siglas-full-new.jsx'),
        handler: async (req) => {
          try {
            const { siglasFullGeneric } = getAdminPageHandlers({ AppDataSource, toCsvBase64 });
            return await siglasFullGeneric(req);
          } catch (e) {
            return { columns: [], rows: [], total: 0 };
          }
        },
        // ✅ Solo ADMIN y EDITOR ven tablas BD
        isAccessible: canViewTablePages,
      },
      BajasFull: {
        label: 'Bajas (completo)',
        component: AdminJS.bundle('../components/tablas_full/bajas-full-new.jsx'),
        handler: async (req) => {
          try {
            const { bajasFullGeneric } = getAdminPageHandlers({ AppDataSource, toCsvBase64 });
            return await bajasFullGeneric(req);
          } catch (e) {
            return { columns: [], rows: [], total: 0 };
          }
        },
        // ✅ Solo ADMIN y EDITOR ven tablas BD
        isAccessible: canViewTablePages,
      },

      
      // ============ SEGURIDAD (solo ADMIN) ============
      Auditoria: {
        label: 'Auditoría',
        component: AdminJS.bundle('../components/vista_seguridad/AuditoriaPage.jsx'),
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
      },
      Tokens: {
        label: 'Tokens',
        component: AdminJS.bundle('../components/vista_seguridad/TokensPage.jsx'),
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
      },
      Usuarios: {
        label: 'Usuarios',
        component: AdminJS.bundle('../components/vista_seguridad/UsuariosPage.jsx'),
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
      },
      Permisos: {
        label: 'Permisos',
        component: AdminJS.bundle('../components/vista_seguridad/PermisosPage.jsx'),
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'admin',
      },
      
      // ============ RECORRIDAS (ADMIN, EDITOR, VIEWER - NO DIRECTOR) ============
      RecorridasHospitales: {
        label: 'Recorridas',
        component: AdminJS.bundle('../components/vista_recorrida/RecorridasHospitales.jsx'),
        isAccessible: canViewStructurePages, // Admin, Editor, Viewer (NO Director)
      },
      RecorridasDetalle: {
        label: 'Detalle de Recorridas',
        component: AdminJS.bundle('../components/vista_recorrida/RecorridasDetalle.jsx'),
        isAccessible: canViewStructurePages, // Admin, Editor, Viewer (NO Director)
      },
      HospitalesConcursos: {
        label: 'Concursos',
        component: AdminJS.bundle('../components/vista_concursos/HospitalesConcursos.jsx'),
        isAccessible: canViewStructurePages, // Admin, Editor, Viewer (NO Director)
      },
      TablonConcursos: {
        label: 'Detalle de Concursos',
        component: AdminJS.bundle('../components/vista_concursos/TablonConcursos.jsx'),
        isAccessible: canViewStructurePages, // Admin, Editor, Viewer (NO Director)
      },
    };
  }

  return adminOptions;
}

module.exports = { buildAdminOptions };
