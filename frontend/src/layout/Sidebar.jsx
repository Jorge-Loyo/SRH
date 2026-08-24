import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

const NAV = [
  {
    items: [
      {
        to: '/',
        label: 'Panel',
        moduleKey: 'Panel',
        exact: true,
        roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Tablas',
    roles: ['admin', 'editor'],
    items: [
      { to: '/tablas/personas', label: 'Personas', moduleKey: 'PersonasFull', roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg> },
      { to: '/tablas/cargos',   label: 'Cargos',   moduleKey: 'CargosFull',   roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
      { to: '/tablas/roles',    label: 'Roles',    moduleKey: 'RolesFull',    roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
      { to: '/tablas/siglas',   label: 'Siglas',   moduleKey: 'SiglasFull',   roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> },
    ],
  },
  {
    label: 'Gestión',
    roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
    items: [
      { to: '/gestion/dashboard', label: 'Dashboard', moduleKey: 'DashboardGestion', roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
      { to: '/pou',         label: 'POU',            moduleKey: 'POUComparativa',  roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      { to: '/hospitales',  label: 'Hospitales',     moduleKey: 'Hospitales',      roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
      { to: '/organigrama', label: 'Organigrama',    moduleKey: 'OrganigramaHome', roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales', 'autoridades'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> },
      { to: '/recorridas',  label: 'Recorridas',     moduleKey: 'RecorridasHospitales', roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
      { to: '/dotacion',    label: 'Dotación Total', moduleKey: 'DotacionTotal',   roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales', 'autoridades'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
  {
    label: 'Concursales',
    roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
    items: [
      { to: '/concursales/tablero',            label: 'Tablero',        moduleKey: 'TableroKpis',        roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
      { to: '/cargos',          label: 'Altas',    moduleKey: 'AltasCargo',         roles: ['admin', 'editor'], end: true,
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { to: '/concursales/recientes', label: 'Recientes', moduleKey: 'AltasCargo',   roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { to: '/cargos/lista',     label: 'Cargos',   moduleKey: 'ListaCargos',        roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
      { to: '/cargos/subir',     label: 'Importar', moduleKey: 'SubirData',          roles: ['admin', 'editor'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> },
      { to: '/concursales/bajas',              label: 'Bajas',          moduleKey: 'BajasConsolidadas',  roles: ['admin', 'editor', 'concursales', 'gerencia'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
      { to: '/concursales/seguimiento-cph',    label: 'Seguim. CPH',    moduleKey: 'SeguimientoCph',     roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
      { to: '/concursales/seguimiento-ceetps', label: 'Seguim. CEETPS', moduleKey: 'SeguimientoCeetps',  roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
      { to: '/concursales/configuracion',      label: 'Configuración',  moduleKey: 'ConfiguracionConcursales', roles: ['admin', 'editor', 'gerencia', 'concursales'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
  {
    label: 'Director',
    roles: ['director'],
    items: [
      { to: '/director', label: 'Mi Hospital', roles: ['director'],
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    ],
  },
]

function NavItem({ to, label, icon, exact = false, end = false, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={exact || end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors
        ${collapsed ? 'px-0 py-2 justify-center' : 'px-3 py-2'}
        ${isActive ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
      }
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

function SidebarContent({ role, allowedModules, collapsed, setCollapsed, onNavigate, showToggle }) {
  // admin ve todo; otros roles filtran por allowedModules
  const canSee = (item) => {
    if (role === 'admin' || allowedModules === null) return item.roles.includes(role)
    if (!item.moduleKey) return item.roles.includes(role)
    return allowedModules.includes(item.moduleKey)
  }
  return (
    <>
      {/* Logo + botón toggle */}
      <div className="px-3 py-4 border-b border-gray-100 flex items-center gap-2 overflow-hidden">
        <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">Recursos Humanos</p>
            <p className="text-xs text-gray-400 truncate">Sistema de Salud</p>
          </div>
        )}
        {showToggle && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {NAV.map((group, gi) => {
          const visibleItems = group.items.filter(item => canSee(item))
          if (!visibleItems.length) return null
          return (
            <div key={gi} className="px-2">
              {group.label && !collapsed && (
                <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && gi > 0 && (
                <div className="mb-1 border-t border-gray-100 mx-1" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => (
                  <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon}
                    exact={item.exact} end={item.end} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </>
  )
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, allowedModules } = useAuth()
  const role = user?.role ?? ''
  const [collapsed, setCollapsed] = useState(true)
  const isDesktop = useIsDesktop()

  // En desktop siempre expandido
  const effectiveCollapsed = isDesktop ? false : collapsed

  return (
    <>
      {/* Backdrop — solo mobile */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Mobile drawer (< md): siempre expandido, se abre con `open` */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:hidden
      `}>
        <SidebarContent role={role} allowedModules={allowedModules} collapsed={false} setCollapsed={setCollapsed} onNavigate={onClose} showToggle={false} />
      </aside>

      {/* Tablet + desktop (md+): siempre visible, colapsable solo en tablet */}
      <aside className={`
        hidden md:flex flex-col bg-white border-r border-gray-200 shrink-0
        transition-all duration-200 ease-in-out
        ${effectiveCollapsed ? 'w-14' : 'w-60'}
      `}>
        <SidebarContent
          role={role}
          allowedModules={allowedModules}
          collapsed={effectiveCollapsed}
          setCollapsed={setCollapsed}
          onNavigate={onClose}
          showToggle={!isDesktop}
        />
      </aside>
    </>
  )
}
