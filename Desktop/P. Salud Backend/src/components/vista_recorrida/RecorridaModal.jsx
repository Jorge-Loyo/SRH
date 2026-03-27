import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import ReactQuill from 'react-quill'
import { Box, H3, Text, Button, Input, Label } from '@adminjs/design-system'
import Modal from '../reutilizables/Modal'
import ErrorFallback from '../reutilizables/ErrorFallback'
import ScrollTrap from '../reutilizables/ScrollTrap'
import LoadingSpinner from '../reutilizables/LoadingSpinner'

// Inyectar estilos de Quill globalmente (solo una vez)
if (typeof document !== 'undefined' && !document.getElementById('quill-editor-styles')) {
  const style = document.createElement('style')
  style.id = 'quill-editor-styles'
  style.textContent = `
    .ql-container {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      height: 100%;
      margin: 0;
      position: relative;
    }
    .ql-container.ql-snow {
      border: 1px solid #ccc;
      border-top: none;
    }
    .ql-editor {
      box-sizing: border-box;
      line-height: 1.6;
      height: 100%;
      outline: none;
      overflow-y: auto;
      padding: 12px 15px;
      tab-size: 4;
      text-align: left;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .ql-editor > * {
      cursor: text;
    }
    .ql-editor p, .ql-editor ol, .ql-editor ul, .ql-editor pre,
    .ql-editor blockquote, .ql-editor h1, .ql-editor h2, .ql-editor h3,
    .ql-editor h4, .ql-editor h5, .ql-editor h6 {
      margin: 0;
      padding: 0;
      counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
    }
    .ql-editor ol, .ql-editor ul {
      padding-left: 1.5em;
    }
    .ql-editor ol > li, .ql-editor ul > li {
      list-style-type: none;
    }
    .ql-editor ul > li::before {
      content: '\\2022';
    }
    .ql-editor li::before {
      display: inline-block;
      white-space: nowrap;
      width: 1.2em;
    }
    .ql-editor li:not(.ql-direction-rtl)::before {
      margin-left: -1.5em;
      margin-right: 0.3em;
      text-align: right;
    }
    .ql-editor ol li:not(.ql-direction-rtl),
    .ql-editor ul li:not(.ql-direction-rtl) {
      padding-left: 1.5em;
    }
    .ql-editor ol li {
      counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
      counter-increment: list-0;
    }
    .ql-editor ol li::before {
      content: counter(list-0, decimal) '. ';
    }
    .ql-editor h1 {
      font-size: 2em;
      margin: 0.67em 0;
    }
    .ql-editor h2 {
      font-size: 1.5em;
      margin: 0.83em 0;
    }
    .ql-editor h3 {
      font-size: 1.17em;
      margin: 1em 0;
    }
    .ql-editor a {
      text-decoration: underline;
      color: #0066cc;
    }
    .ql-editor blockquote {
      border-left: 4px solid #ccc;
      margin: 5px 0;
      padding-left: 16px;
    }
    .ql-editor code, .ql-editor pre {
      background-color: #f0f0f0;
      border-radius: 3px;
    }
    .ql-editor pre {
      white-space: pre-wrap;
      margin: 5px 0;
      padding: 5px 10px;
    }
    .ql-editor code {
      font-size: 85%;
      padding: 2px 4px;
    }
    .ql-snow.ql-toolbar {
      border: 1px solid #ccc;
      box-sizing: border-box;
      font-family: inherit;
      padding: 8px;
      background-color: #f9f9f9;
    }
    .ql-toolbar.ql-snow .ql-formats {
      margin-right: 15px;
    }
    .ql-snow .ql-stroke {
      fill: none;
      stroke: #444;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }
    .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill {
      fill: #444;
    }
    .ql-snow .ql-picker {
      color: #444;
      display: inline-block;
      float: left;
      font-size: 14px;
      font-weight: 500;
      height: 24px;
      position: relative;
      vertical-align: middle;
    }
    .ql-toolbar button {
      background: none;
      border: none;
      cursor: pointer;
      display: inline-block;
      float: left;
      height: 24px;
      padding: 3px 5px;
      width: 28px;
      position: relative;
    }
    .ql-toolbar button svg {
      float: left;
      height: 100%;
    }
    .ql-toolbar button:active, .ql-toolbar button:focus, .ql-toolbar button.ql-active {
      outline: none;
    }
    .ql-toolbar button:hover, .ql-toolbar button:focus, .ql-toolbar button.ql-active {
      color: #06c;
    }
    .ql-toolbar button:hover .ql-stroke, .ql-toolbar button:focus .ql-stroke,
    .ql-toolbar button.ql-active .ql-stroke {
      stroke: #06c;
    }
    .ql-toolbar button:hover .ql-fill, .ql-toolbar button:focus .ql-fill,
    .ql-toolbar button.ql-active .ql-fill {
      fill: #06c;
    }
    .ql-toolbar .ql-active {
      background-color: #e6f2ff;
      border-radius: 3px;
    }
    .ql-editor strong {
      font-weight: bold;
    }
    .ql-editor em {
      font-style: italic;
    }
    .ql-editor u {
      text-decoration: underline;
    }
    .ql-editor s {
      text-decoration: line-through;
    }
    .ql-snow {
      box-sizing: border-box;
    }
    .ql-snow * {
      box-sizing: border-box;
    }
    .ql-snow .ql-hidden {
      display: none;
    }
    .ql-snow .ql-editor.ql-blank::before {
      color: rgba(0,0,0,0.6);
      content: attr(data-placeholder);
      font-style: italic;
      left: 15px;
      pointer-events: none;
      position: absolute;
      right: 15px;
      top: 12px;
    }
    .ql-snow .ql-picker.ql-expanded .ql-picker-label {
      border-color: transparent;
      color: #ccc;
    }
    .ql-snow .ql-picker.ql-expanded .ql-picker-options {
      display: block;
      margin-top: -1px;
      top: 100%;
      z-index: 1;
    }
    .ql-snow .ql-color-picker .ql-picker-item {
      border: 1px solid transparent;
      float: left;
      height: 16px;
      margin: 2px;
      padding: 0px;
      width: 16px;
    }
    .ql-snow .ql-picker-options {
      background-color: #fff;
      border: 1px solid transparent;
      box-shadow: rgba(0,0,0,0.2) 0 2px 8px;
      box-sizing: border-box;
      padding: 4px 8px;
      position: absolute;
      width: 100%;
      display: none;
    }
    .ql-snow .ql-picker-label {
      cursor: pointer;
      display: inline-block;
      height: 100%;
      padding-left: 8px;
      padding-right: 2px;
      position: relative;
      width: 100%;
    }
    .ql-snow .ql-picker-item {
      cursor: pointer;
      display: block;
      padding: 5px 0;
    }
  `
  document.head.appendChild(style)
}

/**
 * Modal para crear una nueva recorrida/seguimiento
 * Utiliza react-quill para editor rich text
 * Prevención XSS: el backend sanitiza con sanitize-html
 * 
 * Props:
 *   - isOpen: boolean - Si el modal está abierto
 *   - onClose: function - Callback al cerrar
 *   - hospitalCode: string - Código del hospital
 *   - onSuccess: function - Callback después de guardar (con redirect por defecto)
 *   - editData: object - Datos para editar existente
 *   - draftData: object - Datos persistentes del draft (para no perder escritura)
 *   - onDraftChange: function - Callback cuando cambia el draft
 *   - disableRedirect: boolean - Si es true, no redirige después de guardar
 */
const RecorridaModal = ({ isOpen, onClose, hospitalCode, onSuccess, editData = null, draftData = null, onDraftChange = null, disableRedirect = false }) => {
  const [titulo, setTitulo] = useState('')
  const [contenidoHtml, setContenidoHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const isEditing = !!editData

  // Cargar datos al abrir en modo edición
  useEffect(() => {
    if (isOpen && editData) {
      setTitulo(editData.titulo || '')
      setContenidoHtml(editData.contenido_html || '')
    } else if (isOpen && draftData) {
      // Cargar desde draft si existe (persistencia)
      setTitulo(draftData.titulo || '')
      setContenidoHtml(draftData.contenidoHtml || '')
    } else if (isOpen && !editData && !draftData) {
      setTitulo('')
      setContenidoHtml('')
    }
  }, [isOpen, editData, draftData])

  // Guardar draft cuando cambia el contenido (sin re-renders excesivos)
  // Usar un timeout para evitar guardar en cada keystroke
  const draftTimeoutRef = useRef(null)
  
  const handleTituloChange = useCallback((e) => {
    const newTitulo = e.target.value
    setTitulo(newTitulo)
    
    if (disableRedirect && onDraftChange && !isEditing) {
      clearTimeout(draftTimeoutRef.current)
      draftTimeoutRef.current = setTimeout(() => {
        onDraftChange({
          titulo: newTitulo,
          contenidoHtml
        })
      }, 500) // Guardar draft cada 500ms sin cambios
    }
  }, [disableRedirect, onDraftChange, isEditing, contenidoHtml])
  
  const handleContenidoChange = useCallback((html) => {
    setContenidoHtml(html)
    
    if (disableRedirect && onDraftChange && !isEditing) {
      clearTimeout(draftTimeoutRef.current)
      draftTimeoutRef.current = setTimeout(() => {
        onDraftChange({
          titulo,
          contenidoHtml: html
        })
      }, 500) // Guardar draft cada 500ms sin cambios
    }
  }, [disableRedirect, onDraftChange, isEditing, titulo])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current)
      }
    }
  }, [])

  // Configuración del editor Quill
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ]
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link',
    'color', 'background'
  ]

  const handleSubmit = async () => {
    setError(null)
    setSuccess(false)

    // Validación cliente
    if (!titulo.trim()) {
      setError('El título es obligatorio')
      return
    }

    if (titulo.length > 1000) {
      setError('El título no puede exceder los 1000 caracteres')
      return
    }

    if (!contenidoHtml.trim() || contenidoHtml === '<p><br></p>') {
      setError('El contenido es obligatorio')
      return
    }

    // Límite de 100KB (aproximado)
    const sizeInBytes = new Blob([contenidoHtml]).size
    if (sizeInBytes > 100000) {
      setError('El contenido supera el límite de 100KB')
      return
    }

    setLoading(true)

    try {
      const url = isEditing ? `/api/recorridas/${editData.id}` : '/api/recorridas'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        credentials: 'include', // Usar cookies de sesión de AdminJS
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hospital_code: hospitalCode,
          titulo: titulo.trim(),
          contenido_html: contenidoHtml
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`)
      }

      setSuccess(true)
      
      // Si no es modo "no redirigir", limpiar formulario
      if (!disableRedirect) {
        setTitulo('')
        setContenidoHtml('')
      }
      
      // Notificar al componente padre
      if (onSuccess) {
        onSuccess(data)
      }

      // Manejar cierre/persistencia según modo
      if (disableRedirect) {
        // Modo persistente: solo mostrar mensaje de éxito, mantener modal abierto
        setTimeout(() => {
          setSuccess(false)
          // Limpiar formulario Y draft después de guardar exitosamente
          setTitulo('')
          setContenidoHtml('')
          if (onDraftChange) {
            onDraftChange({ titulo: '', contenidoHtml: '' })
          }
        }, 1500)
      } else {
        // Modo normal: cerrar modal después de 1.5 segundos
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 1500)
      }

    } catch (err) {
      console.error('Error al crear recorrida:', err)
      setError(err.message || 'Error al guardar la recorrida')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitulo('')
      setContenidoHtml('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar recorrida' : 'Nueva recorrida'}
      subtitle={`Hospital: ${hospitalCode}`}
      maxWidth="900px"
      disableClickOutside={!disableRedirect}
      footer={
        <>
          <Button
            variant="text"
            onClick={handleClose}
            disabled={loading || success}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || success}
            style={{
              backgroundColor: loading ? '#9ca3af' : (success ? '#10b981' : '#111'),
              color: '#fff',
              cursor: (loading || success) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <LoadingSpinner inline size="small" text="Guardando..." color="#fff" />
            ) : (
              success ? '✓ Guardado' : 'Guardar Recorrida'
            )}
          </Button>
        </>
      }
    >
      {/* Mensajes de error/éxito */}
      {error && (
        <Box
          mb="md"
          p="md"
          style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: 4
          }}
        >
          <Text color="error">{error}</Text>
        </Box>
      )}

      {success && (
        <Box
          mb="md"
          p="md"
          style={{
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            borderRadius: 4,
            color: '#060'
          }}
        >
          <Text style={{ margin: 0 }}>✅ Recorrida guardada exitosamente</Text>
        </Box>
      )}

      {/* Título */}
      <Box mb="lg">
        <Label required>Título</Label>
        <Input
          value={titulo}
          onChange={handleTituloChange}
          placeholder="Ej: Recorrida 06/01/2026 - Guardia"
          maxLength={200}
          disabled={loading || success}
          style={{ width: '100%' }}
        />
        <Text color="subtle" style={{ fontSize: 12, marginTop: 4 }}>
          {titulo.length}/200 caracteres
        </Text>
      </Box>

      {/* Editor de contenido */}
      <Box mb="lg">
        <Label required>Contenido</Label>
        <div style={{
          border: '1px solid #ced4da',
          borderRadius: 4,
          backgroundColor: success ? '#f3f4f6' : '#fff',
          minHeight: 320,
          maxHeight: 320,
          overflow: 'auto'
        }}>
          <style>{`
            .ql-toolbar.ql-snow {
              position: sticky !important;
              top: 0 !important;
              z-index: 10 !important;
              background-color: #f9f9f9 !important;
              border-bottom: 1px solid #ccc !important;
              padding: 6px 8px !important;
              border: none !important;
              display: flex !important;
              align-items: center !important;
              flex-wrap: wrap !important;
              gap: 4px !important;
            }
            .ql-toolbar.ql-snow .ql-stroke {
              stroke: #666 !important;
            }
            .ql-toolbar.ql-snow .ql-fill {
              fill: #666 !important;
            }
            .ql-toolbar.ql-snow .ql-picker-label {
              color: #666 !important;
            }
            .ql-toolbar.ql-snow button:hover .ql-stroke,
            .ql-toolbar.ql-snow button:focus .ql-stroke,
            .ql-toolbar.ql-snow button.ql-active .ql-stroke {
              stroke: #333 !important;
            }
            .ql-toolbar.ql-snow button:hover .ql-fill,
            .ql-toolbar.ql-snow button:focus .ql-fill,
            .ql-toolbar.ql-snow button.ql-active .ql-fill {
              fill: #333 !important;
            }
            .ql-container.ql-snow {
              border: none !important;
            }
            .ql-editor {
              min-height: 270px !important;
              padding: 12px !important;
            }
          `}</style>
          <ReactQuill
            theme="snow"
            value={contenidoHtml}
            onChange={handleContenidoChange}
            modules={modules}
            formats={formats}
            placeholder="Escriba el contenido de la recorrida..."
            readOnly={loading || success}
          />
        </div>
        <Text color="subtle" style={{ fontSize: 12, marginTop: 8 }}>
          Límite: 100KB
        </Text>
      </Box>
    </Modal>
  )
}

export default RecorridaModal
