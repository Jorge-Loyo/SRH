import React from 'react'
import { Box, Button, Icon, Text } from '@adminjs/design-system'

/**
 * Componente de paginación con números de página y contador de registros
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Página actual (1-indexed)
 * @param {number} props.totalPages - Total de páginas
 * @param {number} props.totalRecords - Total de registros (opcional)
 * @param {Function} props.onPageChange - Callback al cambiar de página
 * @param {boolean} props.loading - Estado de carga
 * @param {React.RefObject} props.tableRef - Referencia a la tabla para scroll suave
 */
const Pagination = ({ currentPage, totalPages, totalRecords, onPageChange, loading = false, tableRef }) => {
  const handlePageChange = (newPage) => {
    // Scroll hacia el inicio de la tabla primero
    if (tableRef?.current) {
      tableRef.current.scrollTop = 0
    }
    
    // Llamar el callback sin reload
    onPageChange(newPage)
  }
  
  // Calcular rango de páginas a mostrar
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 7
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', padding: '8px 0' }}>
      {/* Controles de paginación */}
      <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Botón Anterior */}
        <button
          aria-label="Página anterior"
          disabled={loading || currentPage <= 1}
          onClick={(e) => {
            e.preventDefault()
            handlePageChange(currentPage - 1)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '8px 12px',
            border: '1px solid #d4d4d8',
            borderRadius: 6,
            background: (loading || currentPage <= 1) ? '#f5f5f5' : '#fff',
            color: (loading || currentPage <= 1) ? '#9ca3af' : '#1f2937',
            fontSize: 14,
            fontWeight: 600,
            cursor: (loading || currentPage <= 1) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: (loading || currentPage <= 1) ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            if (!loading && currentPage > 1) {
              e.currentTarget.style.background = '#1f2937'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(31, 41, 55, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && currentPage > 1) {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#1f2937'
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
            }
          }}
        >
          ‹
        </button>

        {/* Números de página */}
        {pageNumbers.map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#999', fontSize: 13, userSelect: 'none' }}>
                ...
              </span>
            )
          }

          const isActive = page === currentPage

          return (
            <button
              key={page}
              aria-label={`Ir a página ${page}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(page)
              }}
              disabled={loading || isActive}
              style={{
                minWidth: 36,
                height: 36,
                padding: '0 6px',
                border: isActive ? '1px solid #1f2937' : '1px solid #d4d4d8',
                borderRadius: 6,
                background: isActive ? '#1f2937' : '#fff',
                color: isActive ? '#fff' : '#4b5563',
                fontWeight: isActive ? 700 : 600,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : (isActive ? 'default' : 'pointer'),
                transition: 'all 0.2s ease',
                opacity: loading ? 0.5 : 1,
                boxShadow: isActive ? '0 4px 6px rgba(31, 41, 55, 0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !loading) {
                  e.currentTarget.style.background = '#f5f5f5'
                  e.currentTarget.style.borderColor = '#1f2937'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.borderColor = '#d4d4d8'
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                }
              }}
            >
              {page}
            </button>
          )
        })}

        {/* Botón Siguiente */}
        <button
          aria-label="Página siguiente"
          disabled={loading || currentPage >= totalPages}
          onClick={(e) => {
            e.preventDefault()
            handlePageChange(currentPage + 1)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '8px 12px',
            border: '1px solid #d4d4d8',
            borderRadius: 6,
            background: (loading || currentPage >= totalPages) ? '#f5f5f5' : '#fff',
            color: (loading || currentPage >= totalPages) ? '#9ca3af' : '#1f2937',
            fontSize: 14,
            fontWeight: 600,
            cursor: (loading || currentPage >= totalPages) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: (loading || currentPage >= totalPages) ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            if (!loading && currentPage < totalPages) {
              e.currentTarget.style.background = '#1f2937'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(31, 41, 55, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && currentPage < totalPages) {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#1f2937'
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
            }
          }}
        >
          ›
        </button>
      </Box>

      {/* Spacer invisible para mantener el centrado */}
      <div style={{ minWidth: 150 }} />
    </Box>
  )
}

export default Pagination
