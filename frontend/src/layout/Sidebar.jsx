import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

// -----------------------------------------------------------
// Definición de navegación
// Cada item tiene `roles` con los roles que pueden verlo.
// Si un grupo no tiene items visibles para el rol → no se muestra.
// -----------------------------------------------------------
const NAV = [
  {
    // Grupo sin label: solo el Panel
    items: [
      {
        to: '/',
        label: 'Panel',
        exact: true,
        roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      { to: '/tablas/personas', label: 'Personas',  roles: ['admin', 'editor'] },
      { to: '/tablas/cargos',   label: 'Cargos',    roles: ['admin', 'editor'] },
      { to: '/tablas/roles',    label: 'Roles',     roles: ['admin', 'editor'] },
      { to: '/tablas/siglas',   label: 'Siglas',    roles: ['admin', 'editor'] },
      { to: '/tablas/bajas',    label: 'Bajas',     roles: ['admin', 'editor'] },
    ],
  },
  {
    label: 'Gestión',
    roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
    items: [
      { to: '/hospitales', label: 'Hospitales',     roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
      { to: '/organigrama', label: 'Organigrama',   roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
      { to: '/recorridas', label: 'Recorridas',     roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
      { to: '/dotacion',   label: 'Dotación Total', roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
    ],
  },
  {
    label: 'Procesos Concursales',
    roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'],
    items: [
      { to: '/concursales/tablero',            label: 'Tablero',            roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
      { to: '/concursales/bajas',              label: 'Bajas Consolidadas', roles: ['admin', 'editor', 'concursales', 'gerencia'] },
      { to: '/concursales/seguimiento-cph',    label: 'Seguimiento CPH',    roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
      { to: '/concursales/seguimiento-ceetps', label: 'Seguimiento CEETPS', roles: ['admin', 'editor', 'viewer', 'gerencia', 'concursales'] },
      { to: '/concursales/configuracion',      label: 'Configuración',      roles: ['admin', 'editor', 'gerencia', 'concursales'] },
    ],
  },
  {
    label: 'Director',
    roles: ['director'],
    items: [
      { to: '/director', label: 'Mi Hospital', roles: ['director'] },
    ],
  },
  {
    label: 'Seguridad',
    roles: ['admin'],
    items: [
      { to: '/seguridad/auditoria', label: 'Auditoría', roles: ['admin'] },
      { to: '/seguridad/tokens',    label: 'Tokens',    roles: ['admin'] },
      { to: '/seguridad/usuarios',  label: 'Usuarios',  roles: ['admin'] },
      { to: '/seguridad/permisos',  label: 'Permisos',  roles: ['admin'] },
    ],
  },
]

// -----------------------------------------------------------
// Componente de item de navegación
// -----------------------------------------------------------
function NavItem({ to, label, icon, exact = false }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-700 text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
    </NavLink>
  )
}

// -----------------------------------------------------------
// Sidebar principal
// -----------------------------------------------------------
export default function Sidebar() {
  const { user } = useAuth()

  const role = user?.role ?? ''

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-gray-200 h-screen">
      {/* Logo / nombre del sistema */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Recursos Humanos</p>
            <p className="text-xs text-gray-400">Sistema de Salud</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((group, gi) => {
          // Filtrar items visibles para este rol
          const visibleItems = group.items.filter((item) => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          return (
            <div key={gi}>
              {/* Etiqueta del grupo (solo si tiene nombre) */}
              {group.label && (
                <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    exact={item.exact}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

    </aside>
  )
}
