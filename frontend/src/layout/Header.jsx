import React, { useState, useRef, useEffect } from 'react'
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
  '/concursales/seguimiento-cph':          'Seguimiento CPH',
  '/herramientas/dotacion-padron':          'Herramientas · Dotación',
}

const SEGURIDAD_ITEMS = [
  { to: '/seguridad/auditoria',    label: 'Auditoría' },
  { to: '/seguridad/tokens',       label: 'Tokens' },
  { to: '/seguridad/usuarios',     label: 'Usuarios' },
  { to: '/seguridad/permisos',     label: 'Permisos' },
  { to: '/seguridad/carga-masiva', label: 'Carga de Datos' },
]

const HERRAMIENTAS_ITEMS = [
  { to: '/herramientas/dotacion-padron', label: 'Dotación' },
  { to: '/herramientas/tablas-vista', label: 'Tablas Vista' },
  { to: '/herramientas/tablas-admin', label: 'Tablas Admin' },
  { to: '/herramientas/dotaneitor',   label: 'Dotaneitor' },
]

function HeaderMenu({ title, items, navigate, icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title={title}
        className={`p-1.5 rounded-lg transition-colors ${
          open ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          {items.map(item => (
            <button key={item.to} onClick={() => { navigate(item.to); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ICON_SHIELD = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const ICON_WRENCH = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

function resolveTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/hospitales/')) return 'Vista de Hospital'
  if (pathname.startsWith('/organigrama/')) return 'Organigrama · Detalle'
  if (pathname.startsWith('/pou/')) return 'POU · Detalle'
  return 'Sistema RRHH'
}

export default function Header({ onMenuClick = () => {} }) {
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
    <header className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3 min-w-0">
        {/* Botón de menú — solo visible por debajo de `lg`, donde el sidebar es un drawer */}
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg shrink-0"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Título de la ruta actual */}
        <h1 className="text-sm font-semibold text-gray-700 truncate">{title}</h1>
      </div>

      {/* Usuario + seguridad + cerrar sesión */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initial}
          </div>
          <span className="text-sm font-medium text-gray-800 hidden sm:block">{displayName}</span>
          <RoleBadge role={role} alias={roleAlias} />
        </div>
        {role === 'admin' && <HeaderMenu title="Herramientas" items={HERRAMIENTAS_ITEMS} navigate={navigate} icon={ICON_WRENCH} />}
        {role === 'admin' && <HeaderMenu title="Seguridad" items={SEGURIDAD_ITEMS} navigate={navigate} icon={ICON_SHIELD} />}
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
