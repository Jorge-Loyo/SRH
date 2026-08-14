import { useState, useEffect, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

const LIMIT = 50

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function RowModal({ tableName, pk, columns, row, onClose, onSaved }) {
  const isEdit     = !!row
  const editableCols = columns.filter(c => !c.auto)

  const [form,   setForm]   = useState(() => {
    const init = {}
    editableCols.forEach(c => { init[c.name] = row ? (row[c.name] ?? '') : '' })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (isEdit) await apiPut(`/api/herramientas/admin/${tableName}/${row[pk]}`, form)
      else        await apiPost(`/api/herramientas/admin/${tableName}`, form)
      onSaved()
    } catch (err) { setError(err.message); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm">
            {isEdit ? 'Editar' : 'Nuevo'} — {tableName}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {editableCols.map(col => (
            <div key={col.name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {col.name}
                <span className="ml-1 text-gray-300 font-normal">{col.type}</span>
              </label>
              {col.name === 'activo' ? (
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, activo: f.activo == 1 ? 0 : 1 }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.activo == 1 ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.activo == 1 ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                  <span className="ml-12 text-xs font-medium text-gray-700">
                    {form.activo == 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </button>
              ) : (
                <input
                  className="form-input w-full text-sm"
                  value={form[col.name] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [col.name]: e.target.value }))}
                  required={!col.nullable}
                />
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50">
              <CheckIcon className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Panel de tabla con CRUD ──────────────────────────────────────────────────
function TablePanel({ table, onCountChange }) {
  const [rows,     setRows]     = useState([])
  const [cols,     setCols]     = useState([])   // columnas del schema (con meta)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)  // null | 'new' | row-object
  const [deleting, setDeleting] = useState(null)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Cargar columnas del schema una sola vez al montar
  useEffect(() => {
    apiGet('/api/herramientas/erd').then(schema => {
      const schemaCols = schema.tables[table.name] ?? []
      setCols(schemaCols)
    }).catch(() => {})
  }, [table.name])

  // Cargar datos cada vez que cambia la página
  useEffect(() => {
    setLoading(true)
    apiGet(`/api/herramientas/table/${table.name}`, { page, limit: LIMIT })
      .then(d => {
        setRows(d.rows)
        setTotal(d.total)
        onCountChange(d.total)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [table.name, page]) // eslint-disable-line

  function reload() {
    setLoading(true)
    apiGet(`/api/herramientas/table/${table.name}`, { page, limit: LIMIT })
      .then(d => { setRows(d.rows); setTotal(d.total); onCountChange(d.total); setLoading(false) })
      .catch(() => setLoading(false))
  }

  async function handleDelete(row) {
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(row[table.pk])
    try {
      await apiDelete(`/api/herramientas/admin/${table.name}/${row[table.pk]}`)
      reload()
    } finally { setDeleting(null) }
  }

  const displayCols = rows.length ? Object.keys(rows[0]) : cols.map(c => c.name)

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm">{table.label}</span>
          <span className="text-xs text-gray-400">{total.toLocaleString('es-AR')} registros</span>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-700 text-white rounded-lg hover:bg-primary-800">
          <PlusIcon className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {loading && <p className="text-sm text-gray-400 text-center py-12">Cargando...</p>}
        {!loading && (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                {displayCols.map(c => (
                  <th key={c} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">
                    {c}
                  </th>
                ))}
                <th className="px-3 py-2 border-b border-gray-200 w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`group ${i % 2 ? 'bg-gray-50/50' : ''} hover:bg-blue-50/40 transition-colors`}>
                  {displayCols.map(c => (
                    <td key={c} className="px-3 py-1.5 text-gray-700 whitespace-nowrap border-b border-gray-50 max-w-[280px] truncate">
                      {c === 'activo'
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            row[c] == 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>{row[c] == 1 ? 'Activo' : 'Inactivo'}</span>
                        : row[c] === null || row[c] === undefined
                          ? <span className="text-gray-300">—</span>
                          : String(row[c])}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 border-b border-gray-50">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal(row)} title="Editar"
                        className="p-1 rounded hover:bg-blue-100 text-blue-500">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(row)} title="Eliminar"
                        disabled={deleting === row[table.pk]}
                        className="p-1 rounded hover:bg-red-100 text-red-400 disabled:opacity-40">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={displayCols.length + 1} className="text-center py-10 text-gray-400 text-xs">Sin registros</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 shrink-0">
        <span className="text-xs text-gray-400">
          {total > 0
            ? `${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, total)} de ${total.toLocaleString('es-AR')}`
            : '0 registros'}
        </span>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => setPage(1)}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">«</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">‹</button>
          <span className="px-2 text-xs text-gray-500">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">›</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">»</button>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <RowModal
          tableName={table.name}
          pk={table.pk}
          columns={cols.length
            ? cols
            : displayCols.map(c => ({ name: c, type: '', nullable: true, auto: c === table.pk }))}
          row={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); reload() }}
        />
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TablasAdminPage() {
  const [tables,   setTables]   = useState([])
  const [selected, setSelected] = useState(null)
  const [counts,   setCounts]   = useState({})

  useEffect(() => {
    apiGet('/api/herramientas/admin/tables')
      .then(data => { setTables(data); setSelected(data[0] ?? null) })
      .catch(console.error)
  }, [])

  return (
    <div className="flex gap-3" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Panel lateral */}
      <div className="w-52 shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700">Tablas administrables</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{tables.length} tablas</p>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {tables.map(t => (
            <button key={t.name} onClick={() => setSelected(t)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                selected?.name === t.name
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}>
              <span className="truncate">{t.label}</span>
              {counts[t.name] !== undefined && (
                <span className="ml-1 text-[10px] text-gray-400 shrink-0">
                  {counts[t.name].toLocaleString('es-AR')}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      {selected
        ? <TablePanel
            key={selected.name}
            table={selected}
            onCountChange={n => setCounts(c => ({ ...c, [selected.name]: n }))}
          />
        : <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Seleccioná una tabla
          </div>
      }
    </div>
  )
}
