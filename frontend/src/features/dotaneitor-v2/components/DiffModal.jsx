import React, { useMemo, useState } from 'react'
import { CheckCircleIcon, XMarkIcon, CircleStackIcon } from '@heroicons/react/24/outline'
import { ModalShell, Spinner } from './ui'

const DIFF_TABS = [
  { key: 'modificados', label: 'Modificados', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'nuevos', label: 'Nuevos', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'eliminados', label: 'Eliminados', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
]

const CAMPO_LABEL = {
  ayn: 'Nombre', siglas: 'Sigla', escalafon: 'Escalafón',
  codigo_de_registro: 'Cód. Registro', literal_puesto: 'Puesto',
  especialidad: 'Especialidad', unificador_de_puestos: 'Unificador',
  agrupador: 'Agrupador', estado: 'Estado', situacion_de_revista: 'Sit. Revista',
  universo_totalizador: 'Universo',
}

const DRAFT_KEY = 'dotaneitor_v2_diff_draft'

export default function DiffModal({ diff, saving, onConfirm, onClose }) {
  const [tab, setTab] = useState('modificados')
  const [search, setSearch] = useState('')
  const [saveErr, setSaveErr] = useState(null)
  const [excluded, setExcluded] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]')) } catch { return new Set() }
  })

  const counts = {
    modificados: diff.total_modificados,
    nuevos: diff.total_nuevos,
    eliminados: diff.total_eliminados,
  }

  const camposDisponibles = tab === 'modificados'
    ? ['todos', ...new Set(diff.modificados.flatMap((m) => m.cambios.map((c) => c.campo)))]
    : ['todos']
  const [campo, setCampo] = useState('todos')

  const filas = diff[tab] ?? []
  const filtradas = useMemo(() => filas.filter((f) => {
    const txt = search.toLowerCase()
    const matchSearch = !txt ||
      (f.ayn ?? '').toLowerCase().includes(txt) ||
      (f.id_sial ?? '').toLowerCase().includes(txt) ||
      (f.siglas ?? '').toLowerCase().includes(txt)
    const matchCampo = campo === 'todos' || tab !== 'modificados' ||
      f.cambios?.some((c) => c.campo === campo)
    return matchSearch && matchCampo
  }), [filas, search, campo, tab])

  const toggleExclude = (id) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const saveDraft = () => localStorage.setItem(DRAFT_KEY, JSON.stringify([...excluded]))
  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setExcluded(new Set()) }

  const hayDatos = counts.modificados + counts.nuevos + counts.eliminados > 0

  async function handleConfirm() {
    setSaveErr(null)
    try {
      const ok = await onConfirm([...excluded])
      if (ok) localStorage.removeItem(DRAFT_KEY)
    } catch (e) {
      setSaveErr(e.message)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">Validación de cambios</h2>
          <p className="text-xs text-gray-400 mt-0.5">Revisá los cambios antes de guardar. Podés excluir filas individuales.</p>
        </div>
        <div className="flex items-center gap-2">
          {excluded.size > 0 && (
            <span className="text-xs text-amber-600 font-medium">{excluded.size} excluidos</span>
          )}
          <button onClick={saveDraft}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            Guardar borrador
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex gap-8 px-6 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
        {[
          { label: 'modificados', val: counts.modificados, tone: 'text-blue-600' },
          { label: 'nuevos', val: counts.nuevos, tone: 'text-green-600' },
          { label: 'eliminados', val: counts.eliminados, tone: 'text-red-500' },
          { label: 'campos cambiados', val: diff.total_campos_modificados, tone: 'text-gray-700' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.val.toLocaleString('es-AR')}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + filtros */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-100 shrink-0 flex-wrap">
        <div className="flex gap-1">
          {DIFF_TABS.map((t) => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setSearch(''); setCampo('todos') }}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
                ${tab === t.key ? `${t.bg} ${t.color} ${t.border}` : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
              {t.label} <span className="ml-1 opacity-60">({counts[t.key].toLocaleString('es-AR')})</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, ID SIAL o sigla..."
          className="flex-1 min-w-[180px] px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400" />
        {tab === 'modificados' && camposDisponibles.length > 1 && (
          <select value={campo} onChange={(e) => setCampo(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none">
            {camposDisponibles.map((c) => (
              <option key={c} value={c}>{c === 'todos' ? 'Todos los campos' : (CAMPO_LABEL[c] ?? c)}</option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtradas.length.toLocaleString('es-AR')} filas</span>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {!hayDatos ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <CheckCircleIcon className="w-10 h-10 mb-2 text-green-400" />
            <p className="text-sm">Sin cambios — el padrón está actualizado</p>
          </div>
        ) : filtradas.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">Sin resultados para el filtro aplicado.</p>
        ) : tab === 'modificados' ? (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                {['ID SIAL', 'Nombre', 'Sigla', 'Campo', 'Antes', 'Después'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.flatMap((f) => {
                const cambiosFiltrados = campo === 'todos' ? f.cambios : f.cambios.filter((c) => c.campo === campo)
                const isExcluded = excluded.has(f.id_sial)
                return cambiosFiltrados.map((c, j) => (
                  <tr key={`${f.id_sial}-${c.campo}`}
                    className={`${j === 0 ? 'border-t-2 border-gray-100' : ''} ${isExcluded ? 'opacity-40 line-through' : ''}`}>
                    {j === 0 && (
                      <>
                        <td className="px-3 py-1.5 align-top" rowSpan={cambiosFiltrados.length}>
                          <input type="checkbox" checked={!isExcluded}
                            onChange={() => toggleExclude(f.id_sial)}
                            className="cursor-pointer" />
                        </td>
                        <td className="px-3 py-1.5 text-gray-400 font-mono align-top" rowSpan={cambiosFiltrados.length}>{f.id_sial}</td>
                        <td className="px-3 py-1.5 text-gray-700 font-medium align-top max-w-[140px] truncate" rowSpan={cambiosFiltrados.length}>{f.ayn}</td>
                        <td className="px-3 py-1.5 text-gray-500 align-top" rowSpan={cambiosFiltrados.length}>{f.siglas}</td>
                      </>
                    )}
                    <td className="px-3 py-1.5 text-blue-500 font-medium whitespace-nowrap">{CAMPO_LABEL[c.campo] ?? c.campo}</td>
                    <td className="px-3 py-1.5 text-red-400 max-w-[160px] truncate">{c.antes ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-1.5 text-green-600 max-w-[160px] truncate">{c.despues ?? <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                {['ID SIAL', 'Nombre', 'Sigla', 'Escalafón', 'Puesto', 'Especialidad'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f, i) => (
                <tr key={f.id_sial} className={i % 2 ? 'bg-gray-50/50' : ''}>
                  <td className="px-3 py-1.5 text-gray-400 font-mono">{f.id_sial}</td>
                  <td className="px-3 py-1.5 text-gray-700 font-medium max-w-[160px] truncate">{f.ayn}</td>
                  <td className="px-3 py-1.5 text-gray-500">{f.siglas}</td>
                  <td className="px-3 py-1.5 text-gray-600">{f.escalafon}</td>
                  <td className="px-3 py-1.5 text-gray-600 max-w-[140px] truncate">{f.literal_puesto}</td>
                  <td className="px-3 py-1.5 text-gray-600 max-w-[140px] truncate">{f.especialidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
            Cerrar
          </button>
          {excluded.size > 0 && (
            <button onClick={clearDraft}
              className="px-3 py-2 text-xs rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50">
              Limpiar exclusiones
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
          <button onClick={handleConfirm} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 font-medium">
            {saving ? <Spinner className="w-4 h-4" /> : <CircleStackIcon className="w-4 h-4" />}
            {saving ? 'Guardando...' : excluded.size > 0
              ? `Guardar (excluyendo ${excluded.size})`
              : 'Confirmar y guardar en BD'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}