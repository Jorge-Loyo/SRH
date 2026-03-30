import React, { useMemo } from 'react'
import { ApiClient, useCurrentAdmin } from 'adminjs'
import { Box, H3, H2, Text } from '@adminjs/design-system'
import UserInfo from '../reutilizables/UserInfo'
import { hospitalsMap } from '../datos-comunes/hospitals-data'

const CardLink = ({ href, title, subtitle, accent = '#0F766E' }) => (
  <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
    <Box
      p="lg"
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        transition: 'all 120ms ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => { 
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)'
        e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        e.currentTarget.style.borderColor = '#E5E7EB'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 4,
        height: '100%',
        background: accent,
        transition: 'width 120ms ease'
      }} 
      onMouseEnter={(e) => { e.parentElement.style.width = '100%' }}
      onMouseLeave={(e) => { e.parentElement.style.width = '4px' }}
      />
      <Box style={{ paddingLeft: 12 }}>
        <H3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1F2937' }}>{title}</H3>
        {subtitle && <Text color="subtle" style={{ marginTop: 8, fontSize: 14 }}>{subtitle}</Text>}
      </Box>
    </Box>
  </a>
)

const DirectorHome = () => {
  const [currentAdmin] = useCurrentAdmin()
  const hospitalCode = currentAdmin?.hospital_code || 'HGACA'
  const hospitalName = hospitalsMap[hospitalCode] || hospitalCode

  const organizacionHref = `/admin/pages/OrganizacionTabla?hospital=${encodeURIComponent(hospitalCode)}`
  const organigramaHref = `/admin/pages/OrganigramaDetalle?hospital=${encodeURIComponent(hospitalCode)}`

  return (
    <>
      {/* Información del usuario - Primero y separado */}
      <UserInfo />
      
      {/* Contenido principal del DirectorHome */}
      <Box style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 20, paddingBottom: 24 }}>
        {/* Header */}
        <Box mb="xl" style={{ marginBottom: 32 }}>
          <H2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111111', marginBottom: 8 }}>Mi Hospital</H2>
          <Text style={{ margin: 0, fontSize: 16, color: '#666666', opacity: 0.8 }}>
            {hospitalName ? `${hospitalName.toUpperCase()} - Acceso directo a la información de su hospital` : 'Acceso directo a la información de su hospital'}
          </Text>
        </Box>

        {/* Quick Access Links */}
        <Box style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 16,
          maxWidth: 900,
          margin: '0 auto'
        }}>
          <CardLink
            href={organizacionHref}
            title="Dotación de Personal"
            subtitle="Ver estructura y personal"
            accent="#0F766E"
          />
          <CardLink
            href={organigramaHref}
            title="Organigrama"
            subtitle="Estructura organizacional"
            accent="#059669"
          />
        </Box>
      </Box>
    </>
  )
}

export default DirectorHome
