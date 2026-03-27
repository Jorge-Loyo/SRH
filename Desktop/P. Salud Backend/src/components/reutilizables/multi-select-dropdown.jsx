import React, { useEffect, useState, useRef } from 'react'

/**
 * Componente MultiSelect con checkboxes estilo Excel
 * Permite seleccionar múltiples opciones con búsqueda, seleccionar todos y limpiar
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta descriptiva del campo (opcional, para accesibilidad)
 * @param {Array<string|number>} props.value - Array de valores seleccionados
 * @param {Array<string|number>} props.options - Array de opciones disponibles
 * @param {Function} props.onChange - Callback que recibe el nuevo array de valores seleccionados
 * @param {Function} props.onFocus - Callback que se ejecuta al abrir el dropdown (útil para cargar datos bajo demanda)
 * @param {string} props.placeholder - Texto placeholder cuando no hay selección
 */
const MultiSelectDropdown = ({ label, value = [], options = [], onChange, onFocus, placeholder = 'Seleccionar...' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const fieldRef = useRef(null)
  const [dropdownWidth, setDropdownWidth] = useState(undefined)

  // Medir el ancho real del campo principal para alinear el dropdown
  useEffect(() => {
    if (isOpen && fieldRef.current) {
      setDropdownWidth(fieldRef.current.offsetWidth)
    }
  }, [isOpen])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      // Si el click fue dentro del dropdown, ignorar
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
        return
      }
      
      // Click fuera - cerrar dropdown
      setIsOpen(false)
      setSearchTerm('')
    }

    // Escuchar clicks en bubble phase (después de que los elementos procesen el evento)
    document.addEventListener('click', handleClickOutside, false)
    return () => document.removeEventListener('click', handleClickOutside, false)
  }, [isOpen])

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const handleSelectAll = () => {
    onChange(filteredOptions)
  }

  const handleClearAll = () => {
    onChange([])
  }

  // Filtrar opciones según búsqueda
  const filteredOptions = options.filter(opt => 
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const displayText = value.length === 0 
    ? placeholder 
    : value.length === 1 
      ? value[0] 
      : `${value.length} seleccionados`

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        ref={fieldRef}
        onClick={() => {
          setIsOpen(!isOpen)
          if (onFocus && !isOpen) onFocus()
        }}
        style={{
          width: '100%',
          border: '1px solid #111',
          borderRadius: 8,
          padding: '8px 10px',
          background: '#fff',
          color: '#000',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '16px',
          fontSize: '14px'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#000' }}>
          {displayText}
        </span>
        <span style={{ marginLeft: 8, fontSize: '12px', color: '#000' }}>▼</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: dropdownWidth ? dropdownWidth : '100%',
            marginTop: 4,
            background: '#fff',
            border: '1px solid #111',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          {/* Input de búsqueda */}
          <div style={{ padding: '8px', borderBottom: '1px solid #ddd', background: '#f8f8f8' }}>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: '13px',
                color: '#000',
                background: '#fff',
                boxSizing: 'border-box'
              }}
            />
            {options.length > 50 && (
              <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
                {options.length} opciones disponibles
              </div>
            )}
          </div>

          {/* Botones de control */}
          <div style={{ 
            padding: '8px', 
            borderBottom: '1px solid #ddd', 
            display: 'flex', 
            gap: 8,
            background: '#f8f8f8'
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #111',
                borderRadius: 4,
                background: '#fff',
                cursor: 'pointer',
                color: '#000'
              }}
            >
              Todos
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #111',
                borderRadius: 4,
                background: '#fff',
                cursor: 'pointer',
                color: '#000'
              }}
            >
              Limpiar
            </button>
          </div>

          {/* Lista de opciones con scroll */}
          <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', color: '#666', fontSize: '13px' }}>
                {searchTerm ? 'Sin resultados' : 'Sin opciones'}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <label
                  key={String(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: value.includes(opt) ? '#e8f0fe' : '#fff',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = value.includes(opt) ? '#d2e3fc' : '#f8f8f8' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = value.includes(opt) ? '#e8f0fe' : '#fff' }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggle(opt)
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(opt)}
                    onChange={(e) => e.stopPropagation()}
                    style={{ 
                      marginRight: 8, 
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      pointerEvents: 'none'
                    }}
                  />
                  <span style={{ fontSize: '13px', userSelect: 'none', color: '#000' }}>
                    {String(opt)}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiSelectDropdown
