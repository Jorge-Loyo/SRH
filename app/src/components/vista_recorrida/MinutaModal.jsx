import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  const [hasDraft, setHasDraft] = useState(false)
  const [expandedCell, setExpandedCell] = useState(null) // { rowIndex, colId, value, colName }

  const isEditing = !!editData
  const draftKey = `minuta_draft_${hospitalCode}`

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && editData) {
      setTitulo(editData.titulo || '')
      setColumns(editData.datos_tabla?.columns || [{ id: 'col_1', name: 'Columna 1', type: 'text' }])
      setRows(editData.datos_tabla?.rows || [{}])
      setHasDraft(false)
    } else if (isOpen && !editData) {
      // Intentar recuperar borrador de localStorage
      try {
        const saved = localStorage.getItem(draftKey)
        if (saved) {
          const d = JSON.parse(saved)
          const hasMeaningfulData = d.titulo || (d.columns && d.columns.length > 1) ||
            (d.rows && d.rows.some(r => Object.keys(r).length > 0))
          if (hasMeaningfulData) {
            setTitulo(d.titulo || '')
            setColumns(d.columns || [{ id: 'col_1', name: 'Columna 1', type: 'text' }])
            setRows(d.rows || [{}])
            setHasDraft(true)
            return
          }
        }
      } catch {}
      setTitulo('')
      setColumns([{ id: 'col_1', name: 'Columna 1', type: 'text' }])
      setRows([{}])
      setHasDraft(false)
    }
  }, [isOpen, editData, draftKey])

  // Auto-guardar borrador en localStorage (debounced 500ms)
  const draftTimerRef = useRef(null)
  useEffect(() => {
    if (isEditing || !isOpen) return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      const hasMeaningfulData = titulo || columns.length > 1 ||
        rows.some(r => Object.keys(r).length > 0)
      if (hasMeaningfulData) {
        try { localStorage.setItem(draftKey, JSON.stringify({ titulo, columns, rows })) } catch {}
      }
    }, 500)
    return () => clearTimeout(draftTimerRef.current)
  }, [titulo, columns, rows, isEditing, isOpen, draftKey])

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey) } catch {}
    setTitulo('')
    setColumns([{ id: 'col_1', name: 'Columna 1', type: 'text' }])
    setRows([{}])
    setHasDraft(false)
  }

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

      // Limpiar borrador guardado tras guardar exitosamente
      try { localStorage.removeItem(draftKey) } catch {}
      setHasDraft(false)

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

  // Exportar a Excel (genera xlsx en el servidor y lo descarga)
  const handleExportExcel = async () => {
    if (columns.length === 0 || rows.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    try {
      const response = await fetch('/admin/export/minuta.xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ titulo, hospitalCode, columns, rows })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Error ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${titulo || 'minuta'}_${hospitalCode}.xlsx`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('No se pudo exportar el archivo Excel: ' + (e?.message || e))
    }
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
        {hasDraft && (
          <Box
            mb="md"
            p="md"
            style={{
              backgroundColor: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <Text style={{ margin: 0, fontSize: 13 }}>
              ⚠️ Se recuperó un borrador guardado localmente. Podés continuar editando o descartarlo.
            </Text>
            <Button
              variant="text"
              onClick={discardDraft}
              style={{ fontSize: 12, padding: '2px 8px', whiteSpace: 'nowrap', color: '#d4380d' }}
            >
              Descartar borrador
            </Button>
          </Box>
        )}

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
            placeholder="Ej: Reunión de Directores"
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
          <Box style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 4, maxHeight: '55vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: 8, textAlign: 'left', width: 40, borderRight: '1px solid #ddd' }}>#</th>
                  {columns.map((col, idx) => (
                    <th key={col.id} style={{ padding: 8, textAlign: 'left', borderRight: '1px solid #ddd' }}>
                      <Box style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <textarea
                          value={col.name}
                          onChange={(e) => handleColumnNameChange(col.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              e.preventDefault()
                              const pos = e.target.selectionStart
                              const val = col.name
                              handleColumnNameChange(col.id, val.slice(0, pos) + '\n' + val.slice(pos))
                            }
                          }}
                          placeholder="Nombre columna"
                          rows={Math.max(1, (col.name.match(/\n/g) || []).length + 1)}
                          style={{ fontSize: 13, padding: '4px 8px', width: '100%', border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit', resize: 'none', lineHeight: '1.4', boxSizing: 'border-box' }}
                        />
                        <Box style={{ display: 'flex', gap: 4 }}>
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
                      <td key={col.id} style={{ padding: 4, borderRight: '1px solid #ddd', position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            value={row[col.id] || ''}
                            onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                e.preventDefault()
                                const pos = e.target.selectionStart
                                const val = row[col.id] || ''
                                handleCellChange(rowIndex, col.id, val.slice(0, pos) + '\n' + val.slice(pos))
                              }
                            }}
                            rows={Math.max(2, ((row[col.id] || '').match(/\n/g) || []).length + 1)}
                            style={{
                              fontSize: 13,
                              padding: '4px 28px 4px 8px',
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              resize: 'none',
                              fontFamily: 'inherit',
                              lineHeight: '1.4',
                              minHeight: 36,
                              maxHeight: 120,
                              overflowY: 'auto',
                              boxSizing: 'border-box',
                              backgroundColor: 'transparent'
                            }}
                          />
                          <button
                            onClick={() => setExpandedCell({ rowIndex, colId: col.id, value: row[col.id] || '', colName: col.name })}
                            title="Expandir celda (⤢)"
                            style={{
                              position: 'absolute',
                              top: 3,
                              right: 3,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 13,
                              color: '#9ca3af',
                              padding: '1px 3px',
                              lineHeight: 1,
                              borderRadius: 3
                            }}
                          >
                            ⤢
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Modal>

      {/* Overlay de celda expandida */}
      {expandedCell && (
        <Box style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <Box style={{
            background: '#fff',
            borderRadius: 10,
            padding: 24,
            width: 660,
            maxWidth: '92vw',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)'
          }}>
            <Text style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#374151' }}>
              ✏️ Editar celda
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Columna: <strong>{expandedCell.colName}</strong> — Fila {expandedCell.rowIndex + 1}
            </Text>
            <textarea
              value={expandedCell.value}
              onChange={(e) => setExpandedCell(s => ({ ...s, value: e.target.value }))}
              autoFocus
              rows={14}
              placeholder="Escribí el contenido de la celda..."
              style={{
                width: '100%',
                fontSize: 14,
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, marginBottom: 14 }}>
              Enter para nueva línea · Ctrl+Enter también funciona
            </Text>
            <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="light" onClick={() => setExpandedCell(null)}>Cancelar</Button>
              <Button variant="primary" onClick={() => {
                handleCellChange(expandedCell.rowIndex, expandedCell.colId, expandedCell.value)
                setExpandedCell(null)
              }}>Aplicar</Button>
            </Box>
          </Box>
        </Box>
      )}

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
