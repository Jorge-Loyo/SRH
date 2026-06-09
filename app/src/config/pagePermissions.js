/**
 * Configuración centralizada de permisos por página/rol
 * Single source of truth para acceso a páginas personalizadas
 * 
 * IMPORTANTE: 
 * - Este archivo se usa en: middleware.js, config.js y componentes frontend
 * - Al agregar una página nueva, solo actualizar aquí
 * - Las páginas listadas aquí deben existir en config.js
 */

const PAGE_PERMISSIONS = {
  // ADMIN: Acceso total a todas las páginas
  admin: [
    // Panel y estructura
    'Panel',
    'Hospitales',
    'OrganizacionTabla',
    'TablaAmpliada',
    'OrganigramaHome',
    'OrganigramaDetalle',
    
    // Tablas BD
    'PersonasFull',
    'CargosFull',
    'RolesFull',
    'SiglasFull',
    'BajasFull',
    
    // Recorridas
    'RecorridasHospitales',
    'RecorridasDetalle',
    
    // Dotación Total
    'DotacionTotal',
    
    // POU
    'POUDetalle',
    
    // Seguridad (solo admin)
    'Auditoria',
    'Tokens',
    'Usuarios',
    'Permisos',
  ],
  
  // EDITOR: Puede ver estructura, tablas BD, recorridas, pero NO seguridad
  editor: [
    'Panel',
    'Hospitales',
    'OrganizacionTabla',
    'TablaAmpliada',
    'OrganigramaHome',
    'OrganigramaDetalle',
    'PersonasFull',
    'CargosFull',
    'RolesFull',
    'SiglasFull',
    'BajasFull',
    'RecorridasHospitales',
    'RecorridasDetalle',
    'DotacionTotal',
    'POUDetalle',
  ],
  
  // VIEWER: Puede ver estructura, organigrama, recorridas (solo lectura)
  viewer: [
    'Hospitales',
    'OrganizacionTabla',
    'TablaAmpliada',
    'OrganigramaHome',
    'OrganigramaDetalle',
    'Panel',
    'RecorridasHospitales',
    'RecorridasDetalle',
    'DotacionTotal',
    'POUDetalle',
  ],
  
  // DIRECTOR: Solo su página personalizada y organigrama
  director: [
    'Director',
    'OrganigramaHome',
    'OrganigramaDetalle',
    'OrganizacionTabla',
    'TablaAmpliada',
  ],

  // CONCURSALES: Gestión de procesos CEETPS + lectura del módulo de gestión
  concursales: [
    'Panel',
    'Hospitales',
    'OrganizacionTabla',
    'TablaAmpliada',
    'OrganigramaHome',
    'OrganigramaDetalle',
    'RecorridasHospitales',
    'RecorridasDetalle',
    'DotacionTotal',
    'POUDetalle',
    // Módulo concursales
    'BajasConsolidadas',
    'SeguimientoCph',
    'SeguimientoCeetps',
    'TableroKpis',
  ],

  // GERENCIA: Igual que viewer + CRUD completo en recorridas y minutas
  gerencia: [
    'Hospitales',
    'OrganizacionTabla',
    'TablaAmpliada',
    'OrganigramaHome',
    'OrganigramaDetalle',
    'Panel',
    'RecorridasHospitales',
    'RecorridasDetalle',
    'DotacionTotal',
    'POUDetalle',
  ],
};

/**
 * Verifica si un rol tiene acceso a una página específica
 * @param {string} role - Rol del usuario (admin, editor, viewer, director)
 * @param {string} pageName - Nombre de la página (sin /pages/ prefix)
 * @returns {boolean} true si tiene acceso, false si no
 */
function canAccessPage(role, pageName) {
  if (!role || !pageName) return false;
  
  // Admin siempre tiene acceso
  if (role === 'admin') return true;
  
  const allowedPages = PAGE_PERMISSIONS[role] || [];
  return allowedPages.includes(pageName);
}

/**
 * Obtiene todas las páginas permitidas para un rol
 * @param {string} role - Rol del usuario
 * @returns {string[]} Array de nombres de páginas
 */
function getAllowedPages(role) {
  if (!role) return [];
  return PAGE_PERMISSIONS[role] || [];
}

/**
 * Helper para verificar acceso a tablas BD (PersonasFull, CargosFull, etc.)
 * Solo ADMIN y EDITOR pueden ver tablas BD completas
 * @param {Object} context - Contexto con currentAdmin
 * @returns {boolean} true si tiene acceso a tablas BD
 */
function canViewTablePages({ currentAdmin } = {}) {
  if (!currentAdmin) return false;
  return currentAdmin.role === 'admin' || currentAdmin.role === 'editor';
}

/**
 * Helper para verificar acceso a páginas de estructura (Recorridas, Concursos, etc.)
 * ADMIN, EDITOR y VIEWER pueden verlas, pero NO DIRECTOR
 * @param {Object} context - Contexto con currentAdmin
 * @returns {boolean} true si tiene acceso a páginas de estructura
 */
function canViewStructurePages({ currentAdmin } = {}) {
  if (!currentAdmin) return false;
  const role = currentAdmin.role;
  // Admin, Editor, Viewer, Gerencia SÍ; Director NO
  return role === 'admin' || role === 'editor' || role === 'viewer' || role === 'gerencia';
}

module.exports = {
  PAGE_PERMISSIONS,
  canAccessPage,
  getAllowedPages,
  canViewTablePages,
  canViewStructurePages,
};
