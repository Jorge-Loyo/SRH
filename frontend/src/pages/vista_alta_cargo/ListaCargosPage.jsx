import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { altaCargoApi } from '../../api/altaCargoApi'

function SiglaPickerModal({ siglas, value, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef  = useRef(null)
  const filtered  = q.trim()
    ? siglas.filter(s => s.toLowerCase().includes(q.toLowerCase()))
    : siglas

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col" style={{ maxHeight: '70vh' }} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtrar por Ubicación</span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar sigla..." className="form-input text-sm w-full pl-9" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {value && (
            <button onClick={() => { onSelect(''); onClose() }}
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-b border-gray-50">
              <XMarkIcon className="w-3.5 h-3.5 mr-2" /> Quitar filtro
            </button>
          )}
          {filtered.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">Sin resultados</p>
            : filtered.map(s => (
              <button key={s} onClick={() => { onSelect(s); onClose() }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  s === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {s}
                {s === value && <CheckIcon className="w-4 h-4 text-primary-600" />}
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}

const COLS = [
  { key: 'codigo',          label: 'Código'          },
  { key: 'sigla',           label: 'Sigla'           },
  { key: 'carrera',         label: 'Carrera'         },
  { key: 'modalidad',       label: 'Modalidad'       },
  { key: 'nivel_formacion', label: 'Nivel formación' },
  { key: 'puesto',          label: 'Puesto'          },
  { key: 'especialidad',    label: 'Especialidad'    },
  { key: 'fecha_alta',      label: 'Fecha'           },
]

const CARRERAS  = ['CPH', 'ENF', 'TEC', 'SG', 'GEN', 'RES', 'DOC']
const MODALIDADES = ['planta', 'guardia']

function fmt(val, key) {
  if (!val) return <span className="text-gray-300">—</span>
  if (key === 'fecha_alta') return new Date(val).toLocaleDateString('es-AR')
  if (key === 'codigo') return <span className="font-mono font-semibold text-primary-700">{val}</span>
  if (key === 'modalidad') return <span className="capitalize">{val}</span>
  return val
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
      }`}
    >
      {label}
    </button>
  )
}

export default function ListaCargosPage() {
  const [rows,     setRows]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [q,        setQ]        = useState('')
  const [carrera,  setCarrera]  = useState('')
  const [modalidad,setModalidad]= useState('')
  const [tipoCph,  setTipoCph]  = useState('')
  const [sigla,    setSigla]    = useState('')
  const [siglas,   setSiglas]   = useState([])
  const [siglaModal, setSiglaModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const debounceRef = useRef(null)
  const LIMIT = 10

  const load = useCallback((pg, search, car, mod, tipo, sig) => {
    setLoading(true)
    setError(null)
    const params = { page: pg, limit: LIMIT }
    if (search)   params.q        = search
    if (car)      params.carrera  = car
    if (mod)      params.modalidad = mod
    if (tipo)     params.tipoCph  = tipo
    if (sig)      params.sigla    = sig
    altaCargoApi.listNewCargo(params)
      .then(data => { setRows(data.rows); setTotal(data.total) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // debounce búsqueda de texto
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load(1, q, carrera, modalidad, tipoCph, sigla)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [q, carrera, modalidad, tipoCph, sigla, load])

  // cuando cambia página (sin cambiar filtros)
  useEffect(() => {
    load(page, q, carrera, modalidad, tipoCph, sigla)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // cargar lista de siglas para el datalist
  useEffect(() => {
    altaCargoApi.listSiglas().then(data => setSiglas(data.map(s => s.sigla))).catch(() => {})
  }, [])

  function toggleCarrera(c)   { setCarrera(prev => prev === c ? '' : c); setTipoCph(''); setPage(1) }
  function toggleModalidad(m) { setModalidad(prev => prev === m ? '' : m); setPage(1) }
  function toggleTipoCph(t)   { setTipoCph(prev => prev === t ? '' : t); setPage(1) }

  async function handleExport() {
    setExporting(true)
    try {
      const params = {}
      if (q)        params.q        = q
      if (carrera)  params.carrera  = carrera
      if (modalidad) params.modalidad = modalidad
      if (sigla)    params.sigla    = sigla
      const data = await altaCargoApi.exportNewCargo(params)
      const EXPORT_COLS = [
        { key: 'id_sial',         label: 'ID SIAL',        w: 12 },
        { key: 'codigo',          label: 'Código',         w: 14 },
        { key: 'tipo_cph',        label: 'Tipo CPH',       w: 10 },
        { key: 'sigla',           label: 'Sigla',          w: 10 },
        { key: 'carrera',         label: 'Carrera',        w:  8 },
        { key: 'modalidad',       label: 'Modalidad',      w: 10 },
        { key: 'nivel_formacion', label: 'Nivel formación',w: 16 },
        { key: 'puesto',          label: 'Puesto',         w: 40 },
        { key: 'especialidad',    label: 'Especialidad',   w: 30 },
        { key: 'fecha_alta',      label: 'Fecha',          w: 12 },
      ]
      const headers = EXPORT_COLS.map(c => c.label)
      const rows = data.map(r => {
        const tipoCph = /^CPH-D-/.test(r.codigo) ? 'Director'
                      : /^CPH-J-/.test(r.codigo) ? 'Jefe'
                      : r.carrera === 'CPH'       ? 'Común'
                      : ''
        return [
          r.id_sial, r.codigo, tipoCph, r.sigla, r.carrera, r.modalidad,
          r.nivel_formacion, r.puesto, r.especialidad,
          r.fecha_alta ? new Date(r.fecha_alta).toLocaleDateString('es-AR') : ''
        ]
      })
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = EXPORT_COLS.map(c => ({ wch: c.w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cargos')
      const suffix = [carrera, modalidad, sigla].filter(Boolean).join('-')
      XLSX.writeFile(wb, `cargos${suffix ? '-' + suffix : ''}.xlsx`)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-6xl space-y-3">

      {siglaModal && (
        <SiglaPickerModal
          siglas={siglas} value={sigla}
          onSelect={v => { setSigla(v); setPage(1) }}
          onClose={() => setSiglaModal(false)}
        />
      )}

      {/* Barra de búsqueda + filtros */}
      <div className="card p-3 space-y-2.5">
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por código, sigla, puesto, especialidad..."
          className="form-input text-sm w-full"
        />
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium mr-1">Carrera</span>
            {CARRERAS.map(c => (
              <FilterChip key={c} label={c} active={carrera === c} onClick={() => toggleCarrera(c)} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium mr-1">Modalidad</span>
            {MODALIDADES.map(m => (
              <FilterChip key={m} label={m} active={modalidad === m} onClick={() => toggleModalidad(m)} />
            ))}
          </div>
          {carrera === 'CPH' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium mr-1">Tipo CPH</span>
              {[{v:'comun',l:'Común'},{v:'jefe',l:'Jefe'},{v:'director',l:'Director'}].map(({v,l}) => (
                <FilterChip key={v} label={l} active={tipoCph === v} onClick={() => toggleTipoCph(v)} />
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium mr-1">Ubicación</span>
            <button
              onClick={() => setSiglaModal(true)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                sigla
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              {sigla || 'Seleccionar...'}
            </button>
            {sigla && (
              <button onClick={() => { setSigla(''); setPage(1) }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contador + paginación superior */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {loading ? 'Cargando...' : `${total.toLocaleString('es-AR')} cargo${total !== 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLS.map(c => (
                  <th key={c.key} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-12 text-center text-gray-400">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-gray-50 ${i % 2 ? 'bg-gray-50/50' : ''} hover:bg-primary-50/30 transition-colors`}>
                    {COLS.map(c => (
                      <td key={c.key} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {fmt(row[c.key], c.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  // Genera ventana de páginas: siempre muestra primera, última y ±2 alrededor de la actual
  const pages = []
  const add = (n) => { if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n) }
  add(1); add(2)
  for (let i = page - 2; i <= page + 2; i++) add(i)
  add(totalPages - 1); add(totalPages)
  pages.sort((a, b) => a - b)

  const items = []
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push('...')
    items.push(pages[i])
  }

  return (
    <div className="flex items-center gap-1">
      <PgBtn onClick={() => onChange(page - 1)} disabled={page === 1}>‹</PgBtn>
      {items.map((item, i) =>
        item === '...'
          ? <span key={`e${i}`} className="px-1 text-gray-400 text-sm">…</span>
          : <PgBtn key={item} onClick={() => onChange(item)} active={item === page}>{item}</PgBtn>
      )}
      <PgBtn onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</PgBtn>
    </div>
  )
}

function PgBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : disabled
            ? 'text-gray-300 cursor-default'
            : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
