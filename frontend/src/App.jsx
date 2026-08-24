import React, { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import AppLayout from './layout/AppLayout.jsx'
import LoadingScreen from './components/ui/LoadingScreen.jsx'
import ErrorBoundary, { CHUNK_RELOAD_FLAG } from './components/ui/ErrorBoundary.jsx'

// Páginas cargadas con lazy load para mejor performance
const LoginPage     = lazy(() => import('./pages/LoginPage.jsx'))
const HomePage      = lazy(() => import('./pages/panel/HomePage.jsx'))

// Hospitales
const HospitalesPage        = lazy(() => import('./pages/hospitales/HospitalesPage.jsx'))
const OrganizacionTablaPage = lazy(() => import('./pages/hospitales/OrganizacionTablaPage.jsx'))
const POUPage               = lazy(() => import('./pages/hospitales/POUPage.jsx'))
const POUComparativaPage    = lazy(() => import('./pages/hospitales/POUComparativaPage.jsx'))

// Organigrama
const OrganigramaHomePage    = lazy(() => import('./pages/organigrama/OrganigramaHomePage.jsx'))
const OrganigramaDetallePage = lazy(() => import('./pages/organigrama/OrganigramaDetallePage.jsx'))
const OrganigramaSeccionPage = lazy(() => import('./pages/organigrama/OrganigramaSeccionPage.jsx'))

// Tablas
const TablaPersonasPage = lazy(() => import('./pages/tablas/TablaPersonasPage.jsx'))
const TablaCargosPage   = lazy(() => import('./pages/tablas/TablaCargosPage.jsx'))
const TablaRolesPage    = lazy(() => import('./pages/tablas/TablaRolesPage.jsx'))
const TablaSiglasPage   = lazy(() => import('./pages/tablas/TablaSiglasPage.jsx'))

const DashboardGestionPage = lazy(() => import('./pages/gestion/DashboardGestionPage.jsx'))

// Gestión
const RecorridasPage    = lazy(() => import('./pages/recorridas/RecorridasPage.jsx'))
const DotacionTotalPage = lazy(() => import('./pages/dotacion/DotacionTotalPage.jsx'))

// Concursales
const BajasConsolidadasPage    = lazy(() => import('./pages/concursales/BajasConsolidadasPage.jsx'))
const SeguimientoCphPage       = lazy(() => import('./pages/concursales/SeguimientoCphPage.jsx'))
const SeguimientoCeetpsPage    = lazy(() => import('./pages/concursales/SeguimientoCeetpsPage.jsx'))
const TableroPage              = lazy(() => import('./pages/concursales/TableroPage.jsx'))
const ConfiguracionPage        = lazy(() => import('./pages/concursales/ConfiguracionPage.jsx'))
const RecientesAltasPage       = lazy(() => import('./pages/concursales/RecientesAltasPage.jsx'))

// Director
const DirectorHomePage = lazy(() => import('./pages/director/DirectorHomePage.jsx'))

// Cargos
const CargosPage      = lazy(() => import('./pages/cargos/CargosPage.jsx'))
const AltaCargoPage   = lazy(() => import('./pages/cargos/AltaCargoPage.jsx'))
const ListaCargosPage   = lazy(() => import('./pages/cargos/ListaCargosPage.jsx'))
const DotacionKpisPage  = lazy(() => import('./pages/cargos/DotacionKpisPage.jsx'))
const SubirDataPage     = lazy(() => import('./pages/cargos/SubirDataPage.jsx'))

// Seguridad
const AuditoriaPage = lazy(() => import('./pages/seguridad/AuditoriaPage.jsx'))
const TokensPage    = lazy(() => import('./pages/seguridad/TokensPage.jsx'))
const UsuariosPage  = lazy(() => import('./pages/seguridad/UsuariosPage.jsx'))
const PermisosPage  = lazy(() => import('./pages/seguridad/PermisosPage.jsx'))
const RolesPage     = lazy(() => import('./pages/seguridad/RolesPage.jsx'))
const CargaMasivaPage = lazy(() => import('./pages/seguridad/CargaMasivaPage.jsx'))
const ValidacionDotaneitorPage = lazy(() => import('./pages/seguridad/ValidacionDotaneitorPage.jsx'))

// Herramientas
const TablasVistaPage  = lazy(() => import('./pages/herramientas/TablasVistaPage.jsx'))
const TablasAdminPage  = lazy(() => import('./pages/herramientas/TablasAdminPage.jsx'))
const DotaneitorPage   = lazy(() => import('./pages/herramientas/DotaneitorPage.jsx'))
const DotacionPadronPage = lazy(() => import('./pages/herramientas/DotacionPadronPage.jsx'))

// Roles permitidos por sección
const ALL_ROLES              = ['admin', 'editor', 'viewer', 'director', 'gerencia', 'concursales']
const NO_DIRECTOR            = ['admin', 'editor', 'viewer', 'gerencia', 'concursales']
const EDIT_ROLES             = ['admin', 'editor']
const GESTION_ROLES          = ['admin', 'editor', 'viewer', 'gerencia', 'concursales']
const POU_ROLES              = ['admin', 'editor', 'viewer', 'gerencia', 'concursales']
const BAJAS_CONSOLIDADAS_ROLES = ['admin', 'editor', 'concursales', 'gerencia']
const ADMIN_ONLY             = ['admin']
const DIRECTOR_ONLY          = ['director']

export default function App() {
  // Si la app está varios segundos arriba sin errores, se rearma el freno
  // anti-loop de recarga automática (ver ErrorBoundary) para que un futuro
  // fallo de chunk en esta misma pestaña también se recupere solo.
  useEffect(() => {
    const t = setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_FLAG), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Pública */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protegidas: todas dentro del layout con sidebar */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route index element={
                  <ProtectedRoute roles={NO_DIRECTOR}><HomePage /></ProtectedRoute>
                } />

                {/* Hospitales — director NO ve el selector global, sí el detalle de su hospital */}
                <Route path="hospitales" element={
                  <ProtectedRoute roles={NO_DIRECTOR}><HospitalesPage /></ProtectedRoute>
                } />
                <Route path="hospitales/:code" element={
                  <ProtectedRoute roles={ALL_ROLES}><OrganizacionTablaPage /></ProtectedRoute>
                } />

                {/* Organigrama — director SÍ puede verlo */}
                <Route path="organigrama" element={
                  <ProtectedRoute roles={[...ALL_ROLES, 'autoridades']}><OrganigramaHomePage /></ProtectedRoute>
                } />
                <Route path="organigrama/nivel-central" element={
                  <ProtectedRoute roles={[...ALL_ROLES, 'autoridades']}><OrganigramaSeccionPage seccion="nivel-central" /></ProtectedRoute>
                } />
                <Route path="organigrama/atencion-primaria" element={
                  <ProtectedRoute roles={[...ALL_ROLES, 'autoridades']}><OrganigramaSeccionPage seccion="atencion-primaria" /></ProtectedRoute>
                } />
                <Route path="organigrama/:code" element={
                  <ProtectedRoute roles={[...ALL_ROLES, 'autoridades']}><OrganigramaDetallePage /></ProtectedRoute>
                } />

                {/* Tablas full */}
                <Route path="tablas/personas" element={
                  <ProtectedRoute roles={EDIT_ROLES}><TablaPersonasPage /></ProtectedRoute>
                } />
                <Route path="tablas/cargos" element={
                  <ProtectedRoute roles={EDIT_ROLES}><TablaCargosPage /></ProtectedRoute>
                } />
                <Route path="tablas/roles" element={
                  <ProtectedRoute roles={EDIT_ROLES}><TablaRolesPage /></ProtectedRoute>
                } />
                <Route path="tablas/siglas" element={
                  <ProtectedRoute roles={EDIT_ROLES}><TablaSiglasPage /></ProtectedRoute>
                } />

                {/* Gestión */}
                <Route path="gestion/dashboard" element={
                  <ProtectedRoute roles={GESTION_ROLES}><DashboardGestionPage /></ProtectedRoute>
                } />
                <Route path="recorridas" element={
                  <ProtectedRoute roles={NO_DIRECTOR}><RecorridasPage /></ProtectedRoute>
                } />
                <Route path="dotacion" element={
                  <ProtectedRoute roles={[...GESTION_ROLES, 'autoridades']}><DotacionTotalPage /></ProtectedRoute>
                } />
                <Route path="pou" element={
                  <ProtectedRoute roles={POU_ROLES}><POUComparativaPage /></ProtectedRoute>
                } />
                <Route path="pou/:code" element={
                  <ProtectedRoute roles={POU_ROLES}><POUPage /></ProtectedRoute>
                } />

                {/* Módulo 2 — Bajas y Seguimiento CPH */}
                <Route path="concursales/tablero" element={
                  <ProtectedRoute roles={GESTION_ROLES}><TableroPage /></ProtectedRoute>
                } />
                <Route path="concursales/bajas" element={
                  <ProtectedRoute roles={BAJAS_CONSOLIDADAS_ROLES}><BajasConsolidadasPage /></ProtectedRoute>
                } />
                <Route path="concursales/seguimiento-cph" element={
                  <ProtectedRoute roles={GESTION_ROLES}><SeguimientoCphPage /></ProtectedRoute>
                } />
                <Route path="concursales/seguimiento-ceetps" element={
                  <ProtectedRoute roles={GESTION_ROLES}><SeguimientoCeetpsPage /></ProtectedRoute>
                } />
                <Route path="concursales/configuracion" element={
                  <ProtectedRoute roles={[...EDIT_ROLES, 'gerencia', 'concursales']}><ConfiguracionPage /></ProtectedRoute>
                } />
                <Route path="concursales/recientes" element={
                  <ProtectedRoute roles={EDIT_ROLES}><RecientesAltasPage /></ProtectedRoute>
                } />
                <Route path="modulo2/bajas" element={<Navigate to="/concursales/bajas" replace />} />
                <Route path="modulo2/seguimiento-cph" element={<Navigate to="/concursales/seguimiento-cph" replace />} />

                {/* Director */}
                <Route path="director" element={
                  <ProtectedRoute roles={DIRECTOR_ONLY}><DirectorHomePage /></ProtectedRoute>
                } />

                {/* Cargo (Alta + Lista) */}
                <Route path="cargos" element={
                  <ProtectedRoute roles={EDIT_ROLES} moduleKey="AltasCargo"><CargosPage /></ProtectedRoute>
                } />
                <Route path="cargos/lista" element={
                  <ProtectedRoute roles={EDIT_ROLES} moduleKey="ListaCargos"><ListaCargosPage /></ProtectedRoute>
                } />
                <Route path="cargos/kpis" element={
                  <ProtectedRoute roles={GESTION_ROLES}><DotacionKpisPage /></ProtectedRoute>
                } />
                <Route path="cargos/subir" element={
                  <ProtectedRoute roles={EDIT_ROLES} moduleKey="SubirData"><SubirDataPage /></ProtectedRoute>
                } />
                <Route path="cargos/decreto" element={
                  <ProtectedRoute roles={EDIT_ROLES} moduleKey="AltasCargo"><CargosPage /></ProtectedRoute>
                } />
                <Route path="cargos/pou" element={
                  <ProtectedRoute roles={EDIT_ROLES} moduleKey="AltasCargo"><CargosPage /></ProtectedRoute>
                } />
                <Route path="cargos/alta" element={<Navigate to="/cargos" replace />} />

                {/* Seguridad */}
                <Route path="seguridad/auditoria" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><AuditoriaPage /></ProtectedRoute>
                } />
                <Route path="seguridad/tokens" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><TokensPage /></ProtectedRoute>
                } />
                <Route path="seguridad/usuarios" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><UsuariosPage /></ProtectedRoute>
                } />
                <Route path="seguridad/permisos" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><PermisosPage /></ProtectedRoute>
                } />
                <Route path="seguridad/roles" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><RolesPage /></ProtectedRoute>
                } />
                <Route path="seguridad/carga-masiva" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><CargaMasivaPage /></ProtectedRoute>
                } />
                <Route path="seguridad/validacion" element={
                  <ProtectedRoute roles={ADMIN_ONLY}><ValidacionDotaneitorPage /></ProtectedRoute>
                } />

                {/* Herramientas */}
                <Route path="herramientas/dotacion-padron" element={
                  <ProtectedRoute roles={EDIT_ROLES}><DotacionPadronPage /></ProtectedRoute>
                } />
                <Route path="herramientas/tablas-vista" element={
                  <ProtectedRoute roles={EDIT_ROLES}><TablasVistaPage /></ProtectedRoute>
                } />
                <Route path="herramientas/tablas-admin" element={
                  <ProtectedRoute roles={EDIT_ROLES}><TablasAdminPage /></ProtectedRoute>
                } />
                <Route path="herramientas/dotaneitor" element={
                  <ProtectedRoute roles={EDIT_ROLES}><DotaneitorPage /></ProtectedRoute>
                } />
              </Route>

              {/* Cualquier ruta desconocida → home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
