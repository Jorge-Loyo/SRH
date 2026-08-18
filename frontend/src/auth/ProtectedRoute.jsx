import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import LoadingScreen from '../components/ui/LoadingScreen.jsx'

/**
 * Protege una ruta:
 * - Mientras carga la sesión → pantalla de carga
 * - Sin usuario → redirige a /login
 * - Con usuario pero sin rol requerido → redirige a /
 * - OK → renderiza children
 *
 * Props:
 *   roles?: string[]  — roles permitidos. Si se omite, cualquier usuario autenticado pasa.
 */
export function ProtectedRoute({ children, roles, moduleKey }) {
  const { user, loading, allowedModules } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Verificar acceso: por rol hardcodeado O por moduleKey en allowedModules
  const hasRoleAccess = !roles || roles.includes(user.role)
  const hasModuleAccess = !moduleKey || user.role === 'admin' || allowedModules === null
    || (Array.isArray(allowedModules) && allowedModules.includes(moduleKey))

  if (!hasRoleAccess && !hasModuleAccess) {
    const fallback = user.role === 'director' ? '/director'
      : user.role === 'autoridades' ? '/organigrama'
      : '/'
    return <Navigate to={fallback} replace />
  }

  // Si tiene acceso por moduleKey pero no por rol, igual pasa
  if (!hasRoleAccess && hasModuleAccess && moduleKey) return children

  if (!hasRoleAccess) {
    const fallback = user.role === 'director' ? '/director'
      : user.role === 'autoridades' ? '/organigrama'
      : '/'
    return <Navigate to={fallback} replace />
  }

  return children
}
