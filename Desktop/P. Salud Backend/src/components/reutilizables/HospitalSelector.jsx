import React, { useState } from 'react'
import { Box, H2, H3, Text, Icon } from '@adminjs/design-system'

/**
 * HospitalSelector - Componente reutilizable para seleccionar hospital
 * 
 * Proporciona una interfaz consistente y estética para seleccionar hospitales
 * con agrupación por categoría (Agudos, Crónicos, Especializados, etc)
 * 
 * Props:
 *   - hospitals: Array de objetos con { id, name, category, code }
 *   - onSelect: Callback cuando se selecciona un hospital (recibe el hospital completo)
 *   - title: Título principal (default: "Hospitales")
 *   - subtitle: Subtítulo (default: "Seleccione un hospital para su organización")
 *   - groupBy: Campo para agrupar hospitales (default: "category")
 * 
 * @example
 * <HospitalSelector
 *   hospitals={hospitalsData}
 *   onSelect={(hospital) => navigate(`/hospital/${hospital.id}`)}
 *   title="Dotación de Personal"
 * />
 */
const HospitalSelector = ({ 
  hospitals, 
  onSelect, 
  title = 'Hospitales',
  subtitle = 'Seleccione un hospital para su organización',
  groupBy = 'category'
}) => {
  const [openGroups, setOpenGroups] = useState({})
  // Agrupar hospitales por categoría
  const grouped = hospitals.reduce((acc, hospital) => {
    const group = hospital[groupBy] || 'Otros'
    if (!acc[group]) acc[group] = []
    acc[group].push(hospital)
    return acc
  }, {})

  // Orden de categorías para mostrar
  const categoryOrder = ['Agudos', 'Crónicos', 'Especializados', 'Otros']
  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  )

  // Iconos por categoría
  const categoryIcons = {
    'Agudos': 'Activity',
    'Crónicos': 'Calendar',
    'Especializados': 'Settings',
    'Otros': 'Home'
  }

  const HospitalCard = ({ hospital }) => (
    <a 
      onClick={() => onSelect(hospital)}
      style={{ 
        textDecoration: 'none', 
        color: 'inherit',
        cursor: 'pointer'
      }}
    >
      <Box
        p="lg"
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          background: '#FAFBFC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: 120,
          transition: 'all 0.25s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)'
          e.currentTarget.style.borderColor = '#0F766E'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.background = '#F0FFFE'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
          e.currentTarget.style.borderColor = '#E5E7EB'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.background = '#FAFBFC'
        }}
      >
        <H3 style={{ 
          margin: 0, 
          color: '#1F2937', 
          fontSize: 18, 
          fontWeight: 700 
        }}>
          {hospital.name}
        </H3>
        <Text color="subtle" style={{ 
          marginTop: 6, 
          fontSize: 13,
          fontWeight: 500
        }}>
          {hospital.id}
        </Text>
      </Box>
    </a>
  )

  return (
    <Box style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 20, paddingBottom: 24 }}>
      {/* Header */}
      <Box mb="xl" style={{ marginBottom: 32 }}>
        <H2 style={{ 
          margin: 0, 
          color: '#1F2937', 
          fontSize: 28, 
          fontWeight: 800,
          marginBottom: 8
        }}>
          {title}
        </H2>
        <Text color="subtle" style={{ 
          fontSize: 16, 
          lineHeight: '24px',
          color: '#6B7280'
        }}>
          {subtitle}
        </Text>
      </Box>

      {/* Grupos de hospitales */}
      {sortedGroups.map(group => {
        const isOpen = openGroups[group]
        const toggleGroup = () => {
          setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
        }

        return (
          <Box key={group} style={{ marginBottom: 24 }}>
            {/* Header expandible */}
            <Box
              onClick={toggleGroup}
              style={{
                cursor: 'pointer',
                padding: '12px 16px',
                background: '#F3F4F6',
                borderRadius: 8,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #E5E7EB',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E5E7EB'
                e.currentTarget.style.borderColor = '#0F766E'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F3F4F6'
                e.currentTarget.style.borderColor = '#E5E7EB'
              }}
            >
              <Box style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon 
                  icon={categoryIcons[group] || 'Home'} 
                  style={{ fontSize: 18, color: '#0F766E' }}
                />
                <Text style={{ margin: 0, fontWeight: 600, fontSize: 16, color: '#374151' }}>
                  {group}
                </Text>
              </Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Text style={{ 
                  margin: 0,
                  color: '#9CA3AF',
                  fontSize: 13,
                  fontWeight: 500
                }}>
                  {grouped[group].length} {grouped[group].length === 1 ? 'hospital' : 'hospitales'}
                </Text>
                <span style={{ 
                  fontSize: 18, 
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  color: '#6B7280'
                }}>
                  ›
                </span>
              </Box>
            </Box>

            {/* Grid de hospitales (expandible) */}
            {isOpen && (
              <Box style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
                marginBottom: 16
              }}>
                {grouped[group].map(hospital => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

export default HospitalSelector
