import React, { useState, useEffect, useCallback } from 'react'
import { Box, H3, Text, Button, Input, Label, Icon } from '@adminjs/design-system'
import Modal from '../reutilizables/Modal'
import LoadingSpinner from '../reutilizables/LoadingSpinner'
import ConfirmationDialog from '../reutilizables/ConfirmationDialog'

/**
 * MinutaModal - Modal para crear/editar minutas (hojas de cálculo dinámicas)
 * 
 * Permite al usuario:
 * - Definir columnas dinámicamente (nombre, tipo)
 * - Agregar/eliminar filas y columnas
 * - Editar celdas inline
 * - Exportar a Excel
 * 
 * Props:
 *   - isOpen: boolean - Si el modal está abierto
 *   - onClose: function - Callback al cerrar
 *   - hospitalCode: string - Código del hospital
 *   - onSuccess: function - Callback después de guardar (default: vacío)
 *   - editData: object - Datos para editar existente (default: null)
 */
const MinutaModal = ({ isOpen, onClose, hospitalCode, onSuccess = () => {}, editData = null }) => {
  const [titulo, setTitulo] = useState('')
  const [columns, setColumns] = useState([
    { id: 'col_1', name: 'Columna 1', type: 'text' }
  ])
  const [rows, setRows] = useState([{}])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: null, id: null })

  const isEditing = !!editData

  // Cargar datos al abrir en modo edición
  useEffect(() => {
    if (isOpen && editData) {
      setTitulo(editData.titulo || '')
      setColumns(editData.datos_tabla?.columns || [{ id: 'col_1', name: 'Columna 1', type: 'text' }])
      setRows(editData.datos_tabla?.rows || [{}])
    } else if (isOpen && !editData) {
      setTitulo('')
      setColumns([{ id: 'col_1', name: 'Columna 1', type: 'text' }])
      setRows([{}])
    }
  }, [isOpen, editData])

  // Agregar nueva columna
  const handleAddColumn = () => {
    const newColId = `col_${Date.now()}`
    setColumns([...columns, { id: newColId, name: `Columna ${columns.length + 1}`, type: 'text' }])
  }

  // Eliminar columna
  const handleDeleteColumn = (colId) => {
    if (columns.length === 1) {
      alert('Debe haber al menos una columna')
      return
    }
    setConfirmDelete({ show: true, type: 'column', id: colId })
  }

  const confirmDeleteColumn = () => {
    const colId = confirmDelete.id
    setColumns(columns.filter(col => col.id !== colId))
    // Eliminar datos de esa columna en las filas
    setRows(rows.map(row => {
      const newRow = { ...row }
      delete newRow[colId]
      return newRow
    }))
    setConfirmDelete({ show: false, type: null, id: null })
  }

  // Cambiar nombre de columna
  const handleColumnNameChange = (colId, newName) => {
    setColumns(columns.map(col => 
      col.id === colId ? { ...col, name: newName } : col
    ))
  }

  // Cambiar tipo de columna
  const handleColumnTypeChange = (colId, newType) => {
    setColumns(columns.map(col => 
      col.id === colId ? { ...col, type: newType } : col
    ))
  }

  // Agregar nueva fila
  const handleAddRow = () => {
    setRows([...rows, {}])
  }

  // Eliminar fila
  const handleDeleteRow = (rowIndex) => {
    if (rows.length === 1) {
      alert('Debe haber al menos una fila')
      return
    }
    setConfirmDelete({ show: true, type: 'row', id: rowIndex })
  }

  const confirmDeleteRow = () => {
    const rowIndex = confirmDelete.id
    setRows(rows.filter((_, idx) => idx !== rowIndex))
    setConfirmDelete({ show: false, type: null, id: null })
  }

  // Cambiar valor de celda
  const handleCellChange = (rowIndex, colId, value) => {
    const newRows = [...rows]
    newRows[rowIndex] = { ...newRows[rowIndex], [colId]: value }
    setRows(newRows)
  }

  // Guardar minuta
  const handleSave = async () => {
    if (!titulo.trim()) {
      setError('El título es obligatorio')
      return
    }

    if (columns.length === 0) {
      setError('Debe haber al menos una columna')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        hospital_code: hospitalCode,
        titulo: titulo.trim(),
        datos_tabla: {
          columns,
          rows
        }
      }

      const url = isEditing ? `/api/minutas/${editData.id}` : '/api/minutas'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data)
      }

      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Exportar a Excel (descarga CSV)
  const handleExportExcel = () => {
    if (columns.length === 0 || rows.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    // Generar CSV
    const headers = columns.map(col => `"${col.name}"`).join(',')
    const data = rows.map(row => {
      return columns.map(col => {
        const value = row[col.id] || ''
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    }).join('\n')

    const csv = `${headers}\n${data}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${titulo || 'minuta'}_${hospitalCode}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Editar Minuta' : 'Nueva Minuta'}
        subtitle={`Hospital: ${hospitalCode}`}
        maxWidth="1200px"
        disableClickOutside={true}
        footer={
          <>
            <Button onClick={onClose} variant="light" disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} variant="primary" disabled={loading}>
              {loading ? <LoadingSpinner inline size="small" text={isEditing ? 'Actualizando...' : 'Guardando...'} color="#fff" /> : (isEditing ? 'Actualizar' : 'Guardar')}
            </Button>
          </>
        }
      >
        {error && (
          <Box mb="md" p="md" style={{ backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: 4 }}>
            <Text color="error">{error}</Text>
          </Box>
        )}

        {/* Título */}
        <Box mb="lg">
          <Label>Título de la Minuta *</Label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Reunión de Directores - Enero 2026"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          />
        </Box>

        {/* Editor de Tabla */}
        <Box mb="lg">
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <Label style={{ margin: 0 }}>Datos de la Tabla</Label>
            <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="light" onClick={handleAddColumn} disabled={loading}>
                <Icon icon="Plus" /> Agregar Columna
              </Button>
              <Button size="sm" variant="light" onClick={handleAddRow} disabled={loading}>
                <Icon icon="Plus" /> Agregar Fila
              </Button>
              <Button size="sm" variant="primary" onClick={handleExportExcel} disabled={loading}>
                <Icon icon="Download" /> Exportar Excel
              </Button>
            </Box>
          </Box>

          {/* Tabla */}
          <Box style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4, maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: 8, textAlign: 'left', width: 40, borderRight: '1px solid #ddd' }}>#</th>
                  {columns.map((col, idx) => (
                    <th key={col.id} style={{ padding: 8, textAlign: 'left', borderRight: '1px solid #ddd' }}>
                      <Box style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Input
                          value={col.name}
                          onChange={(e) => handleColumnNameChange(col.id, e.target.value)}
                          placeholder="Nombre columna"
                          style={{ fontSize: 13, padding: '4px 8px' }}
                        />
                        <Box style={{ display: 'flex', gap: 4 }}>
                          <select
                            value={col.type}
                            onChange={(e) => handleColumnTypeChange(col.id, e.target.value)}
                            style={{ fontSize: 12, padding: '2px 4px', flex: 1 }}
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                          </select>
                          <Button 
                            size="sm" 
                            variant="text" 
                            onClick={() => handleDeleteColumn(col.id)}
                            style={{ padding: '2px 4px', minWidth: 'auto' }}
                          >
                            <Icon icon="Delete" style={{ fontSize: 14 }} />
                          </Button>
                        </Box>
                      </Box>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ borderTop: '1px solid #ddd' }}>
                    <td style={{ padding: 8, textAlign: 'center', borderRight: '1px solid #ddd', backgroundColor: '#fafafa' }}>
                      <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span>{rowIndex + 1}</span>
                        <Button
                          size="sm"
                          variant="text"
                          onClick={() => handleDeleteRow(rowIndex)}
                          style={{ padding: '2px 4px', minWidth: 'auto' }}
                        >
                          <Icon icon="Delete" style={{ fontSize: 12 }} />
                        </Button>
                      </Box>
                    </td>
                    {columns.map((col) => (
                      <td key={col.id} style={{ padding: 4, borderRight: '1px solid #ddd' }}>
                        <Input
                          value={row[col.id] || ''}
                          onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
                          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                          style={{ fontSize: 13, padding: '4px 8px', width: '100%', border: 'none' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Modal>

      {/* Diálogo de confirmación para eliminación */}
      <ConfirmationDialog
        isOpen={confirmDelete.show}
        onConfirm={confirmDelete.type === 'column' ? confirmDeleteColumn : confirmDeleteRow}
        onCancel={() => setConfirmDelete({ show: false, type: null, id: null })}
        title={confirmDelete.type === 'column' ? 'Eliminar Columna' : 'Eliminar Fila'}
        message={confirmDelete.type === 'column' 
          ? '¿Está seguro de eliminar esta columna? Se perderán todos los datos de esta columna.' 
          : '¿Está seguro de eliminar esta fila? Esta acción no se puede deshacer.'}
        confirmText="Eliminar"
        variant="danger"
        icon="Delete"
      />
    </>
  )
}

export default MinutaModal
