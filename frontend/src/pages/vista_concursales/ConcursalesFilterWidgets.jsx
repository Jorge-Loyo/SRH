import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import BaseModal from '../../components/ui/modals/BaseModal'

// ─── Th sorteable ─────────────────────────────────────────────────────────────
export function Th({ label, field, sort, onSort }) {
  const active = sort.field === field
  return (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ChevronUpDownIcon className={`w-3.5 h-3.5 ${active ? 'text-primary-600' : 'text-gray-300'}`} />
        {active && <span className="text-primary-600">{sort.order === 'ASC' ? '↑' : '↓'}</span>}
      </span>
    </th>
  )
}

// ─── FilterAccSection ─────────────────────────────────────────────────────────
export function FilterAccSection({ title, activeCount = 0, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-widest transition-colors ${
          open
            ? 'bg-primary-50 text-primary-700 rounded-t-lg'
            : 'bg-white text-gray-500 hover:bg-gray-50 rounded-lg'
        }`}
      >
        <span className="flex items-center gap-2">
          <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
          {title}
        </span>
        {activeCount > 0 && (
          <span className="bg-primary-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-white border-t border-gray-100 rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────
export function FilterSelect({ label, value, onChange, options = [], disabled = false, hint = null }) {
  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`form-input text-sm w-full ${disabled ? 'opacity-50 cursor-default' : ''}`}
      >
        <option value="">Todos</option>
        {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="mt-0.5 text-[10px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  )
}

// ─── FilterBoolSelect ─────────────────────────────────────────────────────────
export function FilterBoolSelect({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="form-input text-sm w-full">
        <option value="">Todos</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    </div>
  )
}

// ─── FilterText ───────────────────────────────────────────────────────────────
export function FilterText({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Filtrar...'}
        className="form-input text-sm w-full"
      />
    </div>
  )
}

// ─── FilterDate ───────────────────────────────────────────────────────────────
export function FilterDate({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="form-input text-sm w-full"
      />
    </div>
  )
}

// ─── FilterSearchSelect — select con buscador integrado (dropdown fixed) ─────
// options puede ser string[] o {value, label}[]
export function FilterSearchSelect({ label, value, onChange, options = [], disabled = false, hint = null }) {
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [dropStyle, setDropStyle] = useState({})
  const wrapRef    = useRef(null)
  const dropRef    = useRef(null)
  const triggerRef = useRef(null)
  const inputRef   = useRef(null)

  const normalized = useMemo(
    () => options.map(o => typeof o === 'string' ? { value: o, label: o } : o),
    [options]
  )
  const filteredOpts = useMemo(() => {
    if (!query.trim()) return normalized
    const q = query.toLowerCase()
    return normalized.filter(o => o.label.toLowerCase().includes(q))
  }, [normalized, query])

  useEffect(() => {
    const handler = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropRef.current && dropRef.current.contains(e.target)) return
      setOpen(false); setQuery('')
    }
    document.addEventListener('scroll', handler, true)
    return () => document.removeEventListener('scroll', handler, true)
  }, [open])

  const handleSelect = (val) => { onChange(val); setOpen(false); setQuery('') }

  const openDropdown = () => {
    if (disabled) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropStyle({ position: 'fixed', zIndex: 9999, top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) })
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const selectedLabel = normalized.find(o => o.value === value)?.label ?? value

  return (
    <div ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative" ref={triggerRef}>
        {!open ? (
          <button
            type="button"
            onClick={openDropdown}
            disabled={disabled}
            className={`form-input text-sm w-full text-left flex items-center pr-7 ${disabled ? 'opacity-50 cursor-default' : ''}`}
          >
            {value
              ? <span className="text-gray-900 truncate block flex-1 min-w-0">{selectedLabel}</span>
              : <span className="text-gray-400">Todos</span>
            }
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2" />
          </button>
        ) : (
          <>
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-10" />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className="form-input text-sm w-full pl-8" />
          </>
        )}
        {value && !open && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }} className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 transition-colors z-10">
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div ref={dropRef} style={dropStyle} className="bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <button type="button" onClick={() => handleSelect('')} className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 ${!value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>Todos</button>
            {filteredOpts.length === 0
              ? <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
              : filteredOpts.map(o => (
                <button key={o.value} type="button" onClick={() => handleSelect(o.value)} className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${o.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>{o.label}</button>
              ))
            }
          </div>
        </div>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  )
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────
export function ConfirmDeleteModal({ target, entityLabel, nameOf, onConfirm, onCancel, deleting, error }) {
  return (
    <BaseModal
      open={!!target}
      onClose={onCancel}
      title="Confirmar eliminación"
      size="sm"
      footer={
        <>
          <button onClick={onCancel} className="btn-secondary" disabled={deleting}>Cancelar</button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        ¿Eliminar {entityLabel} <strong>#{target?.id}</strong>
        {nameOf?.(target) ? ` (${nameOf(target)})` : ''}?{' '}
        Esta acción no se puede deshacer.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </BaseModal>
  )
}
