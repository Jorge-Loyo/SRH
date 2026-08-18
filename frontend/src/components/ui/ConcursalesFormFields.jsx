import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, ChevronDownIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { SIGLAS_DATA, formatDateMask } from '../../utils/concursalesHelpers'

// Hook que calcula la posición del dropdown relativa al trigger y lo renderiza en body
function useDropdownPos(triggerRef, open) {
  const [pos, setPos] = useState(null)
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }, [open, triggerRef])
  return pos
}

/**
 * Componentes de formulario compartidos entre BajaForm.jsx y SeguimientoCphDetail.jsx
 * (Section y CheckField también los usa SeguimientoCeetpsDetail.jsx).
 *
 * OrigenContext / getOrigenBgStyle / Field / StyledSelectField / SearchSelectField /
 * SiglaSearchField / DateMaskField / ExportDropdown son específicos del concepto de
 * "Origen" (Alta por Baja / Ampliación / Cobertura Dotación / POU a POF), que solo
 * existe en Bajas y Seguimiento CPH — por eso Seguimiento CEETPS mantiene su propia
 * versión local, más simple, de esos mismos campos.
 */

export const OrigenContext = createContext('')

export function getOrigenBgStyle(origen, hasValue = false) {
  if (origen === 'Alta por Baja')      return { backgroundColor: '#dbeafe' }
  if (origen === 'Ampliación')         return { backgroundColor: '#bbf7d0' }
  if (origen === 'Cobertura Dotación') return { backgroundColor: '#fee2e2' }
  if (origen === 'POU a POF')          return { backgroundColor: '#ede9fe' }
  if (hasValue)                        return { backgroundColor: '#f0fdf4' }
  return {}
}

export function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 w-full group"
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200${open ? '' : ' -rotate-90'}`} />
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{title}</h3>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </button>
      {open && children}
    </div>
  )
}

export function CheckField({ label, value, onChange, cols = 1, disabled = false, staticLabel = null }) {
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <label
        className={`flex items-center gap-2 form-input text-sm w-full select-none ${
          disabled ? 'cursor-default bg-gray-50' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange({ target: { value: e.target.checked } })}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
        />
        <span className={`text-sm ${!!value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {staticLabel ?? (!!value ? 'Sí' : 'No')}
        </span>
      </label>
    </div>
  )
}

export function Field({ label, value, onChange, placeholder = '', type = 'text', cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  const displayValue = disabled && !value ? '—' : (value ?? '')
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={displayValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={getOrigenBgStyle(origen, !!value)}
        className={`form-input text-sm w-full${disabled ? ' cursor-default' : ''}`}
      />
    </div>
  )
}

// ─── StyledSelectField — mismo look del buscador, sin caja de búsqueda ───────
export function StyledSelectField({ label, value, onChange, options = [], cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  const [open, setOpen] = useState(false)
  const wrapRef    = useRef(null)
  const triggerRef = useRef(null)
  const portalRef  = useRef(null)
  const pos = useDropdownPos(triggerRef, open)

  useEffect(() => {
    const handler = (e) => {
      const inWrap   = wrapRef.current?.contains(e.target)
      const inPortal = portalRef.current?.contains(e.target)
      if (!inWrap && !inPortal) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt) => {
    onChange({ target: { value: opt } })
    setOpen(false)
  }

  return (
    <div className={`col-span-${cols}`} ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
          style={getOrigenBgStyle(origen, !!value)}
          className={`form-input text-sm w-full text-left flex items-center justify-between gap-1 pr-7${disabled ? ' cursor-default' : ''}`}
        >
          {value ? (
            <span className="text-gray-900 truncate">{value}</span>
          ) : (
            <span className="text-gray-400">{disabled ? '—' : 'Seleccionar...'}</span>
          )}
          <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && pos && createPortal(
          <div
            ref={portalRef}
            style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="overflow-y-auto" style={{ maxHeight: '10rem' }}>
              {options.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin opciones</div>
              ) : options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

// ─── SearchSelectField — select de una sola opción con buscador integrado ────
export function SearchSelectField({ label, value, onChange, options = [], cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const wrapRef    = useRef(null)
  const triggerRef = useRef(null)
  const inputRef   = useRef(null)
  const portalRef  = useRef(null)
  const pos = useDropdownPos(triggerRef, open)

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e) => {
      const inWrap   = wrapRef.current?.contains(e.target)
      const inPortal = portalRef.current?.contains(e.target)
      if (!inWrap && !inPortal) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt) => {
    onChange({ target: { value: opt } })
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange({ target: { value: '' } })
    setQuery('')
  }

  const openDropdown = () => {
    if (disabled) return
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  return (
    <div className={`col-span-${cols}`} ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        {!open ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={openDropdown}
            disabled={disabled}
            style={getOrigenBgStyle(origen, !!value)}
            className={`form-input text-sm w-full text-left flex items-center justify-between gap-1 pr-7${disabled ? ' cursor-default' : ''}`}
          >
            {value ? (
              <span className="text-gray-900 truncate">{value}</span>
            ) : (
              <span className="text-gray-400">{disabled ? '—' : 'Seleccionar...'}</span>
            )}
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2" />
          </button>
        ) : (
          <div className="relative" ref={triggerRef}>
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="form-input text-sm w-full pl-8"
            />
          </div>
        )}

        {value && !open && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 transition-colors z-10"
            title="Limpiar"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}

        {open && pos && createPortal(
          <div
            ref={portalRef}
            style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="overflow-y-auto" style={{ maxHeight: '10rem' }}>
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
              ) : filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

export function SiglaSearchField({ value, onChange, options = SIGLAS_DATA }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const wrapRef             = useRef(null)
  const inputRef            = useRef(null)
  const origen              = useContext(OrigenContext)

  const selected = options.find(s => s.sigla === value)

  const filtered = query.trim()
    ? options.filter(s =>
        s.sigla.toLowerCase().includes(query.toLowerCase()) ||
        s.descr.toLowerCase().includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (sigla) => {
    onChange({ target: { value: sigla } })
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange({ target: { value: '' } })
    setQuery('')
  }

  const openDropdown = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  return (
    <div className="col-span-1" ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Sigla</label>
      <div className="relative">
        {!open ? (
          <button
            type="button"
            onClick={openDropdown}
            style={getOrigenBgStyle(origen, !!value)}
            className="form-input text-sm w-full text-left flex items-center justify-between gap-1 pr-7"
          >
            {selected ? (
              <span className="font-mono font-semibold text-primary-700">{selected.sigla}</span>
            ) : (
              <span className="text-gray-400">Seleccionar...</span>
            )}
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2" />
          </button>
        ) : (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar sigla o efector..."
              className="form-input text-sm w-full pl-8"
            />
          </div>
        )}

        {value && !open && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 transition-colors z-10"
            title="Limpiar sigla"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}

        {open && (
          <div className="absolute z-40 left-0 top-full mt-1 w-[380px] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
              ) : filtered.map(s => (
                <button
                  key={s.sigla}
                  type="button"
                  onClick={() => handleSelect(s.sigla)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    s.sigla === value ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-primary-700 w-24 flex-shrink-0">{s.sigla}</span>
                  <span className="text-xs text-gray-700 truncate flex-1">{s.descr}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:block max-w-[100px] truncate">{s.tipo}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function DateMaskField({ label, value, onChange, cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  const handleChange = (e) => {
    onChange({ target: { value: formatDateMask(e.target.value) } })
  }
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={handleChange}
        placeholder="dd/mm/aaaa"
        maxLength={10}
        disabled={disabled}
        style={getOrigenBgStyle(origen, value?.length === 10)}
        className={`form-input text-sm w-full font-mono${disabled ? ' cursor-default' : ''}`}
      />
    </div>
  )
}

export function ExportDropdown({ onExport, label = 'Exportar informe' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
        {label}
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[56] overflow-hidden min-w-[140px]">
            <button
              type="button"
              onClick={() => { onExport('pdf'); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <span className="w-5 h-5 rounded bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold flex-shrink-0">PDF</span>
              PDF
            </button>
            <div className="h-px bg-gray-100" />
            <button
              type="button"
              onClick={() => { onExport('word'); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold flex-shrink-0">DOC</span>
              Word
            </button>
          </div>
        </>
      )}
    </div>
  )
}
