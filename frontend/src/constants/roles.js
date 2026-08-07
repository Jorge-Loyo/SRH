export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  GERENCIA: 'gerencia',
  CONCURSALES: 'concursales',
  DIRECTOR: 'director',
  AUTORIDADES: 'autoridades',
}

export const ALL_ROLES        = Object.values(ROLES)
export const NO_DIRECTOR      = [ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER, ROLES.GERENCIA, ROLES.CONCURSALES]
export const EDIT_ROLES       = [ROLES.ADMIN, ROLES.EDITOR]
export const GESTION_ROLES    = [ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER, ROLES.GERENCIA, ROLES.CONCURSALES]
export const ADMIN_ONLY       = [ROLES.ADMIN]
export const DIRECTOR_ONLY    = [ROLES.DIRECTOR]
export const BAJAS_ROLES      = [ROLES.ADMIN, ROLES.EDITOR, ROLES.CONCURSALES, ROLES.GERENCIA]
