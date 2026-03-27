import React from 'react'
import { Box, Button, Icon, Table, TableHead, TableRow, TableCell, TableBody, Text } from '@adminjs/design-system'
import Pagination from '../reutilizables/Pagination'

/**
 * Componente de Tabla Ampliada Modal
 * Muestra la tabla en un modal emergente con scroll horizontal y vertical
 * Encabezados fijos y todas las características de la tabla original
 */
const TablaAmpliada = ({ 
  isOpen, 
  onClose, 
  columns, 
  rows, 
  state,
  toggleSort,
  totalPages,
  fetchData
}) => {
  const tableRef = React.useRef(null)
  if (!isOpen) return null

  return (
    <Box 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <Box 
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          width: '96%',
          maxWidth: '1900px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DEL MODAL */}
        <Box style={{
          padding: '10px 24px',
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #1a3a52 0%, #2c5f7f 100%)',
          color: '#fff',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12
        }}>
          <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon icon="Table" style={{ fontSize: 20 }} />
            <Text style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.3px' }}>
              Tabla Ampliada
            </Text>
          </Box>
          <Button 
            size="sm"
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
            }}
          >
            <Icon icon="X" style={{ marginRight: 6 }} />
            Cerrar
          </Button>
        </Box>

        {/* CONTENIDO DE LA TABLA CON SCROLL */}
        <Box ref={tableRef} style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <Box style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            border: '1px solid #dee2e6',
            overflow: 'auto',
            minWidth: 'min-content'
          }}>
            <Table style={{ minWidth: 'max-content' }}>
              <TableHead>
                <TableRow style={{ backgroundColor: '#1a3a52' }}>
                  {columns.map((col) => (
                    <TableCell 
                      key={col} 
                      style={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#1a3a52',
                        zIndex: 10,
                        borderRight: '1px solid rgba(255,255,255,0.1)',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        transition: 'background-color 0.2s',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c5f7f'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a3a52'}
                      onClick={() => toggleSort(col)}
                    >
                      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {col}
                        {state.sortBy === col && (
                          <Icon 
                            icon={state.sortDir === 'ASC' ? 'ChevronUp' : 'ChevronDown'} 
                            style={{ fontSize: 14 }} 
                          />
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                      <Icon icon="InfoOutline" style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontSize: 16, fontWeight: 500 }}>Sin resultados</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow 
                      key={idx}
                      style={{ 
                        background: row.nombre_apellido === 'TOTAL DE REGISTROS' 
                          ? '#fff3cd' 
                          : idx % 2 === 0 
                            ? '#fff' 
                            : '#f8f9fa',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (row.nombre_apellido !== 'TOTAL DE REGISTROS') {
                          e.currentTarget.style.backgroundColor = '#e3f2fd'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (row.nombre_apellido !== 'TOTAL DE REGISTROS') {
                          e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8f9fa'
                        }
                      }}
                    >
                      {columns.map((col) => (
                        <TableCell 
                          key={col}
                          style={{
                            padding: '10px 16px',
                            fontSize: 13,
                            color: '#212529',
                            whiteSpace: 'nowrap',
                            borderRight: '1px solid #e9ecef'
                          }}
                        >
                          {row[col] != null ? String(row[col]) : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>

        {/* FOOTER CON PAGINACIÓN */}
        <Box style={{
          padding: '10px 24px',
          borderTop: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          backgroundColor: '#fff',
          gap: 24,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12
        }}>
          {/* Info de registros */}
          <Text style={{ fontSize: 14, color: '#495057', fontWeight: 500 }}>
            Mostrando {rows.length} de {state.total} registros
          </Text>
          
          {/* Controles de paginación - Flex grow para ocupar espacio y estar al borde derecho */}
          <Box style={{ marginLeft: 'auto' }}>
            <Pagination
              currentPage={state.page}
              totalPages={totalPages}
              onPageChange={(newPage) => fetchData({ page: newPage })}
              loading={false}
              tableRef={tableRef}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default React.memo(TablaAmpliada)