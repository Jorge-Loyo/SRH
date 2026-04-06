import React, { useEffect, useState } from 'react'
import { ApiClient } from 'adminjs'
import { Box, H3, Text } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { getAllowedPages } from '../../config/pagePermissions'

const Home = () => {
  // ✅ Consolidado: Single source of truth para todo el estado
  const [state, setState] = useState({ 
    loading: true, 
    userRole: null, 
    data: null, 
    error: null 
  })
  const { handleError, clearError } = useErrorHandler()
  
  useEffect(() => {
    const api = new ApiClient()
    ;(async () => {
      try {
        // ✅ OPTIMIZACIÓN: Paralelizar requests con Promise.allSettled
        // Antes: await secuencial (500ms total)
        // Después: paralelo max(300ms, 200ms) = 300ms
        const [dashboardRes, meRes] = await Promise.allSettled([
          api.getDashboard(),
          fetch('/admin/me', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }).then(r => r.json())
        ])
        
        // ✅ FIX: Propagar error si meRes falla (crítico para seguridad)
        if (meRes.status === 'rejected') {
          handleError(new Error('No se pudo cargar información del usuario'), 'Home.loadUserRole')
          setState({ loading: false, userRole: null, data: null, error: 'No se pudo verificar tu rol' })
          return
        }
        
        const role = meRes.value?.currentAdmin?.role || null
        
        // Procesar resultado del dashboard
        if (dashboardRes.status === 'fulfilled') {
          setState({ 
            loading: false, 
            userRole: role, 
            data: dashboardRes.value.data, 
            error: null 
          })
          clearError()
        } else {
          const errorMsg = dashboardRes.reason?.message || 'Error loading dashboard'
          handleError(new Error(errorMsg), 'Home.loadDashboard')
          setState({ 
            loading: false, 
            userRole: role, 
            data: null, 
            error: errorMsg 
          })
        }
      } catch (e) {
        handleError(e, 'Home.loadDashboard')
        setState({ loading: false, userRole: null, data: null, error: e?.message || 'Error inesperado' })
      }
    })()
  }, [])

  const Card = ({ children, title, subtitle, accent = '#0F766E' }) => (
    <Box
      variant="white"
      p="xl"
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        background: '#FAFBFC'
      }}
    >
      {title && (
        <Box mb="md" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-block', width: 4, height: 28, background: accent, borderRadius: 2 }} />
          <H3 style={{ margin: 0, color: '#1F2937', fontSize: 20, fontWeight: 700 }}>{title}</H3>
        </Box>
      )}
      {subtitle && (
        <Text color="subtle" style={{ marginTop: -6, marginBottom: 16, fontSize: 14 }}>{subtitle}</Text>
      )}
      {children}
    </Box>
  )

  const Stat = ({ value, label }) => (
    <Box style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, minHeight: 80
    }}>
      <div style={{ fontSize: 32, lineHeight: '32px', fontWeight: 800 }}>{String(value)}</div>
      <Text color="subtle" style={{ margin: 0, lineHeight: '18px', textAlign: 'center', minHeight: 36 }}>{label}</Text>
    </Box>
  )

  if (state.loading) {
    return (
      <Box style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 16, paddingBottom: 24 }}>
        <Box
          p="xl"
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
            color: '#1F2937',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <H3 style={{ color: '#1F2937', margin: 0, fontWeight: 700, fontSize: 18 }}>Inicio</H3>
          <Text style={{ color: 'rgba(31,41,55,0.8)', marginTop: 6 }}>Cargando…</Text>
        </Box>
      </Box>
    )
  }

  // ✅ Mostrar error si existe (consolidado)
  if (state.error) {
    return (
      <Box style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 16, paddingBottom: 24 }}>
        <Box
          p="xl"
          style={{
            border: '1px solid #FCA5A5',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)',
            color: '#7F1D1D',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <H3 style={{ color: '#7F1D1D', margin: 0, fontWeight: 700, fontSize: 18 }}>Inicio</H3>
          <Text style={{ color: 'rgba(127,29,29,0.85)', marginTop: 6 }}>{String(state.error)}</Text>
        </Box>
      </Box>
    )
  }

  const QuickLink = ({ href, label }) => (
    <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Box
        p="md"
        style={{
          border: '2px solid #1F2937',
          borderRadius: 10,
          background: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          minHeight: 100,
          maxWidth: 320,
          transition: 'all 0.25s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)'
          e.currentTarget.style.borderColor = '#0F766E'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.borderColor = '#1F2937'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <Text style={{ fontWeight: 700, textAlign: 'center', width: '100%', fontSize: 18, color: '#1F2937' }}>{label}</Text>
      </Box>
    </a>
  )

  return (
    <>
      {/* Información del usuario - Primero y separado */}
      <UserInfo />
      
      {/* Contenido principal del dashboard */}
      <Box style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 20, paddingBottom: 24 }}>
        {/* Secciones Disponibles */}
        <Card title="Secciones Disponibles" accent="#0F766E">
          <Box style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            
            {/* ✅ TABLAS (BD) - Solo ADMIN y EDITOR */}
            {(state.userRole === 'admin' || state.userRole === 'editor') && (
              <>
                <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 32 }}>
                  <H3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700, textAlign: 'left', color: '#374151' }}>📊 Tablas (BD)</H3>
                  <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%' }}>
                    <QuickLink href="/admin/pages/PersonasFull" icon="User" label="Personas" />
                    <QuickLink href="/admin/pages/CargosFull" icon="Inbox" label="Cargos" />
                    <QuickLink href="/admin/pages/RolesFull" icon="Copy" label="Roles" />
                    <QuickLink href="/admin/pages/SiglasFull" icon="Menu" label="Siglas" />
                    <QuickLink href="/admin/pages/BajasFull" icon="Bell" label="Bajas" />
                  </Box>
                </Box>
                {/* Línea divisoria */}
                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #E5E7EB', margin: '0 0 28px 0' }} />
              </>
            )}

            {/* ✅ SEGURIDAD - Solo ADMIN */}
            {state.userRole === 'admin' && (
              <>
                <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 32 }}>
                  <H3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700, textAlign: 'left', color: '#374151' }}>🔐 Seguridad</H3>
                  <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, width: '100%' }}>
                    <QuickLink href="/admin/pages/Auditoria" icon="Zap" label="Auditoría" />
                    <QuickLink href="/admin/pages/Tokens" icon="Shield" label="Tokens" />
                    <QuickLink href="/admin/pages/Usuarios" icon="User" label="Usuarios" />
                    <QuickLink href="/admin/pages/Permisos" icon="Settings" label="Permisos" />
                  </Box>
                </Box>
                {/* Línea divisoria */}
                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #E5E7EB', margin: '0 0 28px 0' }} />
              </>
            )}

            {/* ✅ ESTRUCTURAS Y PERSONAL - ADMIN, EDITOR, VIEWER */}
            {(state.userRole === 'admin' || state.userRole === 'editor' || state.userRole === 'viewer' || state.userRole === 'gerencia') && (
              <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <H3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700, textAlign: 'left', color: '#374151' }}>🏥 Estructuras - Personal - Seguimiento</H3>
                <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, width: '100%' }}>
                  <QuickLink href="/admin/pages/Hospitales" icon="Home" label="Hospitales" />
                  <QuickLink href="/admin/pages/OrganigramaHome" icon="Menu" label="Organigrama" />
                  <QuickLink href="/admin/pages/RecorridasHospitales" icon="Folder" label="Recorridas" />
                  <QuickLink href="/admin/pages/HospitalesConcursos" icon="Award" label="Concursos" />
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      </Box>
    </>
  )
}

export default Home
