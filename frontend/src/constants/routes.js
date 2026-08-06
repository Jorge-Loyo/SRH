export const ROUTES = {
  HOME:           '/',
  LOGIN:          '/login',

  // Hospitales
  HOSPITALES:     '/hospitales',
  HOSPITAL:       (code) => `/hospitales/${code}`,

  // Organigrama
  ORGANIGRAMA:    '/organigrama',
  ORGANIGRAMA_DETALLE: (code) => `/organigrama/${code}`,

  // Tablas
  PERSONAS:       '/tablas/personas',
  CARGOS:         '/tablas/cargos',
  ROLES:          '/tablas/roles',
  SIGLAS:         '/tablas/siglas',
  ALTA_CARGO:     '/cargos/alta',

  // Gestión
  RECORRIDAS:     '/recorridas',
  DOTACION:       '/dotacion',
  POU:            '/pou',
  POU_DETALLE:    (code) => `/pou/${code}`,

  // Concursales
  TABLERO:        '/concursales/tablero',
  BAJAS:          '/concursales/bajas',
  SEGUIMIENTO_CPH:    '/concursales/seguimiento-cph',
  SEGUIMIENTO_CEETPS: '/concursales/seguimiento-ceetps',
  CONFIGURACION:  '/concursales/configuracion',

  // Director
  DIRECTOR:       '/director',

  // Seguridad
  AUDITORIA:      '/seguridad/auditoria',
  TOKENS:         '/seguridad/tokens',
  USUARIOS:       '/seguridad/usuarios',
  PERMISOS:       '/seguridad/permisos',
  CARGA_MASIVA:   '/seguridad/carga-masiva',
}
