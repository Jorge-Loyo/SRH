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
export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    // El usuario está autenticado pero no tiene el rol necesario.
    // Director va a su dashboard propio para evitar loop infinito en "/"
    const fallback = user.role === 'director' ? '/director' : '/'
    return <Navigate to={fallback} replace />
  }

  return children
}
