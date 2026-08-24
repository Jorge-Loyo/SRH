import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiFetch } from '../api/client.js'

const PENDIENTE_KEY = 'dotaneitor_pendiente_validacion'

const SEGURIDAD_ITEMS = [
  { to: '/seguridad/validacion',   label: 'Validación' },
  { to: '/seguridad/auditoria',    label: 'Auditoría' },
  { to: '/seguridad/tokens',       label: 'Tokens' },
  { to: '/seguridad/usuarios',     label: 'Usuarios' },
  { to: '/seguridad/permisos',     label: 'Permisos' },
  { to: '/seguridad/carga-masiva', label: 'Carga de Datos' },
]

const HERRAMIENTAS_ITEMS = [
  { to: '/herramientas/dotacion-padron', label: 'Dotación' },
  { to: '/herramientas/tablas-vista',    label: 'Tablas Vista' },
  { to: '/herramientas/tablas-admin',    label: 'Tablas Admin' },
  { to: '/herramientas/dotaneitor',      label: 'Dotaneitor' },
  { to: '/cargos/kpis',                  label: 'KPIs Dotación' },
]

const DESCARGABLES = [
  {
    id: 'catalogo-cargos',
    label: 'Catálogo de Cargos',
    url: '/api/herramientas/descargables/catalogo-cargos',
    filename: 'catalogo-cargos.xlsx',
  },
]

const ROLE_LABELS = {
  admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador',
  director: 'Director', gerencia: 'Gerencia', concursales: 'Concursales',
}

function DropdownMenu({ items, navigate, title, onClose, hayPendiente }) {
  return (
    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
      <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      {items.map(item => (
        <button key={item.to} onClick={() => { navigate(item.to); onClose() }}
          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between">
          {item.label}
          {item.to === '/seguridad/validacion' && hayPendiente && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          )}
        </button>
      ))}
    </div>
  )
}

function IconButton({ icon, title, active, onClick }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}>
      {icon}
    </button>
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

const ICON_OBRAS = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const ICON_PANEL = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const ICON_DOWNLOAD = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return { open, setOpen, ref }
}

export default function Header({ onMenuClick = () => {} }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const tools    = useDropdown()
  const sec      = useDropdown()
  const profile  = useDropdown()
  const downloads = useDropdown()

  const [downloading, setDownloading] = useState(null)

  async function handleDownload(item) {
    if (downloading) return
    setDownloading(item.id)
    downloads.setOpen(false)
    try {
      const res = await apiFetch(item.url)
      if (!res.ok) throw new Error('Error al descargar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
    }
  }

  const hayPendiente = !!localStorage.getItem(PENDIENTE_KEY)

  const role        = user?.role ?? ''
  const roleAlias   = user?.role_alias ?? null
  const displayName = user?.username ?? user?.email ?? 'Usuario'
  const initial     = displayName[0].toUpperCase()
  const roleLabel   = roleAlias || ROLE_LABELS[role] || role

  async function handleLogout() {
    setLoggingOut(true)
    profile.setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-12 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 bg-white border-b border-gray-100">

      {/* Izquierda: hamburger + título */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick}
          className="lg:hidden -ml-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
          aria-label="Abrir menú">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-500 truncate">
          {pathname === '/' ? 'Panel' : pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ')}
        </span>
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-1">

        {/* Obras */}
        <IconButton icon={ICON_OBRAS} title="Obras" active={false}
          onClick={() => { window.location.href = '/obras.html' }} />

        {/* Landing */}
        <IconButton icon={ICON_PANEL} title="Portal" active={false}
          onClick={() => { window.location.href = '/landing.html' }} />

        {/* Herramientas */}
        {role === 'admin' && (
          <div ref={tools.ref} className="relative">
            <IconButton icon={ICON_WRENCH} title="Herramientas" active={tools.open}
              onClick={() => { tools.setOpen(v => !v); sec.setOpen(false); profile.setOpen(false); downloads.setOpen(false) }} />
            {tools.open && <DropdownMenu items={HERRAMIENTAS_ITEMS} navigate={navigate} title="Herramientas" onClose={() => tools.setOpen(false)} />}
          </div>
        )}

        {/* Descargables */}
        {role === 'admin' && (
          <div ref={downloads.ref} className="relative">
            <IconButton icon={ICON_DOWNLOAD} title="Descargables" active={downloads.open}
              onClick={() => { downloads.setOpen(v => !v); tools.setOpen(false); sec.setOpen(false); profile.setOpen(false) }} />
            {downloads.open && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Descargables</p>
                {DESCARGABLES.map(item => (
                  <button key={item.id} onClick={() => handleDownload(item)}
                    disabled={!!downloading}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                    <svg className="w-3.5 h-3.5 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {downloading === item.id ? 'Descargando...' : item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Seguridad */}
        {role === 'admin' && (
          <div ref={sec.ref} className="relative">
            <button onClick={() => { sec.setOpen(v => !v); tools.setOpen(false); profile.setOpen(false); downloads.setOpen(false) }}
              title="Seguridad"
              className={`relative p-1.5 rounded-lg transition-colors ${
                sec.open ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}>
              {ICON_SHIELD}
              {hayPendiente && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
              )}
            </button>
            {sec.open && <DropdownMenu items={SEGURIDAD_ITEMS} navigate={navigate} title="Seguridad" onClose={() => sec.setOpen(false)} hayPendiente={hayPendiente} />}
          </div>
        )}

        {/* Separador */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Avatar / perfil */}
        <div ref={profile.ref} className="relative">
          <button
            onClick={() => { profile.setOpen(v => !v); tools.setOpen(false); sec.setOpen(false); downloads.setOpen(false) }}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              profile.open
                ? 'bg-primary-600 text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}>
            {initial}
          </button>

          {profile.open && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
              {/* Info usuario */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{roleLabel}</p>
                  </div>
                </div>
              </div>
              {/* Cerrar sesión */}
              <div className="py-1">
                <button onClick={handleLogout} disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
