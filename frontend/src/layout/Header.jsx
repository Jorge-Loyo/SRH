import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import RoleBadge from '../components/ui/RoleBadge.jsx'

// Mapeo de rutas a títulos legibles
const ROUTE_TITLES = {
  '/':                      'Panel',
  '/hospitales':            'Hospitales',
  '/organigrama':           'Organigrama',
  '/tablas/personas':       'Tabla · Personas',
  '/tablas/cargos':         'Tabla · Cargos',
  '/tablas/roles':          'Tabla · Roles',
  '/tablas/siglas':         'Tabla · Siglas',
  '/tablas/bajas':          'Tabla · Bajas',
  '/recorridas':            'Recorridas',
  '/concursos':             'Concursos',
  '/dotacion':              'Dotación Total',
  '/director':              'Mi Hospital',
  '/seguridad/auditoria':   'Seguridad · Auditoría',
  '/seguridad/tokens':      'Seguridad · Tokens',
  '/seguridad/usuarios':    'Seguridad · Usuarios',
  '/seguridad/permisos':    'Seguridad · Permisos',
  '/concursales/bajas':           'Bajas Consolidadas',
  '/concursales/seguimiento-cph': 'Seguimiento CPH',
}

function resolveTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/hospitales/')) return 'Vista de Hospital'
  if (pathname.startsWith('/organigrama/')) return 'Organigrama · Detalle'
  if (pathname.startsWith('/pou/')) return 'POU · Detalle'
  return 'Sistema RRHH'
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const title = resolveTitle(pathname)
  const role      = user?.role ?? ''
  const roleAlias = user?.role_alias ?? null
  const displayName = user?.username ?? user?.email ?? 'Usuario'
  const initial = displayName[0].toUpperCase()

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-white border-b border-gray-200">
      {/* Título de la ruta actual */}
      <h1 className="text-sm font-semibold text-gray-700">{title}</h1>

      {/* Usuario + cerrar sesión */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initial}
          </div>
          <span className="text-sm font-medium text-gray-800 hidden sm:block">{displayName}</span>
          <RoleBadge role={role} alias={roleAlias} />
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Cerrar sesión"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:block">{loggingOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
        </button>
      </div>
    </header>
  )
}
